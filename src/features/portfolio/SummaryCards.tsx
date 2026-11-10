import { CalendarX, Flame, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCurrency, pluralize } from '../../domain/format';
import { cx } from '../../lib/cx';
import styles from './SummaryCards.module.css';
import { RECOVERY_TARGET, type PortfolioSummary } from './summary';

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

interface Kpi {
  label: string;
  value: string;
  detail: ReactNode;
  icon: LucideIcon;
  tone: 'primary' | 'danger' | 'warning' | 'success';
}

/** Headline numbers that answer "how is my portfolio doing right now?". */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const recoveredPercent = Math.min(100, Math.round((summary.recoveredAmount / RECOVERY_TARGET) * 100));

  const kpis: Kpi[] = [
    {
      label: 'Overdue balance',
      value: formatCurrency(summary.overdueBalance),
      detail: `across ${pluralize(summary.openCount, 'open account')}`,
      icon: Wallet,
      tone: 'primary',
    },
    {
      label: 'High priority',
      value: String(summary.highPriorityCount),
      detail: 'accounts to work first',
      icon: Flame,
      tone: 'danger',
    },
    {
      label: 'Broken promises',
      value: String(summary.brokenPromises),
      detail: 'customers to follow up',
      icon: CalendarX,
      tone: 'warning',
    },
    {
      label: 'Recovered',
      value: formatCurrency(summary.recoveredAmount),
      detail: (
        <>
          <span className={styles.progress} aria-hidden="true">
            <span className={styles.progressFill} style={{ width: `${recoveredPercent}%` }} />
          </span>
          {recoveredPercent}% of {formatCurrency(RECOVERY_TARGET)} target
        </>
      ),
      icon: TrendingUp,
      tone: 'success',
    },
  ];

  return (
    <dl className={styles.grid}>
      {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
        <div key={label} className={styles.card}>
          <dt className={styles.label}>
            <span className={cx(styles.icon, styles[tone])} aria-hidden="true">
              <Icon size={18} />
            </span>
            {label}
          </dt>
          <dd className={styles.body}>
            <span className={cx(styles.value, 'tabular')}>{value}</span>{' '}
            <span className={styles.detail}>{detail}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
