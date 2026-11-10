import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import { ToastProvider } from '../components/toast/ToastProvider';
import { AppRoutes } from './AppRoutes';
import { createQueryClient } from './queryClient';

export function App() {
  // Created once per app instance (not at module level) so it is never shared between tests.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
