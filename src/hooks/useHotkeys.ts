import { useEffect, useRef } from 'react';

interface HotkeyHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
}

export const useHotkeys = (hotkeys: HotkeyHandler[]) => {
  const handlersRef = useRef(hotkeys);
  
  useEffect(() => {
    handlersRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      handlersRef.current.forEach(({ key, ctrl, shift, alt, handler }) => {
        const ctrlMatch = ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
        const altMatch = alt ? e.altKey : !e.altKey;
        
        if (e.key === key && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
