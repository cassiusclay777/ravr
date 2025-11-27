import React, { useEffect, useState } from "react";

// Mobile-specific optimizations and utilities
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      const ios = /iPad|iPhone|iPod/.test(userAgent);
      const android = /Android/.test(userAgent);

      setIsMobile(mobile);
      setIsIOS(ios);
      setIsAndroid(android);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return { isMobile, isIOS, isAndroid };
};

// Touch-friendly button component
export const TouchButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className = "", disabled = false }) => {
  const { isMobile } = useMobileDetection();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${isMobile ? "min-h-[44px] min-w-[44px]" : "min-h-[36px]"} 
        px-4 py-2 rounded-lg font-medium transition-all
        active:scale-95 touch-manipulation
        ${className}
      `}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
};

// Mobile-optimized audio controls
export const MobileAudioControls: React.FC<{
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}> = ({ isPlaying, onPlayPause, onStop, volume, onVolumeChange }) => {
  const { isMobile } = useMobileDetection();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <TouchButton
          onClick={onStop}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          ⏹️
        </TouchButton>

        <TouchButton
          onClick={onPlayPause}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xl"
        >
          {isPlaying ? "⏸️" : "▶️"}
        </TouchButton>

        <div className="flex items-center space-x-2">
          <span className="text-white text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

// Mobile-friendly file picker
export const MobileFilePicker: React.FC<{
  onFileSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
}> = ({ onFileSelect, accept = "audio/*", multiple = false }) => {
  const { isMobile } = useMobileDetection();

  return (
    <div className="w-full">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => e.target.files && onFileSelect(e.target.files)}
        className={`
          w-full p-4 border-2 border-dashed border-gray-600 rounded-lg
          ${isMobile ? "min-h-[120px] text-lg" : "min-h-[80px]"}
          bg-gray-800 text-white cursor-pointer
          file:mr-4 file:py-2 file:px-4 file:rounded-lg
          file:border-0 file:text-sm file:font-semibold
          file:bg-blue-600 file:text-white
          hover:bg-gray-700 transition-colors
        `}
      />
    </div>
  );
};

// Mobile navigation drawer
export const MobileNavigation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 h-full w-80 bg-gray-900 z-50 transform transition-transform
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">RAVR Menu</h2>
            <TouchButton
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              ✕
            </TouchButton>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};
