interface Props {
  title: string;
  date: string;
  tag: string;
  imageUrl: string;
  long: string;
}

export default function NewsDetail({
  title,
  date,
  tag,
  imageUrl,
  long,
}: Props) {
  return (
    <div className="m-8 flex flex-col gap-4 text-white lg:m-16 lg:mt-32 lg:gap-16">
      <div>
        <h1 className="text-3xl font-black sm:text-7xl">
          {title.toUpperCase()}
        </h1>
        <div className="flex w-full flex-row items-center gap-4">
          <div className="bg-primary h-3 w-10"></div>
          <h3 className="text-md font-medium text-white">
            {date} / {tag}
          </h3>
        </div>
      </div>
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:gap-0">
        <img
          src={imageUrl}
          alt="Portrait"
          className="max-w-full min-w-full object-contain lg:max-w-2/3 lg:min-w-2/3 lg:pr-8"
        />
        <div className="flex max-w-full min-w-full items-center justify-center text-sm font-light text-balance text-white lg:max-w-1/3 lg:min-w-1/3 lg:pl-8 lg:text-xl">
          {long}
        </div>
      </div>
    </div>
  );
}
