import type { DspModule as DspModuleType } from '../store/useDspChainStore';
import { DspModule } from './DspModule';
import { Knob } from '../components/controls/Knob';

interface CompressorModuleProps {
  module: DspModuleType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onParamChange: (moduleId: string, param: string, value: number) => void;
}

export function CompressorModule({ module, onToggle, onRemove, onParamChange }: CompressorModuleProps) {
  return (
    <DspModule module={module} onToggle={onToggle} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <Knob
          label="Threshold"
          value={module.params.threshold}
          min={-60}
          max={0}
          step={0.5}
          onChange={(value) => onParamChange(module.id, 'threshold', value)}
          unit="dB"
          size="sm"
        />
        <Knob
          label="Ratio"
          value={module.params.ratio}
          min={1}
          max={20}
          step={0.5}
          onChange={(value) => onParamChange(module.id, 'ratio', value)}
          unit=":1"
          size="sm"
        />
        <Knob
          label="Attack"
          value={module.params.attack * 1000}
          min={0.1}
          max={100}
          step={0.1}
          onChange={(value) => onParamChange(module.id, 'attack', value / 1000)}
          unit="ms"
          isLogarithmic
          size="xs"
        />
        <Knob
          label="Release"
          value={module.params.release * 1000}
          min={10}
          max={2000}
          step={10}
          onChange={(value) => onParamChange(module.id, 'release', value / 1000)}
          unit="ms"
          isLogarithmic
          size="xs"
        />
        <Knob
          label="Knee"
          value={module.params.knee}
          min={0}
          max={40}
          step={1}
          onChange={(value) => onParamChange(module.id, 'knee', value)}
          unit="dB"
          size="xs"
        />
      </div>
    </DspModule>
  );
}
