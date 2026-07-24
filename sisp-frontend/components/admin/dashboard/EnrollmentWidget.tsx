import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

interface EnrollmentStat {
  programId: string;
  programName: string;
  count: number;
}

interface EnrollmentWidgetProps {
  data: EnrollmentStat[];
}

export function EnrollmentWidget({ data }: EnrollmentWidgetProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Program Enrollment Allocations</h3>
          <p className="text-[10px] text-slate-400">Breakdown of student registrations per curriculum profile</p>
        </div>
        <div className="h-7 px-2 bg-indigo-50 border border-indigo-100 rounded-md flex items-center gap-1 text-[9px] font-bold text-indigo-750">
          <TrendingUp className="h-3.5 w-3.5" />
          Live Feed
        </div>
      </div>
      <div className="h-[250px] w-full min-h-[250px] text-slate-500">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="programName" stroke="#64748B" fontSize={8} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                itemStyle={{ color: '#4f46e5', fontSize: '9px' }}
              />
              <Bar dataKey="count" fill="url(#indigoGrad)" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            No active enrollment metrics logged
          </div>
        )}
      </div>
    </div>
  );
}
