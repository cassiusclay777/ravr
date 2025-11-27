import React, { useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useGesture } from '@use-gesture/react';

// Advanced animation variants
export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

export const scaleVariants = {
  hidden: { 
    scale: 0.8, 
    opacity: 0,
    y: 50
  },
  visible: { 
    scale: 1, 
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      mass: 1
    }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    y: -50,
    transition: {
      duration: 0.2
    }
  }
};

export const morphVariants = {
  idle: {
    borderRadius: "8px",
    scale: 1
  },
  hover: {
    borderRadius: "16px",
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  tap: {
    borderRadius: "24px",
    scale: 0.98
  }
};

export const liquidVariants = {
  initial: {
    pathLength: 0,
    fill: "rgba(0, 255, 255, 0.1)"
  },
  animate: {
    pathLength: 1,
    fill: "rgba(0, 255, 255, 0.3)",
    transition: {
      pathLength: { 
        type: "spring", 
        duration: 2, 
        bounce: 0 
      },
      fill: { 
        duration: 0.5, 
        delay: 1 
      }
    }
  }
};

// Advanced gesture components
interface DraggableKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: number;
  sensitivity?: number;
}

export const DraggableKnob: React.FC<DraggableKnobProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  size = 60,
  sensitivity = 1
}) => {
  const constraintsRef = useRef(null);
  const rotation = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 20 });
  
  const normalizedValue = (value - min) / (max - min);
  const rotationValue = useTransform(rotation, [0, 360], [min, max]);
  
  useEffect(() => {
    rotation.set(normalizedValue * 360);
  }, [value, normalizedValue, rotation]);
  
  const bind = useGesture({
    onDrag: ({ movement: [, my], memo = rotation.get() }) => {
      const newRotation = memo - my * sensitivity;
      const clampedRotation = Math.max(0, Math.min(360, newRotation));
      rotation.set(clampedRotation);
      
      const newValue = min + (clampedRotation / 360) * (max - min);
      onChange(Math.round(newValue * 100) / 100);
      
      return memo;
    },
    onDragStart: () => {
      scale.set(1.1);
    },
    onDragEnd: () => {
      scale.set(1);
    }
  });
  
  return (
    <motion.div
      ref={constraintsRef}
      className="relative cursor-grab active:cursor-grabbing"
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        {...bind()}
        className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg"
        style={{ 
          rotate: rotation,
          scale
        }}
      >
        <div className="absolute top-2 left-1/2 w-1 h-4 bg-white rounded-full transform -translate-x-1/2" />
      </motion.div>
      
      {/* Value display */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {Math.round(value)}
      </motion.div>
    </motion.div>
  );
};

// Elastic slider with haptic feedback simulation
interface ElasticSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
}

export const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  width = 200
}) => {
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 400, damping: 25 });
  
  const normalizedValue = (value - min) / (max - min);
  const trackProgress = useTransform(x, [0, width - 20], [0, 1]);
  
  useEffect(() => {
    x.set((width - 20) * normalizedValue);
  }, [value, normalizedValue, x, width]);
  
  const bind = useGesture({
    onDrag: ({ movement: [mx], memo = x.get() }) => {
      const newX = Math.max(0, Math.min(width - 20, memo + mx));
      x.set(newX);
      
      const progress = newX / (width - 20);
      const newValue = min + progress * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      
      onChange(Math.max(min, Math.min(max, steppedValue)));
      
      return memo;
    },
    onDragStart: () => {
      scale.set(1.3);
    },
    onDragEnd: () => {
      scale.set(1);
      
      // Haptic feedback simulation (visual pulse)
      scale.set(1.1);
      setTimeout(() => scale.set(1), 100);
    }
  });
  
  return (
    <div 
      ref={constraintsRef}
      className="relative py-4"
      style={{ width }}
    >
      {/* Track */}
      <motion.div 
        className="h-2 bg-gray-700 rounded-full overflow-hidden"
        whileHover={{ height: 6 }}
        transition={{ duration: 0.2 }}
      >
        {/* Progress */}
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
          style={{ 
            scaleX: trackProgress,
            originX: 0
          }}
        />
      </motion.div>
      
      {/* Thumb */}
      <motion.div
        {...bind()}
        className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing"
        style={{ 
          x,
          y: "-50%",
          scale
        }}
        whileHover={{ scale: 1.2 }}
      >
        <div className="absolute inset-1 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full" />
      </motion.div>
      
      {/* Value tooltip */}
      <motion.div
        className="absolute -top-8 bg-black text-white text-xs px-2 py-1 rounded pointer-events-none"
        style={{ 
          x: useTransform(x, v => v - 15),
          opacity: useTransform(scale, [1, 1.1], [0, 1])
        }}
      >
        {value.toFixed(1)}
      </motion.div>
    </div>
  );
};

// Morphing button with state transitions
interface MorphButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
}

