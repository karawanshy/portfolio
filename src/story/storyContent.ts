/**
 * All Story (/story) copy, structure and scene metadata, in one typed file.
 *
 * This file is the source of truth for the Story's copy (chapter titles, cinematic
 * lines, stories, Dive Deeper sections and scene quotes), as approved by Karawan.
 * It supersedes ../content.md. Never invent events, quotes, motivations, metrics or claims.
 *
 * Presentation-only data (act names, scene sizes, sky keyframes, UI labels) lives
 * here too, so components hold no copy and no color values.
 */
import { contact, links, type Accent, type KeywordTone, type LinkItem } from '@/content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A run of text; `{ bold }` segments are emphasized, `{ em, tone }` is a toned keyword (the
 * hero summary's treatment), `{ stat }` is a highlighted figure. `\n` = line break.
 */
export type StoryText = ReadonlyArray<string | { bold: string } | { em: string; tone: KeywordTone } | { stat: string }>;

export type SceneSize = 'compact' | 'standard' | 'major';

/**
 * The scene's art (src/story/scenes/).
 * - none: the stage alone carries the scene (prologue; ch 18, whose paper boat sails on the stage's sea)
 * - chessboard (6): two boards and the thread between them; days (10): the six-day build
 * - board (3), waver (4), cpu (5), field (12): the S2 slice
 * - spark (1), stage (2), door (7), workbench (8), crowd (9), window (11),
 *   windows-dark (13), fork (14), hub (15), trunk (16), doorway (17)
 */
export type SceneMotif =
  | 'none'
  | 'chessboard'
  | 'days'
  | 'board'
  | 'waver'
  | 'cpu'
  | 'field'
  | 'spark'
  | 'stage'
  | 'door'
  | 'workbench'
  | 'crowd'
  | 'window'
  | 'windows-dark'
  | 'fork'
  | 'hub'
  | 'trunk'
  | 'doorway';

/** Desktop composition: where the text column sits (the scene art and the risen sun keep the right-hand lane). */
export type SceneAlign = 'start' | 'inset' | 'wide';

export type SkyKeyframeId =
  | 'dusk'
  | 'golden'
  | 'warm'
  | 'cooling'
  | 'lilac'
  | 'evening'
  | 'night'
  | 'firstlight'
  | 'detour'
  | 'sunrise';

export type ActId = 'prologue' | 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii';

export interface SceneMeta {
  size: SceneSize;
  /** Candidate for a pinned, cinematic scene in S2 (the motion-implementer decides the pin length). */
  pinned: boolean;
  sky: SkyKeyframeId;
  align: SceneAlign;
  motif: SceneMotif;
  /** A fact from the chapter's own story, set as art (ch 4: the Bagrut score; ch 11: the start date). */
  figure?: string;
  /**
   * Desktop fine-tuning (px): `text` lifts the text column (the block is centred higher),
   * `art` lowers the art and its quote, `quote` lowers the quote under its art.
   */
  nudge?: { text?: number; art?: number; quote?: number };
  /** Desktop: the scene art sits to the right of this cinematic line (index), level with it (ch 4). */
  artLine?: number;
  /** The chapter's typographic beat (ch 3: the question, set large on the board scene), one entry per line. */
  quote?: readonly string[];
}

export interface DiveSection {
  heading: string;
  /** Paragraphs separated by a blank line (`\n\n`). */
  body: string;
}

export interface DiveDeeper {
  sections: readonly DiveSection[];
  technologies: readonly string[];
  link?: LinkItem;
}

export interface Chapter {
  number: number;
  /** DOM id and deep-link fragment: `chapter-N`. */
  id: string;
  title: string;
  act: ActId;
  /** Cinematic line(s): one entry per line. */
  lines: readonly StoryText[];
  /** "Explore the story" paragraphs. */
  story: readonly StoryText[];
  dive?: DiveDeeper;
  scene: SceneMeta;
}

export interface Act {
  id: ActId;
  /** Roman numeral ('' for the prologue). */
  numeral: string;
  name: string;
  accent: Accent;
  sky: SkyKeyframeId;
}

