// Lightweight approximate LUFS measurement (not full BS.1770)
// For speed and zero-UI automation, we do a simple channel-averaged RMS in dBFS
// and apply a small offset to approximate integrated LUFS.

export async function measureIntegratedLUFS(buffer: AudioBuffer): Promise<number> {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  if (len === 0) return -Infinity;

  // Average across channels
  let sumSq = 0;
  const step = Math.max(1, Math.floor(buffer.sampleRate / 2000)); // downsample to ~2k samples/sec for speed
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i += step) {
      const s = data[i];
      sumSq += s * s;
    }
  }
  const n = Math.ceil(len / step) * ch;
  const rms = Math.sqrt(sumSq / Math.max(1, n));
  const dbfs = 20 * Math.log10(Math.max(1e-10, rms));
  // Rough offset so typical music RMS ~ -18 dBFS -> around -14 LUFS
  const lufs = dbfs + 4;
  return lufs;
}

export function gainForTargetLUFS(currentLUFS: number, targetLUFS: number): number {
  const delta = targetLUFS - currentLUFS; // dB to add
  // Convert dB to linear
  return Math.pow(10, delta / 20);
}
