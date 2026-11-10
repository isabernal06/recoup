import { FileQuestion } from 'lucide-react';
import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router';
import { buttonClassName } from '../components/buttonClassName';
import { EmptyState } from '../components/StateViews';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { AppLayout } from './AppLayout';

// The queue is the landing screen, so it ships in the main bundle. The other
// screens are split out and only downloaded when the collector opens them.
const AccountDetailPage = lazy(() =>
  import('../features/account/AccountDetailPage').then((module) => ({
    default: module.AccountDetailPage,
  })),
);
const CampaignsPage = lazy(() =>
  import('../features/campaigns/CampaignsPage').then((module) => ({
    default: module.CampaignsPage,
  })),
);

/** The route table. Kept separate from <App> so tests can mount it in a memory router. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="accounts/:accountId" element={<AccountDetailPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function NotFoundPage() {
  return (
    <>
      <title>Page not found · Recoup</title>
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Link to="/" className={buttonClassName('primary')}>
            Go to the queue
          </Link>
        }
      />
    </>
  );
}
