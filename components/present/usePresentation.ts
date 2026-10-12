"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent } from "react";

const SWIPE_DISTANCE_PX = 60;
const CURSOR_IDLE_MS = 1400;

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function clampSlide(index: number, slideCount: number) {
  return Math.min(Math.max(index, 0), slideCount - 1);
}

function slideFromHash(slideCount: number) {
  const slideNumber = Number.parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(slideNumber) ? clampSlide(slideNumber - 1, slideCount) : 0;
}

function showSlide(index: number) {
  window.history.replaceState(null, "", `#${index + 1}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void document.documentElement.requestFullscreen({ navigationUI: "hide" });
}

function useKeyboardControls(goTo: (index: number) => void, step: (offset: 1 | -1) => void, slideCount: number) {
  useEffect(() => {
    const actions: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowDown: () => step(1),
      PageDown: () => step(1),
      " ": () => step(1),
      Enter: () => step(1),
      ArrowLeft: () => step(-1),
      ArrowUp: () => step(-1),
      PageUp: () => step(-1),
      Backspace: () => step(-1),
      Home: () => goTo(0),
      End: () => goTo(slideCount - 1),
      f: toggleFullscreen,
    };

    function handleKeyDown(event: KeyboardEvent) {
      const action = actions[event.key];
      if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      action();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goTo, step, slideCount]);
}

export function usePresentation(slideCount: number) {
  const index = useSyncExternalStore(subscribeToHash, () => slideFromHash(slideCount), () => 0);
  const pointerStart = useRef<number | null>(null);

  const goTo = useCallback((requested: number) => showSlide(clampSlide(requested, slideCount)), [slideCount]);
  const step = useCallback((offset: 1 | -1) => goTo(slideFromHash(slideCount) + offset), [goTo, slideCount]);
  useKeyboardControls(goTo, step, slideCount);

  const onPointerDown = useCallback((event: PointerEvent) => {
    pointerStart.current = event.button === 0 ? event.clientX : null;
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      const startX = pointerStart.current;
      pointerStart.current = null;
      if (startX === null) return;
      const travel = event.clientX - startX;
      step(travel >= SWIPE_DISTANCE_PX ? -1 : 1);
    },
    [step],
  );

  const onContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      step(-1);
    },
    [step],
  );

  return { index, pointerHandlers: { onPointerDown, onPointerUp, onContextMenu } };
}

export function useIdleCursor() {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timer = window.setTimeout(() => setIsIdle(true), CURSOR_IDLE_MS);

    function wake() {
      setIsIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsIdle(true), CURSOR_IDLE_MS);
    }

    window.addEventListener("pointermove", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
    };
  }, []);

  return isIdle;
}
