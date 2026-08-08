import { GraduationCap, Users } from 'lucide-react';

interface EnrollmentStat {
  programId: string;
  programName: string;
  count: number;
}

interface EnrollmentWidgetProps {
  data: EnrollmentStat[];
}

export function EnrollmentWidget({ data }: EnrollmentWidgetProps) {
  if (!data.length) {
    return (
      <section className="portal-surface portal-empty min-h-[15rem]">
        <Users className="size-8 text-[#0a439b]" strokeWidth={1.7} />
        <div>
          <h3 className="font-semibold text-[#102f49]">No enrollment data yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#587387]">Program allocation will appear when active enrollment records are available.</p>
        </div>
      </section>
    );
  }

  const maximum = Math.max(...data.map((item) => item.count), 1);

  return (
    <section className="portal-surface p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-[#eaf3fa] text-[#0a439b]">
          <GraduationCap className="size-4" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-semibold text-[#102f49]">Program enrollment</h3>
          <p className="mt-1 text-sm text-[#587387]">Active students by program.</p>
        </div>
      </div>
      <dl className="space-y-4">
        {data.map((item) => {
          const percentage = Math.max(8, Math.round((item.count / maximum) * 100));
          return (
            <div key={item.programId}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-sm font-medium text-[#365a72]">{item.programName}</dt>
                <dd className="shrink-0 text-sm font-semibold text-[#102f49]">{item.count}</dd>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8f0f5]" role="progressbar" aria-label={`${item.programName}: ${item.count} students`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={item.count}>
                <div className="h-full rounded-full bg-[#0a439b]" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
