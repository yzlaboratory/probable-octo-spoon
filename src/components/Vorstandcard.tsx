import Card from "@mui/material/Card";

interface Props {
  name: string;
  title: string;
  mail: string;
  phone: string;
  imageSrc: string;
}

export default function Vorstandcard({
  name,
  title,
  mail,
  phone,
  imageSrc,
}: Props) {
  return (
    <div className="vorstandcard bg-background flex w-9/10 shrink-0 px-2 text-white lg:w-1/6">
      <Card
        elevation={0}
        sx={{
          bgcolor: "transparent",
          borderRadius: 0,
          color: "inherit",
          overflow: "visible",
        }}
        className="card after:bg-primary relative flex h-max w-full shrink-0 flex-col gap-8 pb-8 text-white before:absolute before:right-0 before:bottom-0 before:z-2 before:h-[2px] before:w-full before:bg-gray-600 before:transition-[width] before:duration-300 before:ease-in-out before:content-[''] after:absolute after:bottom-0 after:left-0 after:z-2 after:h-[2px] after:w-0 after:transition-[width] after:delay-125 after:duration-300 after:ease-[cubic-bezier(0.55,0.085,0.68,0.53)] after:content-[''] hover:before:w-0 hover:after:w-full"
      >
        <div className="flex aspect-[1/1] w-full overflow-hidden">
          <img src={imageSrc} alt="Portrait" className="min-w-full object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative flex flex-row">
            <div className="flex w-full flex-col">
              <h1 className="text-start font-bold">{name}</h1>
              <h3 className="text-start text-sm">{title}</h3>
            </div>
            <div className="group bg-background hover:border-primary absolute top-0 right-0 z-1 flex w-4 flex-col overflow-hidden text-xs transition-[width] duration-300 ease-in-out hover:w-full hover:border-l-2">
              <div className="flex self-end">
                <span className="relative bottom-[1px] w-max self-center text-end font-extralight">
                  {mail}
                </span>
                <span className="material-symbols-rounded pl-1 text-base!">
                  mail
                </span>
              </div>
              <div className="flex self-end">
                <span className="relative bottom-[1px] w-max self-center text-end font-extralight">
                  {phone}
                </span>
                <span className="material-symbols-rounded pl-1 text-base!">
                  phone
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
