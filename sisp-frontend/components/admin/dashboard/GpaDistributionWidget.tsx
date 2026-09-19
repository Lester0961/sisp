import { BarChart3 } from 'lucide-react';

interface GpaDistributionWidgetProps {
  publishedGradeCount: number;
}

export function GpaDistributionWidget({ publishedGradeCount }: GpaDistributionWidgetProps) {
  return (
    <section className="portal-surface p-5">
      <BarChart3 className="size-8 text-[#0a439b]" strokeWidth={1.7} />
      <h3 className="mt-3 font-semibold text-[#102f49]">Published grade records</h3>
      <p className="mt-1 text-2xl font-semibold text-[#102f49]">{publishedGradeCount}</p>
      <p className="mt-1 text-sm text-[#587387]">This count uses published grade records. Grade bands and pass/fail classifications require an approved institutional rule.</p>
    </section>
  );
}
