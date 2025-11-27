import { GPUAudioProcessor } from '../audio/GPUAudioProcessor';

export interface BenchmarkResult {
  operation: string;
  bufferSize: number;
  cpuTime: number;
  gpuTime: number;
  speedup: number;
  samplesPerSecond: {
    cpu: number;
    gpu: number;
  };
}

export interface BenchmarkSuite {
  timestamp: number;
  browserInfo: {
    userAgent: string;
    platform: string;
  };
  gpuInfo: any;
  results: BenchmarkResult[];
  summary: {
    averageSpeedup: number;
    totalTests: number;
    gpuFaster: number;
    cpuFaster: number;
  };
}

/**
 * Performance Benchmark Suite
 * Tests GPU vs CPU performance for audio processing operations
 */
export class PerformanceBenchmark {
  private gpuProcessor: GPUAudioProcessor;

  constructor(gpuProcessor: GPUAudioProcessor) {
    this.gpuProcessor = gpuProcessor;
  }

  /**
   * Run complete benchmark suite
   */
  async runFullBenchmark(): Promise<BenchmarkSuite> {
    console.log('🏁 Starting Performance Benchmark Suite...');

    const results: BenchmarkResult[] = [];

    // Test different buffer sizes
    const bufferSizes = [1024, 2048, 4096, 8192, 16384, 32768, 65536];

    // Test FFT performance
    for (const size of bufferSizes) {
      const fftResult = await this.benchmarkFFT(size);
      results.push(fftResult);
    }

    // Test convolution performance (smaller sizes due to O(n²) complexity)
    const convolutionSizes = [1024, 2048, 4096, 8192];
    for (const size of convolutionSizes) {
      const convResult = await this.benchmarkConvolution(size);
      results.push(convResult);
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(results);

    const suite: BenchmarkSuite = {
      timestamp: Date.now(),
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      gpuInfo: this.gpuProcessor.getGPUInfo(),
      results,
      summary,
    };

    console.log('✅ Benchmark Complete!');
    console.log(`   Average Speedup: ${summary.averageSpeedup.toFixed(2)}x`);
    console.log(`   GPU Faster: ${summary.gpuFaster}/${summary.totalTests} tests`);

    return suite;
  }

  /**
   * Benchmark FFT operation
   */
  async benchmarkFFT(bufferSize: number): Promise<BenchmarkResult> {
    console.log(`Testing FFT (${bufferSize} samples)...`);

    // Generate random test data
    const testData = this.generateTestData(bufferSize);

    // CPU Benchmark
    const cpuStartTime = performance.now();
    await this.cpuFFT(testData);
    const cpuEndTime = performance.now();
    const cpuTime = cpuEndTime - cpuStartTime;

    // GPU Benchmark
    if (this.gpuProcessor.isEnabled()) {
      const gpuStartTime = performance.now();
      await this.gpuProcessor.runFFT(testData);
      const gpuEndTime = performance.now();
      const gpuTime = gpuEndTime - gpuStartTime;

      const speedup = cpuTime / gpuTime;

      return {
        operation: 'FFT',
        bufferSize,
        cpuTime,
        gpuTime,
        speedup,
        samplesPerSecond: {
          cpu: bufferSize / (cpuTime / 1000),
          gpu: bufferSize / (gpuTime / 1000),
        },
      };
    } else {
      // GPU not available
      return {
        operation: 'FFT',
        bufferSize,
        cpuTime,
        gpuTime: 0,
        speedup: 1.0,
        samplesPerSecond: {
          cpu: bufferSize / (cpuTime / 1000),
          gpu: 0,
        },
      };
    }
  }

  /**
   * Benchmark convolution operation
   */
  async benchmarkConvolution(bufferSize: number): Promise<BenchmarkResult> {
    console.log(`Testing Convolution (${bufferSize} samples)...`);

    // Generate test data
    const testData = this.generateTestData(bufferSize);
    const impulseResponse = this.generateTestData(Math.min(1024, bufferSize / 4)); // IR is usually smaller

    // CPU Benchmark
    const cpuStartTime = performance.now();
    await this.cpuConvolution(testData, impulseResponse);
    const cpuEndTime = performance.now();
    const cpuTime = cpuEndTime - cpuStartTime;

    // GPU Benchmark
    if (this.gpuProcessor.isEnabled()) {
      const gpuStartTime = performance.now();
      await this.gpuProcessor.runConvolution(testData, impulseResponse);
      const gpuEndTime = performance.now();
      const gpuTime = gpuEndTime - gpuStartTime;

      const speedup = cpuTime / gpuTime;

      return {
        operation: 'Convolution',
        bufferSize,
        cpuTime,
        gpuTime,
        speedup,
        samplesPerSecond: {
          cpu: bufferSize / (cpuTime / 1000),
          gpu: bufferSize / (gpuTime / 1000),
        },
      };
    } else {
      return {
        operation: 'Convolution',
        bufferSize,
        cpuTime,
        gpuTime: 0,
        speedup: 1.0,
        samplesPerSecond: {
          cpu: bufferSize / (cpuTime / 1000),
          gpu: 0,
        },
      };
    }
  }

  /**
   * CPU FFT implementation (simple DFT for benchmarking)
   */
  private async cpuFFT(data: Float32Array): Promise<{ real: Float32Array; imag: Float32Array }> {
    const N = data.length;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    // Simple DFT (not optimized - just for baseline comparison)
    for (let k = 0; k < N; k++) {
      let sumReal = 0;
      let sumImag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        sumReal += data[n] * Math.cos(angle);
        sumImag += data[n] * Math.sin(angle);
      }

      real[k] = sumReal;
      imag[k] = sumImag;
    }

    return { real, imag };
  }

