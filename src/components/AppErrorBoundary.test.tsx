import { render, screen } from '@testing-library/react';
import { errorPage } from '@/content';
import { AppErrorBoundary } from './AppErrorBoundary';

function Boom(): never {
  throw new Error('render failed');
}

describe('AppErrorBoundary', () => {
  it('renders its children when nothing fails', () => {
    render(
      <AppErrorBoundary>
        <p>fine</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows a way out instead of an empty page when a child throws', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1, name: errorPage.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: errorPage.reload })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: errorPage.home })).toHaveAttribute('href', '/');
    quiet.mockRestore();
  });
});
