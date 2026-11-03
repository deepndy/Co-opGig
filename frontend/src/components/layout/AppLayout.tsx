import { Outlet } from 'react-router-dom';
import { isDemoMode } from '../../api';
import { DemoBanner } from './DemoBanner';
import { Footer } from './Footer';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="cg-app">
      <a className="cg-skip-link" href="#main-content">
        Skip to main content
      </a>
      {isDemoMode ? <DemoBanner /> : null}
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
