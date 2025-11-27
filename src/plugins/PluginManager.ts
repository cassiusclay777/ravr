interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'effect' | 'instrument' | 'analyzer' | 'utility';
  tags: string[];
  homepage?: string;
  license: string;
  apiVersion: string;
  minRAVRVersion: string;
}

interface PluginAPI {
  // Audio processing
  processAudio(input: Float32Array[], sampleRate: number): Float32Array[];
  
  // Parameters
  getParameters(): PluginParameter[];
  setParameter(id: string, value: number): void;
  getParameter(id: string): number;
  
  // Presets
  getPresets(): PluginPreset[];
  loadPreset(id: string): void;
  savePreset(name: string): string;
  
  // UI
  createUI?(): HTMLElement;
  destroyUI?(): void;
  
  // Lifecycle
  initialize(context: PluginContext): void;
  activate(): void;
  deactivate(): void;
  dispose(): void;
}

interface PluginParameter {
  id: string;
  name: string;
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  isAutomatable: boolean;
  group?: string;
}

interface PluginPreset {
  id: string;
  name: string;
  parameters: Record<string, number>;
  isFactory: boolean;
}

interface PluginContext {
  audioContext: AudioContext;
  sampleRate: number;
  blockSize: number;
  hostVersion: string;
  projectPath?: string;
  tempPath: string;
}

interface LoadedPlugin {
  metadata: PluginMetadata;
  instance: PluginAPI;
  isActive: boolean;
  audioNode?: AudioWorkletNode;
  lastError?: string;
}

interface PluginStore {
  id: string;
  name: string;
  description: string;
  url: string;
  plugins: PluginStoreEntry[];
}

interface PluginStoreEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  downloadUrl: string;
  size: number;
  rating: number;
  downloads: number;
  screenshots: string[];
  price: number;
  category: string;
  tags: string[];
}

type PluginEventCallback = (event: string, data: any) => void;

export class PluginManager {
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private pluginStores: Map<string, PluginStore> = new Map();
  private audioContext: AudioContext;
  private isInitialized = false;
  
  // Plugin storage and caching
  private pluginCache: Map<string, ArrayBuffer> = new Map();
  private pluginDatabase: IDBDatabase | null = null;
  
  // Event system
  private eventCallbacks: Map<string, PluginEventCallback[]> = new Map();
  
