import type { Settings } from '@/domain/models';

const DAY_MS = 24 * 60 * 60 * 1000;

export const BACKUP_REMINDER_DAYS = 30;
export const BACKUP_DISMISS_DAYS = 7;

export function shouldShowBackupReminder(
  settings: Settings | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!settings?.onboardingCompletedAt) {
    return false;
  }

  const lastSignal = settings.lastBackupAt ?? settings.onboardingCompletedAt;
  const elapsed = now.getTime() - Date.parse(lastSignal);
  if (!(elapsed >= BACKUP_REMINDER_DAYS * DAY_MS)) {
    return false;
  }

  if (settings.backupReminderDismissedAt) {
    const dismissed = now.getTime() - Date.parse(settings.backupReminderDismissedAt);
    if (dismissed < BACKUP_DISMISS_DAYS * DAY_MS) {
      return false;
    }
  }

  return true;
}
