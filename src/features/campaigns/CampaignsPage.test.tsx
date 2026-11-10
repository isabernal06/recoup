import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db } from '../../api/db';
import { renderApp } from '../../test/renderApp';

describe('Campaigns page', () => {
  it('shows past campaigns with their delivery results', async () => {
    renderApp('/campaigns');

    expect(await screen.findAllByRole('article')).toHaveLength(db.campaigns.length);
    expect(screen.getByText('Read rate')).toBeInTheDocument();
  });

  it('starts a new campaign for the whole queue and lists it once sent', async () => {
    const { user } = renderApp('/campaigns');
    await screen.findAllByRole('article');

    const newCampaign = screen.getByRole('button', { name: 'New campaign' });
    expect(newCampaign).toBeEnabled();
    await user.click(newCampaign);

    const dialog = await screen.findByRole('dialog', { name: 'Create campaign' });
    expect(within(dialog).getByRole('region', { name: 'Audience' })).toHaveTextContent(
      `of ${db.accounts.length} accounts will receive this message (from the whole queue)`,
    );

    await user.click(within(dialog).getByRole('button', { name: /^Send to/ }));
    await within(dialog).findByRole('heading', { name: 'Campaign sent' });
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));

    // The new campaign appears at the top of the list without a reload.
    expect(await screen.findAllByRole('article')).toHaveLength(3);
  });
});
