import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="cg-container cg-gate cg-section">
      <div className="cg-card cg-gate__card">
        <span className="cg-badge cg-badge--neutral">404</span>
        <h1>That page is not part of this prototype.</h1>
        <p>
          The link may be outdated, or the page belongs to another module in the integrated project. Use the navigation
          above to get back to the frontend.
        </p>
        <div className="cg-button-row">
          <Link className="cg-btn cg-btn--primary" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Return home
          </Link>
          <Link className="cg-btn cg-btn--secondary" to="/services">
            <Compass size={16} aria-hidden="true" />
            Browse services
          </Link>
        </div>
      </div>
    </section>
  );
}