  // Security and sandboxing
  private sandboxWorker: Worker | null = null;
  private allowedAPIs = new Set(['AudioContext', 'AudioWorkletNode', 'GainNode']);

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.initializePluginSystem();
  }

  private async initializePluginSystem(): Promise<void> {
    try {
      // Initialize plugin database
      await this.initializeDatabase();
      
      // Setup sandbox worker for plugin execution
      await this.setupSandbox();
      
      // Register default plugin stores
      await this.registerDefaultStores();
      
      // Load installed plugins
      await this.loadInstalledPlugins();
      
      // Setup plugin worklet processor
      await this.setupPluginWorklet();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('Plugin Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Plugin Manager:', error);
      this.emit('init-error', error);
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RAVRPlugins', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Plugin metadata store
        if (!db.objectStoreNames.contains('plugins')) {
          const pluginStore = db.createObjectStore('plugins', { keyPath: 'id' });
          pluginStore.createIndex('category', 'category');
          pluginStore.createIndex('author', 'author');
        }
        
        // Plugin binaries store
        if (!db.objectStoreNames.contains('binaries')) {
          db.createObjectStore('binaries', { keyPath: 'id' });
        }
        
        // Plugin settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'pluginId' });
        }
      };
      
      request.onsuccess = () => {
        this.pluginDatabase = request.result;
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async setupSandbox(): Promise<void> {
    // Create worker for sandboxed plugin execution
    const workerCode = `
      class PluginSandbox {
        constructor() {
          this.plugins = new Map();
        }
        
        loadPlugin(id, code) {
          try {
            // Create isolated context for plugin
            const pluginContext = {
              id,
              console: {
                log: (...args) => postMessage({type: 'log', id, args}),
                error: (...args) => postMessage({type: 'error', id, args})
              },
              // Limited API access
              setTimeout: setTimeout.bind(globalThis),
              clearTimeout: clearTimeout.bind(globalThis)
            };
            
            // Execute plugin code in controlled environment
            const pluginFunc = new Function('context', code);
            const plugin = pluginFunc(pluginContext);
            
            this.plugins.set(id, plugin);
            postMessage({type: 'loaded', id});
          } catch (error) {
            postMessage({type: 'error', id, error: error.message});
          }
        }
        
        processAudio(id, audioData) {
          const plugin = this.plugins.get(id);
          if (!plugin || !plugin.processAudio) {
            return audioData;
          }
          
          try {
            return plugin.processAudio(audioData);
          } catch (error) {
            postMessage({type: 'error', id, error: error.message});
            return audioData;
          }
        }
      }
      
      const sandbox = new PluginSandbox();
      
      onmessage = (event) => {
        const {type, id, data} = event.data;
        
        switch (type) {
          case 'load':
            sandbox.loadPlugin(id, data);
            break;
          case 'process':
            const result = sandbox.processAudio(id, data);
            postMessage({type: 'processed', id, result});
            break;
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.sandboxWorker = new Worker(URL.createObjectURL(blob));
    
    this.sandboxWorker.onmessage = (event) => {
      this.handleSandboxMessage(event.data);
    };
  }

  private handleSandboxMessage(message: any): void {
    const { type, id, data, error } = message;
    
    switch (type) {
      case 'loaded':
        this.emit('plugin-loaded', { id });
        break;
      case 'processed':
        this.emit('audio-processed', { id, result: data });
        break;
      case 'error':
        console.error(`Plugin ${id} error:`, error);
        this.emit('plugin-error', { id, error });
        break;
      case 'log':
        console.log(`Plugin ${id}:`, ...data);
        break;
    }
  }

  private async registerDefaultStores(): Promise<void> {
    // Official RAVR Plugin Store
    this.pluginStores.set('official', {
      id: 'official',
      name: 'RAVR Official Store',
      description: 'Official plugins vetted by RAVR team',
      url: 'https://plugins.ravr.audio/api',
      plugins: []
    });
    
    // Community Plugin Store
    this.pluginStores.set('community', {
      id: 'community', 
      name: 'RAVR Community Store',
      description: 'Community-developed plugins',
      url: 'https://community.ravr.audio/api',
      plugins: []
    });
    
    // Development/Local Store
    this.pluginStores.set('local', {
      id: 'local',
      name: 'Local Development',
      description: 'Local development plugins',
      url: 'file://localhost',
      plugins: []
    });
  }

  private async loadInstalledPlugins(): Promise<void> {
    if (!this.pluginDatabase) return;
    
    const transaction = this.pluginDatabase.transaction(['plugins'], 'readonly');
    const store = transaction.objectStore('plugins');
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        const plugins = request.result as PluginMetadata[];
        
        for (const metadata of plugins) {
          try {
            await this.loadPlugin(metadata.id);
          } catch (error) {
            console.warn(`Failed to load plugin ${metadata.id}:`, error);
          }
        }
        
        console.log(`Loaded ${this.loadedPlugins.size} plugins`);
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  private async setupPluginWorklet(): Promise<void> {
    try {
      // Register plugin audio worklet processor
      await this.audioContext.audioWorklet.addModule('/worklets/plugin-processor.js');
    } catch (error) {
      console.warn('Plugin worklet not available:', error);
    }
  }

  async installPlugin(pluginData: ArrayBuffer | string, metadata?: PluginMetadata): Promise<string> {
    try {
      let pluginCode: string;
      let pluginMeta: PluginMetadata;
      
      if (typeof pluginData === 'string') {
        // Plugin provided as code string
        pluginCode = pluginData;
        if (!metadata) {
          throw new Error('Metadata required when installing from code');
        }
        pluginMeta = metadata;
      } else {
        // Plugin provided as bundle (ZIP or single JS file)
        const result = await this.extractPlugin(pluginData);
        pluginCode = result.code;
        pluginMeta = result.metadata;
      }
      
      // Validate plugin
      await this.validatePlugin(pluginCode, pluginMeta);
      
      // Store plugin in database
      await this.storePlugin(pluginMeta.id, pluginCode, pluginMeta);
      
      // Load plugin
      await this.loadPlugin(pluginMeta.id);
      
      this.emit('plugin-installed', { id: pluginMeta.id, name: pluginMeta.name });
      return pluginMeta.id;
      
    } catch (error) {
      console.error('Plugin installation failed:', error);
      throw error;
    }
  }

  private async extractPlugin(data: ArrayBuffer): Promise<{ code: string; metadata: PluginMetadata }> {
    // Simple extraction - in production, this would handle ZIP files
    const decoder = new TextDecoder();
    const text = decoder.decode(data);
    
    // Look for plugin metadata in comments or separate JSON
    const metadataMatch = text.match(/\/\*\s*RAVR_PLUGIN_METADATA\s*\n([\s\S]*?)\n\s*\*\//);
    if (!metadataMatch) {
      throw new Error('Plugin metadata not found');
    }
    
    const metadata = JSON.parse(metadataMatch[1]) as PluginMetadata;
    const code = text.replace(metadataMatch[0], '').trim();
    
    return { code, metadata };
  }

  private async validatePlugin(code: string, metadata: PluginMetadata): Promise<void> {
    // Basic validation
    if (!metadata.id || !metadata.name || !metadata.version) {
      throw new Error('Invalid plugin metadata');
    }
    
    if (!metadata.apiVersion || metadata.apiVersion !== '2.0') {
      throw new Error(`Unsupported API version: ${metadata.apiVersion}`);
    }
    
    // Code safety checks
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\./,
      /window\./,
      /global\./,
      /localStorage\./,
      /sessionStorage\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /import\s*\(/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Plugin contains potentially unsafe code: ${pattern}`);
      }
    }
    
    // Check if plugin already installed
    if (this.loadedPlugins.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} is already installed`);
    }
  }

  private async storePlugin(id: string, code: string, metadata: PluginMetadata): Promise<void> {
    if (!this.pluginDatabase) return;
    
    const transaction = this.pluginDatabase.transaction(['plugins', 'binaries'], 'readwrite');
    
    // Store metadata
    const metaStore = transaction.objectStore('plugins');
    await new Promise<void>((resolve, reject) => {
      const request = metaStore.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Store binary code
    const binStore = transaction.objectStore('binaries');
    await new Promise<void>((resolve, reject) => {
      const request = binStore.put({ id, code });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadPlugin(pluginId: string): Promise<void> {
    if (this.loadedPlugins.has(pluginId)) {
      console.log(`Plugin ${pluginId} already loaded`);
      return;
    }
    
    if (!this.pluginDatabase) {
      throw new Error('Plugin database not available');
    }
    
    // Get plugin metadata and code
    const transaction = this.pluginDatabase.transaction(['plugins', 'binaries'], 'readonly');
    
    const metadata = await new Promise<PluginMetadata>((resolve, reject) => {
      const request = transaction.objectStore('plugins').get(pluginId);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error(`Plugin ${pluginId} not found`));
        }
      };
      request.onerror = () => reject(request.error);
    });
    
    const binary = await new Promise<{ code: string }>((resolve, reject) => {
      const request = transaction.objectStore('binaries').get(pluginId);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error(`Plugin binary ${pluginId} not found`));
        }
      };
      request.onerror = () => reject(request.error);
    });
    
    // Load plugin in sandbox
    if (this.sandboxWorker) {
      this.sandboxWorker.postMessage({
        type: 'load',
        id: pluginId,
        data: binary.code
      });
    }
    
    // Create plugin instance
    const pluginInstance = await this.createPluginInstance(binary.code, metadata);
    
    // Create audio worklet node if needed
    let audioNode: AudioWorkletNode | undefined;
    if (metadata.category === 'effect' || metadata.category === 'instrument') {
      try {
        audioNode = new AudioWorkletNode(this.audioContext, 'plugin-processor', {
          processorOptions: { pluginId }
        });
      } catch (error) {
        console.warn(`Failed to create audio worklet for ${pluginId}:`, error);
      }
    }
    
    const loadedPlugin: LoadedPlugin = {
      metadata,
      instance: pluginInstance,
      isActive: false,
      audioNode
    };
    
    this.loadedPlugins.set(pluginId, loadedPlugin);
    
    // Initialize plugin
    const context: PluginContext = {
      audioContext: this.audioContext,
      sampleRate: this.audioContext.sampleRate,
      blockSize: 512,
      hostVersion: '2.0.0',
      tempPath: '/tmp'
    };
    
    pluginInstance.initialize(context);
    
    console.log(`✅ Plugin loaded: ${metadata.name} v${metadata.version}`);
    this.emit('plugin-loaded', { id: pluginId, metadata });
  }

  private async createPluginInstance(code: string, metadata: PluginMetadata): Promise<PluginAPI> {
    // Create safe execution context
    const context = {
      console: {
        log: (...args: any[]) => console.log(`[${metadata.name}]`, ...args),
        error: (...args: any[]) => console.error(`[${metadata.name}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${metadata.name}]`, ...args)
      },
      Math,
      Date,
      Array,
      Object,
      JSON,
      // Plugin-specific context will be added by the plugin
    };
    
    // Execute plugin code with limited context
    const pluginFunction = new Function('context', `
      const {console, Math, Date, Array, Object, JSON} = context;
      ${code}
      return typeof plugin !== 'undefined' ? plugin : null;
    `);
    
    const plugin = pluginFunction(context);
    
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin did not export a valid plugin object');
    }
    
    return plugin as PluginAPI;
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    try {
      // Deactivate if active
      if (plugin.isActive) {
        plugin.instance.deactivate();
      }
      
      // Dispose plugin
      plugin.instance.dispose();
      
      // Disconnect audio node
      if (plugin.audioNode) {
        plugin.audioNode.disconnect();
      }
      
      this.loadedPlugins.delete(pluginId);
      
      console.log(`Plugin unloaded: ${plugin.metadata.name}`);
      this.emit('plugin-unloaded', { id: pluginId });
      
    } catch (error) {
      console.error(`Error unloading plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async removePlugin(pluginId: string): Promise<void> {
    // Unload if loaded
    if (this.loadedPlugins.has(pluginId)) {
      await this.unloadPlugin(pluginId);
    }
    
    if (!this.pluginDatabase) return;
    
    // Remove from database
    const transaction = this.pluginDatabase.transaction(['plugins', 'binaries', 'settings'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('plugins').delete(pluginId);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve(); // Continue even if not found
      }),
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('binaries').delete(pluginId);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('settings').delete(pluginId);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      })
    ]);
    
    this.emit('plugin-removed', { id: pluginId });
  }

  // Plugin control methods
  activatePlugin(pluginId: string): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    if (!plugin.isActive) {
      plugin.instance.activate();
      plugin.isActive = true;
      this.emit('plugin-activated', { id: pluginId });
    }
  }

  deactivatePlugin(pluginId: string): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    if (plugin.isActive) {
      plugin.instance.deactivate();
      plugin.isActive = false;
      this.emit('plugin-deactivated', { id: pluginId });
    }
  }

  setPluginParameter(pluginId: string, parameterId: string, value: number): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    plugin.instance.setParameter(parameterId, value);
    this.emit('parameter-changed', { pluginId, parameterId, value });
  }

  getPluginParameter(pluginId: string, parameterId: string): number {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    return plugin.instance.getParameter(parameterId);
  }

  // Plugin discovery and store management
  async browsePluginStore(storeId: string = 'official'): Promise<PluginStoreEntry[]> {
    const store = this.pluginStores.get(storeId);
    if (!store) {
      throw new Error(`Plugin store ${storeId} not found`);
    }
    
    try {
      // Mock store data for now
      return [
        {
          id: 'reverb-pro',
          name: 'Reverb Pro',
          version: '1.2.0',
          author: 'RAVR Team',
          description: 'Professional reverb with advanced algorithms',
          downloadUrl: 'https://plugins.ravr.audio/reverb-pro-1.2.0.zip',
          size: 2048576,
          rating: 4.8,
          downloads: 15420,
          screenshots: [],
          price: 0,
          category: 'effect',
          tags: ['reverb', 'spatial', 'premium']
        },
        {
          id: 'vintage-eq',
          name: 'Vintage EQ',
          version: '1.0.3', 
          author: 'Community',
          description: 'Vintage-style equalizer with tube warmth',
          downloadUrl: 'https://community.ravr.audio/vintage-eq-1.0.3.zip',
          size: 1234567,
          rating: 4.2,
          downloads: 8904,
          screenshots: [],
          price: 0,
          category: 'effect',
          tags: ['eq', 'vintage', 'tube', 'free']
        }
      ];
    } catch (error) {
      console.error(`Failed to browse store ${storeId}:`, error);
      return [];
    }
  }

  async downloadAndInstallPlugin(storeEntry: PluginStoreEntry): Promise<string> {
    try {
      this.emit('download-started', { id: storeEntry.id });
      
      // Download plugin
      const response = await fetch(storeEntry.downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const pluginData = await response.arrayBuffer();
      
      this.emit('download-completed', { id: storeEntry.id });
      
      // Install plugin
      const pluginId = await this.installPlugin(pluginData);
      
      return pluginId;
    } catch (error) {
      this.emit('download-failed', { id: storeEntry.id, error: error.message });
      throw error;
    }
  }

  // Getters and utilities
  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  getPluginsByCategory(category: string): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values())
      .filter(plugin => plugin.metadata.category === category);
  }

  searchPlugins(query: string): LoadedPlugin[] {
    const lowQuery = query.toLowerCase();
    return Array.from(this.loadedPlugins.values())
      .filter(plugin => 
        plugin.metadata.name.toLowerCase().includes(lowQuery) ||
        plugin.metadata.description.toLowerCase().includes(lowQuery) ||
        plugin.metadata.tags.some(tag => tag.toLowerCase().includes(lowQuery))
      );
  }

  // Event system
  on(event: string, callback: PluginEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: string, callback: PluginEventCallback): void {
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
          console.error(`Error in plugin callback for ${event}:`, error);
        }
      });
    }
  }

  dispose(): void {
    // Unload all plugins
    for (const pluginId of this.loadedPlugins.keys()) {
      try {
        this.unloadPlugin(pluginId);
      } catch (error) {
        console.error(`Error disposing plugin ${pluginId}:`, error);
      }
    }
    
    // Close sandbox worker
    if (this.sandboxWorker) {
      this.sandboxWorker.terminate();
      this.sandboxWorker = null;
    }
    
    // Close database
    if (this.pluginDatabase) {
      this.pluginDatabase.close();
      this.pluginDatabase = null;
    }
    
    this.eventCallbacks.clear();
  }
}
