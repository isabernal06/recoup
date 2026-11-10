import { diffInDays, parseDate } from './dates';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(value: string): string {
  return dateFormatter.format(parseDate(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(parseDate(value));
}

/** "today", "yesterday", "5 days ago", or "in 3 days" for future dates. */
export function formatRelativeDay(value: string, today: Date): string {
  const days = diffInDays(value, today);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days === -1) return 'tomorrow';
  return days > 0 ? `${days} days ago` : `in ${-days} days`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** "Monday, November 9". */
export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date);
}

/** "Good morning" / "Good afternoon" / "Good evening" for the given time. */
export function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
