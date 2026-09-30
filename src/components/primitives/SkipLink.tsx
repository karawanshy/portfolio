import { nav, sectionIds } from '@/content';

export function SkipLink() {
  return (
    <a className="skip-link" href={`#${sectionIds.main}`}>
      {nav.skipLink}
    </a>
  );
}
