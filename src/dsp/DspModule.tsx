import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DspModule as DspModuleType } from '../store/useDspChainStore';

interface DspModuleProps {
  module: DspModuleType;
  children: React.ReactNode;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function DspModule({ module, children, onToggle, onRemove }: DspModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`relative bg-gray-800 rounded-lg p-4 shadow-lg mb-3 border-l-4 ${
        module.enabled ? 'border-purple-500' : 'border-gray-600'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <button
            {...attributes}
            {...listeners}
            className="mr-2 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            ☰
          </button>
          <h3 className="font-medium text-white">{module.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(module.id)}
            className={`w-10 h-5 rounded-full flex items-center transition-colors ${
              module.enabled ? 'bg-purple-600' : 'bg-gray-600'
            }`}
            aria-label={module.enabled ? 'Disable module' : 'Enable module'}
          >
            <span
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                module.enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            onClick={() => onRemove(module.id)}
            className="text-gray-400 hover:text-red-400"
            aria-label="Remove module"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="pl-6">
        {children}
      </div>
    </motion.div>
  );
}
