import { Fragment, useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ProjectDetailsContent } from '@/content';
import { ChipList, SunMark, middotText } from '@/components/primitives';
import { motion } from '@/motion/config';
import { usePrefersReducedMotion } from '@/motion/usePrefersReducedMotion';

/** Small padlock for the "Private client project" marker. Decorative. */
export function LockGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 14"
      className={`h-[13px] w-[11px] shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <rect x="1" y="6" width="10" height="7" rx="2" />
      <path d="M3.5 6 V4 a2.5 2.5 0 0 1 5 0 V6" />
    </svg>
  );
}

type Heading = 'h3' | 'h4';

/**
 * "My role · Team Lead / Software Engineer": breaks after the middot first. Each later segment is an
 * inline-block, so it moves to its own line whole, and only wraps (after a "/") when even a full line
 * is too narrow for it.
 */
function MiddotHeadingText({ text }: { text: string }) {
  const [first = '', ...rest] = text.split(' · ');
  return (
    <>
      {middotText(first)}
      {rest.map((segment, i) => (
        <Fragment key={i}>
          {'\u00a0· '}
          {/* Words stay together; the only break left inside the segment is after a slash. */}
          <span className="inline-block">{segment.split(' / ').map(middotText).join('\u00a0/ ')}</span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * The project's deeper content (platform, role with its leadership beats, engineering, stack). Shared by the
 * JS dialog and the no-JS inline <details>, so both always say the same thing.
 */
export function ProjectDetailsBody({ details, heading: H }: { details: ProjectDetailsContent; heading: Heading }) {
  const { platform, role, engineering, stack } = details;
  const h = 'font-display text-(length:--fs-ui-base) leading-[1.3] font-bold tracking-[-0.01em] text-balance text-cream md:text-(length:--fs-ui-lg)';
  const sub = 'label text-(length:--fs-ui-2xs) text-peach';
  return (
    <div className="flex flex-col gap-7 text-(length:--fs-ui-base) leading-[1.55] text-text-2">
      <section className="flex flex-col gap-3">
        <H className={h}>{platform.title}</H>
        <p className="-mt-1 text-(length:--fs-ui-base) leading-[1.4] font-semibold text-lilac">{platform.subtitle}</p>
        <p>{platform.intro}</p>
        <p className={sub}>{platform.areasLabel}</p>
        <ChipList items={platform.areas} />
      </section>
      <section className="flex flex-col gap-3">
        <H className={h}>
          <MiddotHeadingText text={role.title} />
        </H>
        {/* Leadership at a glance (short pills), then the full list. */}
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {role.beats.map((beat) => (
            <li key={beat.label} className="flex max-w-full">
              <span
                className="inline-flex items-center gap-2 rounded-pill py-[7px] pr-[13px] pl-[11px] text-chip leading-tight font-semibold whitespace-nowrap text-cream"
                style={{ background: 'var(--beat-fill)', boxShadow: 'var(--beat-outline)' }}
              >
                <SunMark variant="node" size={13} color="var(--color-tangerine)" />
                {beat.short ? (
                  <>
                    <span className="max-xs:hidden">{beat.label}</span>
                    <span className="xs:hidden">{beat.short}</span>
                  </>
                ) : (
                  beat.label
                )}
              </span>
            </li>
          ))}
        </ul>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {role.items.map((item) => (
            <li key={item} className="flex items-baseline gap-2.5">
              <SunMark variant="node" size={14} color="var(--color-tangerine)" className="shrink-0 translate-y-[1px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <H className={h}>{engineering.title}</H>
        <p>{engineering.intro}</p>
        <ChipList items={engineering.areas} />
      </section>
      <section className="flex flex-col gap-3">
        <H className={h}>{stack.title}</H>
        {stack.groups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className={`${sub} min-w-[84px]`}>{g.label}</p>
            <ChipList items={g.items} variant="bright" />
          </div>
        ))}
      </section>
      <p className="flex items-center gap-2 text-(length:--fs-ui-md) text-muted">
        <LockGlyph />
        {details.privateNote}
      </p>
    </div>
  );
}

export interface ProjectDetailsDialogProps {
  id: string;
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * Project details as a native modal <dialog>: it opens in the top layer (so the
 * pinned, translated rail can't clip or offset it), the page behind is inert,
 * focus moves in and Tab stays inside, Esc and a backdrop click close it, and focus
 * returns to the opener. Page scroll is locked while it's open, so the pinned rail
 * doesn't slide behind it. Rendered closed on the server; without JS the card's
 * inline <details> carries the same content instead.
 * With motion allowed it fades and rises in, and fades and sinks out before it
 * closes (motion.dialog; CSS in global.css); with reduced motion it just appears.
 */
export function ProjectDetailsDialog({ id, open, onClose, eyebrow, title, closeLabel, children }: ProjectDetailsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const reduced = usePrefersReducedMotion();
  const animateRef = useRef(!reduced);
  useEffect(() => {
    animateRef.current = !reduced;
  }, [reduced]);

  /** Every user close (button, Esc, backdrop) goes through here: play the exit, then close. */
  const closingRef = useRef(false);
  /** Drops a pending exit (its timer and transitionend listener) without closing. */
  const cancelExitRef = useRef<() => void>(() => {});
  useEffect(() => () => cancelExitRef.current(), []);
  const requestClose = useCallback(() => {
    const dialog = ref.current;
    if (!dialog || closingRef.current) return;
    // No exit to play (reduced motion, or no native dialog, e.g. jsdom): close now.
    if (!animateRef.current || !dialog.open || typeof dialog.close !== 'function') {
      onCloseRef.current();
      return;
    }
    closingRef.current = true;
    dialog.dataset.state = 'leave';
    let timer = 0;
    const finish = (e?: TransitionEvent) => {
      if (e && (e.target !== dialog || e.propertyName !== 'opacity')) return;
      cancelExitRef.current();
      onCloseRef.current();
    };
    cancelExitRef.current = () => {
      dialog.removeEventListener('transitionend', finish);
      window.clearTimeout(timer);
      cancelExitRef.current = () => {};
    };
    dialog.addEventListener('transitionend', finish);
    timer = window.setTimeout(finish, motion.dialog.durationMs + 80);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    const prev = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    root.style.overflow = 'hidden';
    root.style.scrollbarGutter = 'stable';
    closingRef.current = false;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        if (animateRef.current) dialog.dataset.state = 'enter';
        dialog.showModal();
        if (animateRef.current) {
          // Commit the start state (sheet and backdrop), then transition to rest.
          void dialog.offsetHeight;
          void getComputedStyle(dialog, '::backdrop').opacity;
          delete dialog.dataset.state;
        }
      } else dialog.setAttribute('open', ''); // jsdom
    }
    const onNativeClose = () => onCloseRef.current();
    // Close requests the browser routes as `cancel` (Esc, Android back): play the exit.
    // If the browser insists and closes anyway, `close` still reports it.
    const onCancel = (e: Event) => {
      e.preventDefault();
      requestClose();
    };
    dialog.addEventListener('close', onNativeClose);
    dialog.addEventListener('cancel', onCancel);
    return () => {
      cancelExitRef.current();
      dialog.removeEventListener('close', onNativeClose);
      dialog.removeEventListener('cancel', onCancel);
      delete dialog.dataset.state;
      closingRef.current = false;
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      root.style.overflow = prev.overflow;
      root.style.scrollbarGutter = prev.gutter;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, requestClose]);

  const titleId = `${id}-title`;
  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      className="project-dialog"
      data-anim={reduced ? undefined : ''}
      style={
        {
          '--dialog-ms': `${motion.dialog.durationMs}ms`,
          '--dialog-rise': `${motion.dialog.rise}px`,
          '--dialog-ease': motion.dialog.easing,
        } as CSSProperties
      }
      // A click on the dialog box itself (not its content) is a backdrop click.
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      // Esc: handled here too (not only by the native cancel), so it always closes once.
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          requestClose();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6 max-xs:px-5 pb-4 md:px-9 md:pt-8">
        <div className="flex flex-col gap-2">
          <p className="label text-(length:--fs-ui-2xs) text-peach">{eyebrow}</p>
          <h3 id={titleId} className="text-project leading-[1.1] font-bold tracking-[-0.035em] text-cream">
            {title}
          </h3>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={requestClose}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-(length:--fs-ui-2xl) text-cream shadow-outline-cream transition-[filter,background-color] duration-200 hover:bg-cream/5 hover:brightness-110"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {/* Only the body scrolls; the title and close button stay in view. */}
      <div className="project-dialog-body min-h-0 flex-1 overflow-y-auto px-6 pt-2 max-xs:px-5 pb-7 md:px-9 md:pb-9">{children}</div>
    </dialog>
  );
}
