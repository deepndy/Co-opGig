import { Check, Clock, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { SERVICE_CATEGORY_FALLBACK, fallbackCategory } from '../../config/serviceCategories';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { ServiceIcon } from '../services/ServiceIcon';

const HERO_CATEGORIES = ['plumber', 'electrician', 'cleaner', 'carpenter'];

export function Hero() {
  const featured = HERO_CATEGORIES.map((slug) => fallbackCategory(slug) ?? SERVICE_CATEGORY_FALLBACK[0]).filter(
    Boolean,
  );

  return (
    <section className="cg-hero">
      <div className="cg-container cg-hero__inner">
        <div className="cg-hero__copy">
          <p className="cg-eyebrow">
            <span className="cg-eyebrow__dot" aria-hidden="true" />
            Worker-owned · community-first
          </p>
          <h1>
            Reliable Local Services. <span className="cg-hero__accent">Powered by Cooperatives.</span>
          </h1>
          <p className="cg-hero__subtitle">{BRAND.heroSubtitle}</p>

          <div className="cg-hero__actions">
            <Link className="cg-btn cg-btn--primary cg-btn--lg" to="/book">
              Book a Service
            </Link>
            <Link className="cg-btn cg-btn--secondary cg-btn--lg" to="/services">
              Explore Services
            </Link>
          </div>

          <ul className="cg-hero__points" aria-label="Platform principles">
            <li>
              <Check size={15} aria-hidden="true" /> Local cooperative workers
            </li>
            <li>
              <Check size={15} aria-hidden="true" /> No middlemen
            </li>
            <li>
              <Check size={15} aria-hidden="true" /> Transparent job tracking
            </li>
          </ul>
          <p className="cg-hero__fineprint">
            Frontend prototype. Workers, ratings and arrival estimates shown below are fictional demo data.
          </p>
        </div>

        <aside className="cg-hero__visual" aria-label="Illustrative Co-opGig demo preview">
          <div className="cg-hero-card">
            <div className="cg-hero-card__head">
              <div>
                <span className="cg-hero-card__kicker">Co-opGig network</span>
                <p>Find the right local help</p>
              </div>
              <Badge tone="demo">Demo preview</Badge>
            </div>

            <div className="cg-hero-card__services">
              {featured.map((category) => (
                <div className="cg-hero-tile" key={category.slug}>
                  <ServiceIcon slug={category.slug} size={20} />
                  <span>{category.name}</span>
                </div>
              ))}
            </div>

            <div className="cg-hero-card__worker">
              <Avatar name="Rahul Patil" size="md" />
              <div className="cg-hero-card__worker-copy">
                <strong>Rahul Patil</strong>
                <span>Electrician · Kothrud</span>
              </div>
              <div className="cg-hero-card__rating">
                <Star size={14} aria-hidden="true" />
                <strong>4.8</strong>
                <span>demo</span>
              </div>
            </div>
            <div className="cg-hero-card__tags">
              <Badge tone="demo">Demo profile</Badge>
              <span className="cg-hero-card__coop">
                <Users size={13} aria-hidden="true" /> Cooperative member
              </span>
            </div>

            <div className="cg-hero-card__eta">
              <span className="cg-hero-card__eta-icon">
                <Clock size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>Est. arrival 30–45 min</strong>
                <span>Sample estimate only — not guaranteed</span>
              </div>
            </div>

            <p className="cg-hero-card__disclaimer">Fictional demo preview. No live worker availability or booking is shown.</p>
          </div>
          <span className="cg-hero__floating-tag">
            <Users size={15} aria-hidden="true" />
            Cooperative-run
          </span>
        </aside>
      </div>
    </section>
  );
}
