import { CheckCheck, HandCoins, Paperclip, Smile } from 'lucide-react';
import { CHANNEL_LABELS, type RenderedMessage } from '../../domain/templates';
import type { Channel, Customer } from '../../domain/types';
import styles from './MessagePreview.module.css';

const SENDER_NAME = 'Recoup Collections';
const SENDER_EMAIL = 'collections@recoup.example';

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

interface MessagePreviewProps {
  channel: Channel;
  message: RenderedMessage;
  recipient: Customer;
  sentAt: Date;
}

/**
 * The message as the customer will receive it: a chat on a phone for WhatsApp,
 * an email for email. Seeing the real wording, with the customer's own name
 * and amount filled in, is the last check before sending to many people.
 * All text stays real text, so screen readers read the actual message.
 */
export function MessagePreview({ channel, message, recipient, sentAt }: MessagePreviewProps) {
  const caption = `${CHANNEL_LABELS[channel]} message as ${recipient.name} will see it`;

  if (channel === 'whatsapp') {
    return (
      <figure className={styles.phone}>
        <figcaption className="visually-hidden">{caption}</figcaption>
        <div className={styles.screen}>
          <div className={styles.chatHeader}>
            <span className={styles.senderAvatar} aria-hidden="true">
              <HandCoins size={16} />
            </span>
            <div>
              <p className={styles.senderName}>{SENDER_NAME}</p>
              <p className={styles.senderMeta}>Business account</p>
            </div>
          </div>
          <div className={styles.chatBody}>
            <span className={styles.dayChip}>Today</span>
            <div className={styles.bubble}>
              <p>{message.body}</p>
              <span className={styles.bubbleMeta}>
                {timeFormatter.format(sentAt)}
                <CheckCheck size={14} aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className={styles.chatInput} aria-hidden="true">
            <Smile size={18} />
            <span className={styles.chatInputField}>Message</span>
            <Paperclip size={18} />
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className={styles.email}>
      <figcaption className="visually-hidden">{caption}</figcaption>
      <div className={styles.emailChrome} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.emailContent}>
        <p className={styles.subject}>{message.subject}</p>
        <dl className={styles.emailMeta}>
          <div>
            <dt>From</dt>
            <dd>
              {SENDER_NAME} &lt;{SENDER_EMAIL}&gt;
            </dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>{recipient.email}</dd>
          </div>
        </dl>
        <p className={styles.emailBody}>{message.body}</p>
      </div>
    </figure>
  );
}
