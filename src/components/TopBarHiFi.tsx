import { useEffect, useRef, useState } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useHifiTurbo } from "@/dsp/presets/hifiTurbo";

export default function TopBarHiFi() {
  const audioEngine = useAudioEngine();
  const [on, setOn] = useState(false);
  const chain = useRef<ReturnType<typeof useHifiTurbo>>();

  useEffect(() => {
    if (audioEngine.ctx && audioEngine.outputNode && !chain.current) {
      chain.current = useHifiTurbo(audioEngine.ctx, audioEngine.outputNode);
    }
  }, [audioEngine.ctx, audioEngine.outputNode]);

  const toggleHiFi = () => {
    if (!chain.current) return;
    
    if (on) {
      chain.current.bypass();
    } else {
      chain.current.enable();
    }
    setOn(!on);
  };

  return (
    <button
      onClick={toggleHiFi}
      className={`px-3 py-1 rounded ${
        on ? 'bg-cyan-600' : 'bg-slate-700'
      } text-white hover:opacity-90 transition-opacity`}
      title="One-click Hi-Fi"
    >
      RAVR Hi-Fi {on ? 'ON' : 'OFF'}
    </button>
  );
}
