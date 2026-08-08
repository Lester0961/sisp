import { MessageSquareText, Sparkles } from 'lucide-react';

interface IntentShare {
  intent: string;
  count: number;
  avgConfidence: number;
}

interface ChatbotAnalyticsWidgetProps {
  intentDistribution: IntentShare[];
}

export function ChatbotAnalyticsWidget({ intentDistribution }: ChatbotAnalyticsWidgetProps) {
  if (!intentDistribution.length) {
    return (
      <section className="portal-surface portal-empty min-h-[15rem]">
        <Sparkles className="size-8 text-[#0a439b]" strokeWidth={1.7} />
        <div>
          <h3 className="font-semibold text-[#102f49]">No ARIA activity yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#587387]">Intent activity will appear when advisory conversations are recorded.</p>
        </div>
      </section>
    );
  }

  const total = intentDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <section className="portal-surface p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-[#eaf3fa] text-[#0a439b]">
          <MessageSquareText className="size-4" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-semibold text-[#102f49]">ARIA topics</h3>
          <p className="mt-1 text-sm text-[#587387]">Conversation intent distribution.</p>
        </div>
      </div>
      <ul className="divide-y divide-[#e8f0f5]">
        {intentDistribution.map((item) => {
          const share = Math.round((item.count / total) * 100);
          return (
            <li key={item.intent} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize text-[#365a72]">{item.intent.replace(/_/g, ' ')}</p>
                <p className="mt-0.5 text-xs text-[#587387]">{share}% of recorded requests</p>
              </div>
              <span className="shrink-0 rounded-lg bg-[#eef6fc] px-2 py-1 text-xs font-semibold text-[#0a439b]">{item.count}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
