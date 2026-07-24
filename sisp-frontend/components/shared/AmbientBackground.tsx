import React from 'react';
import { cn } from '@/lib/utils';

interface AmbientBackgroundProps {
  className?: string;
  topColor?: string; // Tailwind background color class, e.g. "bg-indigo-500/5"
  bottomColor?: string; // Tailwind background color class, e.g. "bg-violet-600/5"
}

export function AmbientBackground({
  className,
  topColor = 'bg-indigo-500/5',
  bottomColor = 'bg-violet-600/5',
}: AmbientBackgroundProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none z-0', className)}>
      <div className={cn('absolute top-[5%] right-[10%] h-[400px] w-[400px] rounded-full blur-[130px] animate-pulse duration-[7s]', topColor)} />
      <div className={cn('absolute bottom-[20%] left-[5%] h-[350px] w-[350px] rounded-full blur-[120px]', bottomColor)} />
    </div>
  );
}
