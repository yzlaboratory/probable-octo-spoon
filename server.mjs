import express from "express";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { handler as fupaHandler } from "./infrastructure/lambda/fupa.mjs";
import { openDb, dbPath, mediaRoot } from "./server/db.mjs";
import { sweepExpiredSessions } from "./server/auth.mjs";
import { helmetMiddleware, sessionMiddleware } from "./server/middleware.mjs";
import authRoutes from "./server/routes/auth.mjs";
import mediaRoutes from "./server/routes/media.mjs";
import newsRoutes, { runPublishTick } from "./server/routes/news.mjs";
import sponsorRoutes from "./server/routes/sponsors.mjs";
import vorstandRoutes from "./server/routes/vorstand.mjs";
import trainingRoutes from "./server/routes/training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4321;

fs.mkdirSync(path.dirname(dbPath()), { recursive: true });
fs.mkdirSync(mediaRoot(), { recursive: true });
const db = openDb(dbPath());

app.set("trust proxy", 1);
app.use(helmetMiddleware());
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
app.use(sessionMiddleware(db));

app.use(
  "/media",
  express.static(mediaRoot(), { fallthrough: true, maxAge: "1y", immutable: true }),
);

app.use("/api/auth", authRoutes(db));
app.use("/api/media", mediaRoutes(db));
app.use("/api/news", newsRoutes(db));
app.use("/api/sponsors", sponsorRoutes(db));
app.use("/api/vorstand", vorstandRoutes(db));
app.use("/api/training", trainingRoutes(db));

async function callFupa(req, res) {
  try {
    const result = await fupaHandler({ rawPath: req.path });
    res.status(result.statusCode).set(result.headers || {}).send(result.body);
  } catch (err) {
    console.error("FuPa proxy error:", err);
    res.status(200).json({ fetchedAt: null });
  }
}

app.get("/api/fupa/standings", callFupa);
app.get("/api/fupa/fixtures", callFupa);

app.get("/api/instagram", async (_req, res) => {
  try {
    const token = process.env.IG_ACCESS_TOKEN;
    if (!token || token === "placeholder") {
      return res.json([]);
    }

    const userId = "17841429201354204";
    const listUrl = `https://graph.instagram.com/v22.0/${userId}/media?access_token=${token}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!listData.data || !listData.data.length) {
      return res.json([]);
    }

    const fields =
      "caption,comments_count,id,like_count,media_url,permalink,thumbnail_url,timestamp,username,media_type,media_product_type,children{media_url,media_type}";

    const details = await Promise.all(
      listData.data.map(async (item) => {
        const detailUrl = `https://graph.instagram.com/v22.0/${item.id}?fields=${fields}&access_token=${token}`;
        const detailRes = await fetch(detailUrl);
        return detailRes.json();
      }),
    );

    return res.json(details);
  } catch (error) {
    console.error("Instagram API error:", error);
    return res.json([]);
  }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("/{*splat}", (_req, res) => {
  res.type("html").send(fs.readFileSync(path.join(__dirname, "dist", "index.html")));
});

setInterval(() => {
  try {
    runPublishTick(db);
  } catch (e) {
    console.error("publish tick:", e);
  }
  try {
    sweepExpiredSessions(db);
  } catch (e) {
    console.error("session sweep:", e);
  }
}, 60_000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
