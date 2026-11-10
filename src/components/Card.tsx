import { useId, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  description?: ReactNode;
  /** Controls shown on the right of the header, such as a button or a link. */
  actions?: ReactNode;
  /** Renders the card as an <aside> instead of a <section>. */
  as?: 'section' | 'aside';
  className?: string;
  children: ReactNode;
}

/**
 * The surface every panel in the app sits on. It renders a labelled landmark,
 * so screen reader users can jump between panels by their titles.
 */
export function Card({ title, description, actions, as: Element = 'section', className, children }: CardProps) {
  const titleId = useId();
  return (
    <Element className={cx(styles.card, className)} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </Element>
  );
}
