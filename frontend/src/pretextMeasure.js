import { useEffect, useMemo, useState } from "react";
import { layout, prepare } from "@chenglou/pretext";

function safeWindowWidth() {
  if (typeof window === "undefined") return 1200;
  return window.innerWidth || 1200;
}

/**
 * Returns a stable minimum block height computed with Pretext.
 * Use for scroll overlays where DOM reflow-based measurement would be costly.
 */
export function usePretextBlockMetrics({
  text,
  font,
  lineHeight,
  widthPadding = 0.16,
  minHeight = 200
}) {
  const [height, setHeight] = useState(minHeight);
  const prepared = useMemo(() => prepare(text, font), [text, font]);

  useEffect(() => {
    const compute = () => {
      const width = Math.max(280, Math.round(safeWindowWidth() * (1 - widthPadding)));
      const result = layout(prepared, width, lineHeight);
      setHeight(Math.max(minHeight, result.height));
    };

    compute();
    window.addEventListener("resize", compute, { passive: true });
    return () => window.removeEventListener("resize", compute);
  }, [prepared, lineHeight, minHeight, widthPadding]);

  return height;
}
