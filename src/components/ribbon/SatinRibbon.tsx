import { Fragment, useId, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useRibbonDrift } from '@/motion/useRibbonDrift';

/**
 * A glossy satin ribbon: a wide gradient stroke along an SVG path, an optional
 * thin white sheen offset above the centerline, and tag text flowing along the
 * curve on a <textPath>. Purely decorative (aria-hidden); every tag also appears
 * as real text elsewhere on the page.
 *
 * Text coverage + seamless looping: the tag cycle is repeated `repeat` times.
 * After fonts load, the component measures one cycle's length and shifts the
 * start offset back by whole cycles so text begins before the path's visible
 * start at any viewport width, while every tag lands exactly where it would at
 * `startOffset` (the artboard placement). Without JS, `startOffset` is used as-is.
 *
 * Motion: the textPath (`[data-ribbon-text]`) exposes `data-base-offset` (px) and
 * `data-cycle-length` (px); `useRibbonDrift` animates
 *   startOffset = base - (distance mod cycleLength)
 * which loops seamlessly because the text is periodic with that length.
 */
export type RibbonPaint = 'satin';

interface Stop {
  offset: number;
  color: string;
}

const paints: Record<RibbonPaint, Stop[]> = {
  /** Closing + Story path ribbon: tangerine → pink (lighter sheen stop) → tangerine. */
  satin: [
    { offset: 0, color: 'var(--color-tangerine)' },
    { offset: 0.45, color: 'var(--color-pink)' },
    { offset: 0.55, color: 'var(--color-pink-light)' },
    { offset: 1, color: 'var(--color-tangerine)' },
  ],
};

const textFill: Record<RibbonPaint, string> = {
  satin: 'var(--color-deep)',
};

export interface SatinRibbonProps {
  d: string;
  /** Coordinate space of the path (the SVG scales to its box's width). */
  viewBox: { width: number; height: number };
  strokeWidth: number;
  paint: RibbonPaint;
  /** Tags flowing along the path. Omit (or pass []) for a plain ribbon with no text. */
  tags?: readonly string[];
  separator?: string;
  fontSize?: number;
  /** Vertical nudge that centers the text on the stroke. */
  dy?: number;
  /** Where the text starts along the path (px in path units). */
  startOffset?: number;
  /** Thin white highlight above the centerline for the satin sheen. */
  sheenOffsetY?: number;
  /** Horizontal span the gradient is laid across (artboard x-range). */
  gradientSpan?: readonly [number, number];
  /** How many times the tag cycle repeats along the path. */
  repeat?: number;
  className?: string;
  style?: CSSProperties;
  /** SVG preserveAspectRatio (default: the browser's `xMidYMid meet`). */
  preserveAspectRatio?: string;
  /** Size attributes, for use as a nested <svg> in another SVG's user space (default: none). */
  width?: number;
  height?: number;
}

export function SatinRibbon({
  d,
  viewBox,
  strokeWidth,
  paint,
  tags = [],
  separator = '·',
  fontSize = 0,
  dy = 0,
  startOffset = 0,
  sheenOffsetY,
  gradientSpan = [-60, 1520],
  repeat = 8,
  className,
  style,
  preserveAspectRatio,
  width,
  height,
}: SatinRibbonProps) {
  const hasText = tags.length > 0;
  const uid = useId().replace(/:/g, '');
  const gradientId = `ribbon-grad-${uid}`;
  const pathId = `ribbon-path-${uid}`;
  const cycles = Array.from({ length: repeat }, (_, i) => i);
  const localRef = useRef<SVGTextPathElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokeRef = useRef<SVGPathElement | null>(null);
  useRibbonDrift(svgRef, strokeRef, localRef);

  // Characters in one cycle: each tag plus the " <sep> " joiner that follows it.
  const cycleChars = tags.reduce((n, tag) => n + tag.length + separator.length + 2, 0);

  useLayoutEffect(() => {
    const textPath = localRef.current;
    const text = textPath?.parentElement as SVGTextElement | null | undefined;
    if (!textPath || !text) return;
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      let cycle: number;
      try {
        cycle = text.getSubStringLength(0, cycleChars);
      } catch {
        return; // e.g. jsdom: keep the static startOffset
      }
      if (!(cycle > 0)) return;
      const base = startOffset - Math.ceil(startOffset / cycle) * cycle;
      textPath.setAttribute('startOffset', String(base));
      textPath.dataset.baseOffset = String(base);
      textPath.dataset.cycleLength = String(cycle);
    };
    apply();
    document.fonts?.ready.then(apply);
    // Hidden layouts (display:none) measure 0; re-measure once the ribbon gets a box
    // (e.g. after crossing the phone/tablet breakpoint).
    const svg = svgRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && svg ? new ResizeObserver(() => apply()) : null;
    if (ro && svg) ro.observe(svg);
    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [startOffset, cycleChars, fontSize]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio={preserveAspectRatio}
      width={width}
      height={height}
      overflow="visible"
      className={className}
      style={{ overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={gradientSpan[0]}
          y1="0"
          x2={gradientSpan[1]}
          y2="0"
        >
          {paints[paint].map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <path id={pathId} d={d} fill="none" />
      </defs>

      <path ref={strokeRef} d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} />
      {sheenOffsetY !== undefined && (
        <path
          d={d}
          fill="none"
          stroke="var(--ribbon-sheen)"
          strokeWidth={5}
          transform={`translate(0 ${sheenOffsetY})`}
        />
      )}

      {hasText && (
        <text
          className="ribbon-text"
          fontSize={fontSize}
          fontWeight={700}
          letterSpacing={1.5}
          fill={textFill[paint]}
          dy={dy}
        >
          <textPath data-ribbon-text ref={localRef} href={`#${pathId}`} startOffset={startOffset}>
            {cycles.map((c) =>
              tags.map((tag, i) => (
                <Fragment key={`${c}-${i}`}>
                  {c + i > 0 && (
                    <>
                      {' '}
                      <tspan className="ribbon-sep">{separator}</tspan>{' '}
                    </>
                  )}
                  {tag}
                </Fragment>
              )),
            )}
          </textPath>
        </text>
      )}
    </svg>
  );
}
