/**
 * All Portfolio copy and data, in one typed file.
 *
 * Factual source of truth: content/portfolio-facts.md (then the older project's
 * content.md). HANDOFF.md wording is used only where it agrees with those facts.
 * Never invent or strengthen a claim here. Missing values → visible placeholder.
 */

export type Accent = 'pink' | 'tangerine' | 'lilac' | 'peach';

/** CSS color for each accent, so components never hardcode hex values. */
export const accentColor: Record<Accent, string> = {
  pink: 'var(--color-pink)',
  tangerine: 'var(--color-tangerine)',
  lilac: 'var(--color-lilac)',
  peach: 'var(--color-peach)',
};

/** Solid keyword colors for `{ em, tone }` runs (tokens.css --color-kw-*). */
export type KeywordTone = 'lilac' | 'tangerine' | 'pink';

/** A run of text where some segments are emphasized (rendered in cream / bold, or a keyword tone). */
export type RichText = ReadonlyArray<string | { em: string; tone?: KeywordTone } | { stat: string }>;

export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export const links = {
  email: 'karawan.sh.y@gmail.com',
  mailto: 'mailto:karawan.sh.y@gmail.com',
  linkedin: 'https://www.linkedin.com/in/karawanshy/',
  github: 'https://github.com/karawanshy',
  story: '/story',
  repos: {
    habitTracker: 'https://github.com/karawanshy/habit-tracker-api',
    chess: 'https://github.com/karawanshy/ChessGame',
  },
} as const;

// ---------------------------------------------------------------------------
// Site / navigation
// ---------------------------------------------------------------------------

export const site = {
  name: 'Karawan',
  fullName: 'Karawan Youssef',
  role: 'Software Engineer',
  company: 'Axonius',
  title: 'Karawan · Software Engineer',
  description:
    'Karawan, Software Engineer at Axonius. Full-stack today, drawn to infrastructure, CI reliability, developer tooling and automation.',
} as const;

/** Shown only if a page fails to render (AppErrorBoundary), e.g. the Story's chunk can't load. */
export const errorPage = {
  title: 'This page didn’t load',
  body: 'Something went wrong while loading it. Reloading usually fixes it.',
  reload: 'Reload the page',
  home: 'Back to the Portfolio',
} as const;

/** Section anchors; nav and section ids both read from here. */
export const sectionIds = {
  work: 'work',
  skills: 'skills',
  projects: 'projects',
  story: 'story',
  contact: 'contact',
  main: 'main',
} as const;

export const nav = {
  logoLabel: 'Karawan, home',
  /** Same order as the sections on the page. */
  items: [
    { label: 'Home', href: '#top' },
    { label: 'Work', href: `#${sectionIds.work}` },
    { label: 'Skills', href: `#${sectionIds.skills}` },
    { label: 'Projects', href: `#${sectionIds.projects}` },
    { label: 'Contact', href: `#${sectionIds.contact}` },
  ] satisfies LinkItem[],
  story: {
    label: 'Story',
    href: links.story,
  },
  menuLabel: 'Open menu',
  closeMenuLabel: 'Close menu',
  skipLink: 'Skip to content',
} as const;

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export interface ProofItem {
  value: string;
  label: string;
  accent: Accent;
  primary: boolean;
}

export const hero = {
  name: 'Karawan',
  primaryCta: { label: 'See my work', href: `#${sectionIds.work}` },
  proof: [
    {
      value: 'Software Engineer',
      label: 'Axonius',
      accent: 'tangerine',
      primary: false,
    },
    {
      value: 'B.Sc. Computer Science',
      label: 'The Open University',
      accent: 'lilac',
      primary: false,
    },
  ] satisfies ProofItem[],
  portraitAlt: 'Karawan, smiling, in a black hijab and dark green top',
} as const;


// ---------------------------------------------------------------------------
// About me
// ---------------------------------------------------------------------------

export const about = {
  title: 'About me',
  intro: {
    body: [
      'I’m a Software Engineer drawn to ',
      { em: 'infrastructure', tone: 'lilac' },
      ', ',
      { em: 'architecture', tone: 'tangerine' },
      ', and ',
      { em: 'complex systems', tone: 'pink' },
      ', increasingly exploring how ',
      { em: 'AI', tone: 'lilac' },
      ' can change the way we build software. I enjoy understanding how systems fit together, solving problems beneath the surface, and finding better ways to build them.',
    ] satisfies RichText,
  },
} as const;


