import Card from "@mui/material/Card";
import iglogo from "../assets/instagramwhite.svg";

interface Props {
  imageUrl: string;
  caption: string;
  timestamp: string;
  permalink: string;
  type: string;
  productType: string;
  children?: { data: Array<{ media_url: string; media_type: string }> };
}

export default function Socialcard({
  imageUrl,
  caption,
  timestamp,
  permalink,
  type,
  children,
}: Props) {
  return (
    <div className="socialcard flex h-auto w-9/10 shrink-0 bg-transparent px-2 lg:w-1/5">
      <Card
        elevation={0}
        sx={{
          bgcolor: "transparent",
          borderRadius: 0,
          color: "inherit",
          overflow: "visible",
        }}
        className="card after:bg-primary relative flex h-auto w-full shrink-0 flex-col justify-start gap-6 pb-6 text-white before:absolute before:right-0 before:bottom-0 before:z-2 before:h-[2px] before:w-full before:bg-gray-600 before:transition-[width] before:duration-300 before:ease-in-out before:content-[''] after:absolute after:bottom-0 after:left-0 after:z-2 after:h-[2px] after:w-0 after:transition-[width] after:delay-125 after:duration-300 after:ease-[cubic-bezier(0.55,0.085,0.68,0.53)] after:content-[''] hover:before:w-0 hover:after:w-full"
      >
        <div className="flex aspect-[100/56] w-full overflow-hidden">
          {type === "IMAGE" ? (
            <img
              src={imageUrl}
              alt="Portrait"
              className="min-w-full object-cover"
            />
          ) : type === "VIDEO" ? (
            <video className="min-w-full object-cover" muted autoPlay>
              <source src={imageUrl} />
            </video>
          ) : type === "CAROUSEL_ALBUM" && children ? (
            <div className="ig_gallery hidescrollbar flex snap-x snap-mandatory flex-row overflow-auto scroll-smooth">
              {children.data.map((item, idx) =>
                item.media_type === "IMAGE" ? (
                  <img
                    key={idx}
                    src={item.media_url}
                    alt="Portrait"
                    className="min-w-full snap-start object-cover"
                  />
                ) : item.media_type === "VIDEO" ? (
                  <video
                    key={idx}
                    className="min-w-full snap-start object-cover"
                    muted
                    autoPlay
                  >
                    <source src={item.media_url} />
                  </video>
                ) : (
                  <div key={idx} />
                ),
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-row items-center gap-4">
            <div className="bg-primary h-3 w-10"></div>
            <h3 className="text-sm font-medium text-white 2xl:text-base">
              {new Date(timestamp).toLocaleDateString()} / SOCIAL
            </h3>
            <a className="h-max py-1 text-white" href={permalink}>
              <img src={iglogo} alt="" className="w-4" />
            </a>
          </div>
          <div className="h-max text-sm font-light overflow-ellipsis text-gray-300 2xl:text-base">
            <p className="inter-primary line-clamp-4 text-wrap">{caption}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
