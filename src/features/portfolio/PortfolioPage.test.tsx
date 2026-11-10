import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/db';
import { simulation } from '../../api/simulation';
import { withInsights } from '../../domain/accountRow';
import { expectNoA11yViolations, renderApp } from '../../test/renderApp';
import { PAGE_SIZE } from './PortfolioPage';

/** The seed data as the UI will see it, so tests can pick accounts by their state. */
const seedRows = () => db.accounts.map((account) => withInsights(account, new Date()));

const dataRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

const TOTAL = 48;

describe('Collections queue', () => {
  it('shows a loading state, then the top of the queue ranked by priority', async () => {
    renderApp();

    expect(screen.getByText(/loading accounts/i)).toBeInTheDocument();

    await screen.findByRole('table');
    const expectedTop = seedRows().toSorted((a, b) => b.priority.score - a.priority.score)[0];
    expect(dataRows()).toHaveLength(PAGE_SIZE);
    expect(dataRows()[0]).toHaveTextContent(expectedTop.customer.name);
  });

  it('reveals the rest of the queue on request', async () => {
    const { user } = renderApp();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: `Show ${PAGE_SIZE} more` }));
    expect(dataRows()).toHaveLength(PAGE_SIZE * 2);

    await user.click(screen.getByRole('button', { name: `Show ${TOTAL - PAGE_SIZE * 2} more` }));
    expect(dataRows()).toHaveLength(TOTAL);
    expect(screen.queryByRole('button', { name: /^Show \d+ more$/ })).not.toBeInTheDocument();
  });

  it('narrows the queue as the collector searches', async () => {
    const target = db.accounts[5];
    const { user } = renderApp();
    await screen.findByRole('table');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), target.id);

    expect(await screen.findByText(`1 of ${TOTAL} accounts`)).toBeInTheDocument();
    expect(dataRows()[0]).toHaveTextContent(target.customer.name);
  });

  it('filters by status with chips that show how many accounts each one holds', async () => {
    const broken = seedRows().filter((row) => row.status === 'promise_broken').length;
    const { user } = renderApp();
    await screen.findByRole('table');

    const chip = screen.getByRole('button', { name: `Broken promise ${broken}` });
    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(`${broken} of ${TOTAL} accounts`)).toBeInTheDocument();
    for (const row of dataRows()) expect(row).toHaveTextContent('Broken promise');
  });

  it('explains an empty result and offers a way back', async () => {
    const { user } = renderApp('/?q=no-such-customer');

    const emptyTitle = await screen.findByRole('heading', { name: 'No accounts match these filters' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // The empty state has its own "Clear filters" button, next to the message.
    const emptyState = emptyTitle.parentElement!;
    await user.click(within(emptyState).getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  });

  it('filters by age when a bucket of the chart is selected, and toggles it off again', async () => {
    const expected = seedRows().filter((row) => row.agingBucket === '31-60').length;
    const { user } = renderApp();
    await screen.findByRole('table');

    const bucket = screen.getByRole('button', { name: /31–60 days/ });
    await user.click(bucket);

    expect(bucket).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(`${expected} of ${TOTAL} accounts`)).toBeInTheDocument();
    // The chart and the dropdown are two views of the same URL-backed filter.
    expect(screen.getByRole('combobox', { name: 'Days past due' })).toHaveValue('31-60');

    await user.click(bucket);
    expect(await screen.findByText(`${TOTAL} of ${TOTAL} accounts`)).toBeInTheDocument();
  });

  it('shows an error when accounts cannot be loaded, and recovers on retry', async () => {
    simulation.setFailRequests(true);
    const { user } = renderApp();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load your accounts");

    simulation.setFailRequests(false);
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('has no automatically detectable accessibility violations', async () => {
    const { container } = renderApp();
    await screen.findByRole('table');

    await expectNoA11yViolations(container);
  });
});

describe('Creating a campaign from the queue', () => {
  it('previews who will be skipped, sends to the rest, and records it on the account', async () => {
    const rows = seedRows();
    const reachable = rows.find((row) => row.status === 'not_contacted' && row.customer.phone)!;
    const promised = rows.find((row) => row.status === 'promise_active' && row.customer.phone)!;
    const { user } = renderApp();
    await screen.findByRole('table');

    // Selection survives searching, so both accounts can be picked one after the other.
    const search = screen.getByRole('searchbox', { name: 'Search' });
    for (const account of [promised, reachable]) {
      await user.clear(search);
      await user.type(search, account.id);
      await user.click(
        await screen.findByRole('checkbox', { name: `Select ${account.customer.name}` }),
      );
    }

    // The floating selection bar offers the same action.
    const selectionBar = screen.getByRole('region', { name: 'Selected accounts' });
    expect(selectionBar).toHaveTextContent('2 accounts selected');
    expect(within(selectionBar).getByRole('button', { name: 'Message 2 accounts' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create campaign' });
    const audience = within(dialog).getByRole('region', { name: 'Audience' });
    expect(audience).toHaveTextContent('1 of 2 accounts will receive this message');
    expect(within(audience).getAllByRole('listitem')[0]).toHaveTextContent(
      /^active promise to pay 1$/,
    );
    const firstName = reachable.customer.name.split(' ')[0];
    expect(within(dialog).getByText(new RegExp(`^Hi ${firstName},`))).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Send to 1 account' }));

    const confirmation = await within(dialog).findByRole('heading', { name: 'Campaign sent' });
    expect(confirmation).toHaveFocus();

    // The message is now part of the customer's history.
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('link', { name: reachable.customer.name }));
    expect(await screen.findByText('Friendly reminder sent')).toBeInTheDocument();
    expect(screen.getByText(/Sent as part of a/)).toBeInTheDocument();
  });

  it('targets the filtered view when nothing is selected', async () => {
    const brokenPromises = seedRows().filter((row) => row.status === 'promise_broken').length;
    const { user } = renderApp('/?status=promise_broken');
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Create campaign' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create campaign' });
    expect(within(dialog).getByRole('region', { name: 'Audience' })).toHaveTextContent(
      `of ${brokenPromises} accounts will receive this message (from the current filtered view)`,
    );
  });

  it('opens reminders for promises due this week with the right template', async () => {
    const { user } = renderApp();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /^Send reminders/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Create campaign' });
    expect(within(dialog).getByRole('radio', { name: /^Promise reminder/ })).toBeChecked();
    expect(within(dialog).getByRole('region', { name: 'Audience' })).toHaveTextContent(
      '(from promises due this week)',
    );
  });

  it('keeps the form and explains the failure when the campaign cannot be sent', async () => {
    const { user } = renderApp();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create campaign' });

    simulation.setFailRequests(true);
    await user.click(within(dialog).getByRole('button', { name: /^Send to/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The campaign was not sent');
    expect(db.campaigns).toHaveLength(2); // Only the two seeded campaigns exist.
  });
});
