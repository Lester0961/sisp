export const LOCAL_DEMO_FIXTURE_IDS = new Set([
  'mock-student-id',
  'mock-faculty-id',
  'mock-admin-id',
  'mock-dean-id',
  'mock-sysadmin-id',
  'mock-live-agent-id',
]);

export const LOCAL_DEMO_FIXTURE_EMAILS = [
  'student@rmc.edu.ph',
  'faculty@rmc.edu.ph',
  'admin@rmc.edu.ph',
  'dean@rmc.edu.ph',
  'sysadmin@rmc.edu.ph',
  'agent@rmc.edu.ph',
] as const;

export const DEFAULT_LOCAL_DEMO_PASSWORD = 'local-demo-only';
export const DEFAULT_LOCAL_DEMO_PASSWORD_ALIASES = ['password123'] as const;
