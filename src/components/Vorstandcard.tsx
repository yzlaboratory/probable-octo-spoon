interface Props {
  name: string;
  title: string;
  mail: string;
  phone: string;
  imageSrc: string;
}

export default function Vorstandcard({
  name,
  title,
  mail,
  phone,
  imageSrc,
}: Props) {
  return (
    <div className="vorstandcard flex w-9/10 shrink-0 px-2 lg:w-1/6">
      <div
        className="cs-tile group relative flex w-full flex-col overflow-hidden"
        style={{ color: "var(--ink)" }}
      >
        <div className="aspect-square w-full overflow-hidden">
          <img
            src={imageSrc}
            alt="Portrait"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <h1
            className="font-display text-[16px] leading-[1.15]"
            style={{ letterSpacing: "-0.01em", color: "var(--ink)" }}
          >
            {name}
          </h1>
          <h3 className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>
            {title}
          </h3>
          <div className="mt-1 flex flex-col gap-1 text-[11.5px]">
            <a
              href={`mailto:${mail}`}
              className="cs-focus inline-flex items-center gap-1.5 truncate"
              style={{ color: "var(--ink-2)" }}
            >
              <span className="material-symbols-rounded text-[14px]!">
                mail
              </span>
              <span className="truncate">{mail}</span>
            </a>
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="cs-focus inline-flex items-center gap-1.5"
              style={{ color: "var(--ink-2)" }}
            >
              <span className="material-symbols-rounded text-[14px]!">
                phone
              </span>
              <span>{phone}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
