import { useRef, useEffect } from "react";

interface Props {
  imageUrls: string[];
  urls: string[];
  interval: number;
  lgWidthClass: string;
  animated?: boolean;
  backgroundClasses?: string[];
}

export default function Sponsorcard({
  imageUrls,
  urls,
  interval,
  lgWidthClass,
  animated,
  backgroundClasses,
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
      className={`bg-background flex w-9/10 shrink-0 px-2 ${lgWidthClass}`}
    >
      <div className="card bg-dark-gray-700 after:bg-primary relative flex w-full shrink-0 flex-col items-center justify-center gap-4 text-white before:absolute before:right-0 before:bottom-0 before:z-2 before:h-[2px] before:w-full before:bg-gray-600 before:transition-[width] before:duration-300 before:ease-in-out before:content-[''] after:absolute after:bottom-0 after:left-0 after:z-2 after:h-[2px] after:w-0 after:transition-[width] after:delay-125 after:duration-300 after:ease-[cubic-bezier(0.55,0.085,0.68,0.53)] after:content-[''] hover:cursor-pointer hover:before:w-0 hover:after:w-full">
        <div
          ref={scrollRef}
          className="hidescrollbar flex w-full snap-x snap-mandatory flex-row overflow-auto scroll-smooth"
        >
          {imageUrls.map((img, index) => (
            <a
              key={index}
              href={urls[index]}
              className="flex min-w-full snap-start"
            >
              <img
                src={img}
                alt="Sponsor"
                className={`w-full object-contain px-4 ${backgroundClasses?.[index] || ""}`}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
