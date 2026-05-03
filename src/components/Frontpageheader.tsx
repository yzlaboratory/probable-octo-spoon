interface Props {
  text: string;
}

/**
 * Section label for the home page. App-like: a single small-caps line with a
 * glowing primary rail — no editorial display headline.
 */
export default function Frontpageheader({ text }: Props) {
  return (
    <div className="mb-5 flex w-full flex-col px-6 md:mb-8 md:px-20">
      <h1
        className="section-eyebrow text-[12px] md:text-[13px]"
        style={{ color: "var(--ink-2)" }}
      >
        {text}
      </h1>
    </div>
  );
}
