import { HandCoins, ListTodo, Megaphone } from 'lucide-react';
import { Suspense, useEffect, useRef, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { simulation } from '../api/simulation';
import { Avatar } from '../components/Avatar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingState, Skeleton } from '../components/StateViews';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cx } from '../lib/cx';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Queue', icon: ListTodo, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone, end: false },
];

/**
 * The frame shared by every screen: skip link, navigation, main region, footer.
 * The navigation is a sidebar on wide screens and a top bar on narrow ones;
 * it is the same markup restyled, so there is only ever one nav in the DOM.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const user = useCurrentUser();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // In a single-page app a navigation does not reload the page, so keyboard and
  // screen reader users would be left wherever they clicked. Moving focus to the
  // main region on each navigation mirrors what a full page load does.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.app}>
      <a href="#main" className={styles.skipLink}>
        Skip to main content
      </a>

      <header className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <HandCoins size={20} strokeWidth={2.25} />
          </span>
          <span className={styles.brandName}>Recoup</span>
        </div>

        <nav aria-label="Main" className={styles.nav}>
          <ul className={styles.navList}>
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.user}>
          <Avatar name={user.name} size="sm" />
          <div className={styles.userText}>
            <p className={styles.userName}>{user.name}</p>
            <p className={styles.userRole}>{user.role}</p>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
          {/* Keyed by path so a crashed screen does not block the next one. */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className={styles.footer}>
          <p>Demo data. Changes are kept in memory and reset when the page reloads.</p>
          <FailureSwitch />
        </footer>
      </div>
    </div>
  );
}

/** Shown while a lazily loaded screen's code is being downloaded. */
function PageFallback() {
  return (
    <LoadingState label="Loading page">
      <Skeleton width="16rem" height="2.5rem" />
      <Skeleton height="14rem" />
    </LoadingState>
  );
}

/** A demo-only control that makes the simulated API fail, to show error states. */
function FailureSwitch() {
  const isFailing = useSyncExternalStore(simulation.subscribe, simulation.getFailRequests);
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        checked={isFailing}
        onChange={(event) => simulation.setFailRequests(event.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      Simulate API failures
    </label>
  );
}
