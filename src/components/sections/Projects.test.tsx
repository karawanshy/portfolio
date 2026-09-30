import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { projects } from '@/content';
import { Projects } from './Projects';

const cards = () => screen.getAllByRole('article');

describe('Projects', () => {
  it('shows three projects, Hasoub first, then Habit Tracker and Chess', () => {
    render(<Projects />);
    expect(cards().map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Hasoub Talent Bridge',
      'Habit Tracker API',
      'Multiplayer Chess',
    ]);
    expect(screen.getByText('01 / 03')).toBeInTheDocument();
    // Hasoub is the widest card at its design width.
    const widths = [...document.querySelectorAll<HTMLElement>('[data-project-rail] > li')].map((li) =>
      Number(li.dataset.cardWidth),
    );
    expect(widths[0]).toBeGreaterThan(Math.max(...widths.slice(1)));
  });

  it('marks Hasoub as a private client project, with no link at all', () => {
    render(<Projects />);
    const hasoub = cards()[0]!;
    expect(within(hasoub).queryAllByRole('link')).toHaveLength(0);
    expect(hasoub.querySelector('[data-private-marker]')).toHaveTextContent('Private client project');
    expect(hasoub.querySelector('p.project-role')).toHaveTextContent('Team Lead / Software Engineer');
    // The other two keep their real GitHub links.
    expect(within(cards()[1]!).getByRole('link', { name: /view on github/i })).toHaveAttribute(
      'href',
      'https://github.com/karawanshy/habit-tracker-api',
    );
    expect(within(cards()[2]!).getByRole('link', { name: /view on github/i })).toHaveAttribute(
      'href',
      'https://github.com/karawanshy/ChessGame',
    );
  });

  it('opens the details dialog, closes it on Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    const button = screen.getByRole('button', { name: /more about the project/i });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: 'Hasoub Talent Bridge' });
    expect(button.getAttribute('aria-controls')).toBe(dialog.id);
    expect(within(dialog).getByRole('heading', { name: 'The platform' })).toBeInTheDocument();
    // What moved off the card face: the subtitle and the leadership beats.
    expect(within(dialog).getByText(projects.items[0].details.platform.subtitle)).toBeInTheDocument();
    projects.items[0].details.role.beats.forEach((b) => expect(within(dialog).getByText(b.label)).toBeInTheDocument());
    within(dialog).getByRole('button', { name: /close project details/i }).focus();
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('carries the same details in a no-JS <details> fallback', () => {
    const { container } = render(<Projects />);
    const details = container.querySelector('[data-project-rail] details[data-nojs-only]');
    expect(details).not.toBeNull();
    expect(details!.querySelector('summary')?.textContent).toMatch(projects.items[0].moreLabel);
    expect(details!.textContent).toMatch(/Helping define technical direction/);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Projects />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
