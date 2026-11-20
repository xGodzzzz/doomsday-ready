import { ApiRequestError } from '../api';
import { Icon } from './Icons';

export function ErrorBanner({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null;
  const title = error instanceof ApiRequestError && error.code === 'CIRCULAR_DEPENDENCY'
    ? 'Circular dependency blocked'
    : error instanceof ApiRequestError && error.code === 'VALIDATION_ERROR'
      ? 'Please check your input'
      : 'Something went wrong';
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof ApiRequestError ? error.details : [];
  return (
    <div className="feedback feedback-error" role="alert">
      <span className="feedback-icon"><Icon name="alert" size={18} /></span>
      <div className="feedback-body">
        <strong>{title}</strong>
        <p>{message}</p>
        {details.length > 0 && <ul>{details.map(({ field, message: detail }, index) =>
          <li key={`${field}-${index}`}>{field ? `${field}: ` : ''}{detail}</li>)}</ul>}
      </div>
      {onDismiss && <button className="icon-button subtle" aria-label="Dismiss error" onClick={onDismiss}><Icon name="x" size={17} /></button>}
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: 'film' | 'popcorn' | 'ticket' | 'search' | 'checkCircle'; title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3><p>{description}</p>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}
