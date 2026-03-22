const TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = "17841429201354204";
const FIELDS =
  "caption,comments_count,id,like_count,media_url,permalink,thumbnail_url,timestamp,username,media_type,media_product_type,children{media_url,media_type}";

export async function handler() {
  if (!TOKEN || TOKEN === "placeholder") {
    return { statusCode: 200, body: "[]", headers: { "Content-Type": "application/json" } };
  }

  try {
    const listRes = await fetch(
      `https://graph.instagram.com/v22.0/${USER_ID}/media?access_token=${TOKEN}`,
    );
    const listData = await listRes.json();

    if (!listData.data || !listData.data.length) {
      return { statusCode: 200, body: "[]", headers: { "Content-Type": "application/json" } };
    }

    const details = await Promise.all(
      listData.data.map(async (item) => {
        const res = await fetch(
          `https://graph.instagram.com/v22.0/${item.id}?fields=${FIELDS}&access_token=${TOKEN}`,
        );
        if (res.ok) return res.json();
        return null;
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify(details.filter(Boolean)),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("Instagram API error:", err);
    return { statusCode: 200, body: "[]", headers: { "Content-Type": "application/json" } };
  }
}
