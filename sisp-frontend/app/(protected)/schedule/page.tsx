'use client';
import { useEffect, useState } from 'react';
import { enrollmentsApi, type Enrollment } from '@/lib/api/enrollments';

export default function SchedulePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    enrollmentsApi.getMyEnrollments().then((data) => {
      setEnrollments(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading schedule...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Course Code', 'Title', 'Section', 'Units'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrollments.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.course.code}</td>
                <td className="px-4 py-3">{e.course.title}</td>
                <td className="px-4 py-3">{e.section}</td>
                <td className="px-4 py-3">{e.course.units}</td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No enrollments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}