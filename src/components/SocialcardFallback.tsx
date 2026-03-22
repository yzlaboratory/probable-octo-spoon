import { Fragment } from "react";
import Skeleton from "@mui/material/Skeleton";

function FallbackCard() {
  return (
    <div className="socialcard bg-background flex h-max w-9/10 lg:w-1/5 shrink-0 px-2">
      <div className="card after:bg-primary relative flex h-max w-full shrink-0 flex-col justify-start gap-8 pb-8 text-white before:absolute before:right-0 before:bottom-0 before:z-2 before:h-[2px] before:w-full before:bg-gray-600 before:transition-[width] before:duration-300 before:ease-in-out before:content-[''] after:absolute after:bottom-0 after:left-0 after:z-2 after:h-[2px] after:w-0 after:transition-[width] after:delay-300 after:duration-300 after:ease-[cubic-bezier(0.55,0.085,0.68,0.53)] after:content-[''] hover:before:w-0 hover:after:w-full">
        <Skeleton
          variant="rectangular"
          animation="pulse"
          sx={{ bgcolor: "#1e1e1e" }}
          className="!aspect-[100/56] !w-full !h-auto"
        />
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-row items-center gap-4">
            <div className="bg-primary h-3 2xl:h-4 w-10" />
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!h-5 !w-34 !rounded-xs"
            />
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!h-5 !w-5 !rounded-xs"
            />
          </div>
          <div className="flex h-max flex-col gap-2">
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!mt-3 !h-3 2xl:!h-4 !w-full !rounded-xs"
            />
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!h-3 2xl:!h-4 !w-full !rounded-xs"
            />
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!h-3 2xl:!h-4 !w-full !rounded-xs"
            />
            <Skeleton
              variant="rectangular"
              animation="pulse"
              sx={{ bgcolor: "#1e1e1e" }}
              className="!h-3 2xl:!h-4 !w-full !rounded-xs"
            />
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
