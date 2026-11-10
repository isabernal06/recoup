import { Banknote, CircleAlert, CircleCheck, Handshake, PhoneCall } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { SegmentedControl } from '../../components/SegmentedControl';
import { InlineAlert } from '../../components/StateViews';
import { useToast } from '../../components/toast/toastContext';
import type { WithInsights } from '../../domain/accountRow';
import { CALL_OUTCOME_LABELS } from '../../domain/activity';
import { addDays, diffInDays, toISODate } from '../../domain/dates';
import { formatCurrency, formatDate } from '../../domain/format';
import type { Account, CallOutcome } from '../../domain/types';
import { cx } from '../../lib/cx';
import { getErrorMessage } from '../../lib/errors';
import { useCreatePromise, useLogCall, useRecordPayment } from '../../queries/accounts';
import styles from './AccountActions.module.css';

type ActionKind = 'call' | 'promise' | 'payment';

const ACTIONS = [
  { value: 'call', label: 'Log a call', icon: PhoneCall },
  { value: 'promise', label: 'Promise to pay', icon: Handshake },
  { value: 'payment', label: 'Record payment', icon: Banknote },
] as const;

interface AccountActionsProps {
  account: WithInsights<Account>;
  today: Date;
}

/** The things a collector can do to an account. Each one changes server state. */
export function AccountActions({ account, today }: AccountActionsProps) {
  const [action, setAction] = useState<ActionKind>('call');

  if (account.status === 'paid') {
    return (
      <div className={styles.paid}>
        <CircleCheck size={28} aria-hidden="true" />
        <p>This account is paid in full. No further action is needed.</p>
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <SegmentedControl
        legend="Choose an action"
        name="account-action"
        options={[...ACTIONS]}
        value={action}
        onChange={setAction}
      />
      {action === 'call' && <LogCallForm accountId={account.id} />}
      {action === 'promise' && <PromiseForm account={account} today={today} />}
      {action === 'payment' && <PaymentForm account={account} />}
    </div>
  );
}

function LogCallForm({ accountId }: { accountId: string }) {
  const logCall = useLogCall(accountId);
  const toast = useToast();
  const [outcome, setOutcome] = useState<CallOutcome>('spoke');
  const [note, setNote] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    logCall.mutate(
      { outcome, note },
      {
        onSuccess: () => {
          setNote('');
          toast({ message: 'Call logged. It now appears at the top of the activity history.' });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Field label="Outcome">
        {(control) => (
          <select
            {...control}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as CallOutcome)}
          >
            {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Note" hint="Optional. What was said or agreed.">
        {(control) => (
          <textarea
            {...control}
            value={note}
            maxLength={280}
            placeholder="e.g. Asked to be called back on Friday"
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>
      {logCall.isError && (
        <InlineAlert tone="danger" icon={CircleAlert}>
          The call was not saved. {getErrorMessage(logCall.error)}
        </InlineAlert>
      )}
      <Button type="submit" variant="primary" isLoading={logCall.isPending}>
        {logCall.isPending ? 'Saving…' : 'Log call'}
      </Button>
    </form>
  );
}

interface AccountFormProps {
  account: WithInsights<Account>;
}

const DEFAULT_PROMISE_DAYS = 3;
const DATE_SHORTCUTS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

function PromiseForm({ account, today }: AccountFormProps & { today: Date }) {
  const createPromise = useCreatePromise(account.id);
  const toast = useToast();
  const [amount, setAmount] = useState(String(account.balanceDue));
  const [dueDate, setDueDate] = useState(toISODate(addDays(today, DEFAULT_PROMISE_DAYS)));
  const [errors, setErrors] = useState<{ amount?: string; dueDate?: string }>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  // One tap for the answers a collector hears most on a call.
  const amountShortcuts = [
    { label: 'Full balance', value: account.balanceDue },
    { label: 'Half', value: Math.round(account.balanceDue / 2) },
  ];

  const validate = () => {
    const nextErrors: typeof errors = {};
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    } else if (value > account.balanceDue) {
      nextErrors.amount = `The amount cannot exceed the balance due (${formatCurrency(account.balanceDue)}).`;
    }
    if (!dueDate) {
      nextErrors.dueDate = 'Choose the date the customer committed to.';
    } else if (diffInDays(today, dueDate) < 0) {
      nextErrors.dueDate = 'The promise date cannot be in the past.';
    }
    return nextErrors;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    // Send keyboard and screen reader users straight to the first problem.
    if (nextErrors.amount) {
      amountRef.current?.focus();
      return;
    }
    if (nextErrors.dueDate) {
      dueDateRef.current?.focus();
      return;
    }

    createPromise.mutate(
      { amount: Number(amount), dueDate },
      {
        onSuccess: () =>
          toast({
            message: `Promise saved: ${formatCurrency(Number(amount))} by ${formatDate(dueDate)}.`,
          }),
      },
    );
  };

  return (
    // noValidate: we show our own messages, which are specific and consistently styled.
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {account.status === 'promise_active' && (
        <InlineAlert tone="warning" icon={Handshake}>
          This replaces the customer’s current promise.
        </InlineAlert>
      )}
      <div className={styles.fieldGroup}>
        <Field label="Amount promised (USD)" error={errors.amount}>
          {(control) => (
            <input
              {...control}
              ref={amountRef}
              type="number"
              inputMode="decimal"
              min={1}
              max={account.balanceDue}
              step="any"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          )}
        </Field>
        <div className={styles.shortcuts} role="group" aria-label="Amount shortcuts">
          {amountShortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              className={cx(styles.shortcut, Number(amount) === shortcut.value && styles.shortcutActive)}
              aria-pressed={Number(amount) === shortcut.value}
              onClick={() => setAmount(String(shortcut.value))}
            >
              {shortcut.label} · {formatCurrency(shortcut.value)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <Field label="Pay by" error={errors.dueDate}>
          {(control) => (
            <input
              {...control}
              ref={dueDateRef}
              type="date"
              min={toISODate(today)}
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          )}
        </Field>
        <div className={styles.shortcuts} role="group" aria-label="Date shortcuts">
          {DATE_SHORTCUTS.map((shortcut) => {
            const value = toISODate(addDays(today, shortcut.days));
            return (
              <button
                key={shortcut.label}
                type="button"
                className={cx(styles.shortcut, dueDate === value && styles.shortcutActive)}
                aria-pressed={dueDate === value}
                onClick={() => setDueDate(value)}
              >
                {shortcut.label}
              </button>
            );
          })}
        </div>
      </div>
      {createPromise.isError && (
        <InlineAlert tone="danger" icon={CircleAlert}>
          The promise was not saved. {getErrorMessage(createPromise.error)}
        </InlineAlert>
      )}
      <Button type="submit" variant="primary" isLoading={createPromise.isPending}>
        {createPromise.isPending ? 'Saving…' : 'Save promise'}
      </Button>
    </form>
  );
}

function PaymentForm({ account }: AccountFormProps) {
  const recordPayment = useRecordPayment(account.id);
  const toast = useToast();
  const [isConfirming, setConfirming] = useState(false);
  const balance = formatCurrency(account.balanceDue);

  const handleConfirm = () => {
    recordPayment.mutate(undefined, {
      onSuccess: () => toast({ message: `Payment of ${balance} recorded. This account is now closed.` }),
    });
  };

  return (
    <div className={styles.form}>
      <div className={styles.paymentSummary}>
        <span className={styles.paymentLabel}>Full balance</span>
        <span className={cx(styles.paymentAmount, 'tabular')}>{balance}</span>
        <p className={styles.muted}>Recording it closes the account and takes it out of the active queue.</p>
      </div>
      {recordPayment.isError && (
        <InlineAlert tone="danger" icon={CircleAlert}>
          The payment was not recorded. {getErrorMessage(recordPayment.error)}
        </InlineAlert>
      )}
      {/* Closing an account cannot be undone here, so it takes a second, explicit step. */}
      {isConfirming ? (
        <div className={styles.confirm}>
          <Button variant="primary" onClick={handleConfirm} isLoading={recordPayment.isPending}>
            {recordPayment.isPending ? 'Recording…' : `Confirm payment of ${balance}`}
          </Button>
          <Button onClick={() => setConfirming(false)} disabled={recordPayment.isPending}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="primary" onClick={() => setConfirming(true)}>
          Record full payment
        </Button>
      )}
    </div>
  );
}