export const MorphButton: React.FC<MorphButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  isLoading = false,
  disabled = false
}) => {
  const controls = useAnimation();
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
    secondary: "bg-gradient-to-r from-gray-600 to-gray-700 text-white",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white"
  };
  
  useEffect(() => {
    if (isLoading) {
      controls.start({
        scale: [1, 0.95, 1],
        rotate: [0, 360],
        transition: {
          scale: { repeat: Infinity, duration: 1 },
          rotate: { repeat: Infinity, duration: 2, ease: "linear" }
        }
      });
    } else {
      controls.stop();
      controls.set({ scale: 1, rotate: 0 });
    }
  }, [isLoading, controls]);
  
  return (
    <motion.button
      className={`
        px-6 py-3 rounded-lg font-medium transition-all duration-200
        ${variantStyles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
      `}
      variants={morphVariants}
      initial="idle"
      whileHover={!disabled ? "hover" : "idle"}
      whileTap={!disabled ? "tap" : "idle"}
      animate={controls}
      onClick={!disabled && !isLoading ? onClick : undefined}
      layout
    >
      {isLoading ? (
        <motion.div
          className="flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </motion.div>
      ) : (
        children
      )}
    </motion.button>
  );
};

// Fluid card with magnetic hover effects
interface FluidCardProps {
  children: React.ReactNode;
  className?: string;
}

export const FluidCard: React.FC<FluidCardProps> = ({ children, className = "" }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);
  
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  return (
    <motion.div
      ref={cardRef}
      className={`
        relative p-6 bg-gradient-to-br from-gray-800 to-gray-900 
        rounded-xl shadow-xl overflow-hidden cursor-pointer
        ${className}
      `}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Magnetic glow */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: useTransform(
            [x, y],
            ([latestX, latestY]) =>
              `radial-gradient(circle at ${latestX + 50}% ${latestY + 50}%, rgba(0, 255, 255, 0.3) 0%, transparent 50%)`
          )
        }}
      />
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Particle system component
interface ParticleSystemProps {
  count?: number;
  speed?: number;
  color?: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 50,
  speed = 1,
  color = "#00ffff"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];
    
    // Initialize particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      
      requestAnimationFrame(animate);
    };
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    animate();
    
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [count, speed, color]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

// Gesture-controlled spectrum visualizer
interface GestureVisualizerProps {
  audioData: Float32Array;
  width?: number;
  height?: number;
}

export const GestureVisualizer: React.FC<GestureVisualizerProps> = ({
  audioData,
  width = 800,
  height = 200
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sensitivity = useMotionValue(1);
  const zoom = useMotionValue(1);
  const rotation = useMotionValue(0);
  
  const bind = useGesture({
    onWheel: ({ delta: [, dy] }) => {
      const newZoom = Math.max(0.5, Math.min(3, zoom.get() + dy * -0.001));
      zoom.set(newZoom);
    },
    onPinch: ({ offset: [d] }) => {
      zoom.set(Math.max(0.5, Math.min(3, 1 + d / 200)));
    },
    onDrag: ({ movement: [mx, my], buttons }) => {
      if (buttons === 2) { // Right click
        rotation.set(rotation.get() + mx * 0.5);
        sensitivity.set(Math.max(0.1, Math.min(5, sensitivity.get() + my * -0.01)));
      }
    }
  }, {
    eventOptions: { passive: false }
  });
  
  return (
    <motion.div
      ref={containerRef}
      {...bind()}
      className="relative overflow-hidden bg-black rounded-lg border border-gray-700"
      style={{ width, height }}
    >
      <motion.svg
        className="absolute inset-0"
        style={{
          scale: zoom,
          rotate: rotation
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {audioData.map((value, index) => {
          const barHeight = Math.abs(value) * height * 0.8;
          const x = (index / audioData.length) * width;
          const y = height - barHeight;
          
          return (
            <motion.rect
              key={index}
              x={x}
              y={y}
              width={width / audioData.length - 1}
              height={barHeight}
              fill={`hsl(${index * 2}, 70%, 60%)`}
              initial={{ scaleY: 0 }}
              animate={{ 
                scaleY: useTransform(sensitivity, s => Math.min(1, Math.abs(value) * s))
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          );
        })}
      </motion.svg>
      
      {/* Control hints */}
      <div className="absolute top-2 right-2 text-xs text-gray-400 space-y-1">
        <div>Scroll: Zoom</div>
        <div>Right-drag: Rotate & Sensitivity</div>
        <div>Pinch: Zoom (touch)</div>
      </div>
    </motion.div>
  );
};

export default {
  DraggableKnob,
  ElasticSlider,
  MorphButton,
  FluidCard,
  ParticleSystem,
  GestureVisualizer,
  slideVariants,
  scaleVariants,
  morphVariants,
  liquidVariants
};
