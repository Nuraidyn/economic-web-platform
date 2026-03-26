import { useEffect, useRef, useState } from "react";

/**
 * Scroll-based reveal hook using IntersectionObserver.
 * Respects prefers-reduced-motion — immediately marks visible if motion is reduced.
 * @param {number} threshold - 0–1, fraction of element visible to trigger (default 0.12)
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
