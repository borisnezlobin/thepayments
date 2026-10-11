export type PointerReading = {
  clientX: number;
  clientY: number;
  present: boolean;
};

export type PointerTracker = {
  reading: PointerReading;
  dispose(): void;
};

export function trackPointer(): PointerTracker {
  const reading: PointerReading = { clientX: 0, clientY: 0, present: false };

  const moveTo = (clientX: number, clientY: number) => {
    reading.clientX = clientX;
    reading.clientY = clientY;
    reading.present = true;
  };
  const release = () => {
    reading.present = false;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "touch") moveTo(event.clientX, event.clientY);
  };
  const handleTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch) moveTo(touch.clientX, touch.clientY);
  };
  const handleTouchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0) release();
  };

  const passive = { passive: true };
  window.addEventListener("pointermove", handlePointerMove, passive);
  window.addEventListener("touchstart", handleTouch, passive);
  window.addEventListener("touchmove", handleTouch, passive);
  window.addEventListener("touchend", handleTouchEnd, passive);
  window.addEventListener("touchcancel", handleTouchEnd, passive);
  window.addEventListener("blur", release);
  document.documentElement.addEventListener("mouseleave", release);

  return {
    reading,
    dispose() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("blur", release);
      document.documentElement.removeEventListener("mouseleave", release);
    },
  };
}
