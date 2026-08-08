'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
};

export function Reveal({ children, className, delay = 0, amount = 0.2 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HeroZoom({ children }: { children: ReactNode }) {
  const target = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ['start start', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.72]);

  return (
    <div ref={target} className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={reduceMotion ? undefined : { scale, opacity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function PosterReveal({ children, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 1.045 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
