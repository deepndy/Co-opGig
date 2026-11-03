import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage, isDemoMode } from '../api';
import { useAuth } from '../auth/AuthContext';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { ServiceIcon } from '../components/services/ServiceIcon';
import { requestAssistant } from '../components/assistant/assistantEvents';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageLoader } from '../components/ui/PageLoader';
import { ListSkeleton } from '../components/ui/Skeleton';
import { WorkerCard } from '../components/workers/WorkerCard';
import {
  SERVICE_CATEGORY_FALLBACK,
  formatCategoryLabel,
  isKnownCategory,
} from '../config/serviceCategories';
import { useAsyncData } from '../hooks/useAsyncData';
import type { ClassificationResult } from '../types/api';
import type { Job, ServiceCategory, Urgency, Worker } from '../types/domain';
import { URGENCY_LABELS } from '../types/domain';
import { confidenceText, jobReference, urgencyLabel } from '../utils/format';

type Step = 1 | 2 | 3;

interface FormErrors {
  description?: string;
  category?: string;
  locationText?: string;
  latitude?: string;
  longitude?: string;
  confirm?: string;
}

interface WorkerPreviewState {
  status: 'idle' | 'loading' | 'success' | 'error';
  workers: Worker[];
  error: unknown;
}

const URGENCY_OPTIONS: Array<{ value: Urgency; title: string; hint: string }> = [
  { value: 'normal', title: 'Normal', hint: 'Flexible timing' },
  { value: 'urgent', title: 'Urgent', hint: 'You would like attention soon' },
  { value: 'emergency', title: 'Emergency', hint: 'Immediate safety risk' },
];

function parsePrefill(params: URLSearchParams) {
  const category = params.get('category');
  const urgencyParam = params.get('urgency');
  const urgency: Urgency =
    urgencyParam === 'urgent' || urgencyParam === 'emergency' || urgencyParam === 'normal'
      ? urgencyParam
      : 'normal';
  return {
    description: (params.get('description') ?? '').slice(0, 1200),
    category: isKnownCategory(category) ? category : '',
    location: (params.get('location') ?? '').slice(0, 200),
    urgency,
    fromAssistant: params.get('source') === 'assistant',
  };
}

function focusField(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 30);
}

