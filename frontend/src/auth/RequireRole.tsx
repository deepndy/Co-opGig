import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../components/ui/PageLoader';
import type { UserRole } from '../types/domain';
import { useAuth } from './AuthContext';

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader label="Checking your session…" />;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <section className="cg-container cg-gate cg-section">
        <div className="cg-card cg-gate__card">
          <p className="cg-eyebrow">Access notice</p>
          <h1>This workspace is for {roles.map((role) => role.toLowerCase()).join(' or ')} accounts.</h1>
          <p>You are signed in as a {user.role.toLowerCase()}. Use the workspace that matches your role.</p>
          <div className="cg-button-row">
            <Link className="cg-btn cg-btn--primary" to="/">
              Return home
            </Link>
            <Link className="cg-btn cg-btn--secondary" to={user.role === 'WORKER' ? '/worker' : '/customer'}>
              Go to my workspace
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
