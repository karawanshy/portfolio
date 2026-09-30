import { useEffect, useRef } from 'react';
import { motion } from './config';
import { onFrame, onScroll } from './driver';

const cfg = motion.cursor;

/**
 * Custom cursor — mounted by MotionLayer only for fine pointers with motion allowed.
 * A small warm orb follows the mouse with a little lag; over links/buttons it
 * hands over to a glowing pill wrapped around the element; panels (`[data-lit]`)
 * get a light along their top edge under it. The native cursor stays visible
 * (hidden only over link/button targets, where the pill marks the hit area), so
 * text selection keeps its I-beam. Transform/opacity only; the frame loop runs
 * only while the orb is catching up.
 */
export function Cursor() {
  const orbRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orb = orbRef.current;
    const pill = pillRef.current;
    if (!orb || !pill) return;
    const root = document.documentElement;
    const half = cfg.size / 2;
    const pad = cfg.pillPadding;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let visible = false;
    let target: Element | null = null;
    let lit: HTMLElement | null = null;
    let plain = false; // over a `plain` element: no orb or pill, just the native pointer
    let pillW = 0;
    let pillH = 0;
    let stopFrame: (() => void) | null = null;

    const placeOrb = () => {
      orb.style.transform = `translate3d(${(x - half).toFixed(1)}px, ${(y - half).toFixed(1)}px, 0)`;
    };

    const frame = ({ dt }: { dt: number }) => {
      const k = 1 - Math.exp(-dt / cfg.lagS);
      x += (tx - x) * k;
      y += (ty - y) * k;
      placeOrb();
      if (Math.abs(tx - x) < 0.2 && Math.abs(ty - y) < 0.2) {
        x = tx;
        y = ty;
        placeOrb();
        stopFrame?.();
        stopFrame = null;
      }
    };
    const wake = () => {
      if (!stopFrame) stopFrame = onFrame(frame);
    };

    /**
     * The pill rides with its target: in the page (absolute, so a scroll carries it natively,
     * in step with the target) unless the target is in a fixed or sticky box (the top bar,
     * a pinned stage), where it stays fixed and follows on each scroll frame. `origin` is
     * the viewport position of the pill's coordinate frame.
     */
    let anchored = false;
    const origin = () => {
      if (!anchored) return { left: 0, top: 0 };
      const frame = (pill.offsetParent ?? document.documentElement).getBoundingClientRect();
      return { left: frame.left, top: frame.top };
    };
    const inFixedBox = (el: Element) => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const { position } = getComputedStyle(n);
        if (position === 'fixed' || position === 'sticky') return true;
      }
      return false;
    };

    const placePill = (animate: boolean) => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      const o = origin();
      const w = r.width + pad * 2;
      const h = r.height + pad * 2;
      if (w !== pillW || h !== pillH) {
        pill.style.width = `${w}px`;
        pill.style.height = `${h}px`;
        pillW = w;
        pillH = h;
      }
      pill.style.transition = animate
        ? `transform ${cfg.morphMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${cfg.morphMs}ms ease-out`
        : `opacity ${cfg.morphMs}ms ease-out`;
      pill.style.transform = `translate3d(${r.left - o.left - pad}px, ${r.top - o.top - pad}px, 0)`;
    };

    // The hovered target can change size under a still pointer (e.g. a nav link becoming
    // the active pill after it's clicked, which also shifts it): re-fit the pill to it at
    // once, in step with the target (a morph here would lag its new size by a beat).
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (!target) return;
            // Ignore the report that comes with observe() (same size): it would cut short
            // the orb → pill morph that setTarget just started.
            const r = target.getBoundingClientRect();
            if (r.width + pad * 2 !== pillW || r.height + pad * 2 !== pillH) placePill(false);
          });

    const setTarget = (next: Element | null) => {
      if (next === target) return;
      target = next;
      resize?.disconnect();
      if (target) resize?.observe(target);
      if (!target) {
        pill.style.opacity = '0';
        orb.style.opacity = visible && !plain ? '1' : '0';
        return;
      }
      // Start the pill as the orb, then stretch it around the label: it sits on the target
      // from the first frame and grows out of the orb (scaled about the orb's point, clamped
      // into the target), so a big panel doesn't slide in from the orb's corner.
      const r = target.getBoundingClientRect();
      const w = r.width + pad * 2;
      const h = r.height + pad * 2;
      // Follow the element's own shape (pill buttons → pill, the story band → its rounded rect).
      const radius = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
      pill.style.borderRadius = `${Math.min(Math.max(radius + pad, 12), h / 2)}px`;
      pill.style.transition = 'none';
      anchored = !inFixedBox(target);
      pill.style.position = anchored ? 'absolute' : '';
      pill.style.width = `${w}px`;
      pill.style.height = `${h}px`;
      pillW = w;
      pillH = h;
      const o = origin();
      const ox = Math.min(w, Math.max(0, x - (r.left - pad)));
      const oy = Math.min(h, Math.max(0, y - (r.top - pad)));
      pill.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
      pill.style.transform = `translate3d(${r.left - o.left - pad}px, ${r.top - o.top - pad}px, 0) scale(${cfg.size / w}, ${cfg.size / h})`;
      void pill.offsetWidth; // commit the start state
      pill.style.opacity = '1';
      orb.style.opacity = '0';
      placePill(true);
    };

    const setLit = (next: HTMLElement | null, clientX: number) => {
      if (next !== lit) {
        lit?.style.setProperty('--lit-o', '0');
        lit = next;
      }
      if (!lit) return;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty('--lit-w', `${cfg.panelLightWidth}px`);
      lit.style.setProperty('--lit-x', `${(clientX - r.left).toFixed(1)}px`);
      lit.style.setProperty('--lit-o', '1');
    };

    const hitTest = (el: Element | null, clientX: number) => {
      const nextPlain = !!el?.closest(cfg.plain);
      if (nextPlain !== plain) {
        plain = nextPlain;
        if (!target) orb.style.opacity = visible && !plain ? '1' : '0';
      }
      setTarget(plain ? null : (el?.closest(cfg.targets) ?? null));
      setLit((el?.closest('[data-lit]') as HTMLElement | null) ?? null, clientX);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        placeOrb();
        if (!target) orb.style.opacity = '1';
      }
      hitTest(e.target as Element | null, e.clientX);
      wake();
    };
    const hide = () => {
      visible = false;
      plain = false;
      orb.style.opacity = '0';
      setTarget(null);
      setLit(null, 0);
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) hide(); // left the window
    };

    // Content moves under a still pointer when the page scrolls: re-hit-test.
    const stopScroll = onScroll(() => {
      if (!visible) return;
      hitTest(document.elementFromPoint(tx, ty), tx);
      placePill(false);
    });

    // A click can disable or move its target (e.g. the rail's Next button): re-check.
    let clickRaf = 0;
    const onClick = () => {
      cancelAnimationFrame(clickRaf);
      clickRaf = requestAnimationFrame(() => visible && hitTest(document.elementFromPoint(tx, ty), tx));
    };

    root.dataset.cursor = 'on';
    if (cfg.hideNativeOverTargets) root.dataset.cursorHideNative = 'on';
    root.style.setProperty('--cursor-morph', `${cfg.morphMs}ms`);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('blur', hide);
    document.addEventListener('click', onClick, true);

    return () => {
      cancelAnimationFrame(clickRaf);
      document.removeEventListener('click', onClick, true);
      resize?.disconnect();
      stopFrame?.();
      stopScroll();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', hide);
      lit?.style.removeProperty('--lit-o');
      delete root.dataset.cursor;
      delete root.dataset.cursorHideNative;
      root.style.removeProperty('--cursor-morph');
    };
  }, []);

  return (
    <>
      <div
        ref={orbRef}
        aria-hidden="true"
        className="cursor-orb"
        style={{ width: cfg.size, height: cfg.size, opacity: 0 }}
      />
      <div ref={pillRef} aria-hidden="true" className="cursor-pill" style={{ opacity: 0 }} />
    </>
  );
}
