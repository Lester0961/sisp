import React from 'react';
import { cn } from '@/lib/utils';

interface AmbientBackgroundProps {
  className?: string;
  topColor?: string;
  bottomColor?: string;
}

export function AmbientBackground({ className }: AmbientBackgroundProps) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden', className)}>
      <div className="absolute right-[8%] top-0 size-[28rem] rounded-full bg-[#0a439b]/[0.035] blur-[140px]" />
      <div className="absolute bottom-[10%] left-[4%] size-[22rem] rounded-full bg-[#4e89b9]/[0.04] blur-[130px]" />
    </div>
  );
}
