import { useLayoutEffect, useRef, useState } from "react";

/**
 * Scroll-based reveal hook using IntersectionObserver.
 * Respects prefers-reduced-motion — immediately marks visible if motion is reduced.
 * Elements already in the viewport on mount are marked visible instantly (no animation)
 * so interactive controls are never hidden on page load.
 * @param {number} threshold - 0–1, fraction of element visible to trigger (default 0.12)
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    // Already in viewport — mark visible immediately, no entrance animation needed
    const rect = el.getBoundingClientRect();
    const vp = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vp && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, visible];
}
