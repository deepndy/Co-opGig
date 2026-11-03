export interface ServiceCategory {
  slug: string;
  name: string;
  description: string;
  tasks: string[];
}

export type JobStatus =
  | 'OPEN'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CUSTOMER_CONFIRMED'
  | 'CANCELLED';

export const JOB_STATUSES: JobStatus[] = [
  'OPEN',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CUSTOMER_CONFIRMED',
  'CANCELLED',
];

export type Urgency = 'normal' | 'urgent' | 'emergency';

export const URGENCY_LABELS: Record<Urgency, string> = {
  normal: 'Normal',
  urgent: 'Urgent — within 24 hours',
  emergency: 'Emergency — immediate risk',
};

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type UserRole = 'CUSTOMER' | 'WORKER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Optional link to the worker record, when the backend supplies one. */
  workerId?: string | null;
}

export interface Worker {
  id: string;
  displayName: string;
  serviceCategories: string[];
  serviceAreaText: string;
  latitude?: number | null;
  longitude?: number | null;
  availabilityStatus: string;
  verificationStatus: VerificationStatus | string;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  completedJobsCount?: number | null;
  bio?: string | null;
  isDemo?: boolean;
}

export interface Job {
  id: string;
  reference?: string | null;
  customerId: string;
  description: string;
  category: string;
  categoryConfidence?: number | null;
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;
  urgency?: string | null;
  status: JobStatus;
  assignedWorkerId?: string | null;
  preferredWorkerId?: string | null;
  assignedWorkerName?: string | null;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: 'Open',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CUSTOMER_CONFIRMED: 'Customer confirmed',
  CANCELLED: 'Cancelled',
};

export const ACTIVE_JOB_STATUSES: JobStatus[] = ['OPEN', 'ACCEPTED', 'IN_PROGRESS'];
export const CLOSED_JOB_STATUSES: JobStatus[] = ['COMPLETED', 'CUSTOMER_CONFIRMED', 'CANCELLED'];

