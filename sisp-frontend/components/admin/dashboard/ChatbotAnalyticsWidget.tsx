import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Sparkles } from 'lucide-react';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

interface IntentShare {
  intent: string;
  count: number;
  avgConfidence: number;
}

interface ChatbotAnalyticsWidgetProps {
  intentDistribution: IntentShare[];
}

export function ChatbotAnalyticsWidget({ intentDistribution }: ChatbotAnalyticsWidgetProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-indigo-650" />
          ARIA AI Classification Shares
        </h3>
        <p className="text-[10px] text-slate-400">Distribution of advisor intents classified in real-time</p>
      </div>
      <div className="h-[250px] w-full min-h-[250px] relative flex items-center justify-center">
        {intentDistribution && intentDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <PieChart>
              <Pie
                data={intentDistribution}
                dataKey="count"
                nameKey="intent"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
              >
                {intentDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                itemStyle={{ color: '#0f172a', fontSize: '9px' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={6}
                formatter={(value) => <span className="text-[9px] text-slate-500 font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            No chatbot analytics logs detected
          </div>
        )}
      </div>
    </div>
  );
}
