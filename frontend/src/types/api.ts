import type { AuthUser, Job, JobStatus, ServiceCategory, Urgency, UserRole, Worker } from './domain';

export interface AuthSession {
  user: AuthUser;
  token?: string | null;
  isDemo?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'CUSTOMER' | 'WORKER'>;
}

export interface WorkerQuery {
  category?: string;
  latitude?: number;
  longitude?: number;
  available?: boolean;
}

export interface CreateJobInput {
  description: string;
  category: string;
  categoryConfidence?: number | null;
  locationText: string;
  urgency: Urgency;
  /** A customer preference only; the job stays OPEN until the worker accepts. */
  preferredWorkerId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AssistantJobContext {
  locationText?: string | null;
  category?: string | null;
}

export interface AssistantChatInput {
  sessionId: string | null;
  message: string;
  jobContext?: AssistantJobContext;
  locale?: string;
}

export type AssistantNextAction =
  | 'ASK_QUESTION'
  | 'SUGGEST_CATEGORY'
  | 'READY_FOR_REVIEW'
  | 'HANDOFF_TO_BOOKING';

export interface AssistantExtractedFields {
  description?: string | null;
  category?: string | null;
  locationText?: string | null;
  urgency?: Urgency | string | null;
}

export interface AssistantReply {
  sessionId: string | null;
  reply: string;
  suggestedCategory: string | null;
  confidence: number | null;
  needsClarification: boolean;
  nextAction: AssistantNextAction;
  extractedFields?: AssistantExtractedFields;
}

export interface ClassificationAlternative {
  category: string;
  confidence: number | null;
}

export interface ClassificationResult {
  category: string | null;
  confidence: number | null;
  alternatives: ClassificationAlternative[];
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  reason: string;
}

export interface CoopGigApi {
  readonly isMock: boolean;
  getCategories(): Promise<ServiceCategory[]>;
  getWorkers(query?: WorkerQuery): Promise<Worker[]>;
  getWorker(workerId: string): Promise<Worker>;
  createJob(input: CreateJobInput): Promise<Job>;
  getMyJobs(): Promise<Job[]>;
  getJob(jobId: string): Promise<Job>;
  acceptJob(jobId: string): Promise<Job>;
  updateJobStatus(jobId: string, status: JobStatus): Promise<Job>;
  confirmCompletion(jobId: string): Promise<Job>;
  listOpenJobs(): Promise<Job[]>;
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  me(): Promise<AuthUser | null>;
  logout(): Promise<void>;
  assistantChat(input: AssistantChatInput): Promise<AssistantReply>;
  classify(description: string): Promise<ClassificationResult>;
}