export function BookPage() {
  const { status: authStatus, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchSignature = searchParams.toString();
  const initialPrefill = useMemo(
    () => parsePrefill(new URLSearchParams(searchSignature)),
    // Only the initial prefill is needed here; later assistant handoffs use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [step, setStep] = useState<Step>(1);
  const [description, setDescription] = useState(initialPrefill.description);
  const [category, setCategory] = useState(initialPrefill.category);
  const [locationText, setLocationText] = useState(initialPrefill.location);
  const [urgency, setUrgency] = useState<Urgency>(initialPrefill.urgency);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [prefilledNotice, setPrefilledNotice] = useState(initialPrefill.fromAssistant);
  const [suggestion, setSuggestion] = useState<ClassificationResult | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState<unknown>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const [workerVersion, setWorkerVersion] = useState(0);
  const [preferredWorkerId, setPreferredWorkerId] = useState<string | null>(null);
  const [workerPreview, setWorkerPreview] = useState<WorkerPreviewState>({
    status: 'idle',
    workers: [],
    error: null,
  });

  const categoriesState = useAsyncData(() => api.getCategories(), []);
  const categories: ServiceCategory[] =
    categoriesState.data && categoriesState.data.length > 0 ? categoriesState.data : SERVICE_CATEGORY_FALLBACK;

  useEffect(() => {
    const next = parsePrefill(new URLSearchParams(searchSignature));
    if (!next.fromAssistant) return;
    setDescription(next.description);
    setCategory(next.category);
    setLocationText(next.location);
    setUrgency(next.urgency);
    setStep(1);
    setErrors({});
    setConfirmChecked(false);
    setCreatedJob(null);
    setPrefilledNotice(true);
  }, [searchSignature]);

  useEffect(() => {
    if (step !== 3 || !isKnownCategory(category)) return;
    let cancelled = false;
    setWorkerPreview({ status: 'loading', workers: [], error: null });
    api.getWorkers({ category, available: true }).then(
      (workers) => {
        if (!cancelled) setWorkerPreview({ status: 'success', workers, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setWorkerPreview({ status: 'error', workers: [], error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [step, category, workerVersion]);

  useEffect(() => {
    setPreferredWorkerId(null);
  }, [category]);

  function scrollToTop() {
    const node = document.getElementById('booking-top');
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateStepOne(): boolean {
    const next: FormErrors = {};
    if (description.trim().length < 10) {
      next.description = 'Please describe the job in at least 10 characters.';
    } else if (description.trim().length > 1200) {
      next.description = 'Please keep the description under 1,200 characters.';
    }
    if (!isKnownCategory(category)) {
      next.category = 'Choose a service category.';
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      focusField(first === 'category' ? 'booking-category' : 'booking-description');
      return false;
    }
    return true;
  }

  function validateStepTwo(): boolean {
    const next: FormErrors = {};
    if (locationText.trim().length < 2) {
      next.locationText = 'Add a locality so the cooperative knows where the job is.';
    }
    const latText = latitude.trim();
    const lngText = longitude.trim();
    if ((latText && !lngText) || (!latText && lngText)) {
      next.latitude = 'Enter both latitude and longitude, or leave both blank.';
      next.longitude = 'Enter both latitude and longitude, or leave both blank.';
    } else if (latText && lngText) {
      const lat = Number(latText);
      const lng = Number(lngText);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        next.latitude = 'Latitude must be a number between -90 and 90.';
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        next.longitude = 'Longitude must be a number between -180 and 180.';
      }
    }
    setErrors(next);
    if (next.locationText) {
      focusField('booking-location');
      return false;
    }
    if (next.latitude) {
      focusField('booking-latitude');
      return false;
    }
    if (next.longitude) {
      focusField('booking-longitude');
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === 1 && !validateStepOne()) return;
    if (step === 2 && !validateStepTwo()) return;
    setStep((current) => (current < 3 ? ((current + 1) as Step) : current));
    window.setTimeout(scrollToTop, 0);
  }

  function goBack() {
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
    window.setTimeout(scrollToTop, 0);
  }

  async function suggestCategory() {
    if (description.trim().length < 6) {
      setClassifyError(new Error('Add a slightly longer description first.'));
      return;
    }
    setClassifyLoading(true);
    setClassifyError(null);
    try {
      const result = await api.classify(description.trim());
      setSuggestion(result);
      if (result.category) setCategory(result.category);
    } catch (error) {
      setClassifyError(error);
    } finally {
      setClassifyLoading(false);
    }
  }

  async function submitJob() {
    if (!confirmChecked) {
      setErrors({ confirm: 'Tick the confirmation box before posting your request.' });
      focusField('booking-confirm');
      return;
    }
    if (!isKnownCategory(category)) {
      setErrors({ category: 'Choose a service category.' });
      setStep(1);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const job = await api.createJob({
        description: description.trim(),
        category,
        categoryConfidence: suggestion?.category === category ? suggestion.confidence : null,
        locationText: locationText.trim(),
        urgency,
        preferredWorkerId,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
      });
      setCreatedJob(job);
      setConfirmChecked(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStep(1);
    setDescription('');
    setCategory('');
    setLocationText('');
    setUrgency('normal');
    setLatitude('');
    setLongitude('');
    setErrors({});
    setSuggestion(null);
    setClassifyError(null);
    setConfirmChecked(false);
    setSubmitError(null);
    setCreatedJob(null);
    setPrefilledNotice(false);
    setWorkerPreview({ status: 'idle', workers: [], error: null });
    setPreferredWorkerId(null);
    navigate('/book', { replace: true });
  }

  if (!isDemoMode) {
    if (authStatus === 'loading') return <PageLoader label="Checking your session…" />;
    if (!user) {
      const next = `/book${searchSignature ? `?${searchSignature}` : ''}`;
      return (
        <section className="cg-container cg-gate cg-section">
          <div className="cg-card cg-gate__card">
            <p className="cg-eyebrow">Customer booking</p>
            <h1>Sign in to post a service request</h1>
            <p>
              New requests are tied to an account so you can track them and confirm completion. Sign in through the
              Co-opGig core API, then return to this booking form.
            </p>
            <div className="cg-button-row">
              <Link className="cg-btn cg-btn--primary" to={`/login?next=${encodeURIComponent(next)}`}>
                Sign in or create an account
              </Link>
              <Link className="cg-btn cg-btn--secondary" to="/services">
                Browse services
              </Link>
            </div>
          </div>
        </section>
      );
    }
  }

  if (createdJob) {
    const canViewCustomerDashboard = user?.role === 'CUSTOMER' || user?.role === 'ADMIN';
    return (
      <section className="cg-section cg-booking-success" aria-labelledby="booking-success-title">
        <div className="cg-container cg-booking-success__inner">
          <div className="cg-success-mark" aria-hidden="true">
            <Check size={30} />
          </div>
          <p className="cg-eyebrow">Request recorded</p>
          <h1 id="booking-success-title">Your service request has been created.</h1>
          <p className="cg-booking-success__lead">
            Reference <strong>{jobReference(createdJob)}</strong>
          </p>

          <div className="cg-card cg-booking-success__card">
            <div className="cg-booking-success__top">
              <div className="cg-booking-success__category">
                <ServiceIcon slug={createdJob.category} size={22} />
                <div>
                  <span>{formatCategoryLabel(createdJob.category)}</span>
                  <p>{createdJob.locationText}</p>
                </div>
              </div>
              <JobStatusBadge status={createdJob.status} />
            </div>
            <dl className="cg-success-details">
              <div>
                <dt>Reference</dt>
                <dd>{jobReference(createdJob)}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd>{urgencyLabel(createdJob.urgency)}</dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdJob.createdAt))}</dd>
              </div>
            </dl>
            <p className="cg-success-description">{createdJob.description}</p>
          </div>

          {isDemoMode ? (
            <Alert variant="warning" title="Demo request only">
              This record is stored in this browser and is labelled demo. No cooperative, worker or dispatch service was
              contacted. Start the demo customer session to see it in the customer view.
            </Alert>
          ) : (
            <Alert variant="info" title="What happens next">
              The core API has recorded this request. A cooperative administrator still needs to review it and assign a
              worker. No worker, price or arrival time is guaranteed.
            </Alert>
          )}

          <Alert variant="info" title="No payment taken">
            Payments and escrow are not implemented in this frontend. Do not enter card or bank details.
          </Alert>

          <div className="cg-booking-success__actions">
            {canViewCustomerDashboard ? (
              <Link className="cg-btn cg-btn--primary" to="/customer">
                View my requests
              </Link>
            ) : (
              <Link className="cg-btn cg-btn--primary" to="/login?next=%2Fcustomer">
                Sign in to track requests
              </Link>
            )}
            <Button variant="secondary" onClick={resetForm}>
              Book another service
            </Button>
            <Link className="cg-btn cg-btn--ghost" to="/">
              Return home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const selectedCategory = categories.find((item) => item.slug === category);
  const confidence = suggestion ? confidenceText(suggestion.confidence) : null;
  const workerHeading = isDemoMode ? 'Demo workers available for this category' : 'Workers matching this category';

  return (
    <>
      <section className="cg-page-hero cg-page-hero--compact">
        <div className="cg-container" id="booking-top">
          <p className="cg-eyebrow">Book a service</p>
          <h1>Tell us what you need.</h1>
          <p className="cg-page-hero__description">
            Add a few details, review the category suggestion and confirm the request yourself. Nothing is posted until
            you press the final button.
          </p>
        </div>
      </section>

      <section className="cg-section cg-booking-section">
        <div className="cg-container">
          <ol className="cg-booking-steps" aria-label="Booking progress">
            {['Describe the job', 'Location & urgency', 'Review & confirm'].map((label, index) => {
              const number = index + 1;
              const isDone = step > number;
              const isCurrent = step === number;
              return (
                <li
                  key={label}
                  className={isDone ? 'is-done' : isCurrent ? 'is-current' : ''}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="cg-booking-steps__marker" aria-hidden="true">
                    {isDone ? <Check size={13} /> : number}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>

          <div className="cg-booking-layout">
            <div className="cg-booking-main">
              {prefilledNotice ? (
                <Alert variant="info" title="Prefilled from the assistant">
                  The description, category or locality came from your assistant conversation. Review and change anything
                  before posting.
                  <button
                    type="button"
                    className="cg-link-button"
                    onClick={() => setPrefilledNotice(false)}
                    aria-label="Dismiss prefill notice"
                  >
                    Dismiss
                  </button>
                </Alert>
              ) : null}

              {step === 1 ? (
                <div className="cg-card cg-booking-card">
                  <div className="cg-booking-card__head">
                    <p className="cg-eyebrow">Step 1 of 3</p>
                    <h2>Describe the job</h2>
                    <p>A clear description helps the cooperative route the request to the right kind of worker.</p>
                  </div>

                  <div className="cg-field">
                    <label htmlFor="booking-description">What needs to be done?</label>
                    <textarea
                      id="booking-description"
                      rows={5}
                      maxLength={1200}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      aria-invalid={Boolean(errors.description) || undefined}
                      aria-describedby={errors.description ? 'description-error description-hint' : 'description-hint'}
                      placeholder="For example: Water is leaking under the kitchen sink and the cabinet is getting damp."
                    />
                    <div className="cg-field__meta">
                      <span id="description-hint">At least 10 characters. Do not include passwords or identity numbers.</span>
                      <span>{description.length}/1200</span>
                    </div>
                    {errors.description ? (
                      <p className="cg-field__error" id="description-error">
                        {errors.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="cg-assist-callout">
                    <div className="cg-assist-callout__copy">
                      <span className="cg-assist-callout__icon">
                        <Sparkles size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Not sure which category fits?</strong>
                        <p>
                          {isDemoMode
                            ? 'This demo uses a keyword example, not an AI model. A real backend can provide the classifier.'
                            : 'Ask the core API for a category suggestion based on your description.'}
                        </p>
                      </div>
                    </div>
                    <div className="cg-button-row">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void suggestCategory()}
                        isLoading={classifyLoading}
                      >
                        Suggest a category
                      </Button>
                      <Button variant="ghost" size="sm" onClick={requestAssistant}>
                        Ask the assistant
                      </Button>
                    </div>
                  </div>

                  {classifyError ? (
                    <Alert variant="error" title="Category suggestion unavailable">
                      {getErrorMessage(classifyError)} You can still choose a category manually.
                    </Alert>
                  ) : null}

                  {suggestion ? (
                    <div className="cg-suggestion-card" aria-live="polite">
                      <div className="cg-suggestion-card__top">
                        <div>
                          <span className="cg-eyebrow">Suggested category</span>
                          <h3>
                            {suggestion.category
                              ? formatCategoryLabel(suggestion.category)
                              : 'A little more detail is needed'}
                          </h3>
                        </div>
                        {confidence ? (
                          <span className="cg-suggestion-card__confidence">
                            {confidence} {isDemoMode ? 'demo' : ''} confidence
                          </span>
                        ) : null}
                      </div>
                      <p>{suggestion.reason}</p>
                      {suggestion.clarifyingQuestion ? (
                        <p className="cg-suggestion-card__question">{suggestion.clarifyingQuestion}</p>
                      ) : null}
                      {suggestion.alternatives.length > 0 ? (
                        <div className="cg-suggestion-card__alternatives">
                          <span>Other possible categories:</span>
                          {suggestion.alternatives.map((alternative) => (
                            <button
                              key={alternative.category}
                              type="button"
                              className="cg-chip-button"
                              onClick={() => setCategory(alternative.category)}
                            >
                              Use {formatCategoryLabel(alternative.category)}
                              {confidenceText(alternative.confidence)
                                ? ` · ${confidenceText(alternative.confidence)}`
                                : ''}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <p className="cg-suggestion-card__note">
                        {isDemoMode ? 'Demo keyword estimate. ' : ''}A suggestion only — change the category below if
                        needed. You remain in control of what is submitted.
                      </p>
                    </div>
                  ) : null}

                  <div className="cg-field">
                    <label htmlFor="booking-category">Service category</label>
                    <select
                      id="booking-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      aria-invalid={Boolean(errors.category) || undefined}
                      aria-describedby={errors.category ? 'category-error' : undefined}
                    >
                      <option value="">Choose a category…</option>
                      {categories.map((item) => (
                        <option key={item.slug} value={item.slug}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {errors.category ? (
                      <p className="cg-field__error" id="category-error">
                        {errors.category}
                      </p>
                    ) : (
                      <p className="cg-field__hint">Category slugs follow the shared platform contract.</p>
                    )}
                  </div>

                  {categoriesState.error ? (
                    <Alert variant="warning">
                      The live category catalogue could not be loaded; canonical categories are shown. Booking will still
                      use the shared contract.
                    </Alert>
                  ) : null}

                  <p className="cg-booking-note">
                    Optional photo attachment is not available in this version because the v1 API does not define an
                    upload endpoint. Please describe the job in text.
                  </p>

                  <div className="cg-booking-actions">
                    <span />
                    <Button onClick={goNext} leadingIcon={<ArrowRight size={16} />}>
                      Continue
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="cg-card cg-booking-card">
                  <div className="cg-booking-card__head">
                    <p className="cg-eyebrow">Step 2 of 3</p>
                    <h2>Location and urgency</h2>
                    <p>Give the cooperative enough context to route the request. No maps integration is enabled.</p>
                  </div>

                  <div className="cg-field">
                    <label htmlFor="booking-location">Locality or service address</label>
                    <div className="cg-input-with-icon">
                      <MapPin size={17} aria-hidden="true" />
                      <input
                        id="booking-location"
                        type="text"
                        value={locationText}
                        maxLength={200}
                        onChange={(event) => setLocationText(event.target.value)}
                        placeholder="For example: Kothrud, Pune"
                        autoComplete="address-level2"
                        aria-invalid={Boolean(errors.locationText) || undefined}
                        aria-describedby={errors.locationText ? 'location-error' : 'location-hint'}
                      />
                    </div>
                    <p className="cg-field__hint" id="location-hint">
                      Use a locality or landmark. Full addresses are optional in this prototype.
                    </p>
                    {errors.locationText ? (
                      <p className="cg-field__error" id="location-error">
                        {errors.locationText}
                      </p>
                    ) : null}
                  </div>

                  <details className="cg-coordinates">
                    <summary>Add map coordinates (optional)</summary>
                    <p className="cg-field__hint">
                      WGS84 latitude and longitude. Leave both blank if you are unsure — locality text is enough.
                    </p>
                    <div className="cg-field-row">
                      <div className="cg-field">
                        <label htmlFor="booking-latitude">Latitude</label>
                        <input
                          id="booking-latitude"
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="-90"
                          max="90"
                          value={latitude}
                          onChange={(event) => setLatitude(event.target.value)}
                          aria-invalid={Boolean(errors.latitude) || undefined}
                        />
                        {errors.latitude ? <p className="cg-field__error">{errors.latitude}</p> : null}
                      </div>
                      <div className="cg-field">
                        <label htmlFor="booking-longitude">Longitude</label>
                        <input
                          id="booking-longitude"
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="-180"
                          max="180"
                          value={longitude}
                          onChange={(event) => setLongitude(event.target.value)}
                          aria-invalid={Boolean(errors.longitude) || undefined}
                        />
                        {errors.longitude ? <p className="cg-field__error">{errors.longitude}</p> : null}
                      </div>
                    </div>
                  </details>

                  <fieldset className="cg-urgency-fieldset">
                    <legend>How urgent is this request?</legend>
                    <p className="cg-field__hint">
                      Urgency is a preference, not a guaranteed response time. The cooperative cannot promise arrival.
                    </p>
                    <div className="cg-urgency-options">
                      {URGENCY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={urgency === option.value ? 'cg-urgency-option is-selected' : 'cg-urgency-option'}
                        >
                          <input
                            type="radio"
                            name="booking-urgency"
                            value={option.value}
                            checked={urgency === option.value}
                            onChange={() => setUrgency(option.value)}
                          />
                          <span>
                            <strong>{option.title}</strong>
                            <small>{option.hint}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {urgency === 'emergency' ? (
                    <Alert variant="warning" title="Co-opGig is not an emergency service">
                      If there is fire, smoke, a gas smell, flooding near electrical appliances or exposed live wiring,
                      move away, do not touch the hazard, and contact local emergency services or a qualified
                      professional first. Do not use this form as an emergency response.
                    </Alert>
                  ) : null}

                  <div className="cg-booking-actions">
                    <Button variant="secondary" onClick={goBack} leadingIcon={<ArrowLeft size={16} />}>
                      Back
                    </Button>
                    <Button onClick={goNext} leadingIcon={<ArrowRight size={16} />}>
                      Review request
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="cg-card cg-booking-card">
                  <div className="cg-booking-card__head">
                    <p className="cg-eyebrow">Step 3 of 3</p>
                    <h2>Review and confirm</h2>
                    <p>Nothing has been posted yet. Check the details and confirm explicitly.</p>
                  </div>

                  <div className="cg-review-summary">
                    <div className="cg-review-summary__head">
                      <div>
                        <span className="cg-eyebrow">Request summary</span>
                        <h3>{selectedCategory?.name ?? formatCategoryLabel(category)}</h3>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        Edit details
                      </Button>
                    </div>
                    <dl className="cg-review-list">
                      <div>
                        <dt>Description</dt>
                        <dd>{description}</dd>
                      </div>
                      <div>
                        <dt>Category</dt>
                        <dd>{selectedCategory?.name ?? formatCategoryLabel(category)}</dd>
                      </div>
                      <div>
                        <dt>Locality</dt>
                        <dd>{locationText}</dd>
                      </div>
                      <div>
                        <dt>Urgency</dt>
                        <dd>{URGENCY_LABELS[urgency]}</dd>
                      </div>
                      {latitude && longitude ? (
                        <div>
                          <dt>Coordinates</dt>
                          <dd>
                            {latitude}, {longitude}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  <div className="cg-worker-match">
                    <div className="cg-worker-match__head">
                      <div>
                        <span className="cg-eyebrow">Matching preview</span>
                        <h3>{workerHeading}</h3>
                      </div>
                      {workerPreview.status === 'success' ? (
                        <span className="cg-muted-note">
                          {workerPreview.workers.length} shown
                        </span>
                      ) : null}
                    </div>
                    <p className="cg-worker-match__note">
                      You may select a preferred available worker. This remains a preference: the request stays open
                      until that worker accepts it, and no arrival time or assignment is guaranteed.
                    </p>
                    {workerPreview.status === 'loading' ? <ListSkeleton count={2} label="Loading matching workers" /> : null}
                    {workerPreview.status === 'error' ? (
                      <ErrorState
                        error={workerPreview.error}
                        compact
                        title="Worker matching preview unavailable"
                        onRetry={() => setWorkerVersion((value) => value + 1)}
                      />
                    ) : null}
                    {workerPreview.status === 'success' && workerPreview.workers.length === 0 ? (
                      <EmptyState
                        compact
                        icon={<Users size={22} aria-hidden="true" />}
                        title="No available demo workers for this category"
                        message="You can still post the request. A cooperative administrator may match a worker later."
                      />
                    ) : null}
                    {workerPreview.status === 'success' && workerPreview.workers.length > 0 ? (
                      <div className="cg-worker-match__list">
                        {workerPreview.workers.slice(0, 3).map((worker) => (
                          <div className="cg-worker-match__option" key={worker.id}>
                            <WorkerCard worker={worker} compact />
                            <Button
                              variant={preferredWorkerId === worker.id ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setPreferredWorkerId(worker.id)}
                            >
                              {preferredWorkerId === worker.id ? 'Preferred worker selected' : 'Choose as preferred'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {urgency === 'emergency' ? (
                    <Alert variant="warning" title="Emergency selected">
                      Co-opGig is not an emergency service. If there is immediate danger, contact local emergency
                      services first. The request may not receive an immediate response.
                    </Alert>
                  ) : null}

                  {isDemoMode && !user ? (
                    <Alert variant="info" title="Demo booking without sign-in">
                      This request will be stored as demo data in this browser. Start the demo customer session after
                      posting to see it in the customer view.
                    </Alert>
                  ) : null}

                  {submitError ? (
                    <Alert variant="error" title="Could not post the request">
                      {getErrorMessage(submitError)}
                    </Alert>
                  ) : null}

                  <div className="cg-confirm-box">
                    <label className="cg-checkbox">
                      <input
                        id="booking-confirm"
                        type="checkbox"
                        checked={confirmChecked}
                        onChange={(event) => {
                          setConfirmChecked(event.target.checked);
                          if (event.target.checked) setErrors((current) => ({ ...current, confirm: undefined }));
                        }}
                        aria-describedby="confirm-note"
                      />
                      <span>
                        I have reviewed the description, category, locality and urgency, and I want to post this service
                        request.
                      </span>
                    </label>
                    {errors.confirm ? (
                      <p className="cg-field__error" role="alert">
                        {errors.confirm}
                      </p>
                    ) : null}
                    <p className="cg-confirm-box__note" id="confirm-note">
                      Posting creates a request only. It does not assign a worker, guarantee a price or collect payment.
                      The assistant cannot submit this form.
                    </p>
                  </div>

                  <div className="cg-booking-actions">
                    <Button variant="secondary" onClick={goBack} leadingIcon={<ArrowLeft size={16} />}>
                      Back
                    </Button>
                    <Button
                      onClick={() => void submitJob()}
                      isLoading={submitting}
                      disabled={!confirmChecked || submitting}
                    >
                      Confirm &amp; post request
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="cg-booking-aside">
              <div className="cg-side-card">
                <span className="cg-side-card__icon">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <h2>Need help describing it?</h2>
                <p>
                  The assistant can ask a couple of questions and suggest a category. It will never post or book the
                  request for you.
                </p>
                <Button variant="secondary" size="sm" onClick={requestAssistant}>
                  Open the assistant
                </Button>
              </div>
              <div className="cg-side-card">
                <span className="cg-side-card__icon">
                  <Clock size={18} aria-hidden="true" />
                </span>
                <h2>What happens next</h2>
                <ol className="cg-side-steps">
                  <li>You review and confirm the request.</li>
                  <li>The cooperative reviews it and assigns a worker.</li>
                  <li>You track status and confirm when the work is complete.</li>
                </ol>
                <p className="cg-side-card__fineprint">
                  No payment, escrow or guaranteed arrival is part of this prototype.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
