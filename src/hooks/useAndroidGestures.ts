import { useEffect, useRef } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
}

export const useAndroidGestures = (handlers: GestureHandlers) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartRef = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - začátek swipe nebo tap
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };

        // Long press detection
        longPressTimerRef.current = window.setTimeout(() => {
          if (handlers.onLongPress) {
            handlers.onLongPress();
            navigator.vibrate?.(50); // Haptic feedback
          }
        }, 500);
      } else if (e.touches.length === 2 && handlers.onPinch) {
        // Two touches - pinch gesture
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        pinchStartRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press if finger moves
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Pinch gesture
      if (e.touches.length === 2 && handlers.onPinch && pinchStartRef.current) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = distance / pinchStartRef.current;
        handlers.onPinch(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Reset pinch
      pinchStartRef.current = null;

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Check for swipe gestures (minimum 50px and max 300ms)
      const minSwipeDistance = 50;
      const maxSwipeTime = 300;

      if (deltaTime < maxSwipeTime) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
          // Horizontal swipe
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
            navigator.vibrate?.(30);
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
            navigator.vibrate?.(30);
          }
        } else if (Math.abs(deltaY) > minSwipeDistance) {
          // Vertical swipe
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
            navigator.vibrate?.(30);
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
            navigator.vibrate?.(30);
          }
        }
      }

      // Check for double tap (within 300ms)
      const now = Date.now();
      if (now - lastTapRef.current < 300 && handlers.onDoubleTap) {
        handlers.onDoubleTap();
        navigator.vibrate?.(40);
        lastTapRef.current = 0; // Reset to prevent triple tap
      } else {
        lastTapRef.current = now;
      }

      touchStartRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handlers]);
};
