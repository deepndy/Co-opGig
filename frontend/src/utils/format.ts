import { formatCategoryLabel } from '../config/serviceCategories';
import type { Job, Urgency } from '../types/domain';

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
  if (abs < 60) return formatter.format(Math.round(diffSeconds), 'second');
  if (abs < 3_600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86_400) return formatter.format(Math.round(diffSeconds / 3_600), 'hour');
  if (abs < 2_592_000) return formatter.format(Math.round(diffSeconds / 86_400), 'day');
  if (abs < 31_536_000) return formatter.format(Math.round(diffSeconds / 2_592_000), 'month');
  return formatter.format(Math.round(diffSeconds / 31_536_000), 'year');
}

export function initials(name: string): string {
  const parts = name
    .replace(/\(demo\)/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'CG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function availabilityLabel(value: string | null | undefined): string {
  const normalized = (value ?? '').toUpperCase();
  if (normalized === 'AVAILABLE') return 'Available';
  if (normalized === 'BUSY') return 'Busy';
  if (normalized === 'OFFLINE' || normalized === 'UNAVAILABLE') return 'Unavailable';
  return 'Availability not set';
}

export function isAvailable(value: string | null | undefined): boolean {
  return (value ?? '').toUpperCase() === 'AVAILABLE';
}

export function urgencyLabel(value: string | null | undefined): string {
  if (value === 'urgent') return 'Urgent · 24 hours';
  if (value === 'emergency') return 'Emergency · immediate risk';
  return 'Normal';
}

export function toUrgency(value: string | null | undefined): Urgency {
  if (value === 'urgent') return 'urgent';
  if (value === 'emergency') return 'emergency';
  return 'normal';
}

export function confidenceText(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;
}

export function jobReference(job: Pick<Job, 'id' | 'reference'>): string {
  return job.reference?.trim() || `#${job.id.slice(0, 8)}`;
}

export function jobSummaryName(category: string): string {
  return formatCategoryLabel(category);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}
