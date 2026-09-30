import { useRef, type CSSProperties } from 'react';
import { accentColor, sectionIds, skills } from '@/content';
import { ChipList, HorizonLine, RailButton, SectionTitle, SunMark } from '@/components/primitives';
import { motion } from '@/motion/config';
import { useRail } from '@/motion/useProjectRail';
import { useRevealSequence } from '@/motion/useRevealSequence';

/**
 * Skills: the groups as one row of equal-height cards (a rail: stage → track → cards, the
 * same shape as the Projects rail). Where all cards fit the viewport they share the row
 * (growing from the design card width; `fit`) and the reveal sequence pins the stage.
 * Where they don't (md–1279), the rail pins and page scroll slides it sideways, exactly
 * like Projects (useRail `pin`; `row` — a snap row with the Projects prev/next buttons —
 * when the stage can't pin); phones swipe a snap row; reduced motion (md+) and no JS wrap
 * the cards so all show.
 * Layout lives in global.css (.skills-rail / .skills-card, tuned by --skill-card-*;
 * "Skills rail pin" for the pinned slide).
 *
 * Markup contract (for rail motion):
 *   section#skills[data-seq] > [data-seq-track] > [data-seq-stage][data-skills-stage]
 *     > [data-seq-head] (title) · ul#skills-rail[data-skills-rail] (track) · [data-seq-line]
 *   track > li[data-skills-card][data-seq-item] (one card per group; width from CSS)
 */
export function Skills() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const count = skills.groups.length;
  const { mode, atStart, atEnd, step } = useRail({ section: sectionRef, stage: stageRef, rail: railRef }, count, motion.skillsRail);
  // The sequence pins only where the rail doesn't (all cards fit); else it scrubs.
  const { sectionProps } = useRevealSequence(sectionRef, 'skills', count + 1, mode === 'fit'); // + the closing line
  return (
    <section
      ref={sectionRef}
      id={sectionIds.skills}
      aria-labelledby="skills-title"
      className="pt-5 pb-9 md:pt-20 md:pb-11"
      {...sectionProps}
      data-skills-mode={mode}
      // --rail-count: the pre-hydration slide estimate (global.css).
      style={{ ...sectionProps.style, '--rail-count': count } as CSSProperties}
    >
      {/* Skill groups ([data-seq-item]) enter in sequence; see useRevealSequence. */}
      <div data-seq-track>
        <div ref={stageRef} data-seq-stage data-skills-stage className="flex flex-col gap-3.5 md:gap-[30px]">
          <div data-seq-head className="px-gutter">
            <SectionTitle id="skills-title" number={skills.number} title={skills.title} />
          </div>
          {/* Focusable where it scrolls natively, so keyboard users can scroll it. */}
          <ul
            ref={railRef}
            id="skills-rail"
            data-skills-rail
            aria-labelledby="skills-title"
            tabIndex={mode === 'row' || mode === 'swipe' ? 0 : undefined}
            className="skills-rail no-scrollbar m-0 list-none"
          >
            {skills.groups.map((group) => {
              const color = accentColor[group.accent];
              return (
                <li
                  key={group.name}
                  data-lit
                  data-seq-item
                  data-skills-card
                  className="skills-card skill-panel rounded-stat shadow-lit-soft"
                  style={{ ['--tint' as string]: color }}
                >
                  <h3 className="skills-card-title font-display text-(length:--fs-ui-md) leading-[1.35] font-semibold text-balance text-cream">
                    <SunMark variant="node" size={22} color={color} />
                    <span>{group.name}</span>
                  </h3>
                  <ChipList items={group.items} variant="bright" />
                </li>
              );
            })}
          </ul>
          {/* Row mode (md+, the stage too tall to pin): the row scrolls itself, with its scrollbar
              hidden, so pointer users get the Projects prev/next buttons. */}
          {mode === 'row' && !(atStart && atEnd) && (
            <div data-skills-controls className="flex justify-end gap-2.5 px-gutter">
              <RailButton label={skills.prevLabel} glyph="←" controls="skills-rail" disabled={atStart} onClick={() => step(-1)} />
              <RailButton label={skills.nextLabel} glyph="→" controls="skills-rail" disabled={atEnd} onClick={() => step(1)} />
            </div>
          )}
          {/* Closing line: the sequence's last step (draws in once the groups are in). */}
          <div className="px-gutter">
            <HorizonLine variant="lilac-tangerine" data-seq-line="" />
          </div>
        </div>
        <div data-seq-spacer aria-hidden="true" />
      </div>
    </section>
  );
}
