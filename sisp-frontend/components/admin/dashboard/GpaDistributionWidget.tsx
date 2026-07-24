import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

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

export function GpaDistributionWidget({ gpaChartData, passFailData }: GpaDistributionWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* GPA Distribution Matrix */}
      <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">SISP GPA Bracket Distributions</h3>
          <p className="text-[10px] text-slate-400">Student count allocations per academic grading bracket</p>
        </div>
        <div className="h-[250px] w-full min-h-[250px] text-slate-500">
          {gpaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart data={gpaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="bracket" stroke="#64748B" fontSize={8} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#8b5cf6', fontSize: '9px' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                  {gpaChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
              No grade matrix profiles logged
            </div>
          )}
        </div>
      </div>

      {/* Course Grade Pass/Fail Rates */}
      <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Class Performance Outcome Ratios</h3>
          <p className="text-[10px] text-slate-400">Ratio of student passing outcomes versus failed scores per course</p>
        </div>
        <div className="h-[250px] w-full min-h-[250px] text-slate-500">
          {passFailData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart data={passFailData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="code" stroke="#64748B" fontSize={8} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  iconType="circle"
                  iconSize={6}
                  formatter={(value) => <span className="text-[9px] text-slate-500 font-medium capitalize">{value}</span>}
                />
                <Bar dataKey="pass" fill="#10B981" radius={[4, 4, 0, 0]} name="Passed" />
                <Bar dataKey="fail" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
              No course outcome scores recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
