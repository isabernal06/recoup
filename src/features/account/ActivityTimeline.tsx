import { Banknote, Handshake, Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { formatDateTime } from '../../domain/format';
import type { Activity, ActivityType } from '../../domain/types';
import { cx } from '../../lib/cx';
import styles from './ActivityTimeline.module.css';

const ACTIVITY_STYLE: Record<ActivityType, { label: string; icon: LucideIcon }> = {
  call: { label: 'Call', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  email: { label: 'Email', icon: Mail },
  promise: { label: 'Promise', icon: Handshake },
  payment: { label: 'Payment', icon: Banknote },
};

interface ActivityTimelineProps {
  activities: Activity[];
}

/** Everything that has happened on an account, newest first. */
export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className={styles.empty}>
        No activity yet. Log a call or send a message to start this account’s history.
      </p>
    );
  }

  return (
    <ol className={styles.timeline}>
      {activities.map((activity) => {
        const { label, icon: Icon } = ACTIVITY_STYLE[activity.type];
        const isMessage = activity.type === 'whatsapp' || activity.type === 'email';
        return (
          <li key={activity.id} className={styles.item}>
            <span className={cx(styles.icon, styles[activity.type])} aria-hidden="true">
              <Icon size={16} />
            </span>
            <div className={styles.content}>
              <div className={styles.itemHeader}>
                <p className={styles.summary}>
                  <span className="visually-hidden">{label}: </span>
                  {activity.summary}
                </p>
                <time dateTime={activity.at} className={styles.time}>
                  {formatDateTime(activity.at)}
                </time>
              </div>
              {activity.note && (
                <p className={cx(styles.note, isMessage && styles[`${activity.type}Note`])}>
                  {activity.note}
                </p>
              )}
              {activity.campaignId && (
                <p className={styles.campaign}>
                  Sent as part of a <Link to="/campaigns">campaign</Link>.
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
