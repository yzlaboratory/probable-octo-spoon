import { Fragment, useMemo } from "react";
import Gallery from "./Gallery";
import Newscard from "./Newscard";
import Sponsorcard from "./Sponsorcard";
import { shuffleTopSponsors } from "../utilities/sponsors";

interface NewsItem {
  path: string;
  title: string;
  tag: string;
  short: string;
  date: string;
  imageurl: string;
}

interface Props {
  newsItems: NewsItem[];
}

export default function NewsSection({ newsItems }: Props) {
  const sponsors = useMemo(() => shuffleTopSponsors(8), []);
  return (
    <Gallery
      childrenClassName="newscardcontainer"
      headerTitle="ALEMANNIA NEWS"
      classPrefix="news"
      numberOfItemsInViewport={4}
    >
      {newsItems.map((item, index) => {
        if (index === 3) {
          return (
            <Fragment key={`sponsor-${index}`}>
              <Sponsorcard
                imageUrls={sponsors.map((s) => s.ImageUrl)}
                urls={sponsors.map((s) => s.Link)}
                interval={15000}
                lgWidthClass="lg:w-1/4"
                animated
                backgroundClasses={sponsors.map((s) =>
                  s.Color != undefined ? s.Color : "",
                )}
              />
              <Newscard
                title={item.title}
                tag={item.tag}
                description={item.short}
                date={item.date}
                imageUrl={item.imageurl}
                path={item.path}
              />
            </Fragment>
          );
        }
        return (
          <Newscard
            key={item.path}
            title={item.title}
            tag={item.tag}
            description={item.short}
            date={item.date}
            imageUrl={item.imageurl}
            path={item.path}
          />
        );
      })}
    </Gallery>
  );
}
