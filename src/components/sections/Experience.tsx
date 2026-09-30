import { accentColor, experience, sectionIds } from '@/content';
import { ChipList, HorizonLine, Rich, SectionTitle, SunMark, middotText } from '@/components/primitives';

export function Experience() {
  return (
    <section
      id={sectionIds.work}
      aria-labelledby="work-title"
      data-own-reveal="experience"
      className="flex flex-col gap-[18px] px-gutter pt-5 pb-9 md:gap-9 md:pt-20 md:pb-11"
    >
      {/* With motion: the title and the company pill wait until well in view (MotionLayer). */}
      <div data-exp-head>
        <SectionTitle id="work-title" number={experience.number} title={experience.title} />
      </div>

      {/* Pill aligns with the timeline content while single-column; centered once it alternates. */}
      <div data-exp-head className="flex pl-10 md:pl-12 lg:justify-center lg:pl-0">
        <div
          className="inline-flex items-center gap-3 rounded-[28px] py-3 pr-5 pl-3 md:gap-4 md:rounded-pill md:py-3.5 md:pr-[26px] md:pl-3.5"
          style={{ background: 'var(--pill-fill)', boxShadow: 'var(--shadow-highlight)' }}
        >
          <span
            aria-hidden="true"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-cream font-display text-(length:--fs-ui-base) font-extrabold text-deep"
          >
            {experience.company.badge}
          </span>
          <p className="font-display text-(length:--fs-ui-base) font-semibold text-balance text-cream">{middotText(experience.company.title)}</p>
        </div>
      </div>

      <div className="relative">
        {/*
          Center line (left rail below lg). With motion, the base line dims and the lit copy
          over it follows the scroll down, reaching each sun node as it arrives, with a soft
          tail into the dimmed line (MotionLayer).
        */}
        <div
          aria-hidden="true"
          data-timeline-base
          className="absolute top-2 bottom-0 left-[13.5px] w-[3px] rounded-[3px] lg:top-3.5 lg:bottom-[30px] lg:left-1/2 lg:-ml-[1.5px]"
          style={{ background: 'var(--gradient-timeline)' }}
        />
        <div
          aria-hidden="true"
          data-timeline-lit
          className="absolute top-2 bottom-0 left-[13.5px] w-[3px] overflow-hidden rounded-[3px] lg:top-3.5 lg:bottom-[30px] lg:left-1/2 lg:-ml-[1.5px]"
        >
          <div className="h-full w-full" style={{ background: 'var(--gradient-timeline)' }} />
        </div>
        <ol className="m-0 flex list-none flex-col gap-[26px] p-0 md:gap-10">
          {experience.items.map((item, i) => {
            const left = i % 2 === 0;
            const color = accentColor[item.accent];
            return (
              <li
                key={item.title}
                className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-x-2.5 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4 lg:grid-cols-[minmax(0,1fr)_90px_minmax(0,1fr)] lg:gap-x-0"
              >
                <div data-sun-node className="col-start-1 row-start-1 flex justify-center lg:col-start-2">
                  <SunMark variant="node" size="clamp(30px, 30px + 2 * (100vw - 390px) / 378, 32px)" color={color} glow />
                </div>
                {/* With motion, the text enters together with its sun node (MotionLayer). */}
                <div
                  data-sun-content
                  className={`col-start-2 row-start-1 flex flex-col gap-1.5 md:gap-2.5 ${
                    left ? 'lg:col-start-1 lg:items-end lg:text-right' : 'lg:col-start-3'
                  }`}
                >
                  <p className="label" style={{ color }}>
                    {item.label}
                  </p>
                  <h3 className="text-h3 leading-[1.3] font-semibold tracking-[-0.02em] text-balance">{item.title}</h3>
                  <p className="max-w-[440px] text-(length:--fs-ui-base) leading-[1.55] text-pretty md:leading-[1.6] lg:text-(length:--fs-ui-lg)">
                    <Rich text={item.description} />
                  </p>
                  {/* Chips: not in the phone artboard; tools also appear in Skills. */}
                  <ChipList items={item.chips} className={`max-md:hidden ${left ? 'lg:justify-end' : ''}`} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <HorizonLine variant="pink-lilac" />
    </section>
  );
}
