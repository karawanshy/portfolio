import { act, render, screen } from '@testing-library/react';
import { App } from '@/App';
import { entryState, navigate, resolveRoute } from './router';

describe('router', () => {
  it('resolves known routes and rejects unknown ones', () => {
    expect(resolveRoute('/')).toBe('portfolio');
    expect(resolveRoute('/story')).toBe('story');
    expect(resolveRoute('/story/')).toBe('story');
    expect(resolveRoute('/nope')).toBeNull();
  });

  it('redirects unknown paths to /', async () => {
    window.history.replaceState(null, '', '/does-not-exist');
    await act(async () => {
      render(<App />);
    });
    expect(window.location.pathname).toBe('/');
  });

  it('renders the Story on /story', async () => {
    window.history.replaceState(null, '', '/story');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: /how i got here/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /back to the portfolio/i })[0]).toHaveAttribute('href', '/#story');
  });

  it('records the Story origin on the entry it leaves and the return point on the new one', () => {
    window.history.replaceState(null, '', '/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    navigate('/story', { state: { storyReturn: { origin: 'topbar', scrollY: 1234 } }, leaving: { storyOrigin: 'topbar' } });
    expect(window.location.pathname).toBe('/story');
    expect(entryState()).toEqual({ storyReturn: { origin: 'topbar', scrollY: 1234 } });
    window.history.back();
    return new Promise<void>((resolve) => {
      window.addEventListener(
        'popstate',
        () => {
          expect(entryState()).toMatchObject({ storyOrigin: 'topbar' });
          expect(typeof entryState().scrollY).toBe('number');
          resolve();
        },
        { once: true },
      );
    });
  });

  it('reads a missing or foreign history.state as empty', () => {
    window.history.replaceState('not an object', '', '/');
    expect(entryState()).toEqual({});
    window.history.replaceState(null, '', '/');
    expect(entryState()).toEqual({});
  });
});
