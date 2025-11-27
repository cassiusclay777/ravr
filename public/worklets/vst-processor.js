class VSTProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.pluginId = options.processorOptions?.pluginId;
    this.vstManager = null;
    this.isProcessing = false;
    
    // Set up communication with main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    // Internal audio buffers
    this.inputBuffers = [];
    this.outputBuffers = [];
  }

  handleMessage(data) {
    switch (data.type) {
      case 'setVSTManager':
        this.vstManager = data.vstManager;
        break;
      case 'setParameter':
        if (this.vstManager && this.pluginId) {
          this.vstManager.setParameter(this.pluginId, data.parameterId, data.value);
        }
        break;
      case 'bypass':
        if (this.vstManager && this.pluginId) {
          this.vstManager.bypassPlugin(this.pluginId, data.bypassed);
        }
        break;
      case 'enable':
        this.isProcessing = data.enabled;
        break;
    }
  }

  process(inputs, outputs, parameters) {
    const hasValidInput = inputs[0] && inputs[0].length > 0;
    const hasValidOutput = outputs[0] && outputs[0].length > 0;
    
    if (!hasValidInput || !hasValidOutput) {
      return true;
    }

    if (!this.isProcessing || !this.vstManager || !this.pluginId) {
      // Pass through audio if not processing
      this.passThrough(inputs[0], outputs[0]);
      return true;
    }

    try {
      // Prepare VST audio buffer format
      const vstBuffer = {
        inputs: inputs[0],
        outputs: outputs[0],
        sampleRate: sampleRate,
        blockSize: inputs[0][0]?.length || 128
      };

      // Process through VST
      const processed = this.vstManager.processAudio(this.pluginId, vstBuffer);
      
      // Return success status
      return processed !== false;

    } catch (error) {
      console.error('VST processing error:', error);
      // Fallback to pass-through
      this.passThrough(inputs[0], outputs[0]);
      return true;
    }
  }
  
  passThrough(inputChannels, outputChannels) {
    for (let channel = 0; channel < Math.min(inputChannels.length, outputChannels.length); channel++) {
      if (inputChannels[channel] && outputChannels[channel]) {
        outputChannels[channel].set(inputChannels[channel]);
      }
    }
  }
}

registerProcessor('vst-processor', VSTProcessor);