export interface SkyKeyframe {
  id: SkyKeyframeId;
  /** Token references (tokens.css). `gradient` is the composed sky. (The sun's state is per chapter: motion.story.sun.) */
  tokens: {
    gradient: string;
    zenith: string;
    mid: string;
    horizon: string;
    glow: string;
  };
}

// ---------------------------------------------------------------------------
// Acts and sky
// ---------------------------------------------------------------------------

/** Act names are presentation labels only. */
export const acts: readonly Act[] = [
  { id: 'prologue', numeral: '', name: 'Prologue', accent: 'lilac', sky: 'dusk' },
  { id: 'i', numeral: 'I', name: 'Always starting something', accent: 'tangerine', sky: 'golden' },
  { id: 'ii', numeral: 'II', name: 'Discovering CS', accent: 'peach', sky: 'cooling' },
  { id: 'iii', numeral: 'III', name: 'Start before you’re ready', accent: 'pink', sky: 'evening' },
  { id: 'iv', numeral: 'IV', name: 'The long night', accent: 'lilac', sky: 'night' },
  { id: 'v', numeral: 'V', name: 'First light', accent: 'tangerine', sky: 'firstlight' },
  { id: 'vi', numeral: 'VI', name: 'The detour', accent: 'lilac', sky: 'detour' },
  { id: 'vii', numeral: 'VII', name: 'Morning', accent: 'peach', sky: 'sunrise' },
];

/**
 * Sky keyframes in story order (the stage stacks its layers in this order). One per
 * act, plus scene-level keyframes where an act changes light within itself:
 * Act II goes warm (ch 3) → cooling (ch 4) → lilac (ch 5).
 */
const skyIds: readonly SkyKeyframeId[] = [
  'dusk',
  'golden',
  'warm',
  'cooling',
  'lilac',
  'evening',
  'night',
  'firstlight',
  'detour',
  'sunrise',
];

/** Values live in tokens.css (`--sky-<id>-*`). */
export const skyKeyframes: readonly SkyKeyframe[] = skyIds.map((id) => ({
  id,
  tokens: {
    gradient: `var(--sky-${id})`,
    zenith: `var(--sky-${id}-zenith)`,
    mid: `var(--sky-${id}-mid)`,
    horizon: `var(--sky-${id}-horizon)`,
    glow: `var(--sky-${id}-glow)`,
  },
}));

// ---------------------------------------------------------------------------
// Chapters (in order)
// ---------------------------------------------------------------------------

type ChapterInput = Omit<Chapter, 'id' | 'scene'> & {
  scene: Omit<SceneMeta, 'sky'> & { sky?: SkyKeyframeId };
};

