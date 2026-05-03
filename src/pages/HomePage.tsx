import HomeFixturesStrip from "../components/HomeFixturesStrip";
import HomeHero from "../components/HomeHero";
import HomeNewsGrid from "../components/HomeNewsGrid";
import HomeSponsorRibbon from "../components/HomeSponsorRibbon";
import { usePublicNews } from "../utilities/publicData";

export default function HomePage() {
  const news = usePublicNews();
  const items = news ?? [];
  const [hero, ...rest] = items;
  const grid = rest.slice(0, 6);

  return (
    <div>
      {hero ? (
        <HomeHero
          tag={hero.tag}
          title={hero.title}
          short={hero.short}
          date={new Date(hero.date).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
          })}
          imageUrl={hero.imageurl}
          path={hero.path}
        />
      ) : (
        <section
          style={{
            padding: "80px 24px",
            borderBottom: "1px solid var(--p-rule)",
          }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(40px, 6vw, 62px)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              SV Alemannia{" "}
              <span style={{ fontStyle: "italic" }}>Thalexweiler</span>
            </h1>
            <p
              className="font-serif"
              style={{
                marginTop: 16,
                fontSize: 17,
                color: "var(--p-ink-2)",
                maxWidth: 540,
              }}
            >
              Sportverein im Saarland, gegründet 1947. Hier erfahren Sie alles
              rund um Spielplan, Mannschaften und Vereinsleben.
            </p>
          </div>
        </section>
      )}

      <HomeNewsGrid items={grid} />
      <HomeFixturesStrip />
      <HomeSponsorRibbon />
    </div>
  );
}
