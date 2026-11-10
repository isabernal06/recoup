import { X } from 'lucide-react';
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
}

/**
 * A modal built on the native <dialog> element.
 *
 * `showModal()` gives us the hard accessibility parts for free: focus is
 * trapped inside, the rest of the page becomes inert, Escape closes it, and
 * focus returns to the element that opened it. That is why there is no
 * focus-trap library here.
 *
 * Children are only mounted while the dialog is open, so any form state inside
 * starts fresh every time it opens.
 */
export function Dialog({ open, onClose, title, description, size = 'md', children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Keep the imperative <dialog> API in sync with the declarative `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The dialog element itself is only visible as the backdrop: its content
  // fills it completely, so a click whose target is the dialog is "outside".
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      {open && (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close dialog">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * The dialog's action row. It stays pinned to the bottom edge while the content
 * scrolls, so the primary action is always reachable on long forms and small screens.
 */
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}