// ---------------------------------------------------------------------------
// 01 Experience
// ---------------------------------------------------------------------------

export interface ExperienceItem {
  label: string;
  accent: Accent;
  title: string;
  description: RichText;
  chips: string[];
}

export const experience = {
  number: '01',
  title: 'Experience',
  company: {
    badge: 'A',
    title: 'Software Engineer · Axonius',
  },
  items: [
    {
      label: 'Built · Owned',
      accent: 'tangerine',
      title: 'Local Playwright testing infrastructure',
      description: ['Built and owned local Playwright testing infrastructure, improving local testing and developer workflows.'],
      chips: ['Playwright', 'Test infrastructure', 'Developer workflows'],
    },
    {
      label: 'Led · Migration',
      accent: 'pink',
      title: 'Selenium → AG Grid infrastructure migration',
      description: [
        'Led the Selenium testing-infrastructure side of the migration, taking ownership of ',
        { stat: '600+' },
        '\u00a0failing tests and the infrastructure changes behind them, helping restore CI reliability.',
      ],
      chips: ['Selenium', 'AG Grid', 'CI'],
    },
    {
      label: 'Frontend infrastructure',
      accent: 'lilac',
      title: 'Frontend infrastructure & development standards',
      description: [
        'Worked on frontend infrastructure including design tokens and Stylelint, and helped establish development standards by enforcing quality checks through CI gates.',
      ],
      chips: ['Design tokens', 'Stylelint', 'CI', 'Development standards'],
    },
    {
      label: 'AI-assisted engineering',
      accent: 'pink',
      title: 'Engineering the workflow',
      description: [
        'Engineered an AI-assisted development workflow for a large design-system migration, orchestrating the process end to end—from requirements and context through implementation, testing, and review.',
      ],
      chips: ['AI workflows', 'Automation', 'Design systems'],
    },
  ] satisfies ExperienceItem[],
} as const;


// ---------------------------------------------------------------------------
// 02 Skills
// ---------------------------------------------------------------------------

export interface SkillGroup {
  name: string;
  accent: Accent;
  items: string[];
}

export const skills = {
  number: '02',
  title: 'Skills',

  // Prev/next controls where the cards scroll sideways without pinning (Skills rail `row` mode).
  prevLabel: 'Previous skill group',
  nextLabel: 'Next skill group',

  groups: [
    {
      name: 'Backend & Systems',
      accent: 'tangerine',
      items: [
        'Python',
        'Java',
        'FastAPI',
        'Spring',
        'REST APIs',
        'WebSockets',
        'JWT',
      ],
    },
    {
      name: 'Infrastructure & Reliability',
      accent: 'pink',
      items: [
        'CI/CD',
        'Test infrastructure',
        'Playwright',
        'Selenium',
        'Pytest',
        'Developer tooling',
      ],
    },
    {
      name: 'AI Engineering',
      accent: 'lilac',
      items: [
        'AI Agents',
        'Context Engineering',
        'RAG',
        'MCP',
        'Agentic Workflows',
        'AI-assisted Development',
      ],
    },
    {
      name: 'Data',
      accent: 'peach',
      items: [
        'PostgreSQL',
        'MySQL',
        'MongoDB',
        'Alembic',
        'Database migrations',
      ],
    },
    {
      name: 'Frontend Infrastructure',
      accent: 'lilac',
      items: ['Vue', 'JavaScript', 'CSS', 'Vite', 'Design systems', 'Design tokens', 'Stylelint'],
    },
  ] satisfies SkillGroup[],
} as const;


// ---------------------------------------------------------------------------
// 03 Featured projects
// ---------------------------------------------------------------------------

export interface Project {
  id: 'hasoub' | 'habit-tracker' | 'chess';
  label: string;
  title: string;
  /** Card description; `{ em }` runs are emphasized (as in the About paragraph). */
  description: RichText;
  chips: string[];
  /**
   * Public repository or product link; the card renders its button only when set.
   * A private project leaves it out (never a placeholder or disabled link).
   */
  link?: LinkItem;
}