  /**
   * CPU convolution implementation
   */
  private async cpuConvolution(
    data: Float32Array,
    impulseResponse: Float32Array
  ): Promise<Float32Array> {
    const dataLength = data.length;
    const irLength = impulseResponse.length;
    const outputLength = dataLength + irLength - 1;
    const output = new Float32Array(outputLength);

    // Standard convolution algorithm
    for (let i = 0; i < outputLength; i++) {
      let sum = 0;
      for (let j = 0; j < irLength; j++) {
        const dataIndex = i - j;
        if (dataIndex >= 0 && dataIndex < dataLength) {
          sum += data[dataIndex] * impulseResponse[j];
        }
      }
      output[i] = sum;
    }

    return output.slice(0, dataLength); // Trim to original length
  }

  /**
   * Generate random test data
   */
  private generateTestData(size: number): Float32Array {
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }
    return data;
  }

  /**
   * Calculate benchmark summary statistics
   */
  private calculateSummary(results: BenchmarkResult[]): BenchmarkSuite['summary'] {
    let totalSpeedup = 0;
    let gpuFaster = 0;
    let cpuFaster = 0;

    for (const result of results) {
      totalSpeedup += result.speedup;
      if (result.speedup > 1.0) {
        gpuFaster++;
      } else {
        cpuFaster++;
      }
    }

    return {
      averageSpeedup: totalSpeedup / results.length,
      totalTests: results.length,
      gpuFaster,
      cpuFaster,
    };
  }

  /**
   * Export benchmark results as JSON
   */
  exportAsJSON(suite: BenchmarkSuite): string {
    return JSON.stringify(suite, null, 2);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(suite: BenchmarkSuite): string {
    let markdown = '# GPU Performance Benchmark Report\n\n';

    markdown += `**Date:** ${new Date(suite.timestamp).toLocaleString()}\n\n`;

    markdown += '## System Information\n\n';
    markdown += `- **Browser:** ${suite.browserInfo.userAgent}\n`;
    markdown += `- **Platform:** ${suite.browserInfo.platform}\n`;

    if (suite.gpuInfo) {
      markdown += `- **GPU:** ${suite.gpuInfo.description || 'Unknown'}\n`;
      markdown += `- **Vendor:** ${suite.gpuInfo.vendor || 'Unknown'}\n\n`;
    }

    markdown += '## Summary\n\n';
    markdown += `- **Average Speedup:** ${suite.summary.averageSpeedup.toFixed(2)}x\n`;
    markdown += `- **GPU Faster:** ${suite.summary.gpuFaster}/${suite.summary.totalTests} tests\n`;
    markdown += `- **CPU Faster:** ${suite.summary.cpuFaster}/${suite.summary.totalTests} tests\n\n`;

    markdown += '## Detailed Results\n\n';
    markdown += '| Operation | Buffer Size | CPU Time (ms) | GPU Time (ms) | Speedup |\n';
    markdown += '|-----------|-------------|---------------|---------------|----------|\n';

    for (const result of suite.results) {
      markdown += `| ${result.operation} | ${result.bufferSize} | ${result.cpuTime.toFixed(2)} | ${result.gpuTime.toFixed(2)} | ${result.speedup.toFixed(2)}x |\n`;
    }

    markdown += '\n---\n';
    markdown += '*Generated by RAVR GPU Performance Benchmark*\n';

    return markdown;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(suite: BenchmarkSuite): string {
    const markdown = this.generateMarkdownReport(suite);

    // Convert to basic HTML
    let html = '<html><head><title>GPU Benchmark Report</title>';
    html += '<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;}';
    html += 'table{border-collapse:collapse;width:100%;}';
    html += 'th,td{border:1px solid #ddd;padding:8px;text-align:left;}';
    html += 'th{background:#f2f2f2;}</style></head><body>';
    html += markdown.replace(/\n/g, '<br>');
    html += '</body></html>';

    return html;
  }
}

export default PerformanceBenchmark;
