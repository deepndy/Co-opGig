import { HandHeart, Network, UserRound, UsersRound } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';

const ROLES = [
  {
    icon: UserRound,
    title: 'Customer',
    description:
      'Describe the service needed, review the suggested category, track the request and confirm when the work is complete.',
  },
  {
    icon: HandHeart,
    title: 'Worker',
    description:
      'Join through a member cooperative, keep availability current, accept suitable requests and mark work complete.',
  },
  {
    icon: UsersRound,
    title: 'Federation Administration',
    description:
      'Coordinate member cooperatives, review worker verification requests and support fair job assignment.',
  },
  {
    icon: Network,
    title: 'Federation',
    description:
      'Owns the shared network and standards. In this academic model, the federation is the accountable cooperative layer.',
  },
];

export function CooperativeModel({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <section className="cg-section cg-about-model" aria-labelledby="cooperative-model-title">
      <div className="cg-container">
        {withHeading ? (
          <SectionHeading
            eyebrow="The cooperative model"
            title="Shared ownership, clearer accountability."
            description="Co-opGig is designed around four roles so a local service relationship is not reduced to a one-off anonymous transaction."
            id="cooperative-model-title"
          />
        ) : null}
        <div className="cg-role-grid">
          {ROLES.map((role, index) => {
            const Icon = role.icon;
            return (
              <article className="cg-role-card cg-card" key={role.title}>
                <div className="cg-role-card__top">
                  <span className="cg-role-card__icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="cg-role-card__number">0{index + 1}</span>
                </div>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
              </article>
            );
          })}
        </div>
        <p className="cg-role-grid__note">
          These roles describe the intended cooperative model. Federation administration is not implemented in this
          frontend module.
        </p>
      </div>
    </section>
  );
}
