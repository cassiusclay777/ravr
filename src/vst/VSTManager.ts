interface VSTPlugin {
  id: string;
  name: string;
  vendor: string;
  version: string;
  category: "effect" | "instrument" | "analyzer";
  path: string;
  parameters: VSTParameter[];
  presets: VSTPreset[];
  isLoaded: boolean;
  isBypassed: boolean;
}

interface VSTParameter {
  id: string;
  name: string;
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  unit?: string;
  isAutomatable: boolean;
  displayValue?: string;
}

interface VSTPreset {
  id: string;
  name: string;
  data: ArrayBuffer;
  isFactory: boolean;
}

interface VSTAudioBuffer {
  inputs: Float32Array[];
  outputs: Float32Array[];
  sampleRate: number;
  blockSize: number;
}

export class VSTManager {
  private readonly plugins: Map<string, VSTPlugin> = new Map();
  private readonly loadedInstances: Map<string, any> = new Map();
  private readonly audioContext: AudioContext;
  private vstHost: any = null; // Will be native VST host

  // WebAssembly VST bridge
  private vstBridge: any = null;
  private isInitialized = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    // Initialize VST bridge asynchronously
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.initializeVSTBridge();
  }

  private async initializeVSTBridge(): Promise<void> {
    try {
      // Load VST bridge WASM module (fallback if not available)
      this.vstBridge = await import("./vst_bridge_fallback");

      // Initialize native VST host if available (Electron/Tauri)
      if (typeof window !== "undefined" && (window as any).electronAPI) {
        this.vstHost = (window as any).electronAPI.vst;
      } else if (typeof window !== "undefined" && (window as any).__TAURI__) {
        this.vstHost = (window as any).__TAURI__.invoke;
      }

      this.isInitialized = true;
      console.log("VST Manager initialized");
    } catch (error) {
      console.warn(
        "VST Bridge not available, using JavaScript fallback:",
        error
      );
      // Create mock VST bridge
      this.vstBridge = {
        loadPlugin: async (path: string) => ({ id: "mock", path }),
        unloadPlugin: async (instance: any) => {
          /* mock */
        },
        processAudio: async (instance: any, buffer: any) => buffer,
      };
    } finally {
      this.isInitialized = true;
    }
  }

  async scanForPlugins(directories: string[] = []): Promise<VSTPlugin[]> {
    if (!this.isInitialized) {
      await this.initializeVSTBridge();
    }

    // Safely get user profile path (browser-compatible)
    const getUserProfilePath = (): string => {
      // Check if running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return (window as any).electronAPI.getUserProfilePath?.() || '';
      }
      // In browser, we can't access local filesystem anyway
      return '';
    };

    const userProfile = getUserProfilePath();
    const defaultDirs = [
      "C:\\Program Files\\Steinberg\\VSTPlugins",
      "C:\\Program Files\\Common Files\\VST3",
      "C:\\Program Files (x86)\\Steinberg\\VSTPlugins",
      "C:\\Program Files (x86)\\Common Files\\VST3",
      // Add master_me plugin directory
      "C:\\ravr-fixed\\external_plugins\\master_me-1.3.1-win64\\master_me-1.3.1",
    ];

    // Only add user profile directory if available
    if (userProfile) {
      defaultDirs.push(userProfile + "\\Documents\\VST3 Presets");
    }

    const scanDirs = [...defaultDirs, ...directories];
    const foundPlugins: VSTPlugin[] = [];

    for (const dir of scanDirs) {
      try {
        const plugins = await this.scanDirectory(dir);
        foundPlugins.push(...plugins);
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    }

    // Store found plugins
    foundPlugins.forEach((plugin) => {
      this.plugins.set(plugin.id, plugin);
    });

    return foundPlugins;
  }

  private async scanDirectory(path: string): Promise<VSTPlugin[]> {
    if (this.vstHost) {
      // Use native VST host for scanning
      try {
        const plugins = await this.vstHost.scanPlugins(path);
        return plugins.map((p: any) => this.parseNativePlugin(p));
      } catch (error) {
        console.warn("Native VST scanning failed:", error);
      }
    }

    // Fallback: simulate plugin discovery
    return this.simulatePluginScan(path);
  }

  private simulatePluginScan(path: string): VSTPlugin[] {
    const plugins: VSTPlugin[] = [];

    // Check for master_me plugin specifically
    if (path.includes("master_me-1.3.1")) {
      plugins.push({
        id: "master_me",
        name: "Master Me",
        vendor: "Matthias Wagner",
        version: "1.3.1",
        category: "effect" as const,
        path: path + "\\master_me-vst.dll",
        parameters: [
          {
            id: "input_gain",
            name: "Input Gain",
            value: 0,
            defaultValue: 0,
            minValue: -12,
            maxValue: 12,
            unit: "dB",
            isAutomatable: true,
          },
          {
            id: "output_gain",
            name: "Output Gain",
            value: 0,
            defaultValue: 0,
            minValue: -12,
            maxValue: 12,
            unit: "dB",
            isAutomatable: true,
          },
          {
            id: "target_lufs",
            name: "Target LUFS",
            value: -14,
            defaultValue: -14,
            minValue: -23,
            maxValue: -9,
            unit: "LUFS",
            isAutomatable: true,
          },
          {
            id: "max_true_peak",
            name: "Max True Peak",
            value: -1,
            defaultValue: -1,
            minValue: -3,
            maxValue: 0,
            unit: "dBTP",
            isAutomatable: true,
          },
        ],
        presets: [
          {
            id: "master_me_auto",
            name: "Auto Mastering",
            data: new ArrayBuffer(0),
            isFactory: true,
          },
        ],
        isLoaded: false,
        isBypassed: false,
      });
    }

    // Add other common plugins for development
    plugins.push(
      {
        id: "fabfilter_pro_q3",
        name: "FabFilter Pro-Q 3",
        vendor: "FabFilter",
        version: "3.24",
        category: "effect" as const,
        path: path + "\\FabFilter Pro-Q 3.dll",
        parameters: [
          {
            id: "freq_1",
            name: "Band 1 Frequency",
            value: 1000,
            defaultValue: 1000,
            minValue: 20,
            maxValue: 20000,
            unit: "Hz",
            isAutomatable: true,
          },
          {
            id: "gain_1",
            name: "Band 1 Gain",
            value: 0,
            defaultValue: 0,
            minValue: -30,
            maxValue: 30,
            unit: "dB",
            isAutomatable: true,
          },
        ],
        presets: [],
        isLoaded: false,
        isBypassed: false,
      },
      {
        id: "waves_ssl_g_master",
        name: "SSL G-Master Buss Compressor",
        vendor: "Waves",
        version: "14.0",
        category: "effect" as const,
        path: path + "\\SSL G-Master Buss Compressor.dll",
        parameters: [
          {
            id: "threshold",
            name: "Threshold",
            value: 0,
            defaultValue: 0,
            minValue: -20,
            maxValue: 0,
            unit: "dB",
            isAutomatable: true,
          },
          {
            id: "ratio",
            name: "Ratio",
            value: 4,
            defaultValue: 4,
            minValue: 1,
            maxValue: 10,
            unit: ":1",
            isAutomatable: true,
          },
        ],
        presets: [],
        isLoaded: false,
        isBypassed: false,
      }
    );

    return plugins;
  }

  private parseNativePlugin(nativePlugin: any): VSTPlugin {
    return {
      id:
        nativePlugin.uniqueId ||
        nativePlugin.name.toLowerCase().replace(/\s+/g, "_"),
      name: nativePlugin.name,
      vendor: nativePlugin.vendor || "Unknown",
      version: nativePlugin.version || "1.0",
      category: nativePlugin.category || "effect",
      path: nativePlugin.path,
      parameters: nativePlugin.parameters || [],
      presets: nativePlugin.presets || [],
      isLoaded: false,
      isBypassed: false,
    };
  }

  async loadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.isLoaded) {
      console.log(`Plugin ${pluginId} already loaded`);
      return true;
    }

    try {
      let instance;

      if (this.vstHost) {
        // Load using native VST host
        instance = await this.vstHost.loadPlugin(plugin.path);
      } else {
        // Fallback: create mock instance
        instance = this.createMockVSTInstance(plugin);
      }

      this.loadedInstances.set(pluginId, instance);
      plugin.isLoaded = true;

      console.log(`✅ Loaded VST plugin: ${plugin.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      return false;
    }
  }

  private createMockVSTInstance(plugin: VSTPlugin): any {
    // Mock VST instance for development/testing
    return {
      id: plugin.id,
      process: (audioBuffer: VSTAudioBuffer) => {
        // Pass-through processing for mock
        for (let i = 0; i < audioBuffer.outputs.length; i++) {
          if (audioBuffer.inputs[i]) {
            audioBuffer.outputs[i].set(audioBuffer.inputs[i]);
          }
        }
      },
      setParameter: (paramId: string, value: number) => {
        const param = plugin.parameters.find((p) => p.id === paramId);
        if (param) {
          param.value = Math.max(
            param.minValue,
            Math.min(param.maxValue, value)
          );
        }
      },
      getParameter: (paramId: string) => {
        const param = plugin.parameters.find((p) => p.id === paramId);
        return param?.value || 0;
      },
      bypass: (bypassed: boolean) => {
        plugin.isBypassed = bypassed;
      },
    };
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.loadedInstances.get(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (instance && this.vstHost) {
      try {
        await this.vstHost.unloadPlugin(instance);
      } catch (error) {
        console.error(`Error unloading plugin ${pluginId}:`, error);
      }
    }

    this.loadedInstances.delete(pluginId);
    if (plugin) {
      plugin.isLoaded = false;
    }
  }

  processAudio(pluginId: string, audioBuffer: VSTAudioBuffer): void {
    const instance = this.loadedInstances.get(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (!instance || !plugin || plugin.isBypassed) {
      // Pass through if not loaded or bypassed
      for (let i = 0; i < audioBuffer.outputs.length; i++) {
        if (audioBuffer.inputs[i]) {
          audioBuffer.outputs[i].set(audioBuffer.inputs[i]);
        }
      }
      return;
    }

    try {
      instance.process(audioBuffer);
    } catch (error) {
      console.error(`Error processing audio in plugin ${pluginId}:`, error);
      // Fallback to pass-through
      for (let i = 0; i < audioBuffer.outputs.length; i++) {
        if (audioBuffer.inputs[i]) {
          audioBuffer.outputs[i].set(audioBuffer.inputs[i]);
        }
      }
    }
  }

  setParameter(pluginId: string, parameterId: string, value: number): void {
    const instance = this.loadedInstances.get(pluginId);
    if (instance) {
      instance.setParameter(parameterId, value);
    }
  }

  getParameter(pluginId: string, parameterId: string): number {
    const instance = this.loadedInstances.get(pluginId);
    return instance ? instance.getParameter(parameterId) : 0;
  }

  bypassPlugin(pluginId: string, bypassed: boolean): void {
    const instance = this.loadedInstances.get(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (instance) {
      instance.bypass(bypassed);
    }

    if (plugin) {
      plugin.isBypassed = bypassed;
    }
  }

  async savePreset(pluginId: string, presetName: string): Promise<string> {
    const instance = this.loadedInstances.get(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (!instance || !plugin) {
      throw new Error(`Plugin ${pluginId} not found or not loaded`);
    }

    // Get current parameter state
    const presetData = {
      parameters: plugin.parameters.reduce((acc, param) => {
        acc[param.id] = param.value;
        return acc;
      }, {} as Record<string, number>),
      timestamp: Date.now(),
      version: plugin.version,
    };

    const presetId = `${pluginId}_${Date.now()}`;
    const serializedData = new TextEncoder().encode(JSON.stringify(presetData));

    const preset: VSTPreset = {
      id: presetId,
      name: presetName,
      data: serializedData.buffer,
      isFactory: false,
    };

    plugin.presets.push(preset);

    // Persist to localStorage
    try {
      const allPresets = JSON.parse(localStorage.getItem("vstPresets") || "{}");
      allPresets[presetId] = {
        name: presetName,
        pluginId,
        data: Array.from(new Uint8Array(serializedData.buffer)),
      };
      localStorage.setItem("vstPresets", JSON.stringify(allPresets));
    } catch (error) {
      console.error("Failed to save preset to localStorage:", error);
    }

    return presetId;
  }

  async loadPreset(pluginId: string, presetId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const instance = this.loadedInstances.get(pluginId);

    if (!plugin || !instance) {
      throw new Error(`Plugin ${pluginId} not found or not loaded`);
    }

    const preset = plugin.presets.find((p) => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    try {
      const presetData = JSON.parse(new TextDecoder().decode(preset.data));

      // Apply parameters
      for (const [paramId, value] of Object.entries(
        presetData.parameters as Record<string, number>
      )) {
        this.setParameter(pluginId, paramId, value);
      }

      console.log(`✅ Loaded preset ${preset.name} for ${plugin.name}`);
    } catch (error) {
      console.error(`Failed to load preset ${presetId}:`, error);
      throw error;
    }
  }

  getLoadedPlugins(): VSTPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.isLoaded);
  }

  getAllPlugins(): VSTPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): VSTPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  // Audio Worklet integration for real-time processing
  createVSTWorklet(pluginId: string): AudioWorkletNode | null {
    if (!this.audioContext.audioWorklet) {
      console.warn("AudioWorklet not supported");
      return null;
    }

    try {
      const workletNode = new AudioWorkletNode(
        this.audioContext,
        "vst-processor",
        {
          processorOptions: { pluginId },
        }
      );

      // Connect to VST manager
      (workletNode as any).vstManager = this;

      return workletNode;
    } catch (error) {
      console.error("Failed to create VST worklet:", error);
      return null;
    }
  }

  // Auto-mastering functionality
  async autoMaster(
    audioBuffer: ArrayBuffer,
    options?: {
      targetLUFS?: number;
      maxTruePeak?: number;
      inputGain?: number;
      outputGain?: number;
    }
  ): Promise<ArrayBuffer> {
    const masterMePlugin = this.plugins.get("master_me");

    if (!masterMePlugin) {
      throw new Error(
        "Master Me plugin not found. Please ensure the plugin is installed in the correct directory."
      );
    }

    // Load plugin if not already loaded
    if (!masterMePlugin.isLoaded) {
      const loaded = await this.loadPlugin("master_me");
      if (!loaded) {
        throw new Error("Failed to load Master Me plugin");
      }
    }

    try {
      // Configure plugin parameters
      if (options?.targetLUFS !== undefined) {
        this.setParameter("master_me", "target_lufs", options.targetLUFS);
      }
      if (options?.maxTruePeak !== undefined) {
        this.setParameter("master_me", "max_true_peak", options.maxTruePeak);
      }
      if (options?.inputGain !== undefined) {
        this.setParameter("master_me", "input_gain", options.inputGain);
      }
      if (options?.outputGain !== undefined) {
        this.setParameter("master_me", "output_gain", options.outputGain);
      }

      // Process audio through master_me
      const processedBuffer = await this.processAudioBuffer(
        audioBuffer,
        "master_me"
      );

      return processedBuffer;
    } catch (error) {
      console.error("Auto-mastering failed:", error);
      throw new Error(
        `Auto-mastering failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async processAudioBuffer(
    audioBuffer: ArrayBuffer,
    pluginId: string
  ): Promise<ArrayBuffer> {
    // Convert ArrayBuffer to AudioBuffer
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const sourceAudioBuffer = await audioContext.decodeAudioData(
      audioBuffer.slice(0)
    );

    // Create output buffer
    const outputAudioBuffer = audioContext.createBuffer(
      sourceAudioBuffer.numberOfChannels,
      sourceAudioBuffer.length,
      sourceAudioBuffer.sampleRate
    );

    // Process through VST plugin
    const blockSize = 512;
    const numBlocks = Math.ceil(sourceAudioBuffer.length / blockSize);

    for (let block = 0; block < numBlocks; block++) {
      const startSample = block * blockSize;
      const endSample = Math.min(
        startSample + blockSize,
        sourceAudioBuffer.length
      );
      const currentBlockSize = endSample - startSample;

      // Prepare input/output buffers
      const inputChannels: Float32Array[] = [];
      const outputChannels: Float32Array[] = [];

      for (
        let channel = 0;
        channel < sourceAudioBuffer.numberOfChannels;
        channel++
      ) {
        const inputData = sourceAudioBuffer.getChannelData(channel);
        const outputData = outputAudioBuffer.getChannelData(channel);

        inputChannels.push(inputData.slice(startSample, endSample));
        outputChannels.push(outputData.slice(startSample, endSample));
      }

      // Process through VST
      const vstBuffer: VSTAudioBuffer = {
        inputs: inputChannels,
        outputs: outputChannels,
        sampleRate: sourceAudioBuffer.sampleRate,
        blockSize: currentBlockSize,
      };

      this.processAudio(pluginId, vstBuffer);
    }

    // Convert back to ArrayBuffer
    const numberOfChannels = outputAudioBuffer.numberOfChannels;
    const length = outputAudioBuffer.length * numberOfChannels * 2; // 16-bit
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    for (let i = 0; i < outputAudioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, outputAudioBuffer.getChannelData(channel)[i])
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  dispose(): void {
    // Unload all plugins
    for (const pluginId of this.loadedInstances.keys()) {
      this.unloadPlugin(pluginId);
    }

    this.plugins.clear();
    this.loadedInstances.clear();
  }
}
