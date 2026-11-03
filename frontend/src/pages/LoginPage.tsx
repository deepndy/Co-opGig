import { ArrowRight, ClipboardCheck, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage, isDemoMode } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/PageLoader';
import { PasswordInput } from '../components/ui/PasswordInput';
import type { UserRole } from '../types/domain';

type Mode = 'login' | 'register';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function dashboardForRole(role: UserRole): string {
  return role === 'WORKER' ? '/worker' : '/customer';
}

function safeNext(value: string | null): string | null {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

export function LoginPage() {
  const { user, status, login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'CUSTOMER' | 'WORKER'>>('CUSTOMER');
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<'CUSTOMER' | 'WORKER' | null>(null);

  if (status === 'loading') return <PageLoader label="Checking your session…" />;
  if (user) {
    const destination = safeNext(searchParams.get('next')) ?? dashboardForRole(user.role);
    return <Navigate to={destination} replace />;
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  function validate(): boolean {
    const next: FormErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Enter a valid email address.';
    }
    if (mode === 'register' && name.trim().length < 2) {
      next.name = 'Enter your name.';
    }
    if (mode === 'login' && password.length < 6) {
      next.password = 'Enter your password (at least 6 characters in demo mode).';
    }
    if (mode === 'register' && password.length < 10) {
      next.password = 'Use at least 10 characters.';
    }
    if (mode === 'register' && confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      window.setTimeout(() => document.getElementById(`auth-${first}`)?.focus(), 30);
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const signedIn =
        mode === 'login'
          ? await login({ email: email.trim(), password })
          : await register({ name: name.trim(), email: email.trim(), password, role });
      setBusy(false);
      const destination = safeNext(searchParams.get('next')) ?? dashboardForRole(signedIn.role);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError);
      setBusy(false);
    }
  }

  async function handleDemoAccess(demoRole: 'CUSTOMER' | 'WORKER') {
    setError(null);
    setDemoBusy(demoRole);
    try {
      const demoUser = await login({
        email: demoRole === 'CUSTOMER' ? 'demo.customer@coopgig.test' : 'demo.worker@coopgig.test',
        password: 'demo1234',
      });
      setDemoBusy(null);
      const destination = safeNext(searchParams.get('next')) ?? dashboardForRole(demoUser.role);
      navigate(destination, { replace: true });
    } catch (demoError) {
      setError(demoError);
      setDemoBusy(null);
    }
  }

  return (
    <section className="cg-auth-section">
      <div className="cg-container">
        <div className="cg-auth-head">
          <p className="cg-eyebrow">Your account</p>
          <h1>Welcome to Co-opGig.</h1>
          <p>Sign in to track service requests, or create a customer or worker account for this prototype.</p>
        </div>

        <div className="cg-auth-grid">
          <aside className="cg-auth-aside" aria-label="Why create an account">
            <div className="cg-auth-aside__badge">
              <HeartHandshake size={20} aria-hidden="true" />
              Cooperative-first
            </div>
            <h2>A shared local service relationship.</h2>
            <p>
              Customer requests and worker jobs belong in one transparent place. The prototype keeps the cooperative in
              the loop rather than treating a worker as an anonymous listing.
            </p>
            <ul className="cg-check-list">
              <li>
                <ClipboardCheck size={16} aria-hidden="true" />
                Track request status from open to customer confirmed.
              </li>
              <li>
                <ShieldCheck size={16} aria-hidden="true" />
                Verification is never implied by a profile alone.
              </li>
              <li>
                <HeartHandshake size={16} aria-hidden="true" />
                Built for cooperative employment, not a gig-race to the bottom.
              </li>
            </ul>
            <Link className="cg-auth-aside__link" to="/how-it-works">
              How the workflow fits together
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </aside>

          <div className="cg-card cg-auth-card">
            <div className="cg-auth-card__head">
              <p className="cg-eyebrow">{mode === 'login' ? 'Sign in' : 'Create account'}</p>
              <h2>{mode === 'login' ? 'Continue to your workspace' : 'Join the Co-opGig prototype'}</h2>
              <p>
                {mode === 'login'
                  ? 'Use the demo access buttons below, or sign in with the core API.'
                  : 'Choose a customer or worker role. You can change the role only by creating a new account.'}
              </p>
            </div>

            {isDemoMode ? (
              <div className="cg-demo-access">
                <div className="cg-demo-access__head">
                  <span className="cg-badge cg-badge--demo">Demo only</span>
                  <p>Local simulated sessions. No password or account is verified.</p>
                </div>
                <div className="cg-demo-access__buttons">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDemoAccess('CUSTOMER')}
                    isLoading={demoBusy === 'CUSTOMER'}
                    disabled={demoBusy !== null}
                  >
                    Enter as demo customer
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDemoAccess('WORKER')}
                    isLoading={demoBusy === 'WORKER'}
                    disabled={demoBusy !== null}
                  >
                    Enter as demo worker
                  </Button>
                </div>
                <p className="cg-demo-access__fineprint">
                  Demo form sign-in accepts any 6+ character password. Do not use a real password.
                </p>
              </div>
            ) : null}

            <div className="cg-auth-mode" role="group" aria-label="Sign in or create an account">
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : undefined}
                aria-pressed={mode === 'login'}
                onClick={() => switchMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : undefined}
                aria-pressed={mode === 'register'}
                onClick={() => switchMode('register')}
              >
                Create account
              </button>
            </div>

            <form className="cg-auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
              {mode === 'register' ? (
                <div className="cg-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(errors.name) || undefined}
                    aria-describedby={errors.name ? 'auth-name-error' : undefined}
                  />
                  {errors.name ? (
                    <p className="cg-field__error" id="auth-name-error">
                      {errors.name}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="cg-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(errors.email) || undefined}
                  aria-describedby={errors.email ? 'auth-email-error' : undefined}
                  placeholder="you@example.com"
                />
                {errors.email ? (
                  <p className="cg-field__error" id="auth-email-error">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="cg-field">
                <label htmlFor="auth-password">Password</label>
                <PasswordInput
                  id="auth-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  invalid={Boolean(errors.password)}
                  describedBy={errors.password ? 'auth-password-error' : undefined}
                />
                {errors.password ? (
                  <p className="cg-field__error" id="auth-password-error">
                    {errors.password}
                  </p>
                ) : (
                  <p className="cg-field__hint">
                    {isDemoMode ? 'Demo: any 6+ characters. Never enter a real password.' : 'At least 8 characters.'}
                  </p>
                )}
              </div>

              {mode === 'register' ? (
                <>
                  <div className="cg-field">
                    <label htmlFor="auth-confirmPassword">Confirm password</label>
                    <PasswordInput
                      id="auth-confirmPassword"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      invalid={Boolean(errors.confirmPassword)}
                      describedBy={errors.confirmPassword ? 'auth-confirmPassword-error' : undefined}
                    />
                    {errors.confirmPassword ? (
                      <p className="cg-field__error" id="auth-confirmPassword-error">
                        {errors.confirmPassword}
                      </p>
                    ) : null}
                  </div>

                  <fieldset className="cg-role-select">
                    <legend>Account role</legend>
                    <div className="cg-role-select__options">
                      <label className={role === 'CUSTOMER' ? 'cg-role-option is-selected' : 'cg-role-option'}>
                        <input
                          type="radio"
                          name="role"
                          value="CUSTOMER"
                          checked={role === 'CUSTOMER'}
                          onChange={() => setRole('CUSTOMER')}
                        />
                        <span>
                          <strong>Customer</strong>
                          <small>Post and track service requests.</small>
                        </span>
                      </label>
                      <label className={role === 'WORKER' ? 'cg-role-option is-selected' : 'cg-role-option'}>
                        <input
                          type="radio"
                          name="role"
                          value="WORKER"
                          checked={role === 'WORKER'}
                          onChange={() => setRole('WORKER')}
                        />
                        <span>
                          <strong>Worker</strong>
                          <small>Accept and manage cooperative work.</small>
                        </span>
                      </label>
                    </div>
                  </fieldset>
                </>
              ) : null}

              {error ? <Alert variant="error" title="Could not complete sign-in">{getErrorMessage(error)}</Alert> : null}

              <Button type="submit" size="lg" fullWidth isLoading={busy} disabled={busy || demoBusy !== null}>
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>

              {!isDemoMode ? (
                <p className="cg-auth-form__note">
                  Session handling is provided by the core Co-opGig API. This frontend accepts either a returned bearer
                  token or an httpOnly cookie session, so it does not store your password.
                </p>
              ) : (
                <p className="cg-auth-form__note">
                  Demo authentication is simulated in this browser. It is not a real account and grants no access to a
                  live service.
                </p>
              )}
            </form>

            <div className="cg-auth-card__footer">
              <p>
                {mode === 'login' ? 'New to the prototype?' : 'Already have a prototype account?'}{' '}
                <button type="button" className="cg-link-button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Create an account' : 'Sign in instead'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
