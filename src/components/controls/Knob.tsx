import { useState, useEffect, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';

type KnobSize = 'xs' | 'sm' | 'md' | 'lg';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  width?: number;
  height?: number;
  fgColor?: string;
  bgColor?: string;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  size?: KnobSize;
  isLogarithmic?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { knob: 'w-8 h-8', label: 'text-xs' },
  sm: { knob: 'w-10 h-10', label: 'text-xs' },
  md: { knob: 'w-12 h-12', label: 'text-sm' },
  lg: { knob: 'w-16 h-16', label: 'text-base' },
};

export function Knob({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  size = 'md',
  isLogarithmic = false,
  className = '',
}: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(value);

  const { knob: knobSize, label: labelSize } = sizeMap[size];

  const toLinear = (value: number, min: number, max: number) => {
    if (!isLogarithmic) return value;
    const minLog = Math.log10(min);
    const maxLog = Math.log10(max);
    return Math.pow(10, minLog + (value - min) / (max - min) * (maxLog - minLog));
  };

  const fromLinear = (value: number, min: number, max: number) => {
    if (!isLogarithmic) return value;
    const minLog = Math.log10(min);
    const maxLog = Math.log10(max);
    return min + (Math.log10(value) - minLog) / (maxLog - minLog) * (max - min);
  };

  const displayValue = isLogarithmic ? toLinear(value, min, max) : value;
  const normalizedValue = (fromLinear(displayValue, min, max) - min) / (max - min);
  
  const rotation = -135 + (normalizedValue * 270);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartValue(value);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaY = startY - e.clientY;
    let newValue = startValue + (deltaY * step * 0.5);
    
    // Apply constraints
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Snap to step
    newValue = Math.round(newValue / step) * step;
    
    onChange(newValue);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaY = startY - e.touches[0].clientY;
    let newValue = startValue + (deltaY * step * 0.5);
    
    // Apply constraints
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Snap to step
    newValue = Math.round(newValue / step) * step;
    
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <label className={`text-gray-300 mb-1 ${labelSize} font-medium`}>
          {label}
        </label>
      )}
      <div 
        ref={knobRef}
        className={`relative ${knobSize} rounded-full bg-gray-700 shadow-inner border border-gray-600 flex items-center justify-center cursor-ns-resize select-none`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 right-0 bg-purple-600 opacity-20"
            style={{ height: `${normalizedValue * 100}%` }}
          />
        </div>
        <motion.div 
          className="w-1 h-1/2 bg-white absolute top-0 origin-bottom"
          style={{ rotate: `${rotation}deg` }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      <div className={`text-white mt-1 ${labelSize} font-mono`}>
        {displayValue.toFixed(unit === 'dB' && displayValue > 0 ? 1 : 2)}{unit}
      </div>
    </div>
  );
}
