import { useEffect, useId, useRef, useState } from 'react';
import { links, nav } from '@/content';
import { StoryPill, SunMark } from '@/components/primitives';
import { onScroll } from '@/motion/driver';
import { useScrollSpy } from '@/motion/useScrollSpy';
import { hashElement } from '@/router/hash';
import { focusQuietly } from '@/router/router';

const navHrefs = nav.items.map((item) => item.href);

/** Scroll distance (px) after which the bar gets its backdrop. */
const SCROLLED_AT = 8;
/** A scroll step (px, one frame) at least this big is a jump (anchor link, Home/End): no fade. */
const JUMP_AT = 200;

/**
 * Logo · floating pill nav (md+) · the lilac "Story" pill (StoryPill). Below
 * md: logo, the pill with its short label ("Story") and a round gradient menu button that
 * discloses the nav links.
 * Fixed to the top on every breakpoint. Transparent over the top of the hero; once
 * the page scrolls it gets a blurred surface backdrop (`[data-topbar-backdrop]`,
 * global.css). The scrolled state comes from the one scroll source (driver.ts) and
 * is written straight to the DOM (no re-render); after a jump (anchor link) the backdrop
 * switches without its fade. Without JS the backdrop is always on.
 */
export function TopBar() {
  const current = useScrollSpy(navHrefs);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let lastY = window.scrollY;
    return onScroll(({ scrollY }) => {
      const header = headerRef.current;
      if (!header) return;
      // A jump lands wherever the target is, maybe with a section's line right under the
      // bar: show the backdrop at once instead of fading it in over what's behind it.
      const jump = Math.abs(scrollY - lastY) >= JUMP_AT;
      lastY = scrollY;
      if ((header.dataset.jump === 'true') !== jump) header.dataset.jump = String(jump);
      const scrolled = scrollY > SCROLLED_AT;
      if ((header.dataset.scrolled === 'true') !== scrolled) header.dataset.scrolled = String(scrolled);
    });
  }, []);
  return (
    <header
      ref={headerRef}
      data-topbar
      className="fixed inset-x-0 top-0 z-30 flex h-(--topbar-h) items-center justify-between gap-3 px-4 md:px-gutter"
    >
      <div aria-hidden="true" data-topbar-backdrop className="pointer-events-none absolute inset-0 -z-10" />
      <a
        href="#top"
        aria-label={nav.logoLabel}
        data-cursor-plain
        className="flex min-h-11 min-w-11 items-center font-display text-(length:--fs-ui-3xl) font-extrabold tracking-[-0.03em] text-cream no-underline lg:text-(length:--fs-ui-4xl)"
      >
        K<SunMark size="0.5em" />
      </a>

      {/* Centred on the page from lg (below that, the flex row keeps it clear of both sides). */}
      <nav aria-label="Primary" className="hidden md:block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
        <ul
          className="m-0 flex list-none gap-1 rounded-pill p-1.5 shadow-nav"
          style={{ background: 'var(--nav-fill)' }}
        >
          {nav.items.map((item, i) => {
            const active = i === current;
            return (
              <li key={item.href} className="flex">
                <a
                  href={item.href}
                  aria-current={active ? 'location' : undefined}
                  // 45px target (a transparent 4px border above and below, the pill's
                  // background clipped inside it), drawn as the 37px pill; the negative
                  // margin keeps the nav bar's height.
                  className={`relative -my-1 rounded-pill border-y-4 border-transparent bg-clip-padding py-2.5 font-body text-(length:--fs-ui-md) leading-[17px] no-underline ${
                    active
                      ? 'px-[18px] font-bold text-deep'
                      : 'px-4 font-medium text-text-2 hover:text-cream'
                  }`}
                  style={active ? { background: 'var(--gradient-main)' } : undefined}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <StoryLink />
        <MobileMenu />
      </div>
    </header>
  );
}

/**
 * The Story link (StoryPill). The Story opens from its orb and, on the way back, closes
 * onto it (router/transition.ts).
 */
function StoryLink() {
  return (
    <StoryPill href={links.story} storyOrigin="topbar">
      {nav.story.label}
    </StoryPill>
  );
}

/**
 * After the page scrolls to an in-page target (useInPageLinks), make sure keyboard /
 * screen-reader focus is still there once the menu has closed and re-rendered.
 */
function focusHashTarget(href: string) {
  requestAnimationFrame(() => focusQuietly(hashElement(href)));
}

const menuLinkClass =
  'flex min-h-12 items-center rounded-[22px] px-4 font-display text-(length:--fs-ui-xl) font-semibold text-cream no-underline hover:bg-cream/5';

/** Disclosure menu for phones: Esc / outside click / link click close it; focus is managed. */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      {/*
        No-JS fallback (html:not(.js), see global.css): the same round button as a
        link to #site-menu, and a static copy of the menu shown with :target.
        Both are display:none whenever JS runs.
      */}
      <a
        href="#site-menu"
        data-menu-fallback
        aria-label={nav.menuLabel}
        className="hidden size-[46px] flex-col items-center justify-center gap-[5px] rounded-full"
        style={{ background: 'var(--gradient-main)' }}
      >
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded-[2px] bg-deep" />
        <span aria-hidden="true" className="h-0.5 w-3 rounded-[2px] bg-deep" />
      </a>
      <div
        id="site-menu"
        data-menu-fallback-panel
        className="absolute inset-x-4 top-[calc(100%-4px)] hidden rounded-panel p-2 shadow-lit"
        style={{ background: 'var(--menu-fill)' }}
      >
        <nav aria-label="Sections">
          <ul className="m-0 flex list-none flex-col p-0">
            {nav.items.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={menuLinkClass}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <button
        data-menu-button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? nav.closeMenuLabel : nav.menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex size-[46px] flex-col items-center justify-center gap-[5px] rounded-full"
        style={{ background: 'var(--gradient-main)' }}
      >
        <span
          aria-hidden="true"
          className={`h-0.5 rounded-[2px] bg-deep transition-transform duration-200 motion-reduce:transition-none ${open ? 'w-[18px] translate-y-[3.5px] rotate-45' : 'w-[18px]'}`}
        />
        <span
          aria-hidden="true"
          className={`h-0.5 rounded-[2px] bg-deep transition-transform duration-200 motion-reduce:transition-none ${open ? 'w-[18px] -translate-y-[3.5px] -rotate-45' : 'w-3'}`}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-4 top-[calc(100%-4px)] rounded-panel p-2 shadow-lit"
        style={{ background: 'var(--menu-fill)' }}
      >
        <nav aria-label="Menu">
          <ul className="m-0 flex list-none flex-col p-0">
            {nav.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    focusHashTarget(item.href);
                  }}
                  className={menuLinkClass}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
