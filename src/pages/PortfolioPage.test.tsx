import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { about, hero, links } from '@/content';
import { PortfolioPage } from './PortfolioPage';

describe('PortfolioPage', () => {
  it('has one h1, one h2 per section and the nav anchors', () => {
    const { container } = render(<PortfolioPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
    for (const id of ['work', 'projects', 'skills', 'contact', 'main']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
    // The about content lives in the hero, under a visually hidden h2.
    expect(screen.getByRole('heading', { level: 2, name: about.title })).toHaveClass('sr-only');
    expect(container.querySelector('#about')).toBeNull();
    // One portrait element at every width (CSS places it), so it downloads once.
    expect(screen.getAllByAltText(hero.portraitAlt)).toHaveLength(1);
  });

  it('hero shows the two proof signals (role, education), no eyebrow and none of the removed items', () => {
    const { container } = render(<PortfolioPage />);
    const heroEl = container.querySelector<HTMLElement>('section[aria-labelledby="hero-name"]')!;
    const items = within(heroEl).getAllByRole('listitem');
    expect(items).toHaveLength(hero.proof.length);
    hero.proof.forEach((p, i) => {
      expect(items[i]).toHaveTextContent(p.value);
      if (p.label) expect(items[i]).toHaveTextContent(p.label);
      // An empty caption renders nothing, not an empty element.
      expect(items[i]!.children).toHaveLength(p.label ? 2 : 1);
    });
    for (const gone of ['Drawn to', 'Now:', 'AG Grid', 'Tokens', 'Playwright', 'AI Engineering', 'Software Engineer · Axonius']) {
      expect(heroEl).not.toHaveTextContent(gone);
    }
    expect(items[0]).toHaveTextContent('Software EngineerAxonius');
    expect(items[1]).toHaveTextContent('B.Sc. Computer ScienceThe Open University');
    // The hero begins with the name: no eyebrow above it.
    expect(heroEl.querySelector('.hero-eyebrow')).toBeNull();
    // Education now lives only in the hero proof strip, not at the end of Experience.
    expect(container.querySelector('#work')).not.toHaveTextContent('Open University');
  });

  it('links to real destinations', () => {
    render(<PortfolioPage />);
    expect(screen.queryByRole('link', { name: /résumé|cv/i })).toBeNull();
    expect(screen.getByRole('link', { name: /the path here wasn’t exactly straight/i })).toHaveAttribute('href', '/story');
    expect(screen.getByRole('link', { name: /karawan\.sh\.y@gmail\.com/i })).toHaveAttribute('href', links.mailto);
  });

  it('keeps the hero glow out of the accessibility tree, and has no ribbon', () => {
    const { container } = render(<PortfolioPage />);
    expect(container.querySelector('[data-ribbon-text]')).toBeNull();
    // One sunrise glow, behind the portrait.
    const glows = container.querySelectorAll('[data-hero-glow]');
    expect(glows).toHaveLength(1);
    glows.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));
  });

  it('has no axe violations', async () => {
    const { container } = render(<PortfolioPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('mobile menu', () => {
  it('opens, moves focus to the first link, and closes on Escape', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PortfolioPage />);
    const button = screen.getByRole('button', { name: /open menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(menu.querySelector('a')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });
});
