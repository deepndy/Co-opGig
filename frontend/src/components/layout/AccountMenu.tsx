import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../ui/Avatar';

export function AccountMenu() {
  const { user, isDemoSession, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/');
  }

  const dashboardPath = user.role === 'WORKER' ? '/worker' : '/customer';

  return (
    <div className="cg-account" ref={containerRef}>
      <button
        type="button"
        className="cg-account__trigger"
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
      >
        <Avatar name={user.name} size="sm" />
        <span className="cg-account__name">{user.name.replace(' (demo)', '')}</span>
        {isDemoSession ? <span className="cg-badge cg-badge--demo">Demo</span> : null}
        <ChevronDown size={14} aria-hidden="true" className="cg-account__chevron" />
      </button>
      {open ? (
        <div className="cg-account__panel" id="account-panel">
          <div className="cg-account__identity">
            <p>{user.name}</p>
            <span>{user.email || user.role.toLowerCase()}</span>
            {isDemoSession ? <span className="cg-account__demo-note">Demo session — not a real account.</span> : null}
          </div>
          <div className="cg-account__links">
            <Link to={dashboardPath} onClick={() => setOpen(false)}>
              <LayoutDashboard size={16} aria-hidden="true" />
              {user.role === 'WORKER' ? 'Worker dashboard' : 'My requests'}
            </Link>
            {user.role === 'ADMIN' ? (
              <Link to="/worker" onClick={() => setOpen(false)}>
                <LayoutDashboard size={16} aria-hidden="true" />
                Worker dashboard
              </Link>
            ) : null}
            <button type="button" onClick={() => void handleLogout()}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
