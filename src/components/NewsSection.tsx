import { Fragment } from "react";
import Gallery from "./Gallery";
import Newscard from "./Newscard";
import Sponsorcard from "./Sponsorcard";

import schmittfood from "../assets/schmittfood.jpg";
import hjm from "../assets/logos/hjm.png";
import metallbauwalter from "../assets/metallbauwalter.jpg";
import lsheizung from "../assets/logos/ls.png";
import kempf from "../assets/logos/kempf.png";
import obbo from "../assets/obbo.svg";
import zs from "../assets/logos/zimmerundschu.png";
import tankstellezimmer from "../assets/logos/tankstellezimmer.png";

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

const sponsorImages = [
  schmittfood,
  hjm,
  metallbauwalter,
  lsheizung,
  kempf,
  obbo,
  zs,
  tankstellezimmer,
];

const sponsorUrls = [
  "https://www.schmitt-food.net/",
  "https://www.sachverstaendiger-mueller.de/index.html",
  "https://www.metallbau-walter.info/",
  "https://www.ls-heizung.de/",
  "https://kempf-gmbh.com/",
  "https://www.obbo.de/",
  "https://www.zsmobile.de/",
  "https://www.zsmobile.de/",
];

export default function NewsSection({ newsItems }: Props) {
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
                imageUrls={sponsorImages}
                urls={sponsorUrls}
                interval={15000}
                lgWidthClass="lg:w-1/4"
                animated
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
