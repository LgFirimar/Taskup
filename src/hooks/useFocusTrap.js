import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusable = (container) =>
  Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => el.offsetParent !== null);

// Keyboard-accessibility hook for modals/overlays/popovers: while `active` is
// true, Tab/Shift+Tab cycling is trapped inside `containerRef`'s DOM subtree
// (so keyboard/screen-reader users can't tab out into hidden background
// content), focus moves into the container on open (unless something inside
// already auto-focused itself, e.g. an autoFocus input), and focus is
// restored to whatever was focused before on close. Pass `onEscape` to also
// close on the Escape key — omit it for components that already manage their
// own nested Escape behavior (e.g. cancelling a sub-form) to avoid the two
// handlers fighting.
export function useFocusTrap(containerRef, active, onEscape) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    previouslyFocused.current = document.activeElement;

    if (!container.contains(document.activeElement)) {
      const focusable = getFocusable(container);
      (focusable[0] || container).focus?.();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
