import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient();
const SECRET_ID = process.env.SECRET_ID;

export async function handler() {
  // 1. Read current token from Secrets Manager
  const { SecretString: currentToken } = await sm.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID }),
  );

  if (!currentToken) {
    throw new Error("No token found in Secrets Manager");
  }

  // 2. Refresh via Instagram API
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    const msg = `Token refresh failed: ${JSON.stringify(data)}`;
    console.error(msg);
    throw new Error(msg);
  }

  // 3. Store new token in Secrets Manager
  await sm.send(
    new PutSecretValueCommand({
      SecretId: SECRET_ID,
      SecretString: data.access_token,
    }),
  );

  const expiresInDays = Math.round(data.expires_in / 86400);
  console.log(`Token refreshed successfully. Expires in ${expiresInDays} days.`);

  return { statusCode: 200, body: `Token refreshed. Expires in ${expiresInDays} days.` };
}
