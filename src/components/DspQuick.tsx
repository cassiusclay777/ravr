import React from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { EQPanel } from "./EQPanel";

export function DspQuick() {
  const { eq, setEq, makeup, setMakeup, comp, setComp, audioManager } = useAudioEngine();

  return (
    <div className="space-y-6">
      <EQPanel eqChain={audioManager?.getEQChain()} />
      
      <section className="rounded-2xl bg-ravr-panel/70 border border-white/10 p-5 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">DSP · Quick</h2>

      <div className="grid md:grid-cols-3 gap-4">
        {(["low","mid","high"] as const).map((band)=>(
          <div key={band} className="p-3 rounded-xl bg-black/20">
            <div className="text-sm mb-2 uppercase tracking-wide opacity-80">{band}</div>
            <input type="range" min={-12} max={12} step={0.5}
              value={eq[band]} onChange={e=>setEq(band, Number(e.target.value))}
              className="w-full" />
            <div className="text-xs mt-1 opacity-70">{eq[band]} dB</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-black/20">
          <div className="text-sm mb-2 uppercase tracking-wide opacity-80">Makeup</div>
          <input type="range" min={-12} max={12} step={0.5}
            value={makeup} onChange={e=>setMakeup(Number(e.target.value))}
            className="w-full" />
          <div className="text-xs mt-1 opacity-70">{makeup} dB</div>
        </div>

        <div className="p-3 rounded-xl bg-black/20">
          <div className="text-sm mb-2 uppercase tracking-wide opacity-80">Compressor (threshold)</div>
          <input type="range" min={-60} max={0} step={1}
            value={comp.threshold} onChange={e=>setComp({threshold:Number(e.target.value)})}
            className="w-full" />
          <div className="text-xs mt-1 opacity-70">{comp.threshold} dB</div>
        </div>
      </div>
      </section>
    </div>
  );
}