import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Button } from './Button';
import { SectionTitle } from './SectionTitle';
import { SunMark } from './SunMark';
import { middotText } from './middotText';

describe('primitives', () => {
  it('middotText only breaks after a middot, even when the copy already has no-break spaces', () => {
    const expected = '01\u00a0· Real\u00a0client\u00a0· In\u00a0progress';
    expect(middotText('01 · Real client · In progress')).toBe(expected);
    expect(middotText('01\u00a0· Real\u00a0client\u00a0· In\u00a0progress')).toBe(expected);
  });

  it('SunMark is decorative', () => {
    const { container } = render(<SunMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('external Buttons open safely in a new tab', () => {
    render(
      <Button href="https://github.com/karawanshy" external trailing="↗">
        GitHub
      </Button>,
    );
    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('SectionTitle renders an h2 with a decorative number', async () => {
    const { container } = render(<SectionTitle number="01" title="Experience" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
