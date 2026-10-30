import { describe, expect, it } from 'vitest';
import type { ISOTimestamp, Settings } from '@/domain/models';
import { shouldShowBackupReminder } from './backup-reminder';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-30T12:00:00.000Z');

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'app',
    currency: 'PEN',
    locale: 'es-PE',
    timezone: 'America/Lima',
    theme: 'system',
    onboardingStep: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Settings;
}

function daysAgo(days: number): ISOTimestamp {
  return new Date(now.getTime() - days * DAY_MS).toISOString() as ISOTimestamp;
}

describe('shouldShowBackupReminder', () => {
  it('does not remind before onboarding is complete', () => {
    expect(shouldShowBackupReminder(settings(), now)).toBe(false);
  });

  it('does not remind during the first 30 days after onboarding', () => {
    const recent = settings({ onboardingCompletedAt: daysAgo(29) });

    expect(shouldShowBackupReminder(recent, now)).toBe(false);
  });

  it('reminds after 30 days without a backup', () => {
    const stale = settings({ onboardingCompletedAt: daysAgo(31) });

    expect(shouldShowBackupReminder(stale, now)).toBe(true);
  });

  it('uses the last backup date when it exists', () => {
    const recentBackup = settings({
      onboardingCompletedAt: daysAgo(120),
      lastBackupAt: daysAgo(10),
    });
    const staleBackup = settings({
      onboardingCompletedAt: daysAgo(120),
      lastBackupAt: daysAgo(45),
    });

    expect(shouldShowBackupReminder(recentBackup, now)).toBe(false);
    expect(shouldShowBackupReminder(staleBackup, now)).toBe(true);
  });

  it('stays hidden for 7 days after being dismissed', () => {
    const dismissed = settings({
      onboardingCompletedAt: daysAgo(60),
      backupReminderDismissedAt: daysAgo(2),
    });

    expect(shouldShowBackupReminder(dismissed, now)).toBe(false);
  });

  it('comes back a week after being dismissed', () => {
    const dismissed = settings({
      onboardingCompletedAt: daysAgo(60),
      backupReminderDismissedAt: daysAgo(8),
    });

    expect(shouldShowBackupReminder(dismissed, now)).toBe(true);
  });
});
