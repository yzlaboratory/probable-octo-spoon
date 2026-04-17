import { Link } from "react-router-dom";
import Card from "@mui/material/Card";

const images = import.meta.glob<{ default: string }>(
  "/src/assets/*.{jpeg,jpg,png,svg}",
  { eager: true },
);

interface Props {
  title: string;
  tag: string;
  description: string;
  date: string;
  imageUrl: string;
  path: string;
}

export default function Newscard({
  title,
  tag,
  description,
  date,
  imageUrl,
  path,
}: Props) {
  const image = images[imageUrl];

  return (
    <div className="bg-background newscardcontainer flex h-auto w-9/10 shrink-0 px-2 lg:w-1/4">
      <Card
        elevation={0}
        component={Link}
        to={"/news/" + path}
        sx={{
          bgcolor: "transparent",
          borderRadius: 0,
          color: "inherit",
          overflow: "visible",
          textDecoration: "none",
        }}
        className="card after:bg-primary relative flex h-auto w-full shrink-0 flex-col justify-start gap-6 pb-6 text-white before:absolute before:right-0 before:bottom-0 before:z-2 before:h-[2px] before:w-full before:bg-gray-600 before:transition-[width] before:duration-300 before:ease-in-out before:content-[''] after:absolute after:bottom-0 after:left-0 after:z-2 after:h-[2px] after:w-0 after:transition-[width] after:delay-125 after:duration-300 after:ease-[cubic-bezier(0.55,0.085,0.68,0.53)] after:content-[''] hover:cursor-pointer hover:before:w-0 hover:after:w-full"
      >
        <div className="flex aspect-[100/56] w-full overflow-hidden">
          {image && (
            <img
              src={image.default}
              alt="Portrait"
              className="min-w-full object-fill"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex w-full flex-row items-center gap-4">
            <div className="bg-primary h-3 w-10"></div>
            <h3 className="text-sm font-medium text-white 2xl:text-base">
              {date} / {tag}
            </h3>
          </div>

          <h1 className="text-xl font-semibold text-white 2xl:text-3xl">{title}</h1>

          <div className="h-max text-sm font-light overflow-ellipsis text-gray-300 2xl:text-base">
            <p className="inter-primary line-clamp-4 text-wrap">{description}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
