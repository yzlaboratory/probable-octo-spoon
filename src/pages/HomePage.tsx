import Footer from "../components/Footer";
import NewsSection from "../components/NewsSection";
import SocialsSection from "../components/SocialsSection";
import VorstandSection from "../components/VorstandSection";
import rawNews from "../data/news.json";

interface NewsItem {
  path: string;
  title: string;
  tag: string;
  short: string;
  date: string;
  imageurl: string;
}

export default function HomePage() {
  const newsItems: NewsItem[] = [...rawNews]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((item) => ({
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
        <SocialsSection />
        <VorstandSection />
        <Footer />
      </div>
    </div>
  );
}
