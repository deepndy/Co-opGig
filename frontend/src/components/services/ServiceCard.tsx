import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceCategory } from '../../types/domain';
import { ServiceIcon } from './ServiceIcon';

interface ServiceCardProps {
  category: ServiceCategory;
  showTasks?: boolean;
}

export function ServiceCard({ category, showTasks = false }: ServiceCardProps) {
  const bookHref = `/book?category=${encodeURIComponent(category.slug)}`;
  return (
    <article className="cg-service-card cg-card">
      <div className="cg-service-card__top">
        <ServiceIcon slug={category.slug} size={22} />
      </div>
      <h3>{category.name}</h3>
      <p className="cg-service-card__description">{category.description}</p>
      {showTasks && category.tasks.length > 0 ? (
        <ul className="cg-task-list" aria-label={`Typical ${category.name} tasks`}>
          {category.tasks.slice(0, 3).map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
      ) : null}
      <Link className="cg-text-link cg-service-card__link" to={bookHref} aria-label={`Book ${category.name}`}>
        Book this service
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}
