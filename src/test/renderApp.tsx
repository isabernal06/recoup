import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router';
import { expect } from 'vitest';
import { AppRoutes } from '../app/AppRoutes';
import { createQueryClient } from '../app/queryClient';
import { ToastProvider } from '../components/toast/ToastProvider';

/**
 * Renders the real application (routes, layout, data layer) at a given URL.
 *
 * Integration tests go through this instead of mounting components in
 * isolation: they exercise the same wiring a user does, with only the network
 * latency removed, so they keep passing when the internals are refactored.
 */
export function renderApp(route = '/') {
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { user, ...view };
}

/**
 * Runs axe-core's automated accessibility rules against the rendered page.
 * Colour contrast is skipped because jsdom does not compute layout or styles;
 * contrast is covered by the design tokens instead.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
  );
  expect(summary).toEqual([]);
}
