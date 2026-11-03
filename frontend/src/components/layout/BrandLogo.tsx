import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

export function BrandLogo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <Link to="/" className="cg-brand" aria-label={`${BRAND.name} — home`}>
      <svg className="cg-brand__mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <rect width="64" height="64" rx="17" fill="#2563eb" />
        <path
          d="M23 24.5c-5.8 0-10.5 4.7-10.5 10.5S17.2 45.5 23 45.5c3.1 0 5.9-1.3 7.8-3.5"
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M41 39.5c5.8 0 10.5-4.7 10.5-10.5S46.8 18.5 41 18.5c-3.1 0-5.9 1.3-7.8 3.5"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="43.5" cy="43.5" r="4.5" fill="#22c55e" />
      </svg>
      <span className="cg-brand__text">
        <strong>{BRAND.name}</strong>
        {withTagline ? <small>Local services, cooperative power</small> : null}
      </span>
    </Link>
  );
}
