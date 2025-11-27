// Jest setup file for comprehensive testing
import 'jest-environment-jsdom';

// Mock WebAudio API
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  
  createGain() {
    return {
      gain: { 
        value: 1,
        setValueAtTime: jest.fn(),
        setTargetAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'peaking',
      frequency: { 
        value: 1000,
        setTargetAtTime: jest.fn(),
      },
      Q: { 
        value: 0.7,
        setTargetAtTime: jest.fn(),
      },
      gain: { 
        value: 0,
        setTargetAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createDynamicsCompressor() {
    return {
      threshold: { 
        value: -24,
        setTargetAtTime: jest.fn(),
      },
      ratio: { 
        value: 2,
        setTargetAtTime: jest.fn(),
      },
      attack: { 
        value: 0.003,
        setTargetAtTime: jest.fn(),
      },
      release: { 
        value: 0.25,
        setTargetAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createDelay() {
    return {
      delayTime: { 
        value: 0.5,
        setTargetAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createConvolver() {
    return {
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createWaveShaper() {
    return {
      curve: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createMediaElementSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    };
  }
  
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getByteFrequencyData: jest.fn(),
      getFloatFrequencyData: jest.fn(),
    };
  }
  
  createBuffer() {
    return {
      getChannelData: jest.fn(() => new Float32Array(1024)),
      length: 1024,
      sampleRate: 44100,
      numberOfChannels: 2,
    };
  }
  
  decodeAudioData() {
    return Promise.resolve(this.createBuffer());
  }
  
  resume() {
    return Promise.resolve();
  }
  
  suspend() {
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
  
  get destination() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
}

// @ts-ignore
global.AudioContext = MockAudioContext;
// @ts-ignore  
global.webkitAudioContext = MockAudioContext;

// Mock crypto.subtle for hash validation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockImplementation((algorithm: string, buffer: ArrayBuffer) => {
        // Simple mock - in real tests you'd want actual SHA-256
        if (algorithm === 'SHA-256') {
          const view = new Uint8Array(buffer);
          if (view.length === 3 && view[0] === 97 && view[1] === 98 && view[2] === 99) {
            // "abc" -> known SHA-256 hash
            const hashHex = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
            const hashArray = new Uint8Array(hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            return Promise.resolve(hashArray.buffer);
          }
        }
        return Promise.resolve(new ArrayBuffer(32)); // Mock hash
      }),
    },
  },
});

// Mock ONNX Runtime
jest.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: jest.fn().mockResolvedValue({
      run: jest.fn().mockImplementation((inputs) => {
        // Mock inference - return mock output tensor
        const inputTensor = Object.values(inputs)[0] as any;
        const outputData = new Float32Array(inputTensor.data.length);
        // Fill with some mock processed data
        for (let i = 0; i < outputData.length; i++) {
          outputData[i] = (inputTensor.data[i] || 0) * 0.5; // Mock processing
        }
        return Promise.resolve({
          output: {
            data: outputData,
            type: 'float32',
            dims: inputTensor.dims || [1, outputData.length]
          }
        });
      }),
      release: jest.fn(),
    }),
  },
  Tensor: jest.fn().mockImplementation((type, data, dims) => ({
    type,
    data,
    dims,
  })),
  env: {
    wasm: {
      wasmPaths: '',
      numThreads: 4,
      simd: true,
      proxy: true,
    },
  },
}));

// Mock standardized-audio-context
jest.mock('standardized-audio-context', () => ({
  StandardizedAudioContext: MockAudioContext,
}));

// Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
});

// Console warnings cleanup
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('standardized-audio-context')) {
    return;
  }
  originalConsoleWarn(...args);
};
