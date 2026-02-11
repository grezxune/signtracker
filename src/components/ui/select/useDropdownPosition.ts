import { useCallback, useEffect, useState } from "react";

export function useDropdownPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  offsetX = 0,
) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + offsetX,
      width: rect.width,
    });
  }, [offsetX, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  return position;
}
