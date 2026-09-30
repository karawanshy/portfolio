import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorPage } from '@/content';
import { Button } from '@/components/primitives';

/**
 * A lazy chunk that can't be fetched — typically the Story after a redeploy replaced its
 * hashed file while this tab still had the old HTML. Browsers word it differently.
 */
const CHUNK_ERROR = /dynamically imported module|importing a module script failed|error loading dynamically imported/i;
/** Auto-reload at most once per path within this window, so a real outage can't loop. */
const RELOAD_KEY = 'chunk-reload';
const RELOAD_WINDOW_MS = 10_000;

function reloadOnceFor(path: string): boolean {
  try {
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? 'null') as { path: string; at: number } | null;
    if (last && last.path === path && Date.now() - last.at < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    return false; // no storage: can't guard against a loop, so show the fallback instead
  }
  window.location.reload();
  return true;
}

interface State {
  error: Error | null;
  reloading: boolean;
}

/**
 * Catches a render / lazy-load error anywhere under it, so one failure shows a way out
 * instead of an empty page. A failed chunk load reloads once (fresh HTML, fresh hashes).
 * Renders no DOM of its own, so the prerendered HTML hydrates unchanged. App keys it by
 * route, so navigating away resets it.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (CHUNK_ERROR.test(error.message) && reloadOnceFor(window.location.pathname)) {
      this.setState({ reloading: true });
      return;
    }
    console.error(error, info.componentStack);
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    if (reloading) return null;
    return (
      <main
        id="main"
        className="grid min-h-screen place-content-center gap-6 px-6 text-center"
        role="alert"
      >
        <h1 className="font-display text-h2 font-bold text-cream">{errorPage.title}</h1>
        <p className="text-body text-text-2">{errorPage.body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>{errorPage.reload}</Button>
          {/* A full page load, not the client router: the app state that failed is left behind. */}
          <a href="/" className="inline-flex min-h-11 items-center px-4 text-body text-cream underline">
            {errorPage.home}
          </a>
        </div>
      </main>
    );
  }
}
