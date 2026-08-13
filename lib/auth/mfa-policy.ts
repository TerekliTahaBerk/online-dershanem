export const MFA_PATH = "/giris/mfa";
export const MFA_ENROLL_PATH = "/giris/mfa/enroll";
export const STEP_UP_PATH = "/panel/guvenlik";
export const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000;

export function hasFreshStepUp(stepUpAt: Date | null, now = Date.now()): boolean {
  return Boolean(stepUpAt && now - stepUpAt.getTime() <= STEP_UP_MAX_AGE_MS);
}
