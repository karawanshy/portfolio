/**
 * The teacher (ch 8): a woman in a hijab, standing, drawn like the ch 1 girl and the ch 8 kids
 * (the same face language), turned toward the kids (the viewer's right) and looking at them,
 * one hand opened toward the table. Local origin (0, 0) = between her feet; she is about
 * 130 units tall before `s`. Decorative (inside an aria-hidden illustration).
 */
export function Teacher({ x, y, s = 1, shade }: { x: number; y: number; s?: number; shade?: string }) {
  const skin = 'var(--illus-skin-2)';
  const skinShade = 'var(--illus-skin-2-shade)';
  const tunic = 'M-12 -100Q-16 -98 -16 -90L-17 -54H17L16 -90Q16 -98 12 -100Z';
  return (
    <g data-teacher transform={`translate(${x} ${y}) scale(${s})`}>
      {/* A long skirt and shoes. */}
      <path d="M-12 -58L-16 -3H16L12 -58Z" fill="var(--illus-teacher-skirt)" />
      <path d="M4 -58L16 -3H9L2 -58Z" fill="var(--illus-edge-lo)" opacity={0.35} />
      <ellipse cx="-7" cy="-2" rx="5.4" ry="2.3" fill="var(--illus-face-side)" />
      <ellipse cx="8" cy="-2" rx="5.4" ry="2.3" fill="var(--illus-face-side)" />
      {/* The far arm, at her side. */}
      <path d="M-13 -95L-17 -62" stroke="var(--illus-teacher-top)" strokeWidth="6.4" strokeLinecap="round" />
      <circle cx="-17.4" cy="-59.6" r="3" fill={skinShade} />
      {/* A long tunic, darker toward the hem. */}
      <path d={tunic} fill="var(--illus-teacher-top)" />
      {shade && <path d={tunic} fill={shade} />}
      <path d="M5 -100H12Q16 -98 16 -90L17 -54H9Z" fill="var(--illus-edge-lo)" opacity={0.3} />
      {/* The near arm, the hand opened toward the table and the kids. */}
      <path d="M13 -95Q22 -86 30 -79" fill="none" stroke="var(--illus-teacher-top)" strokeWidth="6.4" strokeLinecap="round" />
      <path d="M31 -80.6c3 -1.4 5.8 -1 7.4 .4c-1.6 .2 -3 1 -4 2.4c-1.4 1.2 -3.4 1 -4.2 -.4Z" fill={skin} />
      {/* The hijab: over her head, framing her face, falling over her shoulders. */}
      <path d="M-13 -112C-13 -131 14 -131 14 -112C14 -104 15 -100 20 -96Q10 -89 0 -89Q-10 -89 -20 -96C-15 -100 -13 -104 -13 -112Z" fill="var(--illus-hijab)" />
      <path d="M-10.6 -118C-7.4 -126.4 6.4 -127.6 10.6 -121.4" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Her face, turned toward the kids: eyes on them, a warm smile. */}
      <ellipse cx="4" cy="-111" rx="7.6" ry="9.2" fill={skin} />
      {[3.6, 9].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="-110.6" r="1.1" fill="var(--illus-hair)" />
          <path d={`M${cx - 1.4} -110.6a1.4 1.4 0 0 1 2.8 0Z`} fill={skin} />
          <path d={`M${cx - 1.5} -110.6h3`} stroke={skinShade} strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}
      <path d="M2 -113.8q1.4 -.8 2.8 0M7.8 -113.8q1.4 -.8 2.8 0" fill="none" stroke={skinShade} strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="9.6" cy="-107" r="1.6" fill="var(--color-pink)" opacity={0.35} />
      <path d="M4.2 -105.8q2.4 1.8 4.8 0" fill="none" stroke={skinShade} strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}
