import { useState, useEffect, useMemo, Fragment } from "react";
import Gallery from "./Gallery";
import Socialcard from "./Socialcard";
import SocialcardFallback from "./SocialcardFallback";
import Sponsorcard from "./Sponsorcard";
import { shuffleSponsors } from "../utilities/sponsors";

interface SocialItem {
  media_url: string;
  caption: string;
  permalink: string;
  timestamp: string;
  media_type: string;
  media_product_type: string;
  children?: { data: Array<{ media_url: string; media_type: string }> };
}

function SmallSponsors({
  animated,
  containerClassName,
}: {
  animated: boolean;
  containerClassName?: string;
}) {
  const sponsors = useMemo(() => shuffleSponsors(), []);
  return (
    <Sponsorcard
      imageUrls={sponsors.map((item) => item.ImageUrl)}
      urls={sponsors.map((item) => item.Link)}
      interval={animated ? 7500 : 5000}
      lgWidthClass="lg:w-1/5"
      animated={animated}
      backgroundClasses={sponsors.map((item) =>
        item.Color != undefined ? item.Color : "",
      )}
      containerClassName={containerClassName}
    />
  );
}

export default function SocialsSection() {
  const [items, setItems] = useState<SocialItem[] | null>(null);

  useEffect(() => {
    fetch("/api/instagram")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  // Auto-scroll IG carousel galleries
  useEffect(() => {
    if (!items) return;
    const timer = setInterval(() => {
      const galleries = document.querySelectorAll(".ig_gallery");
      galleries.forEach((gallery) => {
        const maxScroll = gallery.scrollWidth - gallery.clientWidth;
        if (gallery.scrollLeft + gallery.clientWidth * 0.51 > maxScroll) {
          gallery.scrollLeft = 0;
        } else {
          gallery.scrollLeft += gallery.clientWidth * 0.51;
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [items]);

  return (
    <Gallery
      headerTitle="SOCIALS"
      childrenClassName="socialcard"
      classPrefix="socials"
      numberOfItemsInViewport={5}
    >
      {items === null || items.length === 0 ? (
        <SocialcardFallback
          sponsorCard={<SmallSponsors animated={false} />}
        />
      ) : (
        items.map((item, index) => {
          const card = (
            <Socialcard
              imageUrl={item.media_url}
              caption={item.caption}
              permalink={item.permalink}
              timestamp={item.timestamp}
              type={item.media_type}
              productType={item.media_product_type}
              children={item.children}
            />
          );
          const cardKey = item.permalink || `social-${index}`;
          if (index === 0) {
            return (
              <Fragment key={`mobile-social-sponsor-${cardKey}`}>
                {card}
                <SmallSponsors animated containerClassName="lg:hidden" />
              </Fragment>
            );
          }
          if (index === 4) {
            return (
              <Fragment key={`social-sponsor-${cardKey}`}>
                <SmallSponsors animated containerClassName="hidden lg:block" />
                {card}
              </Fragment>
            );
          }
          return <Fragment key={cardKey}>{card}</Fragment>;
        })
      )}
    </Gallery>
  );
}
