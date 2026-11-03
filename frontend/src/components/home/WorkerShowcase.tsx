import { ArrowRight, CalendarCheck, Check, ClipboardList, Coins, Star, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

export function WorkerShowcase() {
  return (
    <section className="cg-section cg-worker-showcase" aria-labelledby="worker-showcase-title">
      <div className="cg-container cg-worker-showcase__grid">
        <div className="cg-worker-showcase__copy">
          <p className="cg-eyebrow">For workers</p>
          <h2 id="worker-showcase-title">A digital front door for cooperative talent.</h2>
          <p className="cg-section-lead">
            Give local workers a calm, visible place to manage requests, keep availability clear and build a record of
            completed work — without losing the cooperative relationship.
          </p>
          <ul className="cg-check-list">
            <li>
              <Check size={16} aria-hidden="true" />
              See incoming service requests in your categories.
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              Accept a job, start work and mark it complete.
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              Keep customer confirmations together with the job record.
            </li>
          </ul>
          <Link className="cg-text-link" to="/worker">
            Open the worker view
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <p className="cg-worker-showcase__demo-note">
            The dashboard below is a <strong>fictional demo preview</strong>. Earnings, ratings and request counts are
            not real activity.
          </p>
        </div>

        <div className="cg-worker-preview" aria-label="Illustrative worker dashboard preview">
          <div className="cg-worker-preview__head">
            <div>
              <span className="cg-worker-preview__kicker">Worker dashboard</span>
              <p>Good morning, Rahul</p>
            </div>
            <Badge tone="demo">Demo preview</Badge>
          </div>

          <div className="cg-worker-preview__identity">
            <Avatar name="Rahul Patil" size="md" />
            <div>
              <strong>Rahul Patil</strong>
              <span>Electrician · Kothrud</span>
            </div>
            <span className="cg-worker-preview__available">
              <span className="cg-dot cg-dot--green" aria-hidden="true" /> Available today (demo)
            </span>
          </div>

          <div className="cg-worker-preview__stats">
            <div>
              <ClipboardList size={16} aria-hidden="true" />
              <span>New requests</span>
              <strong>3</strong>
              <small>demo</small>
            </div>
            <div>
              <CalendarCheck size={16} aria-hidden="true" />
              <span>Active jobs</span>
              <strong>2</strong>
              <small>demo</small>
            </div>
            <div>
              <Check size={16} aria-hidden="true" />
              <span>Completed</span>
              <strong>14</strong>
              <small>demo</small>
            </div>
            <div>
              <Wallet size={16} aria-hidden="true" />
              <span>This week</span>
              <strong>₹8,400</strong>
              <small>demo earnings</small>
            </div>
          </div>

          <div className="cg-worker-preview__requests">
            <div className="cg-worker-preview__requests-head">
              <h3>Job requests</h3>
              <span>
                <Star size={13} aria-hidden="true" /> 4.8 demo rating
              </span>
            </div>
            <div className="cg-worker-preview__request">
              <div>
                <strong>Kitchen tap leaking</strong>
                <span>Kothrud · normal</span>
              </div>
              <span className="cg-badge cg-badge--blue">New</span>
            </div>
            <div className="cg-worker-preview__request">
              <div>
                <strong>Bedroom switch repair</strong>
                <span>Karve Nagar · urgent</span>
              </div>
              <span className="cg-badge cg-badge--green">Accepted</span>
            </div>
            <div className="cg-worker-preview__request">
              <div>
                <strong>Hall light inspection</strong>
                <span>Kothrud · normal</span>
              </div>
              <span className="cg-badge cg-badge--amber">In progress</span>
            </div>
          </div>

          <p className="cg-worker-preview__footer">
            <Coins size={13} aria-hidden="true" /> Fictional demo values. No payment or escrow is enabled.
          </p>
        </div>
      </div>
    </section>
  );
}
