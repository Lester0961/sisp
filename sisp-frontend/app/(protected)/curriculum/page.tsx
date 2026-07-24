'use client';
import { useEffect, useState } from 'react';
import { curriculaApi, type CurriculumCourse } from '@/lib/api/curricula';
import CurriculumChecklist from '@/components/curriculum/CurriculumChecklist';

export default function CurriculumPage() {
  const [courses, setCourses]               = useState<CurriculumCourse[]>([]);
  const [completedIds, setCompletedIds]     = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      curriculaApi.getMyCurriculum(),
      curriculaApi.getCompletedCourseIds(),
    ])
      .then(([c, ids]) => {
        setCourses(c);
        setCompletedIds(ids);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load curriculum:', err);
        setError('Failed to load curriculum data. Please ensure your student profile has a program assigned.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-gray-500 font-medium">Loading curriculum...</div>;

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Curriculum Checklist</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-600 text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Curriculum Checklist</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <CurriculumChecklist curriculumCourses={courses} completedCourseIds={completedIds} />
      </div>
    </div>
  );
}