/** Hasoub's "More about the project" content: the platform (team), her role, the engineering. */
export interface ProjectDetailsContent {
  /** `subtitle`: what the platform is, in one line (lead line of the section). */
  platform: { title: string; subtitle: string; intro: string; areasLabel: string; areas: string[] };
  /**
   * `beats`: 2–3 very short leadership beats (pills), a summary above the full list.
   * `short`: optional phone label (< 380px) so every beat stays on one line.
   */
  role: { title: string; beats: { label: string; short?: string }[]; items: string[] };
  engineering: { title: string; intro: string; areas: string[] };
  stack: { title: string; groups: { label: string; items: string[] }[] };
  privateNote: string;
}

/** The lead project: a team / real-client project, so it carries a role and details. */
export interface LeadProject extends Project {
  /** Her role, shown under the title. */
  role: string;
  /** Shown instead of a link while the project has no public link. */
  privateLabel: string;
  /** Actor areas drawn by the card visual (abstract; not the product UI). */
  actors: string[];
  visualLabel: string;
  details: ProjectDetailsContent;
  moreLabel: string;
  /** Phones under 380px, so the button stays on one line. */
  moreShortLabel: string;
  closeLabel: string;
}

/*
 * Hasoub Talent Bridge — a TEAM project for a real client (portfolio-facts.md).
 * Keep "the team / the platform builds…" apart from "I lead / my role…"; never imply
 * she built the whole platform. No metrics, screenshots, branding or internal details.
 */
const hasoub: LeadProject = {
  id: 'hasoub',
  label: '01 · Real client · Team project · In progress',
  title: 'Hasoub Talent Bridge',

  role: 'Team Lead / Software Engineer',

  description: [
    'Leading a development team building a ',
    { em: 'full-stack recruitment platform for a real client' },
    ', translating product requirements into engineering work and helping shape the ',
    { em: 'technical and architectural direction' },
    '.',
  ],

  chips: ['Python', 'FastAPI', 'PostgreSQL', 'React', 'TypeScript'],

  privateLabel: 'Private client project',

  actors: ['Candidate', 'Recruiter', 'Senior', 'Admin'],

  visualLabel:
    'One platform shared by four groups: candidates, recruiters, seniors and admins',

  moreLabel: 'More about the project',
  moreShortLabel: 'Project details',
  closeLabel: 'Close project details',

  details: {
    platform: {
      title: 'The platform',
      subtitle: 'Recruitment & career-support platform',
      intro:
        'My team is building a recruitment and career-support platform for candidates, recruiters and companies, seniors, and the Hasoub admin team across the recruitment lifecycle.',
      areasLabel: 'Key areas',
      areas: [
        'Candidate and recruiter workflows',
        'Job discovery & applications',
        'Senior & referral workflows',
        'Messaging & notifications',
        'Reporting & dashboard',
        'Paid access & entitlements',
        'AI-assisted recruitment features',
      ],
    },

    role: {
      title: 'My role · Team Lead / Software Engineer',
      beats: [
        {
          label: 'Requirements → engineering plan',
          short: 'Requirements → plan',
        },
        {
          label: 'Technical & architectural direction',
          short: 'Technical direction',
        },
        {
          label: 'AI-assisted development workflow',
          short: 'AI-assisted workflow',
        },
      ],
      items: [
        'Leading and coordinating the development team',
        'Translating client and product requirements into structured engineering work',
        'Breaking down and planning implementation across the team',
        'Helping define technical direction and architectural decisions',
        'Establishing and evolving the team’s AI-assisted development workflow',
        'Coordinating work across different parts of the system',
      ],
    },

    engineering: {
      title: 'Engineering across the project',
      intro: 'Areas the team works across, not mine alone:',
      areas: [
        'Domain modeling',
        'Persistence & repository architecture',
        'Authentication & RBAC',
        'Database migrations',
        'API design & integration',
        'Transactional workflows',
        'Testing',
        'Observability',
      ],
    },

    stack: {
      title: 'Stack',
      groups: [
        {
          label: 'Backend',
          items: ['Python', 'FastAPI', 'Pydantic', 'PostgreSQL'],
        },
        {
          label: 'Frontend',
          items: ['React', 'TypeScript', 'Vite'],
        },
      ],
    },

    privateNote:
      'The code is private, with no public repository or product link.',
  },
};


