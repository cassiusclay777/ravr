import { useAudioStore } from '../audio/audioStore';

export function hasSetSinkId(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (HTMLMediaElement.prototype as any).setSinkId === 'function';
}

export interface EnumeratedOutputDevice {
  id: string;
  label: string;
  kind: 'audiooutput';
  groupId?: string;
  canSetSinkId: boolean;
}

export async function enumerateOutputDevices(): Promise<EnumeratedOutputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const list = await navigator.mediaDevices.enumerateDevices();
  const canRoute = hasSetSinkId();
  let idx = 0;
  const outs: EnumeratedOutputDevice[] = list
    .filter((d) => d.kind === 'audiooutput')
    .map((d) => ({
      id: d.deviceId,
      label: d.label || `Output ${++idx}`,
      kind: 'audiooutput' as const,
      groupId: d.groupId,
      canSetSinkId: canRoute,
    }));
  return outs;
}

export type DeviceChangeUnsubscribe = () => void;

export function startDeviceMonitor(onChange: (outputs: EnumeratedOutputDevice[]) => void): DeviceChangeUnsubscribe {
  const handler = async () => {
    try {
      const outs = await enumerateOutputDevices();
      onChange(outs);
    } catch (e) {
      // non-fatal
      console.warn('Device enumeration failed:', e);
      onChange([]);
    }
  };

  // Initial populate
  void handler();

  navigator.mediaDevices?.addEventListener?.('devicechange', handler);
  return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler as EventListener);
}

// Opinionated wiring for the global audio store (can be called once on app start)
export function initAutoDeviceDetection(): DeviceChangeUnsubscribe {
  const { setOutputs, setSelectedOutput } = useAudioStore.getState();
  return startDeviceMonitor((outs) => {
    setOutputs(outs);

    // Pick a sensible default
    const preferred = selectDefaultOutputId(outs);
    setSelectedOutput(preferred);
  });
}

export function selectDefaultOutputId(outs: EnumeratedOutputDevice[]): string | null {
  if (!outs.length) return null;
  // Prefer explicit default id if present
  const def = outs.find((d) => d.id === 'default');
  if (def) return def.id;
  // Otherwise prefer one with label hint for headphones
  const hp = outs.find((d) => /head(phone|set)|airpods|arctis|hd\b|beyerdynamic|sennheiser/i.test(d.label));
  if (hp) return hp.id;
  // Fallback to first
  return outs[0].id;
}
