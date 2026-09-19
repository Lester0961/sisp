import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { ProgressCourse } from '@/lib/api/curricula';

interface Props {
  courses: ProgressCourse[];
}

/**
 * Displays server-computed curriculum progress (P4-06). No completion or
 * percentage logic is computed in the browser.
 */
export default function CurriculumChecklist({ courses }: Props) {
  // Group by yearLevel then trisemestral term, retaining the legacy semester
  // field as a fallback.
  const grouped = courses.reduce<Record<number, Record<number, ProgressCourse[]>>>(
    (acc, course) => {
      acc[course.yearLevel] ??= {};
      const termNumber = course.termNumber ?? course.semester;
      acc[course.yearLevel][termNumber] ??= [];
      acc[course.yearLevel][termNumber].push(course);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([year, semesters]) => (
        <div key={year}>
          <h3 className="font-semibold text-gray-700 mb-2">Year {year}</h3>
          {Object.entries(semesters).map(([sem, termCourses]) => (
            <div key={sem} className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Term {sem}</p>
              <ul className="space-y-1">
                {termCourses.map((course) => {
                  const unmet = course.prerequisites.filter((prereq) => !prereq.satisfied);
                  const done = course.status === 'completed';
                  const ongoing = course.status === 'ongoing';
                  return (
                    <li key={course.id} className="flex items-center gap-2 text-sm">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : ongoing ? (
                        <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                        {course.code} · {course.title}
                        {course.prereqText ? (
                          <span className="ml-1 text-xs text-gray-400">(Prereq: {course.prereqText})</span>
                        ) : null}
                        {unmet.length > 0 ? (
                          <span className="ml-1 text-xs font-medium text-amber-700">
                            Unmet: {unmet.map((prereq) => prereq.requiresCode).join(', ')}
                          </span>
                        ) : null}
                      </span>
                      <span className="ml-auto text-gray-400">
                        {ongoing ? 'Ongoing · ' : ''}
                        {course.units} units
                        {course.lecUnits != null || course.labUnits != null
                          ? ` (LEC ${course.lecUnits ?? 0} / LAB ${course.labUnits ?? 0})`
                          : ''}
                      </span>
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
