import { useParams } from "react-router-dom";
import Footer from "../components/Footer";
import NewsDetail from "../components/NewsDetail";
import rawNews from "../data/news.json";

const images: Record<string, { default: string }> = import.meta.glob(
  "/src/assets/*.{jpeg,jpg,png,svg}",
  { eager: true },
);

export default function NewsDetailPage() {
  const { path } = useParams<{ path: string }>();
  const data = rawNews.find((item) => item.path === path);

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-white">
        <p>Artikel nicht gefunden</p>
      </div>
    );
  }

  const imageUrl = images[data.imageurl]?.default || "";

  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="flex w-full flex-col">
        <NewsDetail
          title={data.title}
          date={new Date(data.date).toLocaleDateString()}
          tag={data.tag}
          imageUrl={imageUrl}
          long={data.long}
        />
        <Footer />
      </div>
    </div>
  );
}
