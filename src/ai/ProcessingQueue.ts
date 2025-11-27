export interface ProcessingJob {
  id: string;
  name: string;
  type: 'demucs' | 'audiosr' | 'ddsp' | 'style_transfer' | 'genre_detection' | 'auto_mastering';
  input: AudioBuffer;
  params: Record<string, any>;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: AudioBuffer | any;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export type JobStatusCallback = (job: ProcessingJob) => void;

/**
 * AI Processing Queue
 *
 * Manages batch processing of AI model jobs with priority queue,
 * progress tracking, and error handling.
 */
export class ProcessingQueue {
  private queue: ProcessingJob[] = [];
  private processing: ProcessingJob | null = null;
  private maxConcurrent = 1; // Process one job at a time
  private statusCallbacks: Map<string, JobStatusCallback> = new Map();
  private globalCallback: JobStatusCallback | null = null;

  /**
   * Add a job to the queue
   */
  addJob(
    name: string,
    type: ProcessingJob['type'],
    input: AudioBuffer,
    params: Record<string, any> = {},
    priority: number = 0
  ): string {
    const job: ProcessingJob = {
      id: this.generateJobId(),
      name,
      type,
      input,
      params,
      priority,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };

    // Insert job in priority order (higher priority first)
    const insertIndex = this.queue.findIndex((j) => j.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    console.log(`📥 Added job ${job.id} (${job.type}) to queue [Priority: ${priority}]`);

    // Start processing if not already processing
    this.processNext();

    return job.id;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ProcessingJob | undefined {
    if (this.processing?.id === jobId) {
      return this.processing;
    }
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProcessingJob[] {
    const jobs = [...this.queue];
    if (this.processing) {
      jobs.unshift(this.processing);
    }
    return jobs;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const allJobs = this.getAllJobs();

    return {
      total: allJobs.length,
      pending: allJobs.filter((j) => j.status === 'pending').length,
      processing: allJobs.filter((j) => j.status === 'processing').length,
      completed: allJobs.filter((j) => j.status === 'completed').length,
      failed: allJobs.filter((j) => j.status === 'failed').length,
    };
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    // Check if it's the currently processing job
    if (this.processing?.id === jobId) {
      this.processing.status = 'cancelled';
      this.notifyStatus(this.processing);
      this.processing = null;
      this.processNext();
      console.log(`❌ Cancelled processing job ${jobId}`);
      return true;
    }

    // Check if it's in the queue
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      const job = this.queue[index];
      job.status = 'cancelled';
      this.notifyStatus(job);
      this.queue.splice(index, 1);
      console.log(`❌ Cancelled queued job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Clear all pending jobs
   */
  clearQueue(): void {
    const count = this.queue.length;
    this.queue = [];
    console.log(`🧹 Cleared ${count} pending jobs from queue`);
  }

  /**
   * Set status callback for a specific job
   */
  onJobStatus(jobId: string, callback: JobStatusCallback): void {
    this.statusCallbacks.set(jobId, callback);
  }

  /**
   * Set global status callback for all jobs
   */
  onStatus(callback: JobStatusCallback): void {
    this.globalCallback = callback;
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    // Already processing a job
    if (this.processing) {
      return;
    }

    // No jobs in queue
    if (this.queue.length === 0) {
      console.log('✅ Queue empty, no more jobs to process');
      return;
    }

    // Get next job (highest priority)
    const job = this.queue.shift()!;
    this.processing = job;

    // Update job status
    job.status = 'processing';
    job.startedAt = Date.now();
    this.notifyStatus(job);

    console.log(`⚙️ Processing job ${job.id} (${job.type})...`);

    try {
      // Process the job based on type
      const result = await this.processJob(job);

      // Job completed successfully
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = Date.now();
      this.notifyStatus(job);

      const duration = (job.completedAt - job.startedAt!) / 1000;
      console.log(`✅ Job ${job.id} completed in ${duration.toFixed(2)}s`);

    } catch (error: any) {
      // Job failed
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = Date.now();
      this.notifyStatus(job);

      console.error(`❌ Job ${job.id} failed:`, error);
    }

    // Clear processing job
    this.processing = null;

    // Process next job
    this.processNext();
  }

  /**
   * Process a job (mock implementation)
   */
  private async processJob(job: ProcessingJob): Promise<any> {
    // Simulate processing with progress updates
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      // Check if job was cancelled
      if (job.status === 'cancelled') {
        throw new Error('Job cancelled');
      }

      // Update progress
      job.progress = (i / steps) * 100;
      this.notifyStatus(job);

      // Simulate processing time
      await this.delay(500);
    }

    // Return mock result based on job type
    switch (job.type) {
      case 'demucs':
        return {
          vocals: job.input,
          drums: job.input,
          bass: job.input,
          other: job.input,
        };

      case 'audiosr':
        return job.input; // Mock upsampled audio

      case 'ddsp':
        return job.input; // Mock timbre-transferred audio

      case 'style_transfer':
        return job.input; // Mock style-transferred audio

      case 'genre_detection':
        return {
          genre: 'Electronic',
          confidence: 0.87,
          subgenres: ['House', 'Techno', 'Trance'],
        };

      case 'auto_mastering':
        return job.input; // Mock mastered audio

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Notify status change
   */
  private notifyStatus(job: ProcessingJob): void {
    // Job-specific callback
    const callback = this.statusCallbacks.get(job.id);
    if (callback) {
      callback(job);
    }

    // Global callback
    if (this.globalCallback) {
      this.globalCallback(job);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processing history (completed + failed jobs)
   */
  getHistory(): ProcessingJob[] {
    return this.getAllJobs().filter(
      (j) => j.status === 'completed' || j.status === 'failed'
    );
  }

  /**
   * Remove completed/failed jobs from history
   */
  clearHistory(): void {
    // Keep only pending and processing jobs
    this.queue = this.queue.filter(
      (j) => j.status === 'pending' || j.status === 'processing'
    );
    console.log('🧹 Cleared processing history');
  }
}

export default ProcessingQueue;
