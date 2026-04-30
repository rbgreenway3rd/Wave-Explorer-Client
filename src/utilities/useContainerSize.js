import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useContainerSize — returns a callback ref + the live width/height of
 * the element it's attached to, via ResizeObserver. Updates whenever
 * the element's content box changes.
 *
 * Implemented as a *callback ref* (rather than a useRef + useEffect[[]])
 * so the observer attaches whenever the DOM node mounts — important
 * when the consumer conditionally renders the ref'd element (e.g.,
 * Heatmap only mounts its container when `wellArrays.length > 0`; an
 * effect with empty deps would run once at mount-time when the ref is
 * still null and never set up the observer).
 *
 * Returns `[ref, { width, height }]`. Initial size is `{0, 0}`; the
 * first ResizeObserver callback fires synchronously after the element
 * mounts.
 */
export function useContainerSize() {
  const observerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const setRef = useCallback((node) => {
    // Disconnect any previous observer when the ref changes (incl. unmount).
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.observe(node);
    observerRef.current = observer;

    // Seed the initial size synchronously so consumers don't have to
    // wait for the first observer callback.
    const rect = node.getBoundingClientRect();
    setSize((prev) =>
      prev.width === rect.width && prev.height === rect.height
        ? prev
        : { width: rect.width, height: rect.height }
    );
  }, []);

  // Cleanup on unmount of the consumer component.
  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return [setRef, size];
}

export default useContainerSize;
