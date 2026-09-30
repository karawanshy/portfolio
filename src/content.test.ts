import * as content from './content';

const allCopy = JSON.stringify(content);

describe('content faithfulness (content/portfolio-facts.md)', () => {
  it('never describes the internship as backend', () => {
    expect(allCopy).not.toMatch(/backend intern/i);
  });
  it('mentions Stylelint for the design-token work', () => {
    const tokens = content.experience.items.find((i) => i.label === 'Frontend infrastructure');
    expect(tokens?.description.join('')).toMatch(/Stylelint/);
  });
  it('has no unfilled placeholders and uses real links', () => {
    expect(allCopy).not.toMatch(/\[[A-ZÉ ]+\]/);
    expect(content.links.repos.habitTracker).toBe('https://github.com/karawanshy/habit-tracker-api');
    expect(content.links.repos.chess).toBe('https://github.com/karawanshy/ChessGame');
  });
});
