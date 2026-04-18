import Gallery from "./Gallery";
import Vorstandcard from "./Vorstandcard";
import { usePublicVorstand } from "../utilities/publicData";

export default function VorstandSection() {
  const members = usePublicVorstand() ?? [];
  return (
    <Gallery
      headerTitle="VORSTAND"
      childrenClassName="vorstandcard"
      classPrefix="vorstand"
      numberOfItemsInViewport={6}
    >
      {members.map((member) => (
        <Vorstandcard
          key={`${member.name}-${member.title}`}
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
