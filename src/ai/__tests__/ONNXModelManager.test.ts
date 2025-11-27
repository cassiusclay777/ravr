import { ONNXModelManager, ModelConfig } from '../ONNXModelManager';

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

describe('ONNXModelManager hash validation', () => {
  let manager: ONNXModelManager;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    manager = new ONNXModelManager();
    fetchSpy = jest.spyOn(global, 'fetch') as jest.SpyInstance;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    manager.unloadAllModels();
  });

  it('loads model if hash matches', async () => {
    // "abc" SHA-256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    const ab = str2ab('abc');
    fetchSpy.mockResolvedValue({ 
      ok: true, 
      arrayBuffer: () => Promise.resolve(ab) 
    });
    
    const config: ModelConfig = {
      name: 'test',
      url: 'fake',
      inputShape: [1],
      outputShape: [1],
      inputType: 'float32',
      outputType: 'float32',
      expectedHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    };
    
    manager.registerModel(config);
    const session = await manager.loadModel('test');
    expect(session).toBeDefined();
    expect(manager.isModelLoaded('test')).toBe(true);
  });

  it('throws if hash does not match', async () => {
    const ab = str2ab('abc');
    fetchSpy.mockResolvedValue({ 
      ok: true, 
      arrayBuffer: () => Promise.resolve(ab) 
    });
    
    const config: ModelConfig = {
      name: 'test-fail',
      url: 'fake',
      inputShape: [1],
      outputShape: [1],
      inputType: 'float32',
      outputType: 'float32',
      expectedHash: 'deadbeef',
    };
    
    manager.registerModel(config);
    await expect(manager.loadModel('test-fail')).rejects.toThrow(/Hash mismatch/);
  });

  it('loads model without hash validation if no hash provided', async () => {
    const ab = str2ab('test-data');
    fetchSpy.mockResolvedValue({ 
      ok: true, 
      arrayBuffer: () => Promise.resolve(ab) 
    });
    
    const config: ModelConfig = {
      name: 'test-no-hash',
      url: 'fake',
      inputShape: [1],
      outputShape: [1],
      inputType: 'float32',
      outputType: 'float32',
      // No expectedHash provided
    };
    
    manager.registerModel(config);
    const session = await manager.loadModel('test-no-hash');
    expect(session).toBeDefined();
  });

  it('throws error if fetch fails', async () => {
    fetchSpy.mockResolvedValue({ 
      ok: false, 
      statusText: 'Not Found' 
    });
    
    const config: ModelConfig = {
      name: 'test-404',
      url: 'fake',
      inputShape: [1],
      outputShape: [1],
      inputType: 'float32',
      outputType: 'float32',
    };
    
    manager.registerModel(config);
    await expect(manager.loadModel('test-404')).rejects.toThrow(/Failed to fetch model/);
  });

  it('can run inference on loaded model', async () => {
    const ab = str2ab('model-data');
    fetchSpy.mockResolvedValue({ 
      ok: true, 
      arrayBuffer: () => Promise.resolve(ab) 
    });
    
    const config: ModelConfig = {
      name: 'inference-test',
      url: 'fake',
      inputShape: [1, 1024],
      outputShape: [1, 1024],
      inputType: 'float32',
      outputType: 'float32',
    };
    
    manager.registerModel(config);
    await manager.loadModel('inference-test');
    
    const inputData = new Float32Array(1024);
    const result = await manager.runInference('inference-test', inputData);
    
    expect(result).toBeInstanceOf(Float32Array);
  });
});
