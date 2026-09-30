import { footer } from '@/content';
import { SunMark } from '@/components/primitives';

export function Footer() {
  return (
    <footer className="relative px-gutter pb-10">
      <div className="flex flex-col items-center gap-2 border-t border-cream/16 pt-6 text-(length:--fs-ui-md) text-text-2 md:flex-row md:justify-between">
        <span className="font-display text-(length:--fs-ui-2xl) font-extrabold text-cream">
          {footer.wordmark}
          <SunMark size="0.6em" />
        </span>
        <span>{footer.center}</span>
        <span>{footer.right}</span>
      </div>
    </footer>
  );
}
