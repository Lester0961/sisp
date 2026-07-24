import { BadRequestException } from '@nestjs/common';

export function assertTransition(
  current: string,
  next: string,
  transitions: Record<string, string[]>,
): void {
  const allowedNext = transitions[current] ?? [];
  if (!allowedNext.includes(next)) {
    throw new BadRequestException(
      `Cannot transition from '${current}' to '${next}'. ` +
        `Allowed next statuses: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal status)'}`,
    );
  }
}
