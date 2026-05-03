import { useRef, useEffect } from "react";

interface Props {
  imageUrls: string[];
  urls: string[];
  interval: number;
  lgWidthClass: string;
  animated?: boolean;
  backgroundClasses?: string[];
  containerClassName?: string;
}

export default function Sponsorcard({
  imageUrls,
  urls,
  interval,
  lgWidthClass,
  animated,
  backgroundClasses,
  containerClassName,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = 0;
    const timer = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft + el.clientWidth * 0.51 > maxScroll) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += el.clientWidth * 0.51;
      }
    }, interval);
    return () => clearInterval(timer);
  }, [animated, interval]);

  return (
    <div
      className={`relative w-9/10 shrink-0 px-2 ${lgWidthClass} ${containerClassName || ""}`}
    >
      <div
        className="cs-tile absolute inset-2 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--paper-3)" }}
      >
        <span
          className="caps absolute top-3 left-4 text-[9.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          Partner
        </span>
        <div
          ref={scrollRef}
          className="hidescrollbar flex h-full w-full snap-x snap-mandatory flex-row overflow-auto scroll-smooth"
        >
          {imageUrls.map((img, index) => (
            <a
              key={index}
              href={urls[index]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-full snap-start items-center justify-center"
            >
              <img
                src={img}
                alt="Sponsor"
                className={`max-h-full max-w-full object-contain px-6 py-8 ${backgroundClasses?.[index] || ""}`}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
