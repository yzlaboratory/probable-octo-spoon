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

    const sizeButtons = () => {
      const height =
        scrollContainer.getBoundingClientRect().height.toString() + "px";
      nextBtn.style.height = height;
      prevBtn.style.height = height;
    };

    const pageWidth = () => {
      const childElement = scrollContainer.querySelector(
        `.${childrenClassName}`,
      );
      return (
        (childElement?.getBoundingClientRect().width || 0) *
        numberOfItemsInViewport
      );
    };

    const handleNext = () => {
      finalScrollRef.current += pageWidth();
      scrollContainer.scrollLeft = finalScrollRef.current;
      checkButtons();
    };

    const handlePrev = () => {
      finalScrollRef.current -= pageWidth();
      scrollContainer.scrollLeft = finalScrollRef.current;
      checkButtons();
    };

    const handleScroll = () => {
      finalScrollRef.current = scrollContainer.scrollLeft;
      checkButtons();
    };

    nextBtn.addEventListener("click", handleNext);
    prevBtn.addEventListener("click", handlePrev);
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Re-check when child content (re)flows — children load async from APIs,
    // so initial mount has 0 width and we need to recompute later.
    const ro = new ResizeObserver(() => {
      sizeButtons();
      checkButtons();
    });
    ro.observe(scrollContainer);
    const firstChild = scrollContainer.firstElementChild;
    if (firstChild) ro.observe(firstChild);

    sizeButtons();
    checkButtons();

    return () => {
      nextBtn.removeEventListener("click", handleNext);
      prevBtn.removeEventListener("click", handlePrev);
      scrollContainer.removeEventListener("scroll", handleScroll);
      ro.disconnect();
    };
  }, [childrenClassName, numberOfItemsInViewport, checkButtons]);

  return (
    <div className="relative flex w-full flex-col">
      <Frontpageheader text={headerTitle} />
      <div
        ref={scrollRef}
        className="galleryContainer hidescrollbar relative flex max-w-full flex-row flex-nowrap content-start items-stretch overflow-auto scroll-smooth px-4 md:px-20"
      >
        {children}
      </div>
      <div
        ref={nextRef}
        className={`${classPrefix}NextButton absolute right-0 bottom-0 z-1 hidden h-full w-20 items-center justify-center transition-opacity duration-200 hover:cursor-pointer lg:flex`}
        style={{
          background:
            "linear-gradient(to left, color-mix(in oklab, var(--paper) 92%, transparent), transparent)",
        }}
      >
        <IconButton
          disableRipple
          sx={{ color: "inherit", p: 0 }}
          aria-label="Next"
        >
          <span
            className="material-symbols-rounded material-symbols-rounded-light z-10 text-5xl!"
            style={{ color: "var(--ink-2)" }}
          >
            arrow_forward_ios
          </span>
        </IconButton>
      </div>
      <div
        ref={prevRef}
        className={`${classPrefix}PrevButton absolute bottom-0 left-0 z-1 hidden h-full w-20 items-center justify-center transition-opacity duration-200 hover:cursor-pointer lg:flex`}
        style={{
          background:
            "linear-gradient(to right, color-mix(in oklab, var(--paper) 92%, transparent), transparent)",
        }}
      >
        <IconButton
          disableRipple
          sx={{ color: "inherit", p: 0 }}
          aria-label="Previous"
        >
          <span
            className="material-symbols-rounded material-symbols-rounded-light z-10 text-5xl!"
            style={{ color: "var(--ink-2)" }}
          >
            arrow_back_ios_new
          </span>
        </IconButton>
      </div>
    </div>
  );
}
