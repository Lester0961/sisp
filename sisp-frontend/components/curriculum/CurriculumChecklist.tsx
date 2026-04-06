import { CheckCircle2, Circle } from 'lucide-react';
import type { CurriculumCourse } from '@/lib/api/curricula';

interface Props {
  curriculumCourses: CurriculumCourse[];
  completedCourseIds: string[];
}

export default function CurriculumChecklist({ curriculumCourses, completedCourseIds }: Props) {
  // Group by yearLevel then semester
  const grouped = curriculumCourses.reduce<Record<number, Record<number, CurriculumCourse[]>>>(
    (acc, course) => {
      acc[course.yearLevel] ??= {};
      acc[course.yearLevel][course.semester] ??= [];
      acc[course.yearLevel][course.semester].push(course);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([year, semesters]) => (
        <div key={year}>
          <h3 className="font-semibold text-gray-700 mb-2">Year {year}</h3>
          {Object.entries(semesters).map(([sem, courses]) => (
            <div key={sem} className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Semester {sem}</p>
              <ul className="space-y-1">
                {courses.map((course) => {
                  const done = completedCourseIds.includes(course.id);
                  return (
                    <li key={course.id} className="flex items-center gap-2 text-sm">
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                      <span className={done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                        {course.code} — {course.title}
                      </span>
                      <span className="ml-auto text-gray-400">{course.units} units</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}