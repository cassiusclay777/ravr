import type { DspModule as DspModuleType } from '../store/useDspChainStore';
import { DspModule } from './DspModule';
import { Knob } from '../components/controls/Knob';

interface ReverbModuleProps {
  module: DspModuleType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onParamChange: (moduleId: string, param: string, value: number) => void;
}

export function ReverbModule({ module, onToggle, onRemove, onParamChange }: ReverbModuleProps) {
  return (
    <DspModule module={module} onToggle={onToggle} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <Knob
          label="Mix"
          value={module.params.level * 100}
          min={0}
          max={100}
          step={1}
          onChange={(value) => onParamChange(module.id, 'level', value / 100)}
          unit="%"
          size="sm"
        />
        <Knob
          label="Decay"
          value={module.params.decay}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(value) => onParamChange(module.id, 'decay', value)}
          unit="s"
          size="sm"
        />
        <div className="col-span-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Reverse</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={module.params.reverse > 0.5}
                onChange={(e) => onParamChange(module.id, 'reverse', e.target.checked ? 1 : 0)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>
    </DspModule>
  );
}
