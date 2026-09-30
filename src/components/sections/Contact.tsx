import { contact, sectionIds } from '@/content';
import { Button, SunMark } from '@/components/primitives';

/** The second statement moment. The sunrise glow lives on the page root. */
export function Contact() {
  return (
    <section
      id={sectionIds.contact}
      aria-labelledby="contact-title"
      className="relative px-gutter pt-[70px] pb-10"
    >
      <div className="relative flex flex-col items-center gap-[18px] text-center">
        <p className="label text-tangerine">{contact.label}</p>
        <h2 id="contact-title" className="statement text-closing">
          {contact.headline}
          <SunMark size="0.4em" />
        </h2>
        <p className="max-w-[580px] text-(length:--fs-ui-lg) leading-[1.55] text-balance text-text-2 lg:text-(length:--fs-ui-xl)">{contact.body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button variant="cream" href={contact.email.href} trailing="→">
            {contact.email.label}
          </Button>
          {contact.socials.map((s) => (
            <Button key={s.label} variant="secondary" href={s.href} external trailing="↗">
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
