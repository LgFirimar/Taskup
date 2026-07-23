import { useRef, useState } from "react";

// Minimal swipe-left-to-reveal-an-action gesture (iOS Mail style), built on
// Pointer Events so the exact same handlers work for touch AND mouse with no
// feature detection — which also means it "just works" under Playwright's
// mouse-based automation without any touch-emulation setup.
//
// Usage: spread swipeHandlers onto the draggable content element, use
// `offset` (a value from -revealWidth to 0) as its transform, and `dragging`
// to disable the snap-back transition while actively dragging.
//
// Deadzone: pointer capture is deliberately NOT taken on pointerdown, only
// once movement crosses DRAG_THRESHOLD. Capturing immediately would hijack
// every plain tap on a child button (rename/delete) inside the row — the
// browser would target the resulting click at the capturing element instead
// of the button actually under the finger, silently breaking those buttons
// even when the user never intended to swipe at all.
const DRAG_THRESHOLD = 8;

export function useSwipeToReveal(revealWidth = 76) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const pointerIdRef = useRef(null);
  const armedRef = useRef(false); // pointer is down, watching for threshold — not yet dragging
  // After a real drag ends with the pointer captured, the browser still
  // fires one more trailing "click" targeted at the capturing element (this
  // one, not whatever's visually under the finger). Left unhandled, a
  // content onClick wired up to "tap to close when open" would immediately
  // undo the swipe it was just told to reveal. This flag is set for exactly
  // that one synthetic click and consumed by wasDragClick() below.
  const suppressNextClickRef = useRef(false);

  const close = () => setOffset(0);
  // Call from the content element's onClick before doing anything else —
  // returns true (and clears the flag) if this click is the drag's trailing
  // synthetic one and should be ignored, false for a genuine tap.
  const wasDragClick = () => {
    if (!suppressNextClickRef.current) return false;
    suppressNextClickRef.current = false;
    return true;
  };

  const onPointerDown = (e) => {
    startXRef.current = e.clientX;
    startOffsetRef.current = offset;
    pointerIdRef.current = e.pointerId;
    armedRef.current = true;
    // No setPointerCapture here — see DRAG_THRESHOLD note above.
  };
  const onPointerMove = (e) => {
    if (!armedRef.current) return;
    const delta = e.clientX - startXRef.current;
    if (!dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return; // still inside the tap deadzone
      setDragging(true);
      e.currentTarget.setPointerCapture?.(pointerIdRef.current);
    }
    // Only ever swipe left (negative) — this is a reveal-on-the-right
    // pattern, not a general-purpose drag.
    const next = Math.min(0, Math.max(-revealWidth, startOffsetRef.current + delta));
    setOffset(next);
  };
  const endDrag = () => {
    armedRef.current = false;
    if (!dragging) return; // was just a tap — let the click pass through untouched
    setDragging(false);
    suppressNextClickRef.current = true;
    // Snap to fully open or fully closed based on which side of the
    // midpoint the drag ended on — no half-open resting state.
    setOffset(prev => (prev < -revealWidth / 2 ? -revealWidth : 0));
  };

  return {
    offset,
    dragging,
    isOpen: offset !== 0,
    close,
    wasDragClick,
    swipeHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
