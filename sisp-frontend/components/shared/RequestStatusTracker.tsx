import { cn } from '@/lib/utils';
import { Check, Clock, X } from 'lucide-react';

interface RequestStatusTrackerProps {
  status: string;
  statusStep: number;
  updatedAt: string;
}

const STEPS = [
  { step: 1, label: 'Pending' },
  { step: 2, label: 'Under Review' },
  { step: 3, label: 'Approved' },
  { step: 4, label: 'Released' },
];

export function RequestStatusTracker({
  status,
  statusStep,
  updatedAt,
}: RequestStatusTrackerProps) {
  const isRejected = status === 'rejected';

  if (isRejected) {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <X className="h-4 w-4" />
        <span className="text-sm font-medium">Request Rejected</span>
        <span className="text-xs text-muted-foreground">
          {new Date(updatedAt).toLocaleDateString()}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = statusStep > step.step;
          const isActive = statusStep === step.step;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.step} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isActive &&
                      'border-primary bg-primary/10 text-primary',
                    !isCompleted &&
                      !isActive &&
                      'border-muted bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : isActive ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    step.step
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1 text-center text-xs',
                    (isCompleted || isActive) && 'font-medium text-primary',
                    !isCompleted && !isActive && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'mb-4 h-0.5 flex-1 transition-all',
                    statusStep > step.step
                      ? 'bg-primary'
                      : 'bg-muted',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}