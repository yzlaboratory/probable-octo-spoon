import { Fragment } from "react";
import Skeleton from "@mui/material/Skeleton";

function FallbackCard() {
  return (
    <div className="socialcard flex w-9/10 shrink-0 px-2 lg:w-1/5">
      <div className="cs-tile flex w-full flex-col overflow-hidden">
        <Skeleton
          variant="rectangular"
          animation="pulse"
          sx={{ bgcolor: "var(--paper-3)" }}
          className="!aspect-[100/56] !h-auto !w-full"
        />
        <div className="flex flex-col gap-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "var(--paper-3)" }}
              className="!h-3 !w-32 !rounded-sm"
            />
            <Skeleton
              variant="circular"
              animation="pulse"
              sx={{ bgcolor: "var(--paper-3)" }}
              className="!h-7 !w-7"
            />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                animation="pulse"
                sx={{ bgcolor: "var(--paper-3)" }}
                className="!h-3 !w-full !rounded-sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  sponsorCard?: React.ReactNode;
}

export default function SocialcardFallback({ sponsorCard }: Props) {
  const items = Array.from({ length: 25 }, (_, i) => i);
  return (
    <>
      {items.map((index) => {
        if (index === 4 && sponsorCard) {
          return (
            <Fragment key={index}>
              {sponsorCard}
              <FallbackCard />
            </Fragment>
          );
        }
        return <FallbackCard key={index} />;
      })}
    </>
  );
}
