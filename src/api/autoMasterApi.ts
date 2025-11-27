// Auto-mastering API service
import { VSTManager } from "../vst/VSTManager";

export interface AutoMasterOptions {
  targetLUFS?: number;
  maxTruePeak?: number;
  inputGain?: number;
  outputGain?: number;
}

export interface AutoMasterRequest {
  audioData: ArrayBuffer;
  options?: AutoMasterOptions;
}

export interface AutoMasterResponse {
  success: boolean;
  processedAudio?: ArrayBuffer;
  error?: string;
  processingTime?: number;
  originalLufs?: number;
  finalLufs?: number;
  originalTruePeak?: number;
  finalTruePeak?: number;
}

export interface ProcessingProgress {
  stage:
    | "initializing"
    | "loading_plugin"
    | "processing"
    | "analyzing"
    | "complete";
  progress: number; // 0-100
  message: string;
}

class AutoMasterService {
  private vstManager: VSTManager | null = null;
  private processingCallbacks: Map<
    string,
    (progress: ProcessingProgress) => void
  > = new Map();

  constructor() {
    this.initializeVSTManager();
  }

  private async initializeVSTManager(): Promise<void> {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.vstManager = new VSTManager(audioContext);

      // Scan for plugins including master_me
      await this.vstManager.scanForPlugins();
      console.log("AutoMaster service initialized");
    } catch (error) {
      console.error("Failed to initialize VST Manager:", error);
    }
  }

  async autoMaster(
    request: AutoMasterRequest,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<AutoMasterResponse> {
    const startTime = Date.now();
    const requestId = `request_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Store progress callback
      if (onProgress) {
        this.processingCallbacks.set(requestId, onProgress);
      }

      // Use Electron API if available for better VST integration
      if (typeof window !== "undefined" && (window as any).electronAPI) {
        this.notifyProgress(requestId, {
          stage: "initializing",
          progress: 10,
          message: "Initializing auto-mastering via Electron...",
        });

        const result = await (window as any).electronAPI.autoMaster({
          audioData: Array.from(new Uint8Array(request.audioData)),
          options: request.options,
        });

        // Convert result back to ArrayBuffer if successful
        if (result.success && result.processedAudio) {
          const processedArray = new Uint8Array(result.processedAudio);
          result.processedAudio = processedArray.buffer;
        }

        this.notifyProgress(requestId, {
          stage: "complete",
          progress: 100,
          message: "Auto-mastering complete!",
        });

        return {
          ...result,
          processingTime: Date.now() - startTime,
        };
      }

      // Fallback to local processing
      if (!this.vstManager) {
        await this.initializeVSTManager();
        if (!this.vstManager) {
          throw new Error("Failed to initialize VST Manager");
        }
      }

      this.notifyProgress(requestId, {
        stage: "initializing",
        progress: 10,
        message: "Initializing auto-mastering...",
      });

      // Check if master_me plugin is available
      const masterMePlugin = this.vstManager.getPlugin("master_me");
      if (!masterMePlugin) {
        throw new Error(
          "Master Me plugin not found. Please ensure the plugin is installed in C:\\ravr-fixed\\external_plugins\\master_me-1.3.1-win64\\master_me-1.3.1"
        );
      }

      this.notifyProgress(requestId, {
        stage: "loading_plugin",
        progress: 30,
        message: "Loading Master Me plugin...",
      });

      // Process audio through master_me
      this.notifyProgress(requestId, {
        stage: "processing",
        progress: 50,
        message: "Processing audio through Master Me...",
      });

      const processedAudio = await this.vstManager.autoMaster(
        request.audioData,
        request.options
      );

      this.notifyProgress(requestId, {
        stage: "analyzing",
        progress: 80,
        message: "Analyzing processed audio...",
      });

      // Analyze results (simplified - in real implementation you'd analyze LUFS and true peak)
      const analysis = await this.analyzeAudio(processedAudio);

      this.notifyProgress(requestId, {
        stage: "complete",
        progress: 100,
        message: "Auto-mastering complete!",
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        processedAudio,
        processingTime,
        originalLufs: -16, // Mock values - would be calculated from original audio
        finalLufs: analysis.lufs,
        originalTruePeak: -0.5, // Mock values
        finalTruePeak: analysis.truePeak,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      this.notifyProgress(requestId, {
        stage: "complete",
        progress: 100,
        message: `Error: ${errorMessage}`,
      });

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime,
      };
    } finally {
      // Clean up progress callback
      this.processingCallbacks.delete(requestId);
    }
  }

  private async analyzeAudio(
    audioBuffer: ArrayBuffer
  ): Promise<{ lufs: number; truePeak: number }> {
    // Simplified analysis - in real implementation you'd use proper LUFS analysis
    return {
      lufs: -14, // Mock LUFS value
      truePeak: -1.0, // Mock true peak value
    };
  }

  private notifyProgress(
    requestId: string,
    progress: ProcessingProgress
  ): void {
    const callback = this.processingCallbacks.get(requestId);
    if (callback) {
      callback(progress);
    }
  }

  // Check if master_me plugin is available
  async isMasterMeAvailable(): Promise<boolean> {
    try {
      if (!this.vstManager) {
        await this.initializeVSTManager();
      }
      return this.vstManager?.getPlugin("master_me") !== undefined;
    } catch (error) {
      console.error("Error checking Master Me availability:", error);
      return false;
    }
  }

  // Get plugin installation instructions
  getInstallationInstructions(): string {
    return `
Master Me plugin installation instructions:

1. Download Master Me from the official website
2. Extract the plugin to: C:\\ravr-fixed\\external_plugins\\master_me-1.3.1-win64\\master_me-1.3.1
3. Ensure the following files are present:
   - master_me-vst.dll
   - master_me.exe
   - master_me.clap
4. Restart RAVR Audio Engine
5. The plugin should be automatically detected

If you continue to have issues, please check that:
- The plugin files are not corrupted
- You have the correct version (1.3.1)
- The directory path is exactly as specified above
    `.trim();
  }
}

// Create singleton instance
export const autoMasterService = new AutoMasterService();

// API endpoint handler for Electron
export const handleAutoMasterRequest = async (
  request: AutoMasterRequest
): Promise<AutoMasterResponse> => {
  return autoMasterService.autoMaster(request);
};
