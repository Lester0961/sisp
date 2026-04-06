'use client';
import { useEffect, useState } from 'react';
import { curriculaApi, type CurriculumCourse } from '@/lib/api/curricula';
import CurriculumChecklist from '@/components/curriculum/CurriculumChecklist';

export default function CurriculumPage() {
  const [courses, setCourses]               = useState<CurriculumCourse[]>([]);
  const [completedIds, setCompletedIds]     = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      curriculaApi.getMyCurriculum(),
      curriculaApi.getCompletedCourseIds(),
    ]).then(([c, ids]) => {
      setCourses(c);
      setCompletedIds(ids);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading curriculum...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Curriculum Checklist</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <CurriculumChecklist curriculumCourses={courses} completedCourseIds={completedIds} />
      </div>
    </div>
  );
}