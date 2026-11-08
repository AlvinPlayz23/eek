import { useCallback, useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

type InViewOptions = { threshold?: number; rootMargin?: string; once?: boolean };

// Reports whether an element is on screen. With `once` it latches true after the first sighting.
// Without IntersectionObserver the element counts as visible so content is never hidden
export function useInView<T extends Element>({
  threshold = 0.15,
  rootMargin = "0px 0px -8% 0px",
  once = false,
}: InViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

// Scroll state and paging for a `.scroller` row
export function useCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const update = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setEdges({ atStart: node.scrollLeft <= 4, atEnd: node.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const page = useCallback(
    (direction: 1 | -1) => {
      const node = ref.current;
      if (!node) return;
      const card = node.querySelector<HTMLElement>("[data-card]");
      const step = ((card?.offsetWidth ?? 280) + 8) * 2;
      node.scrollBy({ left: direction * step, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced]
  );

  return { ref, ...edges, prev: () => page(-1), next: () => page(1) };
}
