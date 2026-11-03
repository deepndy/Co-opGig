import { FileText, HandHeart, Landmark, Network, ShieldCheck, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CooperativeModel } from '../components/home/CooperativeModel';
import { CtaBand } from '../components/home/CtaBand';
import { Alert } from '../components/ui/Alert';
import { Avatar } from '../components/ui/Avatar';
import { SectionHeading } from '../components/ui/SectionHeading';
import { BRAND } from '../config/brand';

const PRINCIPLES = [
  {
    icon: HandHeart,
    title: 'Workers are members, not listings',
    text: 'The model gives workers a cooperative relationship with shared standards, rather than treating each person as an interchangeable profile.',
  },
  {
    icon: Landmark,
    title: 'The federation stays accountable',
    text: 'Federation administration is intended to coordinate member cooperatives, review verification requests and support fair assignment.',
  },
  {
    icon: FileText,
    title: 'A record both sides can see',
    text: 'A service request has an explicit lifecycle, from open to customer confirmed, so both sides can follow the same state.',
  },
];

export function AboutPage() {
  return (
    <>
      <section className="cg-page-hero cg-page-hero--about">
        <div className="cg-container cg-page-hero__inner">
          <div>
            <p className="cg-eyebrow">About the cooperative</p>
            <h1>A cooperative-first home for local skills.</h1>
            <p>
              {BRAND.name} is an academic prototype exploring how local skilled workers can use a shared digital platform
              while keeping cooperative ownership, accountability and human judgement in the foreground.
            </p>
          </div>
          <div className="cg-page-hero__aside">
            <div className="cg-mini-assurance">
              <Sprout size={20} aria-hidden="true" />
              <div>
                <strong>Working product name</strong>
                <p>“{BRAND.name}” is used for this prototype and is configurable in one place.</p>
              </div>
            </div>
            <Link className="cg-text-link" to="/how-it-works">
              Read the workflow and prototype status
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="why-cooperative-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="Why cooperative?"
            title="The platform should strengthen the relationship, not hide it."
            description="A marketplace can easily reduce a skilled worker to a star rating and a customer to a transaction. The cooperative model is an attempt to keep accountability, membership and fair work visible."
            id="why-cooperative-title"
          />
          <div className="cg-principle-grid">
            {PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <article className="cg-principle-card cg-card" key={principle.title}>
                  <span className="cg-principle-card__icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </article>
              );
            })}
          </div>

          <div className="cg-about-split">
            <div className="cg-card cg-about-copy">
              <span className="cg-badge cg-badge--blue">Intended model</span>
              <h2>Four roles, one shared service relationship.</h2>
              <p>
                Customers describe jobs and confirm completion. Workers manage availability and the work assigned to
                them. Federation administration coordinates member cooperatives and reviews credentials. The federation
                owns the network and its standards.
              </p>
              <p>
                The current frontend demonstrates the customer and worker sides of that model. Administration screens
                are not part of this module.
              </p>
            </div>
            <div className="cg-card cg-about-copy">
              <span className="cg-badge cg-badge--amber">Academic prototype</span>
              <h2>No claim of a live federation.</h2>
              <p>
                This project does not claim that a real cooperative federation, verified workforce or public service
                network is operating. The interface and synthetic records are a demonstration of the intended
                experience.
              </p>
              <p>
                Any future public deployment would need governance, consent, data protection, worker review and payment
                processes that are outside this frontend.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CooperativeModel />

      <section className="cg-section cg-section--soft" aria-labelledby="accountability-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="Accountability"
            title="What the design tries to keep honest."
            description="Several deliberate constraints keep the prototype from overstating what a website can prove."
            id="accountability-title"
          />
          <div className="cg-accountability-grid">
            <div className="cg-accountability-card">
              <ShieldCheck size={21} aria-hidden="true" />
              <h3>Verification is explicit</h3>
              <p>
                A worker card only says “Verified” when the backend returns a reviewed status. In demo mode every profile
                is labelled “Demo profile”, and creating a profile never implies verification.
              </p>
            </div>
            <div className="cg-accountability-card">
              <Network size={21} aria-hidden="true" />
              <h3>Sensitive data stays off-chain</h3>
              <p>
                The separate blockchain module is intended to store hashes and lifecycle references, not names, phone
                numbers, addresses, photos or raw credentials. This frontend never touches a signing key.
              </p>
            </div>
            <div className="cg-accountability-card">
              <HandHeart size={21} aria-hidden="true" />
              <h3>Humans make the decisions</h3>
              <p>
                The assistant may ask questions and suggest a category. It cannot post a job, accept work, set a price or
                confirm completion. Those actions remain explicit and role-bound.
              </p>
            </div>
          </div>

          <Alert variant="warning" title="Limits of this prototype">
            Payments and escrow are not implemented. Worker verification review is not implemented here. Satellite
            demand analysis is a separate service and cannot diagnose hidden faults. Blockchain status is not displayed
            in this frontend. No availability, rating, earnings or arrival figure is a live commitment.
          </Alert>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="team-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="The team"
            title="Four modules, built to integrate."
            description="This ZIP contains the frontend module only. The shared API contract keeps it aligned with the backend, AI service, remote-sensing service and blockchain work."
            id="team-title"
          />
          <div className="cg-team-grid">
            {BRAND.team.map((member) => (
              <article className="cg-team-card cg-card" key={member.name}>
                <Avatar name={member.name} size="lg" />
                <h3>{member.name}</h3>
                <p>{member.area}</p>
              </article>
            ))}
          </div>
          <p className="cg-team-note">
            Academic project: {BRAND.academicTitle}. The product name and prototype are not affiliated with a commercial
            service.
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
