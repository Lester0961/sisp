'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Clock, MapPin, RefreshCw, User } from 'lucide-react';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { Button } from '@/components/ui/button';

interface ScheduleSlot {
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
}

interface ScheduleEntry {
  id: string;
  courseCode: string | null;
  courseTitle: string | null;
  units: number;
  section: string | null;
  instructor: string | null;
  term: { code: string; label: string; academicYear: string } | null;
  schedulePublished: boolean;
  schedules: ScheduleSlot[];
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export default function SchedulePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enrollmentsApi.getMySchedule();
      setEntries(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setError('We could not load your schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  return (
    <div className="portal-page">
      <main className="portal-main pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">My schedule</h1>
            <p className="portal-description mt-2">Published class sections and meeting times for your active enrollment.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSchedule()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-5 w-40" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Schedule unavailable</h2>
              <p className="mt-1 text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadSchedule()}>Try again</Button>
          </section>
        ) : entries.length === 0 ? (
          <section className="portal-surface portal-empty">
            <CalendarDays className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No enrolled courses yet</h2>
              <p className="mt-1 text-sm text-[#587387]">Your schedule will appear here when enrollment is confirmed.</p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {entries.map((entry) => (
              <article key={entry.id} className="portal-surface overflow-hidden">
                <div className="flex flex-col gap-1 border-b border-[#dce7ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-[#102f49]">
                      <span className="text-[#0a439b]">{entry.courseCode}</span> · {entry.courseTitle}
                    </h2>
                    <p className="mt-1 text-xs text-[#587387]">
                      {entry.units} units
                      {entry.section ? ` · Section ${entry.section}` : ' · Section to be assigned'}
                      {entry.term ? ` · ${entry.term.academicYear} ${entry.term.label}` : ''}
                    </p>
                  </div>
                  {entry.instructor ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-[#365a72]">
                      <User className="size-3.5" strokeWidth={1.8} />
                      {entry.instructor}
                    </p>
                  ) : null}
                </div>

                {entry.schedulePublished ? (
                  <ul className="divide-y divide-[#e7eef3]">
                    {entry.schedules.map((slot, index) => (
                      <li key={`${entry.id}-${index}`} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 text-sm text-[#102f49]">
                        <span className="font-medium">{slot.dayOfWeek}</span>
                        <span className="flex items-center gap-1.5 text-[#587387]">
                          <Clock className="size-3.5" strokeWidth={1.8} />
                          {formatTime(slot.startTime)}
                          {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ''}
                        </span>
                        {slot.room ? (
                          <span className="flex items-center gap-1.5 text-[#587387]">
                            <MapPin className="size-3.5" strokeWidth={1.8} />
                            {slot.room}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-3 text-xs text-[#587387]">
                    Meeting day, time, and room for this section have not been published yet.
                  </p>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
