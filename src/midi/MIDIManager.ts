interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'input' | 'output';
  state: 'connected' | 'disconnected';
  connection: 'open' | 'closed' | 'pending';
  version?: string;
}

interface MIDIMessage {
  command: number;
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  data: Uint8Array;
  timestamp: number;
}

interface MIDIMapping {
  id: string;
  name: string;
  deviceId: string;
  controller: number;
  targetType: 'parameter' | 'transport' | 'preset' | 'custom';
  targetId: string;
  minValue: number;
  maxValue: number;
  curve: 'linear' | 'logarithmic' | 'exponential';
  invert: boolean;
  enabled: boolean;
}

interface MIDILearnSession {
  isActive: boolean;
  targetType: string;
  targetId: string;
  callback: (mapping: MIDIMapping) => void;
  timeout?: NodeJS.Timeout;
}

interface MIDIControllerPreset {
  id: string;
  name: string;
  deviceName: string;
  mappings: MIDIMapping[];
  isFactory: boolean;
}

type MIDIEventCallback = (event: string, data: any) => void;

export class MIDIManager {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private readonly inputDevices: Map<string, MIDIDevice> = new Map();
  private readonly outputDevices: Map<string, MIDIDevice> = new Map();
  private readonly mappings: Map<string, MIDIMapping> = new Map();
  private readonly presets: Map<string, MIDIControllerPreset> = new Map();
  
  // MIDI learning
  private learnSession: MIDILearnSession | null = null;
  
  // Event system
  private readonly eventCallbacks: Map<string, MIDIEventCallback[]> = new Map();
  
  // MIDI message processing
  private messageHistory: MIDIMessage[] = [];
  private readonly maxHistorySize = 1000;
  
  // Known controller mappings
  private readonly knownControllers = new Map<string, MIDIControllerPreset>();
  
  private isInitialized = false;

  constructor() {
    this.initializeMIDI();
  }

  private async initializeMIDI(): Promise<void> {
    try {
      if (navigator.requestMIDIAccess) {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        
        // Setup event listeners
        this.midiAccess.onstatechange = (event: WebMidi.MIDIConnectionEvent) => {
          this.handleDeviceStateChange(event);
        };
        
        // Scan for existing devices
        this.scanDevices();
        
        // Load known controller presets
        this.loadKnownControllers();
        
        // Load saved mappings
        await this.loadMappings();
        
        this.isInitialized = true;
        this.emit('initialized');
        
        console.log('MIDI Manager initialized');
        console.log(`Found ${this.inputDevices.size} input devices, ${this.outputDevices.size} output devices`);
      } else {
        throw new Error('Web MIDI API not supported');
      }
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      this.emit('init-error', error);
    }
  }

