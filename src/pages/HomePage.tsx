import Footer from "../components/Footer";
import LeagueStandingsSection from "../components/LeagueStandingsSection";
import NewsSection from "../components/NewsSection";
import NextFixturesSection from "../components/NextFixturesSection";
import SocialsSection from "../components/SocialsSection";
import TrainingSection from "../components/TrainingSection";
import VorstandSection from "../components/VorstandSection";
import { usePublicNews } from "../utilities/publicData";

export default function HomePage() {
  const news = usePublicNews();
  const newsItems = (news ?? []).map((item) => ({
    path: item.path,
    title: item.title,
    tag: item.tag,
    short: item.short,
    date: new Date(item.date).toLocaleDateString(),
    imageurl: item.imageurl,
  }));

  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-30 flex w-full flex-col gap-30">
        <NewsSection newsItems={newsItems} />
        <NextFixturesSection />
        <LeagueStandingsSection />
        <TrainingSection />
        <SocialsSection />
        <VorstandSection />
        <Footer />
      </div>
    </div>
  );
}
