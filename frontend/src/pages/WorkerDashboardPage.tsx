import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Coins,
  MapPin,
  RefreshCw,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage, isApiError, isDemoMode } from '../api';
import { useAuth } from '../auth/AuthContext';
import { JobCard, type JobAction } from '../components/jobs/JobCard';
import { Alert } from '../components/ui/Alert';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ListSkeleton, Skeleton } from '../components/ui/Skeleton';
import { AvailabilityBadge, VerificationBadge, WorkerRating } from '../components/workers/WorkerBadges';
import { useAsyncData } from '../hooks/useAsyncData';
import type { Job } from '../types/domain';
import { formatCategoryLabel } from '../config/serviceCategories';
import { jobReference } from '../utils/format';

export function WorkerDashboardPage() {
  const { user, isDemoSession } = useAuth();
  const profileState = useAsyncData<Awaited<ReturnType<typeof api.getWorker>> | null>(
    () => (user?.workerId ? api.getWorker(user.workerId) : Promise.resolve(null)),
    [user?.workerId],
  );
  const jobsState = useAsyncData(() => api.getMyJobs(), [user?.id]);
  const openJobsState = useAsyncData(() => api.listOpenJobs(), []);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const profile = profileState.data;
  const myJobs = jobsState.data ?? [];
  const activeJobs = myJobs.filter((job) => job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS');
  const completedJobs = myJobs.filter(
    (job) => job.status === 'COMPLETED' || job.status === 'CUSTOMER_CONFIRMED',
  );

  const incomingJobs =
    profile && user?.workerId
      ? (openJobsState.data ?? []).filter(
          (job) =>
            job.status === 'OPEN' &&
            (profile.serviceCategories.length === 0 || profile.serviceCategories.includes(job.category)),
        )
      : [];
  const openFeedUnavailable =
    isApiError(openJobsState.error) && openJobsState.error.code === 'OPEN_JOBS_UNAVAILABLE';

  async function handleAction(job: Job, action: JobAction) {
    if (action === 'confirm') return;
    setBusyJobId(job.id);
    setActionError(null);
    setNotice(null);
    try {
      if (action === 'accept') {
        await api.acceptJob(job.id);
        setNotice(`Request ${jobReference(job)} accepted. It is now in your active jobs.`);
      } else if (action === 'start') {
        await api.updateJobStatus(job.id, 'IN_PROGRESS');
        setNotice(`Job ${jobReference(job)} started.`);
      } else if (action === 'complete') {
        await api.updateJobStatus(job.id, 'COMPLETED');
        setNotice(`Job ${jobReference(job)} marked complete. Waiting for customer confirmation.`);
      }
      jobsState.reload();
      openJobsState.reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyJobId(null);
    }
  }

  const stats = [
    { icon: ClipboardList, label: 'New requests', value: incomingJobs.length, tone: 'blue' },
    { icon: BriefcaseBusiness, label: 'Active jobs', value: activeJobs.length, tone: 'amber' },
    {
      icon: CheckCircle2,
      label: 'Completed or confirmed',
      value: completedJobs.length,
      tone: 'green',
    },
  ];

  return (
    <>
      <section className="cg-dashboard-hero cg-dashboard-hero--worker">
        <div className="cg-container cg-dashboard-hero__inner">
          <div>
            <p className="cg-eyebrow">Worker workspace</p>
            <h1>Your cooperative work, in one place.</h1>
            <p>
              Review requests in your service categories, manage accepted jobs and keep the customer confirmation step
              clear.
            </p>
          </div>
          <div className="cg-dashboard-hero__actions">
            {isDemoSession ? <span className="cg-badge cg-badge--demo">Demo session</span> : null}
            <Link className="cg-btn cg-btn--secondary" to="/services">
              Browse service categories
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-section cg-dashboard-section">
        <div className="cg-container">
          {isDemoMode ? (
            <Alert variant="demo" title="Demo worker workspace">
              Every request, rating and profile here is synthetic. Accepting or completing a job changes only local demo
              data. No payment is calculated and no real customer is contacted.
            </Alert>
          ) : null}

          {notice ? (
            <Alert
              variant="success"
              title="Workspace updated"
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
              title="Could not update this job"
              action={
                <button type="button" className="cg-link-button" onClick={() => setActionError(null)}>
                  Dismiss
                </button>
              }
            >
              {getErrorMessage(actionError)}
            </Alert>
          ) : null}

          <div className="cg-dashboard-toolbar">
            <div>
              <p className="cg-eyebrow">Profile</p>
              <h2>Worker identity and availability</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                profileState.reload();
                jobsState.reload();
                openJobsState.reload();
              }}
              isLoading={profileState.isLoading || jobsState.isLoading || openJobsState.isLoading}
              leadingIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
          </div>

          {profileState.isLoading && !profileState.data ? (
            <div className="cg-worker-profile-card cg-card" aria-busy="true">
              <Skeleton className="cg-skeleton--avatar" />
              <div className="cg-stack">
                <Skeleton className="cg-skeleton--title" />
                <Skeleton className="cg-skeleton--line" />
              </div>
            </div>
          ) : profileState.error ? (
            <ErrorState
              error={profileState.error}
              title="Could not load your worker profile"
              onRetry={profileState.reload}
            />
          ) : profile ? (
            <div className="cg-worker-profile-card cg-card">
              <Avatar name={profile.displayName} size="lg" />
              <div className="cg-worker-profile-card__main">
                <div className="cg-worker-profile-card__title">
                  <h3>{profile.displayName}</h3>
                  <VerificationBadge worker={profile} />
                  <AvailabilityBadge worker={profile} />
                </div>
                <p className="cg-worker-profile-card__area">
                  <MapPin size={14} aria-hidden="true" />
                  {profile.serviceAreaText || 'Service area not specified'}
                </p>
                <div className="cg-worker-card__categories">
                  {profile.serviceCategories.map((category) => (
                    <span className="cg-chip" key={category}>
                      {formatCategoryLabel(category)}
                    </span>
                  ))}
                </div>
                <WorkerRating worker={profile} />
                <p className="cg-worker-profile-card__note">
                  Availability is read-only here. It is managed by your cooperative administrator in this prototype.
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<UserRound size={24} aria-hidden="true" />}
              title="Worker profile not linked"
              message="Your account is signed in, but the backend did not return a linked worker profile. A federation administrator needs to connect it before requests can be accepted."
              action={
                <Button variant="secondary" onClick={profileState.reload}>
                  Check again
                </Button>
              }
            />
          )}

          <div className="cg-stat-grid cg-stat-grid--three">
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

          <Alert variant="info" title="Payments are not enabled">
            <span className="cg-inline-icon">
              <Coins size={15} aria-hidden="true" /> This frontend does not calculate earnings, collect payment or
              manage escrow. Ask your cooperative about payment terms outside this prototype.
            </span>
          </Alert>

          <div className="cg-dashboard-section__head">
            <div>
              <h2>New requests</h2>
              <p>Open jobs in your categories. Accepting creates an assignment.</p>
            </div>
            <span className="cg-count-pill">{incomingJobs.length}</span>
          </div>

          {openFeedUnavailable ? (
            <Alert variant="warning" title="Open job feed not available">
              The shared backend has not exposed an open-jobs read endpoint yet. Your assigned jobs still appear below.
              Ask the backend owner to add a read-only list for OPEN jobs; this UI is ready to use it.
            </Alert>
          ) : openJobsState.isLoading && !openJobsState.data ? (
            <ListSkeleton count={2} label="Loading new requests" />
          ) : openJobsState.error && !profile ? null : openJobsState.error ? (
            <ErrorState
              error={openJobsState.error}
              compact
              title="Could not load open requests"
              onRetry={openJobsState.reload}
            />
          ) : incomingJobs.length === 0 ? (
            <EmptyState
              compact
              icon={<WifiOff size={21} aria-hidden="true" />}
              title={profile ? 'No open requests in your categories' : 'Link a worker profile first'}
              message={
                profile
                  ? 'New cooperative requests in your categories will appear here when the API lists them.'
                  : 'Without a linked worker profile, the app cannot match requests or accept a job.'
              }
            />
          ) : (
            <div className="cg-job-list">
              {incomingJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  perspective="worker"
                  busy={busyJobId === job.id}
                  actionsNote={
                    profile
                      ? 'Review the locality and description before accepting. You can only accept this if it is still OPEN.'
                      : undefined
                  }
                  onAction={(target, action) => void handleAction(target, action)}
                />
              ))}
            </div>
          )}

          <div className="cg-dashboard-section__head">
            <div>
              <h2>Your active jobs</h2>
              <p>Accepted and in-progress work assigned to you.</p>
            </div>
            <span className="cg-count-pill cg-count-pill--amber">{activeJobs.length}</span>
          </div>
          {jobsState.isLoading && !jobsState.data ? (
            <ListSkeleton count={2} label="Loading active jobs" />
          ) : jobsState.error && !jobsState.data ? (
            <ErrorState error={jobsState.error} title="Could not load your jobs" onRetry={jobsState.reload} />
          ) : activeJobs.length === 0 ? (
            <EmptyState
              compact
              icon={<BriefcaseBusiness size={22} aria-hidden="true" />}
              title="No active jobs"
              message="Accepted requests and jobs in progress will appear here."
            />
          ) : (
            <div className="cg-job-list">
              {activeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  perspective="worker"
                  busy={busyJobId === job.id}
                  onAction={(target, action) => void handleAction(target, action)}
                />
              ))}
            </div>
          )}

          {jobsState.error && jobsState.data ? (
            <Alert variant="warning" title="Some job data may be out of date">
              {getErrorMessage(jobsState.error)}{' '}
              <button type="button" className="cg-link-button" onClick={jobsState.reload}>
                Refresh again
              </button>
            </Alert>
          ) : null}

          <div className="cg-dashboard-section__head">
            <div>
              <h2>Completed jobs</h2>
              <p>Work you marked complete, including customer confirmations.</p>
            </div>
            <span className="cg-count-pill cg-count-pill--green">{completedJobs.length}</span>
          </div>
          {completedJobs.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              title="No completed jobs yet"
              message="Completed work and customer confirmations will be listed here."
            />
          ) : (
            <div className="cg-job-list">
              {completedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  perspective="worker"
                  busy={busyJobId === job.id}
                  onAction={(target, action) => void handleAction(target, action)}
                />
              ))}
            </div>
          )}

        </div>
      </section>
    </>
  );
}
