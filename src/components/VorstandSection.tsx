import Gallery from "./Gallery";
import Vorstandcard from "./Vorstandcard";
import logo from "../assets/logo.svg";
import matzeheinrich from "../assets/matzeheinrich.png";
import zoehler from "../assets/zoehler.png";
import hurthi from "../assets/hurthi.png";
import holgersaar from "../assets/holgersaar.png";
import nicolas from "../assets/nicolas.png";

const boardMembers = [
  {
    name: "Bj\u00f6rn Perius",
    title: "Pr\u00e4sident",
    mail: "b.perius@gmx.de",
    phone: "0177 3448 469",
    imageSrc: logo,
  },
  {
    name: "Christian Schwirz",
    title: "Pr\u00e4sident",
    mail: "christian.schwirz@evs.de",
    phone: "0178 8094 579",
    imageSrc: logo,
  },
  {
    name: "Matthias Heinrich",
    title: "Gesch\u00e4ftsf\u00fchrer",
    mail: "matze234@t-online.de",
    phone: "0151 1560 7391",
    imageSrc: matzeheinrich,
  },
  {
    name: "Yannik Zeyer",
    title: "Schatzmeister",
    mail: "finanzen@svthalexweiler.de",
    phone: "0151 2222 8048",
    imageSrc: logo,
  },
  {
    name: "Benno Bohliner",
    title: "Haushaltsausschuss",
    mail: "bohlinger-bauideen@t-online.de",
    phone: "0177 6559 401",
    imageSrc: logo,
  },
  {
    name: "Mathias Z\u00f6hler",
    title: "Spielausschuss",
    mail: "mathiaszoehler@aol.com",
    phone: "0163 4337 073",
    imageSrc: zoehler,
  },
  {
    name: "Pascal Herre",
    title: "Jugendausschuss",
    mail: "pascal.herre86@gmail.com",
    phone: "0179 5087 849",
    imageSrc: logo,
  },
  {
    name: "Dennis Hurth",
    title: "Festausschuss",
    mail: "de-hurth@t-online.de",
    phone: "0151 5258 5535",
    imageSrc: hurthi,
  },
  {
    name: "Markus Leinenbach",
    title: "Bau- & Betriebsausschuss",
    mail: "markusleinenbach@gmx.de",
    phone: "0151 6511 9495",
    imageSrc: logo,
  },
  {
    name: "Holger Saar",
    title: "Vorsitzender AH Abteilung",
    mail: "Holger.Saar@web.de",
    phone: "0152 2661 7025",
    imageSrc: holgersaar,
  },
  {
    name: "Nicolas Heinrich",
    title: "Spielausschuss",
    mail: "nicolas.heinrich@gmx.de",
    phone: "0170 9624 109",
    imageSrc: nicolas,
  },
  {
    name: "Andre Seewald",
    title: "AH Abteilung",
    mail: "andreseewald@gmx.de",
    phone: "0171 3635 521",
    imageSrc: logo,
  },
];

export default function VorstandSection() {
  return (
    <Gallery
      headerTitle="VORSTAND"
      childrenClassName="vorstandcard"
      classPrefix="vorstand"
      numberOfItemsInViewport={6}
    >
      {boardMembers.map((member) => (
        <Vorstandcard
          key={member.mail}
          name={member.name}
          title={member.title}
          mail={member.mail}
          phone={member.phone}
          imageSrc={member.imageSrc}
        />
      ))}
    </Gallery>
  );
}
