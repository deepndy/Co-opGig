import { CalendarClock, CheckCircle2, ClipboardList, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage, isDemoMode } from '../api';
import { useAuth } from '../auth/AuthContext';
import { JobCard, type JobAction } from '../components/jobs/JobCard';
import { requestAssistant } from '../components/assistant/assistantEvents';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useAsyncData } from '../hooks/useAsyncData';
import { ACTIVE_JOB_STATUSES, CLOSED_JOB_STATUSES, type Job } from '../types/domain';
import { jobReference } from '../utils/format';

export function CustomerDashboardPage() {
  const { user, isDemoSession } = useAuth();
  const jobsState = useAsyncData(() => api.getMyJobs(), [user?.id]);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const jobs = jobsState.data ?? [];
  const activeJobs = jobs.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status));
  const awaitingConfirmation = jobs.filter((job) => job.status === 'COMPLETED');
  const confirmedJobs = jobs.filter((job) => job.status === 'CUSTOMER_CONFIRMED');
  const cancelledJobs = jobs.filter((job) => job.status === 'CANCELLED');
  const closedJobs = jobs.filter((job) => CLOSED_JOB_STATUSES.includes(job.status));

  async function handleAction(job: Job, action: JobAction) {
    if (action !== 'confirm') return;
    setBusyJobId(job.id);
    setActionError(null);
    setNotice(null);
    try {
      const updated = await api.confirmCompletion(job.id);
      setNotice(`Completion confirmed for ${jobReference(updated)}. No payment has been recorded.`);
      jobsState.reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyJobId(null);
    }
  }

  const stats = [
    {
      icon: ClipboardList,
      label: 'Open requests',
      value: jobs.filter((job) => job.status === 'OPEN').length,
      tone: 'blue',
    },
    {
      icon: CalendarClock,
      label: 'Active jobs',
      value: jobs.filter((job) => job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS').length,
      tone: 'amber',
    },
    {
      icon: Sparkles,
      label: 'Awaiting your confirmation',
      value: awaitingConfirmation.length,
      tone: 'violet',
    },
    {
      icon: CheckCircle2,
      label: 'Confirmed jobs',
      value: confirmedJobs.length,
      tone: 'green',
    },
  ];

  return (
    <>
      <section className="cg-dashboard-hero">
        <div className="cg-container cg-dashboard-hero__inner">
          <div>
            <p className="cg-eyebrow">Customer workspace</p>
            <h1>Your service requests, all in one place.</h1>
            <p>
              Track open requests, see which worker accepted, and confirm completion when the work is done. Nothing here
              processes a payment.
            </p>
          </div>
          <div className="cg-dashboard-hero__actions">
            {isDemoSession ? <span className="cg-badge cg-badge--demo">Demo session</span> : null}
            <Link className="cg-btn cg-btn--primary" to="/book">
              Book a Service
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-section cg-dashboard-section">
        <div className="cg-container">
          {isDemoMode ? (
            <Alert variant="demo" title="Demo workspace">
              Jobs shown here are synthetic browser records. Accepting, completing or confirming them changes only this
              browser&apos;s demo data. No worker, cooperative or payment system is contacted.
            </Alert>
          ) : null}

          <div className="cg-dashboard-toolbar">
            <div>
              <p className="cg-eyebrow">Overview</p>
              <h2>Request summary</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={jobsState.reload}
              isLoading={jobsState.isLoading}
              leadingIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
          </div>

          <div className="cg-stat-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div className={`cg-stat-card cg-stat-card--${stat.tone}`} key={stat.label}>
                  <span className="cg-stat-card__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              );
            })}
          </div>

          {notice ? (
            <Alert
              variant="success"
              title="Confirmation recorded"
              action={
                <button type="button" className="cg-link-button" onClick={() => setNotice(null)}>
                  Dismiss
                </button>
              }
            >
              {notice}
            </Alert>
          ) : null}

          {actionError ? (
            <Alert
              variant="error"
              title="Could not update the request"
              action={
                <button type="button" className="cg-link-button" onClick={() => setActionError(null)}>
                  Dismiss
                </button>
              }
            >
              {getErrorMessage(actionError)}
            </Alert>
          ) : null}

          {jobsState.isLoading && !jobsState.data ? (
            <ListSkeleton count={3} label="Loading your requests" />
          ) : jobsState.error && !jobsState.data ? (
            <ErrorState
              error={jobsState.error}
              title="Could not load your requests"
              onRetry={jobsState.reload}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={25} aria-hidden="true" />}
              title="No service requests yet"
              message="Start with a description of what needs fixing. You will review the category and confirm before anything is posted."
              action={
                <Link className="cg-btn cg-btn--primary" to="/book">
                  Book your first service
                </Link>
              }
            />
          ) : (
            <>
              {jobsState.error ? (
                <Alert variant="warning" title="Some data may be out of date">
                  {getErrorMessage(jobsState.error)}{' '}
                  <button type="button" className="cg-link-button" onClick={jobsState.reload}>
                    Refresh again
                  </button>
                </Alert>
              ) : null}

              <div className="cg-dashboard-section__head">
                <div>
                  <h2>Active requests</h2>
                  <p>Open, accepted and in-progress jobs.</p>
                </div>
                <span className="cg-count-pill">{activeJobs.length}</span>
              </div>
              {activeJobs.length === 0 ? (
                <EmptyState
                  compact
                  title="No active requests"
                  message="Your open and accepted service requests will appear here."
                />
              ) : (
                <div className="cg-job-list">
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      perspective="customer"
                      busy={busyJobId === job.id}
                      onAction={(target, action) => void handleAction(target, action)}
                    />
                  ))}
                </div>
              )}

              {awaitingConfirmation.length > 0 ? (
                <>
                  <div className="cg-dashboard-section__head">
                    <div>
                      <h2>Awaiting your confirmation</h2>
                      <p>Review the work and confirm completion only when you are satisfied.</p>
                    </div>
                    <span className="cg-count-pill cg-count-pill--amber">{awaitingConfirmation.length}</span>
                  </div>
                  <div className="cg-job-list">
                    {awaitingConfirmation.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        perspective="customer"
                        busy={busyJobId === job.id}
                        onAction={(target, action) => void handleAction(target, action)}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {closedJobs.length > 0 ? (
                <>
                  <div className="cg-dashboard-section__head">
                    <div>
                      <h2>Past requests</h2>
                      <p>Confirmed and cancelled jobs are kept for your reference.</p>
                    </div>
                    <span className="cg-count-pill">{closedJobs.length}</span>
                  </div>
                  <div className="cg-job-list">
                    {[...confirmedJobs, ...cancelledJobs].map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        perspective="customer"
                        busy={busyJobId === job.id}
                        onAction={(target, action) => void handleAction(target, action)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}

          <div className="cg-dashboard-footer-card">
            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <h2>Verification is not automatic</h2>
                <p>
                  A worker profile is not proof of a credential. The platform only shows “Verified” when the backend
                  returns a reviewed <code>VERIFIED</code> status.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={requestAssistant}>
              Ask the assistant
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
