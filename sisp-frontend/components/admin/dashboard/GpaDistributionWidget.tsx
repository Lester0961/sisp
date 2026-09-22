import { BarChart3 } from 'lucide-react';

export interface GradeBand {
  band: string;
  count: number;
}

interface GpaDistributionWidgetProps {
  publishedGradeCount: number;
  distribution?: GradeBand[];
}

export function GpaDistributionWidget({
  publishedGradeCount,
  distribution,
}: GpaDistributionWidgetProps) {
  const bands = Array.isArray(distribution) ? distribution : [];
  const maxCount = Math.max(...bands.map((item) => item.count), 1);

  return (
    <section className="portal-surface p-5">
      <BarChart3 className="size-8 text-[#0a439b]" strokeWidth={1.7} />
      <h3 className="mt-3 font-semibold text-[#102f49]">Published grade records</h3>
      <p className="mt-1 text-2xl font-semibold text-[#102f49]">{publishedGradeCount}</p>
      {bands.length > 0 ? (
        <ul className="mt-3 space-y-1.5" aria-label="Published grades by final-grade band">
          {bands.map((item) => (
            <li key={item.band} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-[#587387]">{item.band}</span>
              <span
                className="h-2 rounded-full bg-[#0a439b]/80"
                style={{
                  width: `${item.count > 0 ? Math.max((item.count / maxCount) * 100, 8) : 0}%`,
                }}
              />
              <span className="font-semibold text-[#102f49]">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-[#587387]">
        Counts published grade records grouped into numeric final-grade bands.
      </p>
    </section>
  );
}
