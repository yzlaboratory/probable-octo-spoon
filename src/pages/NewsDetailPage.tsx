import { useParams } from "react-router-dom";
import Footer from "../components/Footer";
import NewsDetail from "../components/NewsDetail";
import { usePublicNewsBySlug } from "../utilities/publicData";

export default function NewsDetailPage() {
  const { path } = useParams<{ path: string }>();
  const data = usePublicNewsBySlug(path);

  if (data === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-white">
        <p>Lade…</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-white">
        <p>Artikel nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="flex w-full flex-col">
        <NewsDetail
          title={data.title}
          date={new Date(data.date).toLocaleDateString()}
          tag={data.tag}
          imageUrl={data.imageurl}
          longHtml={data.longHtml}
        />
        <Footer />
      </div>
    </div>
  );
}
