import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  /** Small line above the title, such as today's date. */
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Page-level actions, aligned to the right on wide screens. */
  actions?: ReactNode;
}

/** The title block at the top of every screen. Owns the page's only <h1>. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
