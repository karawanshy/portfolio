import { lazy, Suspense } from 'react';
import { useRoute } from '@/router/router';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { PortfolioPage } from '@/pages/PortfolioPage';

// The Story is its own chunk so it never weighs on the Portfolio's first load.
const StoryPage = lazy(() => import('@/pages/StoryPage'));

export function App() {
  const route = useRoute();
  // Keyed by route: an error on one page is cleared by navigating to the other.
  return (
    <AppErrorBoundary key={route}>
      {route === 'story' ? (
        // No visible fallback: the orb transition covers the chunk load (transition.ts waits
        // for [data-story]), and a prerendered /story hydrates without suspending visibly.
        <Suspense fallback={null}>
          <StoryPage />
        </Suspense>
      ) : (
        <PortfolioPage />
      )}
    </AppErrorBoundary>
  );
}
