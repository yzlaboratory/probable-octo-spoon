import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4321;

app.use(express.static(path.join(__dirname, "dist")));

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

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
