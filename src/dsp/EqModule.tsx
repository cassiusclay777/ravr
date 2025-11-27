import type { DspModule as DspModuleType } from '../store/useDspChainStore';
import { DspModule } from './DspModule';
import { Knob } from '../components/controls/Knob';

interface EqModuleProps {
  module: DspModuleType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onParamChange: (moduleId: string, param: string, value: number) => void;
}

export function EqModule({ module, onToggle, onRemove, onParamChange }: EqModuleProps) {
  return (
    <DspModule module={module} onToggle={onToggle} onRemove={onRemove}>
      <div className="grid grid-cols-3 gap-4 mt-2">
        <Knob
          label="Low"
          value={module.params.lowGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(value) => onParamChange(module.id, 'lowGain', value)}
          unit="dB"
          size="sm"
        />
        <Knob
          label="Mid"
          value={module.params.midGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(value) => onParamChange(module.id, 'midGain', value)}
          unit="dB"
          size="sm"
        />
        <Knob
          label="High"
          value={module.params.highGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(value) => onParamChange(module.id, 'highGain', value)}
          unit="dB"
          size="sm"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Knob
          label="Mid Freq"
          value={module.params.midFreq}
          min={200}
          max={5000}
          step={10}
          onChange={(value) => onParamChange(module.id, 'midFreq', value)}
          unit="Hz"
          isLogarithmic
          size="xs"
        />
        <Knob
          label="Q"
          value={module.params.midQ}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(value) => onParamChange(module.id, 'midQ', value)}
          size="xs"
        />
      </div>
    </DspModule>
  );
}
