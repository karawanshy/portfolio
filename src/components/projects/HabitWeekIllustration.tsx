import { projects } from '@/content';

const { habitWeek } = projects;

/** CSS color per habit (tokens.css --habit-*). */
const habitColor: Record<(typeof habitWeek.habits)[number]['tone'], string> = {
  read: 'var(--habit-read)',
  workout: 'var(--habit-workout)',
  water: 'var(--habit-water)',
  journal: 'var(--habit-journal)',
};

/**
 * Habit Tracker card illustration: one week of four habits (content: projects.habitWeek).
 * Mon→Sat are done / not done, Sunday is "today" (a dashed ring). Decorative. On the
 * narrowest phones the fixed-size panel zooms down to fit the card (container query).
 */
export function HabitWeekIllustration({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`@container flex w-full justify-center ${className}`}>
      <div
        className="w-[236px] shrink-0 rounded-[22px] bg-(--habit-panel-bg) p-4 text-(--habit-ink) shadow-(--habit-panel-shadow) @max-[235px]:[zoom:0.9] @max-[211px]:[zoom:0.8]"
      >
        <p className="font-display text-(length:--fs-ui-sm) leading-[1.2] font-bold">{habitWeek.title}</p>
        <div className="mt-3.5 flex gap-1 pl-16">
          {habitWeek.days.map((day, i) => (
            <span key={i} className="w-4 text-center text-(length:--fs-ui-4xs) leading-none font-bold text-(--habit-muted)">
              {day}
            </span>
          ))}
        </div>
        <ul className="m-0 mt-2 flex list-none flex-col gap-[9px] p-0">
          {habitWeek.habits.map((habit) => {
            const color = habitColor[habit.tone];
            return (
              <li key={habit.name} className="flex items-center gap-1">
                <span className="flex w-[60px] shrink-0 items-center gap-1.5 text-(length:--fs-ui-2xs) leading-none font-bold">
                  <span className="size-[7px] shrink-0 rounded-full" style={{ background: color }} />
                  {habit.name}
                </span>
                {habit.done.map((done, i) => (
                  <span
                    key={i}
                    className="size-4 shrink-0 rounded-full"
                    style={{ background: done ? color : 'var(--habit-empty)' }}
                  />
                ))}
                {/* Today (Sunday): not decided yet. */}
                <span className="size-4 shrink-0 rounded-full border-[1.5px] border-dashed border-(--habit-today)" />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
