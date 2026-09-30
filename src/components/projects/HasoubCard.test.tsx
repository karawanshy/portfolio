import { render, screen, within } from '@testing-library/react';
import { projects, type LeadProject } from '@/content';
import { HasoubCard } from './HasoubCard';

const hasoub = projects.items[0] as LeadProject;
const renderCard = (project: LeadProject) =>
  render(<HasoubCard project={project} sizeClass="" dialogId="d" detailsOpen={false} onOpenDetails={() => {}} />);

describe('HasoubCard', () => {
  it('shows the private status and no link while the project has none', () => {
    renderCard(hasoub);
    const card = screen.getByRole('article');
    expect(within(card).queryAllByRole('link')).toHaveLength(0);
    expect(card.querySelector('[data-private-marker]')).toHaveTextContent('Private client project');
  });

  it('renders the link button (and drops the private marker) once a link exists', () => {
    renderCard({ ...hasoub, link: { label: 'Visit the platform', href: 'https://example.com', external: true } });
    const card = screen.getByRole('article');
    const link = within(card).getByRole('link', { name: /visit the platform/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(card.querySelector('[data-private-marker]')).toBeNull();
  });

  it('keeps the face short: role and description on the card, beats and subtitle only in the details', () => {
    renderCard(hasoub);
    const card = screen.getByRole('article');
    expect(card.querySelector('p.project-role')).toHaveTextContent(hasoub.role);
    // Emphasized runs render in <b>.
    const ems = hasoub.description.filter((p) => typeof p !== 'string');
    expect(card.querySelectorAll('p b')).toHaveLength(ems.length);
    // The deeper content lives only in the (no-JS) inline details.
    const details = card.querySelector('details')!;
    expect(within(details).getByText(hasoub.details.platform.subtitle)).toBeInTheDocument();
    hasoub.details.role.beats.forEach((b) => expect(within(details).getByText(b.label)).toBeInTheDocument());
    // The label only breaks after a middot (no-break space before each "·").
    expect(card.querySelector('.label')!.textContent).not.toMatch(/ ·/);
  });
});