export const projects = {
  number: '03',
  title: 'Featured projects',

  progressHint: 'Scroll to slide',

  swipeHint: '{n} / {total} · Swipe for {title} →',
  swipeBackHint: '{n} / {total} · ← Swipe back to {title}',

  prevLabel: 'Previous project',
  nextLabel: 'Next project',

  items: [
    hasoub,

    {
      id: 'habit-tracker',
      label: '02 · Backend API · Solo project',
      title: 'Habit Tracker API',
      description: [
        'A ',
        { em: 'multi-user habit-tracking backend' },
        ' where users can create and manage habits, organize them by category and frequency, and track completions—with JWT authentication, authorization, admin roles, database migrations, and automated tests.',
      ],
      chips: [
        'Python',
        'FastAPI',
        'PostgreSQL',
        'SQLModel',
        'Alembic',
        'JWT',
        'Pytest',
      ],
      link: {
        label: 'View on GitHub',
        href: links.repos.habitTracker,
        external: true,
      },
    },

    {
      id: 'chess',
      label: '03 · Real-time · Solo project',
      title: 'Multiplayer Chess',
      description: [
        'A real-time multiplayer chess system where two players can play from different devices, with live game communication over WebSockets, matchmaking, player statistics, and a leaderboard.',
      ],
      chips: ['Java', 'Spring', 'WebSockets', 'MySQL', 'Android'],
      link: {
        label: 'View on GitHub',
        href: links.repos.chess,
        external: true,
      },
    },
  ] satisfies [LeadProject, Project, Project],

  /**
   * Habit Tracker card illustration (decorative): one week of four habits. `done` is
   * Mon→Sat (1 = done); Sunday is always "today" (dashed ring). Colors: --habit-*.
   */
  habitWeek: {
    title: 'This week',
    days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    habits: [
      { name: 'Read', tone: 'read', done: [1, 1, 0, 1, 1, 1] },
      { name: 'Workout', tone: 'workout', done: [1, 0, 1, 0, 1, 0] },
      { name: 'Water', tone: 'water', done: [1, 1, 1, 1, 1, 1] },
      { name: 'Journal', tone: 'journal', done: [0, 1, 1, 0, 1, 0] },
    ],
  } as const,

  /**
   * Multiplayer Chess card illustration (decorative): an Android phone mid-game.
   * Squares are algebraic ("a8" = top-left, light); `lastMove` squares are highlighted.
   */
  chessPhone: {
    opponent: { name: 'Opponent', clock: '1:05' },
    you: { name: 'You', clock: '0:42' },
    lastMove: { from: 'f3', to: 'g5' },
    // Filled glyphs = Black, outline = White. Never ♟ (U+265F): some platforms draw it as an emoji.
    pieces: {
      a8: '♜', d8: '♛', f8: '♜', g8: '♚', c6: '♞', c5: '♝',
      g1: '♔', f1: '♖', h5: '♕', c4: '♗', g5: '♘', d3: '♙', e4: '♙',
    } as Record<string, string>,
    actions: { primary: 'Offer draw', secondary: 'Resign' },
  } as const,
} as const;


// ---------------------------------------------------------------------------
// Story band
// ---------------------------------------------------------------------------

export const storyBand = {
  label: 'The long version · 18 chapters',
  title: 'The path here wasn’t exactly straight.',
  body:
    'From a Computer Science class I joined two months late to a role that didn’t exist yet. Scroll through it like a film.',
  orb: ['Enter', 'the Story'],
  href: links.story,
} as const;


// ---------------------------------------------------------------------------
// Contact & footer
// ---------------------------------------------------------------------------

export const contact = {
  label: 'Get in touch',
  headline: 'Let’s talk.',
  body: 'Have an interesting problem or opportunity? I’d love to hear from you.',
  email: {
    label: links.email,
    href: links.mailto,
  },
  socials: [
    {
      label: 'LinkedIn',
      href: links.linkedin,
      external: true,
    },
    {
      label: 'GitHub',
      href: links.github,
      external: true,
    },
  ] satisfies LinkItem[],
} as const;


export const footer = {
  wordmark: 'Karawan',
  center: 'Software Engineer at Axonius',
  right: '© 2026',
} as const;
