import { useRef, useEffect, useCallback, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Frontpageheader from "./Frontpageheader";

interface Props {
  headerTitle: string;
  childrenClassName: string;
  classPrefix: string;
  numberOfItemsInViewport: number;
  children: ReactNode;
}

export default function Gallery({
  headerTitle,
  childrenClassName,
  classPrefix,
  numberOfItemsInViewport,
  children,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const finalScrollRef = useRef(0);

  const checkButtons = useCallback(() => {
    const scrollContainer = scrollRef.current;
    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    if (!scrollContainer) return;
    const val = finalScrollRef.current;

    if (nextBtn) {
      nextBtn.style.display =
        val >= scrollContainer.scrollWidth - scrollContainer.clientWidth
          ? "none"
          : "";
    }
    if (prevBtn) {
      prevBtn.style.display = val <= 0 ? "none" : "";
    }
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(width >= 64rem)").matches) return;

    const scrollContainer = scrollRef.current;
    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    if (!scrollContainer || !prevBtn || !nextBtn) return;

    const height =
      scrollContainer.getBoundingClientRect().height.toString() + "px";
    nextBtn.style.height = height;
    prevBtn.style.height = height;

    const childElement = scrollContainer.querySelector(
      `.${childrenClassName}`,
    );
    const scrollValue =
      (childElement?.getBoundingClientRect().width || 0) *
      numberOfItemsInViewport;

    const handleNext = () => {
      finalScrollRef.current += scrollValue;
      scrollContainer.scrollLeft = finalScrollRef.current;
      checkButtons();
    };

    const handlePrev = () => {
      finalScrollRef.current -= scrollValue;
      scrollContainer.scrollLeft = finalScrollRef.current;
      checkButtons();
    };

    nextBtn.addEventListener("click", handleNext);
    prevBtn.addEventListener("click", handlePrev);
    checkButtons();

    return () => {
      nextBtn.removeEventListener("click", handleNext);
      prevBtn.removeEventListener("click", handlePrev);
    };
  }, [childrenClassName, numberOfItemsInViewport, checkButtons]);

  return (
    <div className="relative flex w-full flex-col">
      <Frontpageheader text={headerTitle} />
      <div
        ref={scrollRef}
        className="galleryContainer hidescrollbar relative flex max-w-full flex-row flex-nowrap content-start overflow-auto scroll-smooth px-4 md:px-20"
      >
        {children}
      </div>
      <div
        ref={nextRef}
        className={`${classPrefix}NextButton bg-background/75 hidden lg:flex absolute right-0 z-1 bottom-0 h-full w-20 items-center justify-center hover:bg-background/90 transition-colors ease-in-out duration-300 hover:cursor-pointer`}
      >
        <IconButton
          disableRipple
          sx={{ color: "inherit", p: 0 }}
          aria-label="Next"
        >
          <span className="material-symbols-rounded material-symbols-rounded-light z-10 text-5xl! text-zinc-400">
            arrow_forward_ios
          </span>
        </IconButton>
      </div>
      <div
        ref={prevRef}
        className={`${classPrefix}PrevButton bg-background/75 hidden lg:flex absolute bottom-0 left-0 z-1 h-full w-20 items-center justify-center hover:bg-background/90 transition-colors ease-in-out duration-300 hover:cursor-pointer`}
      >
        <IconButton
          disableRipple
          sx={{ color: "inherit", p: 0 }}
          aria-label="Previous"
        >
          <span className="material-symbols-rounded material-symbols-rounded-light z-10 text-5xl! text-zinc-400">
            arrow_back_ios_new
          </span>
        </IconButton>
      </div>
    </div>
  );
}
