"use client";

import { motion, useReducedMotion } from "motion/react";

/** Única curva de easing da página — usar em toda animação nova. */
export const PAGE_EASE = [0.16, 1, 0.3, 1] as const;

interface RevealMotionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right";
  /** Entrada com blur(4px) → 0 além de opacity/translate. Usar com parcimônia (cards de destaque). */
  blur?: boolean;
  /** false = replay a cada entrada/saída da viewport (padrão da página: roda 1x). */
  once?: boolean;
}

export function RevealMotion({
  children,
  delay = 0,
  className,
  direction = "up",
  blur = false,
  once = true,
}: RevealMotionProps) {
  const reduce = useReducedMotion();

  const offset =
    direction === "left"
      ? { x: -24 }
      : direction === "right"
        ? { x: 24 }
        : { y: 24 };

  const initial = blur
    ? { opacity: 0, filter: "blur(4px)", ...offset }
    : { opacity: 0, ...offset };

  const target = blur
    ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
    : { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      className={className}
      initial={reduce ? false : initial}
      whileInView={target}
      viewport={{ once, amount: 0.25 }}
      transition={{
        duration: 0.6,
        delay,
        ease: PAGE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