const input: ChapterInput[] = [
  {
    number: 0,
    title: 'How I Got Here',
    act: 'prologue',
    lines: [
      ['A story about starting before I was ready, taking a few unexpected turns, and somehow ending up closer to where I wanted to be.'],
    ],
    story: [
      ['A classroom door I never expected to walk through. A chess game I didn’t yet know how to build. Nearly three years of trying to get into the industry. More than 600 failing tests. And a detour I was sure was taking me in the wrong direction.'],
      ['It took me a while to realize those weren’t separate stories.'],
    ],
    scene: { size: 'major', pinned: false, align: 'start', motif: 'none' },
  },
  {
    number: 1,
    title: 'I Never Really Knew Why',
    act: 'i',
    lines: [
      ['Growing up, people often told me I would achieve great things.'],
      ['I never really knew why.'],
    ],
    story: [
      ['I wasn’t thinking about careers or technology. I was just curious, involved, and always looking for something new to try.'],
      ['Looking back, maybe the people around me saw something in me before I knew how to see it myself.'],
    ],
    scene: { size: 'compact', pinned: false, align: 'inset', motif: 'spark' },
  },
  {
    number: 2,
    title: 'Always Starting Something',
    act: 'i',
    lines: [
      ['At school, I was always starting something.'],
      ['I’d come up with the idea, write the script or lyrics, find the music, cast the singers, actors, or dancers, coordinate with the school, and bring it all together.'],
      ['I loved taking a lot of moving pieces and making them work as one.'],
    ],
    story: [
      ['Sometimes it was a song or a poem. Sometimes an act, an activity, an idea for a science competition, or simply something I wanted to organize at school.'],
      ['I’d start with an idea and figure out what it needed: write the material, find the right people, cast students to sing, act, or dance, coordinate with the people running things at school, and carry the whole process from beginning to end.'],
      ['I didn’t have words for it then, but I loved taking something complicated, understanding all its pieces, and figuring out how to make them work together.'],
      ['Years later, that instinct would feel very familiar.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'stage', quote: ['“Years later, that instinct would feel very familiar.”'] },
  },
  {
    number: 3,
    title: 'The First Time I Heard of Computer Science',
    act: 'ii',
    lines: [
      ['Two months into 10th grade, a Computer Science teacher walked into my math class and asked for two strong students.'],
      ['I was one of them. I had never even heard of Computer Science before.'],
    ],
    story: [
      ['My math teacher chose me and one other student to try Computer Science.'],
      ['I joined the class two months late, with absolutely no idea what I was walking into.'],
      ['During one of my first lessons, I stared at the code on the board and genuinely asked:'],
      ['“We’re in Computer Science. Why are we writing English on a board?”'],
      ['That was roughly when I realized I had missed two months of introductions—and had a lot of catching up to do.'],
    ],
    scene: { size: 'major', pinned: true, align: 'start', motif: 'board', sky: 'warm', quote: ['“We’re in Computer Science.', 'Why are we writing English on a board?”'] },
  },
  {
    number: 4,
    title: 'Maybe This Wasn’t for Me',
    act: 'ii',
    lines: [
      ['I was behind. Maybe Computer Science just wasn’t for me.'],
      ['Then my first CS Bagrut score came back:'],
      ['99. The highest in my school.'],
    ],
    story: [
      ['What the 99 didn’t show was how close I had come to giving up on Computer Science.'],
      ['More than once, I considered going back to psychology because I felt too far behind. My CS teacher kept encouraging me, and even arranged for an older student to tutor me so I could catch up.'],
      ['Eventually, I stopped treating Computer Science like something I had accidentally fallen into and decided to give it a real chance.'],
      ['Then came the 99.'],
      ['Maybe I liked this after all.'],
    ],
    scene: { size: 'compact', pinned: false, align: 'inset', motif: 'waver', figure: '99', artLine: 1, quote: ['“Maybe I liked this after all.”'] },
  },
  {
    number: 5,
    title: 'I Didn’t Just Like It',
    act: 'ii',
    lines: [
      ['A complicated CPU diagram appeared on the board.'],
      ['A few hours later, I could explain every part of it.'],
      ['I remember getting butterflies.'],
      ['Looking back, it was an early sign of what still pulls me in today: understanding what happens underneath and how complex systems fit together.'],
    ],
    story: [
      ['During my degree, there were plenty of moments when I wondered whether everyone around me was simply smarter than I was.'],
      ['Then came a lecture about the CPU. At first, the diagram made almost no sense. I spent the afternoon working through it piece by piece until suddenly, the whole thing clicked.'],
      ['I remember getting butterflies.'],
      ['At the time, I thought I was just excited because I finally understood it. Looking back, I see something else too: I loved going beneath the surface, understanding what each part was doing, and seeing how all of those parts worked together as one system.'],
      ['Years later, I would find that same feeling in architecture, infrastructure, and complex engineering systems.'],
      ['That day, all I knew was this:'],
      [{ bold: 'I didn’t just like Computer Science. I loved it.' }],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'cpu', sky: 'lilac', quote: ['I didn’t just like Computer Science.', 'I loved it.'] },
  },
  {
    number: 6,
    title: 'Start Before You’re Ready',
    act: 'iii',
    lines: [
      ['One month. A real-time online multiplayer chess game.'],
      ['I had never built anything at that scale—and I had never used most of the technologies it required.'],
      ['I built it anyway—and finished with a 95.'],
    ],
    story: [
      ['This was before I had AI helping me figure things out.'],
      ['I knew what I wanted the game to do, but I didn’t yet know how to build most of it. So I started with what I could do: plan the UI, functionality, and architecture.'],
      ['Then I worked through it one problem at a time, learning each concept and technology when I reached the part that needed it.'],
      ['Piece by piece, it became a working multiplayer system.'],
      ['The 95 was nice. But the project gave me something much more useful:'],
      ['I didn’t have to know how to do something before I started doing it.'],
    ],
    dive: {
      sections: [
        {
          heading: 'Context',
          body: 'A university project with a one-month deadline: build a real-time multiplayer chess application that two people could play from different machines.',
        },
        {
          heading: 'Challenge',
          body: 'Real-time gameplay, player communication, server logic, a database, authentication, statistics, and the chess logic itself—most of which I had never built before.',
        },
        {
          heading: 'Approach',
          body: 'I planned the UI, functionality, and architecture first, then learned each technology as the implementation reached it.',
        },
        {
          heading: 'Outcome',
          body: 'A working real-time multiplayer game with player statistics and a leaderboard, completed with a grade of 95.',
        },
      ],
      technologies: ['Java', 'Spring MVC', 'REST API', 'WebSocket', 'JPA', 'MySQL', 'Android'],
      link: { label: 'ChessGame on GitHub', href: links.repos.chess, external: true },
    },
    scene: { size: 'major', pinned: true, align: 'start', motif: 'chessboard', nudge: { text: 48, art: 40 }, quote: ['I didn’t have to know how to do something', 'before I started doing it.'] },
  },
  {
    number: 7,
    title: 'The Longest Part',
    act: 'iv',
    lines: [
      ['I thought getting the degree would be the hard part.'],
      ['Then came almost three years of trying to get into the industry.'],
      ['Applications. Rejections. Learning. Trying again.'],
    ],
    story: [
      ['I hadn’t realized how early many students start building their careers. By the time I began searching seriously around my final year, I felt like I was already trying to catch up.'],
      ['So I applied. And applied. And kept trying to understand what I was missing—and what I could do differently.'],
      ['I worked on my CV, kept learning, and after graduating, completed an AWS bootcamp and certification because AWS seemed to appear in every other job description.'],
      ['Every time I thought I had found something that might help, I worked on it and tried again.'],
      ['I kept learning. I kept applying.'],
      ['Still, the door wouldn’t open.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'door' },
  },
  {
    number: 8,
    title: 'While I Was Waiting',
    act: 'iv',
    lines: [
      ['The software role still hadn’t come.'],
      ['So I kept moving—and ended up teaching Game Design, programming, and Robotics to ', { stat: '150+' }, '\u00a0students.'],
    ],
    story: [
      ['While searching for my first software role, I started teaching Game Design, Roblox, programming, Arduino, and Tinkercad to students aged 9–16.'],
      ['Over time, I taught 150+ students—often taking concepts that felt complicated at first and finding a way to make them approachable.'],
      ['Teaching wasn’t the career I was chasing, but it taught me something I still use constantly: understanding something myself wasn’t enough. I had to learn how to break it down, explain it clearly, notice where someone was stuck, and approach it differently until it clicked.'],
      ['They would go from:'],
      ['“I don’t understand this.”'],
      ['to:'],
      ['“I built it.”'],
      ['And somewhere along the way, I became much better at explaining how we got there.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'workbench', nudge: { quote: 28 }, quote: ['They learned to build.', 'I learned to explain.'] },
  },
  {
    number: 9,
    title: 'Finally, A Door Opened',
    act: 'iv',
    lines: [
      ['Then I found Place-IL.'],
      [{ stat: '2,000+' }, '\u00a0applicants. Around\u00a0', { stat: '50' }, '\u00a0selected.'],
      ['For the first time in a long time, I was excited by the challenge.'],
    ],
    story: [
      ['The selection process included group, technical, and HR interviews.'],
      ['The technical stage included system design—something I barely knew at the time.'],
      ['But I was surrounded by people I could learn from. Throughout the process, I picked up ideas, listened to how others approached problems, asked questions, and filled in the gaps as I went.'],
      ['Once again, I was learning my way into something I didn’t fully know how to do yet.'],
      ['And somewhere in the middle of all that pressure, something felt different. I wasn’t just trying to survive the process or prove that I belonged there.'],
      ['I was actually enjoying it.'],
      ['After years of trying to get closer to the industry from the outside, this finally felt like a door opening.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'crowd', quote: ['I was having fun.'] },
  },
  {
    number: 10,
    title: 'Six Days',
    act: 'v',
    lines: [
      ['Six days until the Axonius interview.'],
      ['I had an idea: let’s build something real.'],
      ['A complete Habit Tracker API. From scratch.'],
    ],
    story: [
      ['Before interviewing with Axonius’s Director of Engineering, I gave myself six days to build something real.'],
      ['In five days, I built a Habit Tracker API where users could create and manage habits, organize them by category and frequency, mark them as complete, and track their progress—with separate capabilities for regular users and admins.'],
      ['Then I spent a separate sixth day testing it.'],
      ['I used AI to help me plan and learn unfamiliar technologies, but intentionally wrote the implementation myself.'],
      ['The point wasn’t to build something huge.'],
      ['It was to show how I thought about taking an idea and turning it into something structured, tested, and ready to behave like a real system.'],
    ],
    dive: {
      sections: [
        {
          heading: 'The System',
          body: 'A REST API for a multi-user habit-tracking application, designed around users, habits, and habit completions rather than as a collection of disconnected endpoints.\n\nUsers could manage their own accounts and habits, categorize habits, define their frequency, filter them, and record completions. Admin users had additional access to user information and management capabilities.',
        },
        {
          heading: 'Architecture',
          body: 'I structured the application around FastAPI and SQLModel, with PostgreSQL for persistence and Alembic for database migrations. Pydantic models defined and validated the API contracts, while the application separated user, authentication, habit, and completion concerns.',
        },
        {
          heading: 'Authentication & Authorization',
          body: 'Authentication used JWT-based access tokens. Protected operations required an authenticated user, ownership rules prevented users from managing another user’s data, and admin-only operations were handled separately.',
        },
        {
          heading: 'Data & Habit Tracking',
          body: 'The data model covered users, habits, and completion records, with enums for structured values such as habit categories and frequencies.\n\nHabit endpoints supported creation, updates, deletion, filtering, and completion tracking, while deletion behavior was designed so related data would not be left behind.',
        },
        {
          heading: 'Database Evolution',
          body: 'Alembic migrations kept database changes explicit and reproducible instead of relying on manually created tables or an implicit schema.',
        },
        {
          heading: 'Testing',
          body: 'After completing the implementation in five days, I dedicated the sixth day entirely to testing.\n\nThe test suite covered authentication, user and admin behavior, habit CRUD, filtering, completion tracking, authorization boundaries, and API behavior. Tests ran against an isolated in-memory SQLite database so they could execute independently from the development PostgreSQL environment.',
        },
      ],
      technologies: ['Python', 'FastAPI', 'SQLModel', 'Alembic', 'PostgreSQL', 'JWT', 'Pydantic', 'Uvicorn', 'Pytest'],
      link: { label: 'Habit Tracker API on GitHub', href: links.repos.habitTracker, external: true },
    },
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'days' },
  },
  {
    number: 11,
    title: 'Finally',
    act: 'v',
    lines: [
      ['Almost three years of applications, rejections, learning, and trying again.'],
      ['Then, finally, one of those applications turned into a yes.'],
      ['Axonius. July 2025.'],
      ['I was in.'],
    ],
    story: [
      ['I joined Axonius in July 2025, after almost three years of trying to get my first opportunity in the industry.'],
      ['The role had originally been connected to backend engineering, but the work I stepped into introduced me to automation, testing, and CI—areas I barely understood when I started.'],
      ['It wasn’t exactly the beginning I had pictured for myself. But after spending so long trying to get there, I was excited to finally have the chance to learn, contribute, and prove myself in a real engineering environment.'],
      ['The path looked different from what I had imagined.'],
      ['But it had finally started.'],
    ],
    scene: { size: 'compact', pinned: false, align: 'inset', motif: 'window', figure: 'July 2025' },
  },
  {
    number: 12,
    title: '600+ Failures',
    act: 'v',
    lines: [
      ['A large infrastructure migration. ', { stat: '600+' }, '\u00a0failing tests.'],
      ['I led the Selenium testing side of the migration, helping make the CI pipeline trustworthy again.'],
    ],
    story: [
      ['I led the Selenium testing-infrastructure side of our migration to AG Grid, taking ownership of more than 600 failing tests and the infrastructure changes behind them.'],
      ['It wasn’t just about fixing tests one by one. The migration meant understanding how the existing infrastructure worked, figuring out why its assumptions no longer held, and adapting it to a completely different table architecture.'],
      ['It became one of my first experiences owning an engineering problem whose impact reached far beyond the code I was changing. When this infrastructure wasn’t reliable, neither were the tests depending on it.'],
      ['And I started noticing something about myself: some of the engineering problems I enjoyed most weren’t necessarily product features.'],
      ['I liked working on the systems other engineers depended on.'],
    ],
    dive: {
      sections: [
        {
          heading: 'The Problem',
          body: 'The existing Selenium table-testing infrastructure had been built around assumptions that no longer held after the move to AG Grid. That left more than 600 tests failing across the suite.',
        },
        {
          heading: 'My Contribution',
          body: 'I worked through the migration from both sides: understanding the existing testing abstractions and adapting them to AG Grid’s behavior.\n\nThat included table mappings, locators, headers, rows and cells, as well as handling AG Grid’s virtual scrolling, where not every row exists in the DOM at the same time.',
        },
        {
          heading: 'The Approach',
          body: 'Rather than treating hundreds of failures as hundreds of isolated problems, I traced them back to the shared infrastructure and migration patterns behind them.\n\nFrom there, I could fix the underlying behavior and systematically work through the affected tests.',
        },
        {
          heading: 'Outcome',
          body: 'More than 600 failing tests were resolved, helping restore CI reliability after the migration.',
        },
        {
          heading: 'What I Learned',
          body: 'This was one of the projects that made me realize how much I enjoy infrastructure work: understanding a system beneath the product, finding the shared problem behind many visible failures, and making something other engineers rely on trustworthy again.',
        },
      ],
      technologies: ['Selenium', 'AG Grid', 'Python', 'CI/CD'],
    },
    scene: { size: 'major', pinned: true, align: 'start', motif: 'field' },
  },
  {
    number: 13,
    title: 'And Then Everything Changed',
    act: 'vi',
    lines: [
      ['Three months in, the company went through layoffs and the product I had joined was shut down.'],
      ['Eventually, I was the only intern retained.'],
    ],
    story: [
      ['My team changed. The product disappeared. And the other interns eventually left when their contracts ended.'],
      [{ bold: 'I was the only intern retained.' }],
      ['But there still wasn’t an open permanent role for me.'],
      ['Instead, my internship was extended for another six months.'],
      ['I had spent almost three years trying to get through the door.'],
      ['Now that I was finally inside, the path had become uncertain again.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'windows-dark' },
  },
  {
    number: 14,
    title: 'The Detour',
    act: 'vi',
    lines: [
      ['I wanted backend.'],
      ['Instead, I was moved into frontend infrastructure.'],
      ['It felt like I was heading in exactly the wrong direction.'],
    ],
    story: [
      ['The team needed the automation and infrastructure knowledge I had developed, while leadership was clear that a backend opening was unlikely.'],
      ['If another opportunity appeared, it would probably be full-stack.'],
      ['So I made a deliberate choice: instead of staying where I was, I would use the opportunity to build the frontend experience I was missing. With leadership’s support, I stepped away from automation and started learning frontend properly—contributing to real work while building a completely new side of my skill set.'],
      ['Strategically, it made sense. Personally, it was difficult.'],
      ['I had spent so long trying to get closer to backend, and now the path forward seemed to be taking me in the opposite direction.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'fork' },
  },
  {
    number: 15,
    title: 'Engineering the Workflow',
    act: 'vi',
    lines: [
      ['Frontend stopped being just something I had to learn.'],
      ['I was working on frontend infrastructure—and engineering an AI workflow that orchestrated a large project end to end.'],
    ],
    story: [
      ['I started working on frontend infrastructure designed to improve how designers and engineers worked together.'],
      ['At the same time, I started thinking differently about AI.'],
      ['Not simply:'],
      ['“Write this code for me.”'],
      ['I engineered an AI-assisted workflow that orchestrated development end to end—from requirements and context through implementation, testing, and review—connecting the stages, responsibilities, and feedback loops into one system.'],
      ['Frontend had started as a detour.'],
      ['But the work itself brought me back to something I already knew I loved: complex systems, infrastructure, and making many moving pieces work together as one.'],
    ],
    dive: {
      sections: [
        {
          heading: 'Problem',
          body: 'We were moving to a new design system, which required stronger alignment between design and engineering and a more efficient way to manage a large migration.',
        },
        {
          heading: 'My Contribution',
          body: 'I worked on the design-system migration while engineering an AI-assisted workflow that orchestrated the process end to end—from requirements and context through implementation, testing, and review.',
        },
        {
          heading: 'Outcome',
          body: 'The workflow reduced manual effort and accelerated the migration significantly, allowing the work to progress much faster than originally allocated.',
        },
        {
          heading: 'What I Learned',
          body: 'AI became much more powerful when I stopped treating it as a code generator and started engineering the workflow around it.',
        },
      ],
      technologies: ['Design Systems', 'Storybook', 'Figma', 'Claude Code'],
    },
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'hub', quote: ['Different tools. Different problems.', 'Same thing I loved: making the pieces work together.'] },
  },
  {
    number: 16,
    title: 'Three Days',
    act: 'vi',
    lines: [
      ['People across the company had tried to find a way to keep me.'],
      ['But there was no role. My equipment was packed in the car, and I had already started thinking about what came next.'],
    ],
    story: [
      ['Team leads, senior engineers, and engineering leadership had all looked for possibilities.'],
      ['There simply wasn’t an open role.'],
      ['Eventually, I accepted that my time at Axonius was ending. I started thinking seriously about my next step and where I would go from there.'],
      ['I packed the equipment I needed to return to the office and put it in the car.'],
      ['After everything it had taken to get there, I was disappointed—but I was ready to move forward.'],
      ['And then, with three days left, I got unexpected news.'],
    ],
    scene: { size: 'compact', pinned: false, align: 'inset', motif: 'trunk', quote: ['Three days', 'remained.'] },
  },
  {
    number: 17,
    title: 'The Role That Didn’t Exist',
    act: 'vii',
    lines: [
      ['A new full-stack team was being created inside the backend organization.'],
      ['They needed frontend knowledge.'],
      ['And they wanted me.'],
    ],
    story: [
      ['The new team already had strong backend knowledge. What it needed was someone who could bring frontend experience too.'],
      ['Suddenly, the thing I had spent months worrying was taking me away from backend had become part of the reason I could move closer to it.'],
      ['The frontend experience I had reluctantly started building wasn’t a step away from where I wanted to go anymore. It had become something I could bring with me.'],
      ['I thought I was moving away from where I wanted to go.'],
      ['I was actually getting closer.'],
    ],
    scene: { size: 'major', pinned: true, align: 'start', motif: 'doorway', quote: ['The detour', 'finally made sense.'] },
  },
  {
    number: 18,
    title: 'To Be Continued',
    act: 'vii',
    lines: [
      ['I still don’t know exactly where this path leads.'],
      ['But one pattern has finally become clear: I’m drawn to ', { em: 'infrastructure', tone: 'lilac' }, ', ', { em: 'architecture', tone: 'tangerine' }, ', and ', { em: 'complex systems', tone: 'pink' }, '.'],
      ['I’m still exploring, still learning, and giving it everything I have.'],
      ['But I’ve never felt more ready for whatever comes next.'],
    ],
    story: [
      ['Looking back, the pattern was there long before I recognized it.'],
      ['The CPU diagram I couldn’t stop thinking about. The ', { em: 'infrastructure', tone: 'lilac' }, ' behind 600+ failing tests. The AI workflow I engineered end to end. Different problems, but the same thing kept pulling me in: understanding what happens underneath, how systems fit together, and how to make them work better.'],
      ['That’s the direction I want to keep exploring—deeper into ', { em: 'infrastructure', tone: 'lilac' }, ', ', { em: 'architecture', tone: 'tangerine' }, ', and ', { em: 'complex systems', tone: 'pink' }, '.'],
      ['I still don’t know exactly where that path will take me. There are technologies I don’t know, problems I haven’t solved, and directions I haven’t explored yet.'],
      ['And I’m okay with that now.'],
      ['There’s still more to learn.'],
      ['More to explore.'],
      ['And more to build.'],
      ['To be continued.'],
    ],
    scene: { size: 'standard', pinned: false, align: 'start', motif: 'none' },
  },
];

const actById = Object.fromEntries(acts.map((a) => [a.id, a])) as Record<ActId, Act>;

export const chapters: readonly Chapter[] = input.map((c) => ({
  ...c,
  id: `chapter-${c.number}`,
  scene: { ...c.scene, sky: c.scene.sky ?? actById[c.act].sky },
}));

export function getAct(id: ActId): Act {
  return actById[id];
}

/** Chapters grouped by act, in reading order. */
export const actsWithChapters: ReadonlyArray<{ act: Act; chapters: readonly Chapter[] }> = acts.map((act) => ({
  act,
  chapters: chapters.filter((c) => c.act === act.id),
}));

// ---------------------------------------------------------------------------
// Presentation helpers + UI copy
// ---------------------------------------------------------------------------

/** "Prologue" for chapter 0, otherwise "Chapter 03". */
export function chapterLabel(c: Chapter): string {
  return c.number === 0 ? storyUi.prologue : `${storyUi.chapter} ${String(c.number).padStart(2, '0')}`;
}

/** Compact label for very narrow headers: "Ch 03" (the prologue: "Ch 00"). */
export function chapterLabelShort(c: Chapter): string {
  return `${storyUi.chapterShort} ${String(c.number).padStart(2, '0')}`;
}

/** Two-digit chapter number: 3 → "03". */
export function chapterNumeral(c: Chapter): string {
  return String(c.number).padStart(2, '0');
}

export function actLabel(a: Act): string {
  return a.numeral ? `${storyUi.act} ${a.numeral} · ${a.name}` : a.name;
}

/** Plain text of a StoryText run (for labels and tests). */
export function plainText(t: StoryText): string {
  return t.map((s) => (typeof s === 'string' ? s : 'bold' in s ? s.bold : 'em' in s ? s.em : s.stat)).join('');
}

export const storyMeta = {
  title: 'How I Got Here · Karawan',
  description:
    'Karawan’s story in 18 chapters: starting before I was ready, taking a few unexpected turns, and somehow ending up closer to where I wanted to be.',
} as const;

export const storyUi = {
  prologue: 'Prologue',
  chapter: 'Chapter',
  /** The header's compact chapter label on the narrowest phones (visual only; the full label is read). */
  chapterShort: 'Ch',
  act: 'Act',
  logoLabel: 'Karawan, portfolio home',
  back: { label: 'Portfolio', href: '/#story', ariaLabel: 'Back to the portfolio' },
  index: {
    open: 'Chapters',
    openHint: 'open the chapter index',
    title: 'Chapters',
    close: 'Close the chapter index',
  },
  explore: 'Explore the story',
  dive: 'Dive into the engineering',
  tabs: { story: 'The story', dive: 'Dive into the engineering' },
  closePanel: 'Close',
  /** Journal footer: the visible "Ch 04" leads the name, then ", Previous chapter: <title>" (sr-only). */
  journal: { prev: 'Previous chapter', next: 'Next chapter', nameSeparator: ', ', titleSeparator: ': ' },
  technologies: 'Technologies',
  progressLabel: 'Story progress',
  ending: {
    email: contact.email,
    socials: contact.socials,
  },
} as const;
