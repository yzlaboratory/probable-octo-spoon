interface Props {
  text: string;
}

export default function Frontpageheader({ text }: Props) {
  return (
    <div className="mb-4 flex w-full justify-start pl-6 md:mb-8 md:justify-center md:pl-0">
      <h1 className="text-2xl font-black text-white italic xl:min-w-6xl xl:text-4xl">
        {text}
      </h1>
    </div>
  );
}
