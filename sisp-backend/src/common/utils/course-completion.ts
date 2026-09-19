import { PrismaService } from '../../prisma/prisma.service';

/**
 * Single source of truth for enrollment status and course completion
 * (Phase 5, P5-01/P5-05).
 *
 * The final printed thesis does not define a formal pass/fail grade
 * threshold, so completion is derived from the recorded enrollment status
 * only. Grade-based completion rules remain a documented limitation
 * (DEC-015) rather than an invented policy.
 */

export const ENROLLMENT_STATUSES = ['enrolled', 'completed', 'failed', 'dropped'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** Valid staff/registrar transitions between enrollment states. */
export const ENROLLMENT_TRANSITIONS: Record<string, string[]> = {
  enrolled: ['completed', 'failed', 'dropped'],
  dropped: ['enrolled'], // Registrar reinstatement (DEC-014)
  completed: [],
  failed: [],
};

export const COMPLETED_STATUS: EnrollmentStatus = 'completed';

export function isCompletedStatus(status: string): boolean {
  return status === COMPLETED_STATUS;
}

/**
 * Completed course IDs for a student, derived from enrollment records.
 * Used by prerequisite checks, curriculum progress, and the student API.
 */
export async function getCompletedCourseIdSet(
  prisma: PrismaService,
  studentProfileId: string,
): Promise<Set<string>> {
  const completed = await prisma.enrollment.findMany({
    where: { studentId: studentProfileId, status: COMPLETED_STATUS },
    select: { courseId: true },
  });
  return new Set(completed.map((entry) => entry.courseId));
}
