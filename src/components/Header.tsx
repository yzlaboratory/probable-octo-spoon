import logo from "../assets/logo.svg";
import iglogo from "../assets/instagramwhite.svg";

export default function Header() {
  return (
    <div className="relative z-20 flex w-full flex-row justify-evenly border-0 border-t-4 border-solid border-t-primary bg-black p-3 text-white">
      <span className="material-symbols-rounded absolute left-6 hidden! self-center text-4xl! text-white hover:cursor-not-allowed hover:opacity-50 xl:flex!">
        menu
      </span>
      <div className="flex h-full w-full max-w-6xl justify-between">
        <div className="flex h-full items-center justify-center gap-2 md:gap-0">
          <span className="material-symbols-rounded left-6 flex hidden! self-center text-4xl! text-white hover:cursor-not-allowed hover:opacity-50 xl:hidden!">
            menu
          </span>
          <img
            className="mr-0 h-10 w-10 md:mr-2 md:h-14 md:w-14 lg:mr-4"
            width="38"
            height="38"
            src={logo}
            alt="Club Logo."
          />
          <div className="flex h-full flex-col justify-center text-sm md:flex md:text-base">
            <div className="mb-[-3px] font-black">SVALEMANNIA</div>
            <div className="mt-[-3px] font-black">THALEXWEILER</div>
          </div>
        </div>
        <div className="flex h-full w-max flex-row items-center justify-between gap-2 md:gap-6">
          <button className="border-primary hidden border-2 border-solid px-4 py-2 text-xs hover:cursor-not-allowed hover:opacity-50 md:text-base lg:flex">
            LOGIN
          </button>
          <span className="material-symbols-rounded hidden! h-max text-xl! text-white hover:cursor-not-allowed hover:opacity-50 lg:flex!">
            shopping_cart
          </span>
          <span className="material-symbols-rounded hidden! h-max text-xl! text-white hover:cursor-not-allowed hover:opacity-50 lg:flex!">
            search
          </span>
          <a
            className="h-max"
            href="https://www.instagram.com/sgthalexweileraschbach/"
          >
            <img src={iglogo} alt="" className="w-8 lg:w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
