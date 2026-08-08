import { BarChart3 } from 'lucide-react';

interface GpaBracket {
  bracket: string;
  count: number;
}

interface PassFailRate {
  code: string;
  title: string;
  pass: number;
  fail: number;
}

interface GpaDistributionWidgetProps {
  gpaChartData: GpaBracket[];
  passFailData: PassFailRate[];
}

function ChartEmpty({ title, description }: { title: string; description: string }) {
  return (
    <section className="portal-surface portal-empty min-h-[15rem]">
      <BarChart3 className="size-8 text-[#0a439b]" strokeWidth={1.7} />
      <div>
        <h3 className="font-semibold text-[#102f49]">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-[#587387]">{description}</p>
      </div>
    </section>
  );
}

export function GpaDistributionWidget({ gpaChartData, passFailData }: GpaDistributionWidgetProps) {
  if (!gpaChartData.length && !passFailData.length) {
    return <ChartEmpty title="No grade analytics yet" description="Academic analytics will appear when grade data is available for reporting." />;
  }

  const maximumCount = Math.max(...gpaChartData.map((item) => item.count), 1);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {gpaChartData.length ? (
        <section className="portal-surface p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#102f49]">Grade distribution</h3>
            <p className="mt-1 text-sm text-[#587387]">Students by final-grade bracket.</p>
          </div>
          <dl className="space-y-4">
            {gpaChartData.map((item) => {
              const percentage = Math.max(8, Math.round((item.count / maximumCount) * 100));
              return (
                <div key={item.bracket}>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-[#365a72]">{item.bracket}</dt>
                    <dd className="text-sm font-semibold text-[#102f49]">{item.count}</dd>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8f0f5]" role="progressbar" aria-label={`${item.bracket}: ${item.count} students`} aria-valuemin={0} aria-valuemax={maximumCount} aria-valuenow={item.count}>
                    <div className="h-full rounded-full bg-[#0a439b]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      ) : <ChartEmpty title="No grade distribution yet" description="Grade brackets will appear when records are ready." />}

      {passFailData.length ? (
        <section className="portal-surface p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#102f49]">Course outcomes</h3>
            <p className="mt-1 text-sm text-[#587387]">Passing and failing outcomes by course.</p>
          </div>
          <ul className="divide-y divide-[#e8f0f5]">
            {passFailData.map((item) => (
              <li key={item.code} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="font-medium text-[#102f49]">{item.code}</p><p className="mt-0.5 truncate text-xs text-[#587387]">{item.title}</p></div>
                  <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-[#dce7ef] text-center text-xs">
                    <span className="bg-[#effaf4] px-2 py-1 font-semibold text-[#16794c]" aria-label={`${item.pass} passed`}>{item.pass} pass</span>
                    <span className="border-l border-[#dce7ef] bg-[#fff4f4] px-2 py-1 font-semibold text-[#b42318]" aria-label={`${item.fail} failed`}>{item.fail} fail</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : <ChartEmpty title="No course outcomes yet" description="Course outcomes will appear when approved grades are available." />}
    </div>
  );
}
