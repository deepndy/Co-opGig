import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ServiceCard } from '../components/services/ServiceCard';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SERVICE_CATEGORY_FALLBACK } from '../config/serviceCategories';
import { useAsyncData } from '../hooks/useAsyncData';
import { pluralize } from '../utils/format';

export function ServicesPage() {
  const { data, error, isLoading, reload } = useAsyncData(() => api.getCategories(), []);
  const [query, setQuery] = useState('');

  const usingFallback = Boolean(error);
  const source = data && data.length > 0 ? data : usingFallback ? SERVICE_CATEGORY_FALLBACK : data ?? [];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return source;
    return source.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term) ||
        category.tasks.some((task) => task.toLowerCase().includes(term)),
    );
  }, [source, query]);

  return (
    <>
      <section className="cg-page-hero">
        <div className="cg-container cg-page-hero__inner">
          <div>
            <p className="cg-eyebrow">Our services</p>
            <h1>Everyday help, from local cooperative workers.</h1>
            <p>
              Explore household and community services. Choose a category to describe the job, review the details and
              confirm a request.
            </p>
          </div>
          <div className="cg-page-hero__aside">
            <p className="cg-page-hero__note">
              Categories come from the shared service catalog. Availability, assignment and verification are handled by
              the core platform and cooperative review process.
            </p>
            <Link className="cg-text-link" to="/how-it-works">
              How booking works
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="service-list-title">
        <div className="cg-container">
          <div className="cg-services-toolbar">
            <div>
              <p className="cg-eyebrow">Service catalog</p>
              <h2 id="service-list-title">Find the right kind of help</h2>
            </div>
            <label className="cg-search">
              <Search size={18} aria-hidden="true" />
              <span className="visually-hidden">Search services</span>
              <input
                type="search"
                placeholder="Search services or tasks…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search services"
              />
            </label>
          </div>

          {usingFallback ? (
            <Alert
              variant="warning"
              title="Live catalog unavailable"
              action={
                <Button size="sm" variant="secondary" onClick={reload}>
                  Try again
                </Button>
              }
            >
              The categories endpoint could not be loaded, so the built-in canonical list is shown. Booking still uses
              the shared category slugs.
            </Alert>
          ) : null}

          <div className="cg-results-count" aria-live="polite">
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>
              {isLoading && !data
                ? 'Loading services…'
                : `${pluralize(filtered.length, 'service')}${query.trim() ? ' match your search' : ' available'}`}
            </span>
          </div>

          {isLoading && !data ? (
            <CardGridSkeleton count={8} label="Loading services" />
          ) : filtered.length === 0 && !usingFallback ? (
            <EmptyState
              icon={<Search size={24} aria-hidden="true" />}
              title={query.trim() ? 'No services match that search' : 'No services are published yet'}
              message={
                query.trim()
                  ? 'Try a broader term, or browse the full catalogue.'
                  : 'The categories endpoint returned an empty list. Please check back after the backend is configured.'
              }
              action={
                query.trim() ? (
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={reload}>
                    Reload services
                  </Button>
                )
              }
            />
          ) : (
            <div className="cg-card-grid cg-card-grid--3">
              {filtered.map((category) => (
                <ServiceCard key={category.slug} category={category} showTasks />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
