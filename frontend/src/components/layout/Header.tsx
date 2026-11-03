import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BRAND, NAV_LINKS } from '../../config/brand';
import { cx } from '../../utils/cx';
import { Avatar } from '../ui/Avatar';
import { AccountMenu } from './AccountMenu';
import { BrandLogo } from './BrandLogo';
import { LanguageSelector } from './LanguageSelector';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, status, isDemoSession, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  function navClass({ isActive }: { isActive: boolean }) {
    return cx('cg-nav__link', isActive && 'is-active');
  }

  async function handleMobileLogout() {
    setMobileOpen(false);
    await logout();
  }

  return (
    <header className="cg-header">
      <div className="cg-container cg-header__inner">
        <BrandLogo />

        <nav className="cg-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="cg-header__controls">
          <LanguageSelector />
          {status === 'loading' ? (
            <span className="cg-header__loading" aria-hidden="true" />
          ) : user ? (
            <AccountMenu />
          ) : (
            <Link className="cg-login-link" to="/login">
              Login
            </Link>
          )}
          <Link className="cg-btn cg-btn--primary cg-btn--sm cg-header__book" to="/book">
            Book a Service
          </Link>
        </div>

        <button
          type="button"
          className="cg-menu-toggle"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="cg-mobile-nav" id="mobile-navigation">
          <nav className="cg-mobile-nav__links" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => cx('cg-mobile-nav__link', isActive && 'is-active')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="cg-mobile-nav__account">
            {user ? (
              <>
                <div className="cg-mobile-nav__identity">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p>{user.name}</p>
                    <span>
                      {user.role.toLowerCase()}
                      {isDemoSession ? ' · demo session' : ''}
                    </span>
                  </div>
                </div>
                <Link
                  className="cg-btn cg-btn--secondary cg-btn--sm cg-btn--full"
                  to={user.role === 'WORKER' ? '/worker' : '/customer'}
                >
                  {user.role === 'WORKER' ? 'Worker dashboard' : 'My requests'}
                </Link>
                <button
                  type="button"
                  className="cg-btn cg-btn--ghost cg-btn--sm cg-btn--full"
                  onClick={() => void handleMobileLogout()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link className="cg-btn cg-btn--secondary cg-btn--full" to="/login">
                Login
              </Link>
            )}
            <Link className="cg-btn cg-btn--primary cg-btn--full" to="/book">
              Book a Service
            </Link>
            <LanguageSelector compact />
            <p className="cg-mobile-nav__note">
              {BRAND.name} academic prototype. {isDemoSession ? 'Demo data only.' : ''}
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