  private scanDevices(): void {
    if (!this.midiAccess) return;
    
    // Scan input devices
    this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
      const device: MIDIDevice = {
        id: input.id || `input_${Date.now()}_${Math.random()}`,
        name: input.name || 'Unknown Input',
        manufacturer: input.manufacturer || 'Unknown',
        type: 'input',
        state: input.state,
        connection: input.connection,
        version: input.version || undefined
      };
      
      this.inputDevices.set(device.id, device);
      
      // Setup message listener
      input.onmidimessage = (event: WebMidi.MIDIMessageEvent) => {
        this.handleMIDIMessage(event, device.id);
      };
      
      console.log(`MIDI Input: ${device.name} (${device.manufacturer})`);
    });
    
    // Scan output devices
    this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => {
      const device: MIDIDevice = {
        id: output.id || `output_${Date.now()}_${Math.random()}`,
        name: output.name || 'Unknown Output',
        manufacturer: output.manufacturer || 'Unknown',
        type: 'output',
        state: output.state,
        connection: output.connection,
        version: output.version || undefined
      };
      
      this.outputDevices.set(device.id, device);
      
      console.log(`MIDI Output: ${device.name} (${device.manufacturer})`);
    });
    
    this.emit('devices-scanned', {
      inputs: Array.from(this.inputDevices.values()),
      outputs: Array.from(this.outputDevices.values())
    });
  }

  private handleDeviceStateChange(event: WebMidi.MIDIConnectionEvent): void {
    const port = event.port;
    if (!port) return;
    
    console.log(`MIDI device ${port.name} ${port.state}`);
    
    if (port.state === 'connected') {
      this.scanDevices(); // Rescan to pick up new devices
    } else if (port.state === 'disconnected') {
      // Remove device
      if (port.id) {
        this.inputDevices.delete(port.id);
        this.outputDevices.delete(port.id);
      }
    }
    
    this.emit('device-changed', {
      deviceId: port.id,
      name: port.name,
      state: port.state
    });
  }

  private handleMIDIMessage(event: WebMidi.MIDIMessageEvent, deviceId: string): void {
    const data = event.data;
    if (!data) return;
    
    const timestamp = event.timeStamp || performance.now();
    
    const message = this.parseMIDIMessage(data, timestamp);
    
    // Add to message history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
    
    // Handle MIDI learning
    if (this.learnSession?.isActive) {
      this.handleMIDILearn(message, deviceId);
      return;
    }
    
    // Process existing mappings
    this.processMappings(message, deviceId);
    
    this.emit('message', { message, deviceId });
  }

  private parseMIDIMessage(data: Uint8Array, timestamp: number): MIDIMessage {
    const status = data[0];
    const command = status >> 4;
    const channel = status & 0x0F;
    
    const message: MIDIMessage = {
      command,
      channel,
      data,
      timestamp
    };
    
    switch (command) {
      case 0x8: // Note Off
        message.note = data[1];
        message.velocity = data[2];
        break;
        
      case 0x9: // Note On
        message.note = data[1];
        message.velocity = data[2];
        break;
        
      case 0xB: // Control Change
        message.controller = data[1];
        message.value = data[2];
        break;
        
      case 0xC: // Program Change
        message.value = data[1];
        break;
        
      case 0xE: // Pitch Bend
        message.value = (data[2] << 7) | data[1];
        break;
    }
    
    return message;
  }

  private processMappings(message: MIDIMessage, deviceId: string): void {
    // Find mappings for this device and controller
    const relevantMappings = Array.from(this.mappings.values()).filter(mapping => 
      mapping.deviceId === deviceId &&
      mapping.controller === message.controller &&
      mapping.enabled
    );
    
    for (const mapping of relevantMappings) {
      this.applyMapping(mapping, message);
    }
  }

  private applyMapping(mapping: MIDIMapping, message: MIDIMessage): void {
    if (message.value === undefined) return;
    
    // Normalize MIDI value (0-127) to mapping range
    let normalizedValue = message.value / 127;
    
    if (mapping.invert) {
      normalizedValue = 1 - normalizedValue;
    }
    
    // Apply curve
    switch (mapping.curve) {
      case 'logarithmic':
        normalizedValue = Math.log(normalizedValue * 9 + 1) / Math.log(10);
        break;
      case 'exponential':
        normalizedValue = normalizedValue * normalizedValue;
        break;
      // Linear is default, no change needed
    }
    
    // Scale to target range
    const targetValue = mapping.minValue + normalizedValue * (mapping.maxValue - mapping.minValue);
    
    // Apply to target
    this.applyToTarget(mapping.targetType, mapping.targetId, targetValue);
    
    this.emit('mapping-applied', {
      mappingId: mapping.id,
      targetValue,
      originalValue: message.value
    });
  }

  private applyToTarget(targetType: string, targetId: string, value: number): void {
    switch (targetType) {
      case 'parameter':
        this.emit('parameter-change', { parameterId: targetId, value });
        break;
        
      case 'transport':
        this.emit('transport-control', { control: targetId, value });
        break;
        
      case 'preset':
        if (value > 0.5) { // Trigger on high value
          this.emit('preset-change', { presetId: targetId });
        }
        break;
        
      case 'custom':
        this.emit('custom-control', { controlId: targetId, value });
        break;
    }
  }

  // MIDI Learning
  startMIDILearn(targetType: string, targetId: string): Promise<MIDIMapping> {
    return new Promise((resolve, reject) => {
      if (this.learnSession?.isActive) {
        reject(new Error('MIDI learn session already active'));
        return;
      }
      
      this.learnSession = {
        isActive: true,
        targetType,
        targetId,
        callback: resolve,
        timeout: setTimeout(() => {
          this.stopMIDILearn();
          reject(new Error('MIDI learn timeout'));
        }, 30000) // 30 second timeout
      };
      
      this.emit('learn-started', { targetType, targetId });
      console.log(`MIDI Learn started for ${targetType}:${targetId}. Move a control on your MIDI device...`);
    });
  }

  private handleMIDILearn(message: MIDIMessage, deviceId: string): void {
    if (!this.learnSession || message.controller === undefined) return;
    
    // Create mapping
    const mappingId = `${deviceId}_${message.controller}_${this.learnSession.targetId}`;
    const device = this.inputDevices.get(deviceId);
    
    const mapping: MIDIMapping = {
      id: mappingId,
      name: `${device?.name || 'Unknown'} CC${message.controller} → ${this.learnSession.targetId}`,
      deviceId,
      controller: message.controller,
      targetType: this.learnSession.targetType as 'parameter' | 'transport' | 'preset' | 'custom',
      targetId: this.learnSession.targetId,
      minValue: 0,
      maxValue: 1,
      curve: 'linear',
      invert: false,
      enabled: true
    };
    
    this.mappings.set(mappingId, mapping);
    this.saveMappings();
    
    console.log(`✅ MIDI Learn: CC${message.controller} mapped to ${this.learnSession.targetId}`);
    
    // Complete learning session
    const callback = this.learnSession.callback;
    this.stopMIDILearn();
    callback(mapping);
  }

  stopMIDILearn(): void {
    if (this.learnSession?.timeout) {
      clearTimeout(this.learnSession.timeout);
    }
    
    this.learnSession = null;
    this.emit('learn-stopped');
  }

  // Mapping management
  createMapping(mapping: Omit<MIDIMapping, 'id'>): string {
    const mappingId = `${mapping.deviceId}_${mapping.controller}_${mapping.targetId}`;
    const fullMapping: MIDIMapping = {
      ...mapping,
      id: mappingId
    };
    
    this.mappings.set(mappingId, fullMapping);
    this.saveMappings();
    
    this.emit('mapping-created', fullMapping);
    return mappingId;
  }

  updateMapping(mappingId: string, updates: Partial<MIDIMapping>): void {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`Mapping ${mappingId} not found`);
    }
    
    Object.assign(mapping, updates);
    this.saveMappings();
    
    this.emit('mapping-updated', mapping);
  }

  deleteMapping(mappingId: string): void {
    if (this.mappings.delete(mappingId)) {
      this.saveMappings();
      this.emit('mapping-deleted', { mappingId });
    }
  }

  // Preset management
  savePreset(name: string, deviceName: string): string {
    const presetId = `preset_${Date.now()}`;
    
    // Get all mappings for the device
    const deviceMappings = Array.from(this.mappings.values())
      .filter(mapping => {
        const device = this.inputDevices.get(mapping.deviceId);
        return device?.name === deviceName;
      });
    
    const preset: MIDIControllerPreset = {
      id: presetId,
      name,
      deviceName,
      mappings: deviceMappings,
      isFactory: false
    };
    
    this.presets.set(presetId, preset);
    this.savePresets();
    
    this.emit('preset-saved', preset);
    return presetId;
  }

  loadPreset(presetId: string): void {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }
    
    // Clear existing mappings for this device
    const deviceIds = new Set(preset.mappings.map(m => m.deviceId));
    for (const deviceId of deviceIds) {
      const toDelete = Array.from(this.mappings.keys())
        .filter(id => this.mappings.get(id)?.deviceId === deviceId);
      
      for (const id of toDelete) {
        this.mappings.delete(id);
      }
    }
    
    // Load preset mappings
    for (const mapping of preset.mappings) {
      this.mappings.set(mapping.id, { ...mapping });
    }
    
    this.saveMappings();
    
    this.emit('preset-loaded', preset);
    console.log(`Loaded MIDI preset: ${preset.name}`);
  }

  deletePreset(presetId: string): void {
    if (this.presets.delete(presetId)) {
      this.savePresets();
      this.emit('preset-deleted', { presetId });
    }
  }

  // Known controller presets
  private loadKnownControllers(): void {
    // Akai MPK Mini MK3
    this.knownControllers.set('MPK mini 3', {
      id: 'akai_mpk_mini_mk3',
      name: 'Akai MPK Mini MK3 Default',
      deviceName: 'MPK mini 3',
      isFactory: true,
      mappings: [
        {
          id: 'mpk_k1_volume',
          name: 'K1 → Master Volume',
          deviceId: '',
          controller: 70,
          targetType: 'parameter',
          targetId: 'master_volume',
          minValue: 0,
          maxValue: 1,
          curve: 'linear',
          invert: false,
          enabled: true
        },
        {
          id: 'mpk_k2_filter',
          name: 'K2 → Filter Cutoff',
          deviceId: '',
          controller: 71,
          targetType: 'parameter',
          targetId: 'filter_cutoff',
          minValue: 20,
          maxValue: 20000,
          curve: 'logarithmic',
          invert: false,
          enabled: true
        }
      ]
    });

    // Novation Launchpad
    this.knownControllers.set('Launchpad X', {
      id: 'novation_launchpad_x',
      name: 'Novation Launchpad X',
      deviceName: 'Launchpad X',
      isFactory: true,
      mappings: [
        // Transport controls
        {
          id: 'lpx_play',
          name: 'Play Button',
          deviceId: '',
          controller: 91,
          targetType: 'transport',
          targetId: 'play',
          minValue: 0,
          maxValue: 1,
          curve: 'linear',
          invert: false,
          enabled: true
        }
      ]
    });

    // Behringer X-Touch Mini
    this.knownControllers.set('X-TOUCH MINI', {
      id: 'behringer_xtouch_mini',
      name: 'Behringer X-Touch Mini',
      deviceName: 'X-TOUCH MINI',
      isFactory: true,
      mappings: [
        // 8 rotary encoders
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `xtouch_encoder_${i + 1}`,
          name: `Encoder ${i + 1} → EQ Band ${i + 1}`,
          deviceId: '',
          controller: 1 + i,
          targetType: 'parameter' as const,
          targetId: `eq_band_${i + 1}_gain`,
          minValue: -12,
          maxValue: 12,
          curve: 'linear' as const,
          invert: false,
          enabled: true
        }))
      ]
    });
  }

  autoDetectController(deviceId: string): boolean {
    const device = this.inputDevices.get(deviceId);
    if (!device) return false;
    
    const knownPreset = this.knownControllers.get(device.name);
    if (!knownPreset) return false;
    
    // Create preset with correct device ID
    const mappings = knownPreset.mappings.map(mapping => ({
      ...mapping,
      deviceId,
      id: `${deviceId}_${mapping.controller}_${mapping.targetId}`
    }));
    
    // Load mappings
    for (const mapping of mappings) {
      this.mappings.set(mapping.id, mapping);
    }
    
    this.saveMappings();
    
    console.log(`✅ Auto-detected controller: ${device.name}`);
    this.emit('controller-detected', { deviceId, presetName: knownPreset.name });
    
    return true;
  }

  // MIDI output
  sendMIDIMessage(deviceId: string, data: Uint8Array): void {
    if (!this.midiAccess) return;
    
    const output = this.midiAccess.outputs.get(deviceId);
    if (output) {
      output.send(data);
    }
  }

  sendControlChange(deviceId: string, channel: number, controller: number, value: number): void {
    const data = new Uint8Array([0xB0 | channel, controller, value]);
    this.sendMIDIMessage(deviceId, data);
  }

  sendNoteOn(deviceId: string, channel: number, note: number, velocity: number): void {
    const data = new Uint8Array([0x90 | channel, note, velocity]);
    this.sendMIDIMessage(deviceId, data);
  }

  sendNoteOff(deviceId: string, channel: number, note: number): void {
    const data = new Uint8Array([0x80 | channel, note, 0]);
    this.sendMIDIMessage(deviceId, data);
  }

  // Persistence
  private async saveMappings(): Promise<void> {
    const mappingsArray = Array.from(this.mappings.values());
    localStorage.setItem('ravr-midi-mappings', JSON.stringify(mappingsArray));
  }

  private async loadMappings(): Promise<void> {
    const saved = localStorage.getItem('ravr-midi-mappings');
    if (saved) {
      try {
        const mappingsArray = JSON.parse(saved) as MIDIMapping[];
        this.mappings.clear();
        for (const mapping of mappingsArray) {
          this.mappings.set(mapping.id, mapping);
        }
      } catch (error) {
        console.error('Failed to load MIDI mappings:', error);
      }
    }
  }

  private savePresets(): void {
    const presetsArray = Array.from(this.presets.values());
    localStorage.setItem('ravr-midi-presets', JSON.stringify(presetsArray));
  }

  // Getters
  getInputDevices(): MIDIDevice[] {
    return Array.from(this.inputDevices.values());
  }

  getOutputDevices(): MIDIDevice[] {
    return Array.from(this.outputDevices.values());
  }

  getMappings(): MIDIMapping[] {
    return Array.from(this.mappings.values());
  }

  getMappingsForDevice(deviceId: string): MIDIMapping[] {
    return Array.from(this.mappings.values())
      .filter(mapping => mapping.deviceId === deviceId);
  }

  getPresets(): MIDIControllerPreset[] {
    return Array.from(this.presets.values());
  }

  getMessageHistory(): MIDIMessage[] {
    return [...this.messageHistory];
  }

  isLearning(): boolean {
    return this.learnSession?.isActive || false;
  }

  // Event system
  on(event: string, callback: MIDIEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: string, callback: MIDIEventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`Error in MIDI callback for ${event}:`, error);
        }
      });
    }
  }

  dispose(): void {
    this.stopMIDILearn();
    
    if (this.midiAccess) {
      // Close all MIDI ports
      this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
        if (input.connection === 'open') {
          input.close();
        }
      });
      
      this.midiAccess.outputs.forEach((output: WebMidi.MIDIOutput) => {
        if (output.connection === 'open') {
          output.close();
        }
      });
    }
    
    this.eventCallbacks.clear();
    this.mappings.clear();
    this.presets.clear();
    this.messageHistory = [];
  }
}
