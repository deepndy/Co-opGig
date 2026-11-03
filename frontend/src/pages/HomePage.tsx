import { ArrowRight, ClipboardList, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CtaBand } from '../components/home/CtaBand';
import { CooperativeModel } from '../components/home/CooperativeModel';
import { Hero } from '../components/home/Hero';
import { WorkerShowcase } from '../components/home/WorkerShowcase';
import { ServiceCard } from '../components/services/ServiceCard';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { SectionHeading } from '../components/ui/SectionHeading';
import { SERVICE_CATEGORY_FALLBACK } from '../config/serviceCategories';
import { useAsyncData } from '../hooks/useAsyncData';

const STEPS = [
  {
    icon: FileText,
    title: 'Describe the job',
    text: 'Say what needs fixing and where. You can ask the assistant to help clarify the category.',
  },
  {
    icon: Sparkles,
    title: 'Review the suggestion',
    text: 'A category suggestion is just a starting point. Change it if it is not right for your job.',
  },
  {
    icon: ClipboardList,
    title: 'Confirm and track',
    text: 'Nothing is posted until you confirm. Then follow the request status from your customer view.',
  },
];

export function HomePage() {
  const { data, error, isLoading, reload } = useAsyncData(() => api.getCategories(), []);
  const categories = data && data.length > 0 ? data : SERVICE_CATEGORY_FALLBACK;
  const showCatalogNotice = Boolean(error) || (!isLoading && data !== null && data.length === 0);

  return (
    <>
      <Hero />

      <section className="cg-section cg-home-services" aria-labelledby="home-services-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="What do you need help with?"
            title="Services for everyday life, from your local cooperative network."
            description="Choose a category to start a request. Every request is reviewed by you before it is posted."
            id="home-services-title"
            action={
              <Link className="cg-text-link" to="/services">
                View all services
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />

          {showCatalogNotice ? (
            <Alert
              variant={error ? 'warning' : 'info'}
              title={error ? 'Live service catalog unavailable' : 'No live categories returned'}
              action={
                <Button variant="secondary" size="sm" onClick={reload}>
                  Try again
                </Button>
              }
            >
              Showing the built-in category list. Booking and category suggestions still work, but the catalog should be
              supplied by the core API in a connected build.
            </Alert>
          ) : null}

          {isLoading && !data ? (
            <CardGridSkeleton count={8} label="Loading service categories" />
          ) : (
            <div className="cg-card-grid cg-card-grid--4">
              {categories.map((category) => (
                <ServiceCard key={category.slug} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      <WorkerShowcase />

      <section className="cg-section cg-section--soft" aria-labelledby="home-steps-title">
        <div className="cg-container">
          <SectionHeading
            eyebrow="How it works"
            title="From description to confirmation, in three clear steps."
            description="The assistant can help you describe the job, but it cannot post, accept or book anything on your behalf."
            id="home-steps-title"
            action={
              <Link className="cg-text-link" to="/how-it-works">
                How it works
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />
          <div className="cg-step-grid">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="cg-step-card cg-card" key={step.title}>
                  <div className="cg-step-card__top">
                    <span className="cg-step-card__icon">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="cg-step-card__number">0{index + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CooperativeModel />
      <CtaBand />
    </>
  );
}
