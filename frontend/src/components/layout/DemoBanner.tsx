import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

export function DemoBanner() {
  return (
    <div className="cg-demo-banner" role="status">
      <div className="cg-container cg-demo-banner__inner">
        <FlaskConical size={16} aria-hidden="true" />
        <p>
          <strong>Demo mode.</strong> {BRAND.demoModeNotice}
        </p>
        <Link to="/how-it-works#prototype-status">Prototype status</Link>
      </div>
    </div>
  );
}
