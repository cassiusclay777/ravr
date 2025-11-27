interface GPUShaderModule {
  id: string;
  name: string;
  type: 'compute' | 'fragment' | 'vertex';
  source: string;
  entryPoint: string;
  workgroupSize?: [number, number, number];
}

interface GPUAudioBuffer {
  id: string;
  size: number;
  format: 'float32' | 'int16' | 'int32';
  channels: number;
  sampleRate: number;
  gpuBuffer: GPUBuffer;
  hostBuffer?: Float32Array;
}

interface GPUProcessingPipeline {
  id: string;
  name: string;
  shaders: GPUShaderModule[];
  bindGroups: GPUBindGroup[];
  pipeline: GPUComputePipeline;
  workgroupCount: [number, number, number];
}

export class WebGPUAccelerator {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private commandEncoder: GPUCommandEncoder | null = null;
  
  // Audio processing pipelines
  private pipelines: Map<string, GPUProcessingPipeline> = new Map();
  private audioBuffers: Map<string, GPUAudioBuffer> = new Map();
  
  // Shader library
  private shaderLibrary: Map<string, string> = new Map();
  
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to CPU processing');
        return false;
      }

      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('WebGPU adapter not available');
        return false;
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: ['timestamp-query'],
        requiredLimits: {
          maxStorageBufferBindingSize: 1024 * 1024 * 1024, // 1GB
          maxComputeWorkgroupSizeX: 1024,
          maxComputeWorkgroupSizeY: 1024,
          maxComputeWorkgroupSizeZ: 64
        }
      });

      // Load shader library
      await this.loadShaderLibrary();
      
      // Create default processing pipelines
      await this.createDefaultPipelines();
      
      this.isInitialized = true;
      console.log('🚀 WebGPU Accelerator initialized successfully');
      console.log(`GPU: ${this.adapter.info?.description || 'Unknown'}`);
      
      return true;
      
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  private async loadShaderLibrary(): Promise<void> {
    // FFT Compute Shader
    this.shaderLibrary.set('fft_compute', `
      @group(0) @binding(0) var<storage, read_write> audio_data: array<f32>;
      @group(0) @binding(1) var<storage, read_write> fft_result: array<vec2<f32>>;
      @group(0) @binding(2) var<uniform> params: FFTParams;
      
      struct FFTParams {
        size: u32,
        inverse: u32,
        window_type: u32,
        overlap: f32,
      };
      
      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= params.size) { return; }
        
        // Radix-2 Cooley-Tukey FFT
        let n = params.size;
        var j: u32 = 0;
        
        // Bit reversal
        for (var i: u32 = 0; i < n - 1; i++) {
          if (i < j) {
            let temp_real = audio_data[i * 2];
            let temp_imag = audio_data[i * 2 + 1];
            audio_data[i * 2] = audio_data[j * 2];
            audio_data[i * 2 + 1] = audio_data[j * 2 + 1];
            audio_data[j * 2] = temp_real;
            audio_data[j * 2 + 1] = temp_imag;
          }
          
          var k: u32 = n >> 1;
          while (j >= k && k > 0) {
            j -= k;
            k >>= 1;
          }
          j += k;
        }
        
        // FFT computation
        var length: u32 = 2;
        while (length <= n) {
          let angle = 2.0 * 3.14159265359 / f32(length);
          let wlen_real = cos(angle);
          let wlen_imag = select(sin(angle), -sin(angle), params.inverse > 0);
          
          var i: u32 = 0;
          while (i < n) {
            var w_real: f32 = 1.0;
            var w_imag: f32 = 0.0;
            
            for (var j: u32 = 0; j < length >> 1; j++) {
              let u_idx = i + j;
              let v_idx = i + j + (length >> 1);
              
              let u_real = audio_data[u_idx * 2];
              let u_imag = audio_data[u_idx * 2 + 1];
              let v_real = audio_data[v_idx * 2] * w_real - audio_data[v_idx * 2 + 1] * w_imag;
              let v_imag = audio_data[v_idx * 2] * w_imag + audio_data[v_idx * 2 + 1] * w_real;
              
              audio_data[u_idx * 2] = u_real + v_real;
              audio_data[u_idx * 2 + 1] = u_imag + v_imag;
              audio_data[v_idx * 2] = u_real - v_real;
              audio_data[v_idx * 2 + 1] = u_imag - v_imag;
              
              let temp_real = w_real * wlen_real - w_imag * wlen_imag;
              w_imag = w_real * wlen_imag + w_imag * wlen_real;
              w_real = temp_real;
            }
            
            i += length;
          }
          
          length <<= 1;
        }
        
        // Store result
        if (index < n) {
          fft_result[index] = vec2<f32>(audio_data[index * 2], audio_data[index * 2 + 1]);
        }
      }
    `);

    // Convolution Shader
    this.shaderLibrary.set('convolution_compute', `
      @group(0) @binding(0) var<storage, read> input_audio: array<f32>;
      @group(0) @binding(1) var<storage, read> impulse_response: array<f32>;
      @group(0) @binding(2) var<storage, read_write> output_audio: array<f32>;
      @group(0) @binding(3) var<uniform> params: ConvParams;
      
      struct ConvParams {
        input_size: u32,
        ir_size: u32,
        output_size: u32,
        channel_count: u32,
      };
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= params.output_size) { return; }
        
        var sum: f32 = 0.0;
        let start_idx = max(0i, i32(index) - i32(params.ir_size) + 1);
        let end_idx = min(i32(index) + 1, i32(params.input_size));
        
        for (var i: i32 = start_idx; i < end_idx; i++) {
          let ir_idx = i32(index) - i;
          if (ir_idx >= 0 && ir_idx < i32(params.ir_size)) {
            sum += input_audio[i] * impulse_response[ir_idx];
          }
        }
        
        output_audio[index] = sum;
      }
    `);

    // AI Model Inference Shader
    this.shaderLibrary.set('ai_inference_compute', `
      @group(0) @binding(0) var<storage, read> input_data: array<f32>;
      @group(0) @binding(1) var<storage, read> weights: array<f32>;
      @group(0) @binding(2) var<storage, read> biases: array<f32>;
      @group(0) @binding(3) var<storage, read_write> output_data: array<f32>;
      @group(0) @binding(4) var<uniform> params: InferenceParams;
      
      struct InferenceParams {
        input_size: u32,
        output_size: u32,
        hidden_size: u32,
        activation_type: u32,
      };
      
      fn relu(x: f32) -> f32 {
        return max(0.0, x);
      }
      
      fn tanh_activation(x: f32) -> f32 {
        return tanh(x);
      }
      
      fn sigmoid(x: f32) -> f32 {
        return 1.0 / (1.0 + exp(-x));
      }
      
      @compute @workgroup_size(128)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let output_idx = global_id.x;
        if (output_idx >= params.output_size) { return; }
        
        var sum: f32 = 0.0;
        
        // Matrix multiplication
        for (var i: u32 = 0; i < params.input_size; i++) {
          let weight_idx = output_idx * params.input_size + i;
          sum += input_data[i] * weights[weight_idx];
        }
        
        // Add bias
        sum += biases[output_idx];
        
        // Apply activation function
        var result: f32;
        switch (params.activation_type) {
          case 0u: { result = sum; }           // Linear
          case 1u: { result = relu(sum); }     // ReLU
          case 2u: { result = tanh_activation(sum); }  // Tanh
          case 3u: { result = sigmoid(sum); }  // Sigmoid
          default: { result = sum; }
        }
        
        output_data[output_idx] = result;
      }
    `);

    // Real-time Audio Processing Shader
    this.shaderLibrary.set('realtime_effects', `
      @group(0) @binding(0) var<storage, read_write> audio_buffer: array<f32>;
      @group(0) @binding(1) var<uniform> effects_params: EffectParams;
      
      struct EffectParams {
        gain: f32,
        eq_low: f32,
        eq_mid: f32,
        eq_high: f32,
        compressor_threshold: f32,
        compressor_ratio: f32,
        reverb_mix: f32,
        distortion_drive: f32,
      };
      
      @compute @workgroup_size(1024)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&audio_buffer)) { return; }
        
        var sample = audio_buffer[index];
        
        // Apply gain
        sample *= effects_params.gain;
        
        // Simple EQ (placeholder - would be more sophisticated)
        sample *= (1.0 + effects_params.eq_mid * 0.1);
        
        // Compression (simplified)
        if (abs(sample) > effects_params.compressor_threshold) {
          let excess = abs(sample) - effects_params.compressor_threshold;
          let compressed = effects_params.compressor_threshold + excess / effects_params.compressor_ratio;
          sample = sign(sample) * compressed;
        }
        
        // Soft clipping
        sample = tanh(sample * 0.8) * 1.25;
        
        audio_buffer[index] = sample;
      }
    `);
  }

  private async createDefaultPipelines(): Promise<void> {
    if (!this.device) return;

    // Create FFT Pipeline
    await this.createFFTPipeline();
    
    // Create Convolution Pipeline
    await this.createConvolutionPipeline();
    
    // Create AI Inference Pipeline
    await this.createAIInferencePipeline();
    
    // Create Real-time Effects Pipeline
    await this.createRealtimeEffectsPipeline();
  }

  private async createFFTPipeline(): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: this.shaderLibrary.get('fft_compute')!,
      label: 'FFT Compute Shader'
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    this.pipelines.set('fft', {
      id: 'fft',
      name: 'Fast Fourier Transform',
      shaders: [],
      bindGroups: [],
      pipeline,
      workgroupCount: [1, 1, 1]
    });
  }

  private async createConvolutionPipeline(): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: this.shaderLibrary.get('convolution_compute')!,
      label: 'Convolution Compute Shader'
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    this.pipelines.set('convolution', {
      id: 'convolution',
      name: 'GPU Convolution',
      shaders: [],
      bindGroups: [],
      pipeline,
      workgroupCount: [1, 1, 1]
    });
  }

  private async createAIInferencePipeline(): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: this.shaderLibrary.get('ai_inference_compute')!,
      label: 'AI Inference Compute Shader'
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    this.pipelines.set('ai_inference', {
      id: 'ai_inference',
      name: 'AI Model Inference',
      shaders: [],
      bindGroups: [],
      pipeline,
      workgroupCount: [1, 1, 1]
    });
  }

  private async createRealtimeEffectsPipeline(): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: this.shaderLibrary.get('realtime_effects')!,
      label: 'Real-time Effects Shader'
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    this.pipelines.set('realtime_effects', {
      id: 'realtime_effects',
      name: 'Real-time Effects',
      shaders: [],
      bindGroups: [],
      pipeline,
      workgroupCount: [1, 1, 1]
    });
  }

  // Public API
  async processAudioOnGPU(
    audioData: Float32Array,
    pipelineId: string,
    params?: any
  ): Promise<Float32Array> {
    if (!this.device || !this.isInitialized) {
      throw new Error('WebGPU not initialized');
    }

    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    // Create GPU buffers
    const inputBuffer = await this.createGPUBuffer(audioData, 'storage');
    const outputBuffer = this.device.createBuffer({
      size: audioData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: `Output Buffer - ${pipelineId}`
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } }
      ]
    });

    // Dispatch compute
    const commandEncoder = this.device.createCommandEncoder({
      label: `${pipelineId} Command Encoder`
    });
    
    const passEncoder = commandEncoder.beginComputePass({
      label: `${pipelineId} Compute Pass`
    });
    
    passEncoder.setPipeline(pipeline.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    const workgroupCount = Math.ceil(audioData.length / 256);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    // Copy result back to CPU
    const readBuffer = this.device.createBuffer({
      size: audioData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'Read Buffer'
    });

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, audioData.byteLength);
    
    this.device.queue.submit([commandEncoder.finish()]);

    // Map and read result
    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return result;
  }

  async runFFTOnGPU(audioData: Float32Array): Promise<{ real: Float32Array; imag: Float32Array }> {
    const result = await this.processAudioOnGPU(audioData, 'fft');
    
    // Split complex result into real and imaginary parts
    const real = new Float32Array(result.length / 2);
    const imag = new Float32Array(result.length / 2);
    
    for (let i = 0; i < real.length; i++) {
      real[i] = result[i * 2];
      imag[i] = result[i * 2 + 1];
    }
    
    return { real, imag };
  }

  async runConvolutionOnGPU(
    audioData: Float32Array, 
    impulseResponse: Float32Array
  ): Promise<Float32Array> {
    // Implementation would create proper bind groups for convolution
    return this.processAudioOnGPU(audioData, 'convolution');
  }

  async runAIInferenceOnGPU(
    inputData: Float32Array,
    weights: Float32Array,
    biases: Float32Array
  ): Promise<Float32Array> {
    // Implementation would handle AI model inference
    return this.processAudioOnGPU(inputData, 'ai_inference');
  }

  private async createGPUBuffer(data: Float32Array, usage: string): Promise<GPUBuffer> {
    if (!this.device) throw new Error('Device not available');

    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: `${usage} Buffer`,
      mappedAtCreation: true
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  }

  // Performance monitoring
  async benchmarkGPUPerformance(): Promise<any> {
    if (!this.isInitialized) return null;

    const testSizes = [1024, 4096, 16384, 65536];
    const results: any = {};

    for (const size of testSizes) {
      const testData = new Float32Array(size).map(() => Math.random());
      
      const startTime = performance.now();
      await this.processAudioOnGPU(testData, 'realtime_effects');
      const endTime = performance.now();
      
      results[size] = {
        processingTime: endTime - startTime,
        samplesPerSecond: size / ((endTime - startTime) / 1000)
      };
    }

    return results;
  }

  getGPUInfo(): any {
    if (!this.adapter) return null;

    return {
      vendor: this.adapter.info?.vendor || 'Unknown',
      architecture: this.adapter.info?.architecture || 'Unknown',
      device: this.adapter.info?.device || 'Unknown',
      description: this.adapter.info?.description || 'Unknown',
      isInitialized: this.isInitialized,
      pipelineCount: this.pipelines.size
    };
  }

  dispose(): void {
    // Clean up GPU resources
    for (const [id, buffer] of this.audioBuffers) {
      buffer.gpuBuffer.destroy();
    }
    
    this.audioBuffers.clear();
    this.pipelines.clear();
    this.device = null;
    this.adapter = null;
    this.isInitialized = false;
  }
}

export default WebGPUAccelerator;
