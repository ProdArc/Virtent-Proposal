"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

interface CountUpProps {
  value: string;
  active: boolean;
  duration?: number;
  delayMs?: number;
  className?: string;
}

const NUMBER_RE = /\d[\d.]*\d|\d/;

/**
 * Animates the first numeric run inside `value` (e.g. "R$ 7.245", "42%", "~30%")
 * from 0 up to its target while keeping surrounding text (currency signs, "%",
 * "mil", "~") static. Falls back to the plain string when reduced motion is on
 * or no digits are found.
 */
export function CountUp({ value, active, duration = 1100, delayMs = 300, className }: CountUpProps) {
  const reduce = useReducedMotion();
  const match = value.match(NUMBER_RE);
  const started = useRef(false);
  const [display, setDisplay] = useState(() => {
    if (reduce || !match) return value;
    return value.slice(0, match.index) + "0" + value.slice((match.index ?? 0) + match[0].length);
  });

  useEffect(() => {
    if (!match) return;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);

    // Reset to "0" so the count-up can replay next time this scrolls into view.
    if (!active) {
      started.current = false;
      if (!reduce) setDisplay(prefix + "0" + suffix);
      return;
    }

    if (reduce || started.current) return;
    started.current = true;

    const target = parseInt(match[0].replace(/\./g, ""), 10);
    let raf: number;

    const timeout = setTimeout(() => {
      const t0 = performance.now();
      function tick(now: number) {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = Math.floor(eased * target);
        setDisplay(prefix + current.toLocaleString("pt-BR") + suffix);
        if (p < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce]);

  return <span className={className}>{display}</span>;
}
