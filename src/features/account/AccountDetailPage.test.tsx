import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/db';
import { withInsights } from '../../domain/accountRow';
import { formatCurrency } from '../../domain/format';
import { expectNoA11yViolations, renderApp } from '../../test/renderApp';

/** An open account with no promise yet, picked from the seed data by its state. */
const findUncontactedAccount = () =>
  db.accounts.find((account) => withInsights(account, new Date()).status === 'not_contacted')!;

describe('Account detail', () => {
  it('shows the account with an explanation of its priority', async () => {
    const account = findUncontactedAccount();
    const { container } = renderApp(`/accounts/${account.id}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: account.customer.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Why this priority' })).toBeInTheDocument();
    expect(screen.getByText('Never contacted')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('logs a call and adds it to the top of the activity history', async () => {
    const account = findUncontactedAccount();
    const { user } = renderApp(`/accounts/${account.id}`);
    await screen.findByRole('heading', { level: 1 });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Outcome' }), 'Left voicemail');
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Asked for a call back.');
    await user.click(screen.getByRole('button', { name: 'Log call' }));

    // Confirmed with a toast, announced through a polite live region.
    expect(await screen.findByText(/^Call logged/)).toBeInTheDocument();
    const history = screen.getAllByRole('listitem').filter((item) => item.querySelector('time'));
    expect(history[0]).toHaveTextContent('Left voicemail');
    expect(history[0]).toHaveTextContent('Asked for a call back.');
    // The account is no longer "not contacted".
    expect(screen.getByText('In follow-up')).toBeInTheDocument();
  });

  it('rejects an invalid promise, points at the problem, then saves a valid one', async () => {
    const account = findUncontactedAccount();
    const { user } = renderApp(`/accounts/${account.id}`);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('radio', { name: 'Promise to pay' }));
    const amount = screen.getByRole('spinbutton', { name: /Amount promised/ });
    await user.clear(amount);
    await user.type(amount, String(account.balanceDue + 1));
    await user.click(screen.getByRole('button', { name: 'Save promise' }));

    expect(amount).toBeInvalid();
    expect(amount).toHaveAccessibleDescription(/cannot exceed the balance due/);
    expect(amount).toHaveFocus();
    expect(db.accounts.find((item) => item.id === account.id)?.promise).toBeNull();

    await user.clear(amount);
    await user.type(amount, '50');
    await user.click(screen.getByRole('button', { name: 'Save promise' }));

    expect(await screen.findByText(/^Promise saved: \$50 by/)).toBeInTheDocument();
    expect(amount).toBeValid();
    expect(screen.getByText(/^Promised to pay \$50 by/)).toBeInTheDocument();
  });

  it('records a payment only after confirmation, then closes the account', async () => {
    const account = findUncontactedAccount();
    const balance = formatCurrency(account.balanceDue);
    const { user } = renderApp(`/accounts/${account.id}`);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('radio', { name: 'Record payment' }));
    await user.click(screen.getByRole('button', { name: 'Record full payment' }));
    // Nothing is saved until the second, explicit step.
    expect(db.accounts.find((item) => item.id === account.id)?.balanceDue).toBe(account.balanceDue);

    await user.click(screen.getByRole('button', { name: `Confirm payment of ${balance}` }));

    expect(await screen.findByText(`Payment of ${balance} recorded. This account is now closed.`)).toBeInTheDocument();
    expect(screen.getByText(/paid in full/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Record payment' })).not.toBeInTheDocument();
  });

  it('fills the promise from the shortcuts a collector hears most on a call', async () => {
    const account = findUncontactedAccount();
    const { user } = renderApp(`/accounts/${account.id}`);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('radio', { name: 'Promise to pay' }));
    await user.click(screen.getByRole('button', { name: /^Half/ }));
    await user.click(screen.getByRole('button', { name: 'In a week' }));

    expect(screen.getByRole('spinbutton', { name: /Amount promised/ })).toHaveValue(
      Math.round(account.balanceDue / 2),
    );
    expect(screen.getByRole('button', { name: 'In a week' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains when the account does not exist', async () => {
    renderApp('/accounts/ACC-0000');

    expect(await screen.findByRole('heading', { name: 'Account not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the queue' })).toHaveAttribute('href', '/');
  });
});
