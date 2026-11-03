import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND, NAV_LINKS } from '../../config/brand';
import { SERVICE_CATEGORY_FALLBACK } from '../../config/serviceCategories';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  return (
    <footer className="cg-footer">
      <div className="cg-container">
        <div className="cg-footer__grid">
          <div className="cg-footer__brand">
            <BrandLogo />
            <p>{BRAND.description}</p>
            <p className="cg-footer__academic">{BRAND.academicTitle}</p>
            <div className="cg-footer__tags">
              <span>Academic prototype</span>
              <span>Frontend module</span>
            </div>
          </div>

          <nav className="cg-footer__column" aria-label="Footer navigation">
            <h2>Explore</h2>
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="cg-footer__column" aria-label="Popular services">
            <h2>Services</h2>
            {SERVICE_CATEGORY_FALLBACK.slice(0, 6).map((category) => (
              <Link key={category.slug} to={`/book?category=${category.slug}`}>
                {category.name}
              </Link>
            ))}
            <Link to="/services">
              All services <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </nav>

          <div className="cg-footer__notice">
            <h2>Prototype notice</h2>
            <p>
              This build demonstrates the customer and worker experience. Workers, jobs, ratings and earnings shown in
              demo mode are fictional. No payment, escrow, verified badge or guaranteed arrival is provided.
            </p>
            <Link to="/how-it-works#prototype-status">What is implemented?</Link>
          </div>
        </div>

        <div className="cg-footer__bottom">
          <p>
            © {new Date().getFullYear()} {BRAND.name} academic prototype.
          </p>
          <p>{BRAND.demoDataNote}</p>
        </div>
        <p className="cg-footer__team">
          Team: {BRAND.team.map((member) => `${member.name} (${member.area})`).join(' · ')}
        </p>
      </div>
    </footer>
  );
}
