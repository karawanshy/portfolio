import { useEffect, type RefObject } from 'react';
import { motion } from './config';
import { onFrame } from './driver';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const cfg = motion.ribbons;

/**
 * Drifts a satin ribbon's text along its path:
 *   startOffset = base − (distance mod cycleLength)
 * where base/cycle are measured by SatinRibbon (data-base-offset / data-cycle-length),
 * so the loop is seamless. Faster while the page scrolls; eases to a crawl while a
 * fine pointer is over the ribbon's stroke. Runs only while the ribbon is on screen
 * (and the driver sleeps while the tab is hidden). Off with reduced motion.
 */
export function useRibbonDrift(
  svgRef: RefObject<SVGSVGElement | null>,
  strokeRef: RefObject<SVGPathElement | null>,
  textPathRef: RefObject<SVGTextPathElement | null>,
) {
  const reduced = usePrefersReducedMotion();
  const finePointer = useMediaQuery(motion.finePointerQuery);

  useEffect(() => {
    const svg = svgRef.current;
    const stroke = strokeRef.current;
    const textPath = textPathRef.current;
    if (reduced || !svg || !stroke || !textPath || typeof IntersectionObserver === 'undefined') return;

    let distance = 0;
    let hoverFactor = 1;
    let hovered = false;
    let stop: (() => void) | null = null;

    const frame = ({ dt, velocity }: { dt: number; velocity: number }) => {
      const base = Number(textPath.dataset.baseOffset);
      const cycle = Number(textPath.dataset.cycleLength);
      if (!(cycle > 0) || Number.isNaN(base)) return; // not measured yet
      const target = hovered ? cfg.hoverSlowdown : 1;
      hoverFactor += (target - hoverFactor) * (1 - Math.exp(-dt / cfg.hoverEaseS));
      const boost = 1 + Math.min(Math.abs(velocity) * cfg.scrollBoost, cfg.maxBoost);
      distance = (distance + cfg.driftSpeed * boost * hoverFactor * dt) % cycle;
      textPath.setAttribute('startOffset', (base - distance).toFixed(2));
    };

    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      if (entry.isIntersecting && !stop) stop = onFrame(frame);
      else if (!entry.isIntersecting && stop) {
        stop();
        stop = null;
      }
    });
    io.observe(svg);

    // Hover: hit-test the stroke itself (the SVGs are pointer-events: none, so the
    // page underneath keeps working). Tolerance comes from hoverSlop.
    const onPointerMove = (e: PointerEvent) => {
      if (!stop || e.pointerType !== 'mouse') {
        hovered = false;
        return;
      }
      const ctm = stroke.getScreenCTM?.();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const slop = cfg.hoverSlop / (ctm.a || 1);
      const original = stroke.getAttribute('stroke-width') ?? '0';
      if (slop > 0) stroke.setAttribute('stroke-width', String(Number(original) + 2 * slop));
      try {
        hovered = stroke.isPointInStroke(p);
      } catch {
        hovered = false;
      } finally {
        if (slop > 0) stroke.setAttribute('stroke-width', original);
      }
    };
    const onLeave = () => {
      hovered = false;
    };
    if (finePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    return () => {
      io.disconnect();
      stop?.();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      const base = textPath.dataset.baseOffset;
      if (base !== undefined) textPath.setAttribute('startOffset', base);
    };
  }, [reduced, finePointer, svgRef, strokeRef, textPathRef]);
}
