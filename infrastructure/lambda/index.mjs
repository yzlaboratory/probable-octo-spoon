import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient();
const SECRET_ID = process.env.SECRET_ID;
const USER_ID = "17841429201354204";
const FIELDS =
  "caption,comments_count,id,like_count,media_url,permalink,thumbnail_url,timestamp,username,media_type,media_product_type,children{media_url,media_type}";

// Cache token in memory across warm invocations (5 min TTL)
let cachedToken = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getToken() {
  if (cachedToken && Date.now() - cacheTime < CACHE_TTL) {
    return cachedToken;
  }
  const { SecretString } = await sm.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID }),
  );
  cachedToken = SecretString;
  cacheTime = Date.now();
  return cachedToken;
}

export async function handler() {
  try {
    const token = await getToken();
    if (!token || token === "placeholder") {
      return { statusCode: 200, body: "[]", headers: { "Content-Type": "application/json" } };
    }

    const listRes = await fetch(
      `https://graph.instagram.com/v22.0/${USER_ID}/media?access_token=${token}`,
    );
    const listData = await listRes.json();

    if (!listData.data || !listData.data.length) {
      return { statusCode: 200, body: "[]", headers: { "Content-Type": "application/json" } };
    }

    const details = await Promise.all(
      listData.data.map(async (item) => {
        const res = await fetch(
          `https://graph.instagram.com/v22.0/${item.id}?fields=${FIELDS}&access_token=${token}`,
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
