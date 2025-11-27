import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudioStore } from '@/audio/audioStore';

interface HiddenDevProps {
  // If provided, overrides internal hotkey toggle logic
  open?: boolean;
}

// Hidden dev panel: toggled with Shift+D by default.
// Integrate with a logo by calling `dispatchEvent(new CustomEvent('ravr:toggleDev'))` on Shift+Click.
export const HiddenDev: React.FC<HiddenDevProps> = ({ open }) => {
  const { outputs, selectedOutputId, status, profile, expertMode, setExpertMode } = useAudioStore();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open ?? internalOpen;

  // Hotkey and custom event toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && e.shiftKey) {
        setInternalOpen((v) => !v);
      }
    };
    const onToggle = () => setInternalOpen((v) => !v);
    window.addEventListener('keydown', onKey);
    window.addEventListener('ravr:toggleDev', onToggle as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ravr:toggleDev', onToggle as EventListener);
    };
  }, []);

  const selected = useMemo(() => outputs.find((o) => o.id === (selectedOutputId ?? '')) || null, [outputs, selectedOutputId]);

  const onToggleExpert = useCallback(() => setExpertMode(!expertMode), [expertMode, setExpertMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute top-4 right-4 w-[420px] max-w-[90vw] pointer-events-auto rounded-lg border border-cyan-500/30 bg-black/70 text-cyan-100 shadow-xl">
        <div className="px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="font-semibold text-cyan-300">RAVR Dev Panel</div>
          <button onClick={() => setInternalOpen(false)} className="text-cyan-300 hover:text-cyan-200">✕</button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <section>
            <div className="text-cyan-300 font-semibold mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${status === 'optimal' ? 'bg-green-500' : 'bg-orange-500'}`} />
              <span className="font-mono">{status}</span>
            </div>
          </section>

          <section>
            <div className="text-cyan-300 font-semibold mb-1">Output Device</div>
            <div className="space-y-1">
              <div className="font-mono text-cyan-200 truncate" title={selected?.label || 'Unknown'}>
                {selected?.label || 'Unknown'}
              </div>
              <div className="text-xs text-cyan-400">ID: <span className="font-mono">{selected?.id || 'n/a'}</span></div>
              <div className="text-xs text-cyan-400">Can setSinkId: <span className="font-mono">{selected?.canSetSinkId ? 'yes' : 'no'}</span></div>
            </div>
          </section>

          <section>
            <div className="text-cyan-300 font-semibold mb-1">Matched Profile</div>
            <div className="space-y-1">
              <div className="font-mono text-cyan-200">{profile?.name ?? 'Generic Output'}</div>
              <div className="text-xs text-cyan-400">ID: <span className="font-mono">{profile?.id ?? 'default'}</span></div>
              {profile?.dsp && (
                <pre className="text-xs bg-black/40 p-2 rounded border border-cyan-500/20 overflow-auto">
{JSON.stringify(profile.dsp, null, 2)}
                </pre>
              )}
            </div>
          </section>

          <section>
            <div className="text-cyan-300 font-semibold mb-1">Expert Mode</div>
            <label className="inline-flex items-center gap-2 text-cyan-200 cursor-pointer select-none">
              <input type="checkbox" checked={expertMode} onChange={onToggleExpert} />
              <span>{expertMode ? 'On' : 'Off'}</span>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HiddenDev;
