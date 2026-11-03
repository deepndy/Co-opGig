import {
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Handshake,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { requestAssistant } from '../components/assistant/assistantEvents';
import { CtaBand } from '../components/home/CtaBand';
import { CooperativeModel } from '../components/home/CooperativeModel';
import { Alert } from '../components/ui/Alert';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/SectionHeading';
import { isDemoMode } from '../api';

const CUSTOMER_STEPS = [
  {
    icon: FileText,
    title: 'Describe the job',
    text: 'Choose a service or explain the issue in your own words. You can ask the assistant for help clarifying it.',
  },
  {
    icon: Sparkles,
    title: 'Review the category',
    text: 'A suggested category is not a decision. Check it, change it if needed, and add locality and urgency.',
  },
  {
    icon: Send,
    title: 'Confirm and post',
    text: 'Review every detail and tick the confirmation box yourself. Nothing is submitted automatically.',
  },
  {
    icon: CheckCircle2,
    title: 'Track and confirm',
    text: 'Follow the status, then confirm completion when the work is done. No payment is processed here.',
  },
];

const WORKER_STEPS = [
  {
    icon: Handshake,
    title: 'Join through a cooperative',
    text: 'A worker profile is associated with a member cooperative. Creation alone does not grant verified status.',
  },
  {
    icon: CalendarClock,
    title: 'Keep availability current',
    text: 'Availability is read from the platform. Cooperative administration controls it in this prototype.',
  },
  {
    icon: ClipboardList,
    title: 'Review incoming work',
    text: 'See open requests in your categories, review the locality, then accept a suitable job.',
  },
  {
    icon: CheckCircle2,
    title: 'Complete and confirm',
    text: 'Start the job, mark the work complete, and wait for the customer to confirm. Payment remains outside this UI.',
  },
];

interface StatusItem {
  label: string;
  tone: BadgeTone;
  status: string;
  description: string;
}

const STATUS_ITEMS: StatusItem[] = [
  {
    label: 'Customer and worker screens',
    tone: 'green',
    status: 'Frontend implemented',
    description: 'Responsive routes, typed API client, loading/error/empty states and role-aware guards.',
  },
  {
    label: 'Booking and job tracking',
    tone: 'green',
    status: 'Frontend implemented',
    description: 'A three-step form with an explicit confirmation checkbox; it cannot submit automatically.',
  },
  {
    label: 'Demo mode',
    tone: 'demo',
    status: 'Labelled local data',
    description: 'When the API is not configured, synthetic workers and jobs are stored in this browser only.',
  },
  {
    label: 'Authentication',
    tone: 'blue',
    status: 'Backend dependency',
    description:
      'The forms call /auth/login, /auth/register and /auth/me. Neither token nor cookie session can be verified without the core API.',
  },
  {
    label: 'AI assistant bubble',
    tone: 'green',
    status: 'UI implemented',
    description: 'One widget mounted at the app shell; requests go only through the core /assistant/chat proxy.',
  },
  {
    label: 'Assistant replies',
    tone: 'amber',
    status: 'Backend dependency',
    description:
      'A connected build depends on the shared backend and AI service. Demo mode uses clearly labelled keyword replies.',
  },
  {
    label: 'Category classifier',
    tone: 'amber',
    status: 'Backend dependency',
    description: 'The booking form calls /assistant/classify. No model runs in the browser.',
  },
  {
    label: 'Payments and escrow',
    tone: 'red',
    status: 'Not implemented',
    description: 'No card fields, no payment success state and no earnings calculation.',
  },
  {
    label: 'Worker verification review',
    tone: 'amber',
    status: 'Outside this module',
    description:
      'The UI only displays a badge when the backend returns VERIFIED. A profile creation does not set that status.',
  },
  {
    label: 'Blockchain records',
    tone: 'neutral',
    status: 'Not displayed here',
    description:
      'The ledger is a separate integration. This frontend does not handle private keys or show chain status.',
  },
  {
    label: 'Satellite demand analysis',
    tone: 'neutral',
    status: 'Separate module',
    description: 'No aerial or satellite imagery analysis is exposed in this frontend build.',
  },
  {
    label: 'Photo attachment',
    tone: 'neutral',
    status: 'Not implemented',
    description: 'The v1 contract has no upload endpoint, so the form asks for a text description only.',
  },
];

export function HowItWorksPage() {
  return (
    <>
      <section className="cg-page-hero">
        <div className="cg-container cg-page-hero__inner">
          <div>
            <p className="cg-eyebrow">How it works</p>
            <h1>A clear path from a local problem to a confirmed job.</h1>
            <p>
              Co-opGig keeps the customer, worker and cooperative in the same loop. Artificial intelligence can suggest,
              but only a person can confirm.
            </p>
          </div>
          <div className="cg-page-hero__aside">
            <div className="cg-mini-assurance">
              <Bot size={20} aria-hidden="true" />
              <div>
                <strong>One assistant. Suggestions only.</strong>
                <p>It never creates, accepts or changes a job.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={requestAssistant} leadingIcon={<MessageCircle size={16} />}>
              Ask Co-opGig
            </Button>
          </div>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="customer-flow-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="For customers"
            title="Describe. Review. Confirm."
            description="The request is yours to control. The system may assist, but it does not quietly submit anything."
            id="customer-flow-title"
          />
          <div className="cg-flow-grid">
            {CUSTOMER_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="cg-flow-card cg-card" key={step.title}>
                  <div className="cg-flow-card__top">
                    <span className="cg-flow-card__icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="cg-flow-card__number">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cg-section cg-section--soft" aria-labelledby="worker-flow-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="For workers"
            title="Cooperative work with a visible record."
            description="Workers see the requests that match their categories and control each status change assigned to them."
            id="worker-flow-title"
          />
          <div className="cg-flow-grid">
            {WORKER_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="cg-flow-card cg-card" key={step.title}>
                  <div className="cg-flow-card__top">
                    <span className="cg-flow-card__icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="cg-flow-card__number">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="assistant-boundaries-title">
        <div className="cg-container cg-assistant-boundaries">
          <div className="cg-assistant-boundaries__copy">
            <p className="cg-eyebrow">One assistant, clear boundaries</p>
            <h2 id="assistant-boundaries-title">Useful for clarification. Not an authority.</h2>
            <p>
              The assistant is built for service discovery and job clarification. It can ask what needs repair, where
              the job is, how urgent it is, and suggest a category. It cannot act on your behalf.
            </p>
            <Button onClick={requestAssistant} leadingIcon={<MessageCircle size={17} />}>
              Open the assistant
            </Button>
            {isDemoMode ? (
              <p className="cg-assistant-boundaries__note">
                You are in demo mode. The current assistant replies are canned keyword examples, not an AI model.
              </p>
            ) : null}
          </div>
          <div className="cg-boundary-columns">
            <div className="cg-boundary-card cg-boundary-card--yes">
              <h3>
                <Check size={17} aria-hidden="true" /> It can
              </h3>
              <ul>
                <li>Ask follow-up questions about a service need.</li>
                <li>Suggest a canonical service category with a confidence value.</li>
                <li>Prepare a description and locality for the booking form.</li>
                <li>Hand you to the booking form for review.</li>
              </ul>
            </div>
            <div className="cg-boundary-card cg-boundary-card--no">
              <h3>
                <X size={17} aria-hidden="true" /> It cannot
              </h3>
              <ul>
                <li>Create, accept, cancel or complete a job.</li>
                <li>Book a worker or promise availability.</li>
                <li>Confirm a price, arrival time or payment.</li>
                <li>Diagnose hidden faults from satellite imagery.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="cg-section cg-section--soft" aria-labelledby="prototype-status-title" id="prototype-status">
        <div className="cg-container">
          <SectionHeading
            eyebrow="Prototype status"
            title="Implemented, dependent or explicitly out of scope."
            description="This page is the honest status board for this frontend module. It does not claim that an unconnected service is running."
            id="prototype-status-title"
          />
          <div className="cg-status-table" role="list">
            {STATUS_ITEMS.map((item) => (
              <div className="cg-status-row" role="listitem" key={item.label}>
                <div className="cg-status-row__label">
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <Badge tone={item.tone}>{item.status}</Badge>
              </div>
            ))}
          </div>

          <div className="cg-safety-grid">
            <Alert variant="warning" title="Emergency situations are not handled here">
              <span className="cg-inline-icon">
                <ShieldAlert size={16} aria-hidden="true" />
                For smoke, fire, a gas smell, flooding near electrical appliances or exposed live wiring, move away, avoid
                touching the hazard, and contact local emergency services or a qualified professional. The assistant
                will not guide a repair.
              </span>
            </Alert>
            <Alert variant="info" title="Satellite imagery cannot reveal hidden faults">
              Aerial imagery can support area-level building and infrastructure change detection. It cannot show internal
              wiring, a broken pipe or a blocked drain. A specific job needs the customer&apos;s description or a
              ground-level photo.
            </Alert>
          </div>

          <div className="cg-faq">
            <h2>Common questions</h2>
            <details>
              <summary>Does the assistant book a worker for me?</summary>
              <p>
                No. It can suggest a category and help prepare draft details. You review and confirm the request in the
                booking form; the backend creates the job only after that explicit action.
              </p>
            </details>
            <details>
              <summary>Why is there no price or final arrival time?</summary>
              <p>
                No pricing, payment gateway or dispatch guarantee is part of this academic prototype. Sample estimates
                on marketing sections are labelled demo and are not commitments.
              </p>
            </details>
            <details>
              <summary>How does a worker become “Verified”?</summary>
              <p>
                Only an authorised cooperative review should set the backend record to <code>VERIFIED</code>. Creating a
                profile in the frontend does not do this. In demo mode every worker is labelled “Demo profile”.
              </p>
            </details>
            <details>
              <summary>Where is blockchain used?</summary>
              <p>
                Blockchain is a separate backend integration for tamper-evident credential and job-status references.
                This frontend never holds a signing key, and no chain status is shown in this build.
              </p>
            </details>
            <details>
              <summary>Can I attach a photo of the problem?</summary>
              <p>
                Not yet. The shared v1 API does not define an upload endpoint for job photos, so this build accepts a text
                description only. Satellite imagery is not a substitute for a ground-level job photo.
              </p>
            </details>
          </div>
        </div>
      </section>

      <CooperativeModel />
      <CtaBand />
    </>
  );
}
