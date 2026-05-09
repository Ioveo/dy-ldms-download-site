const ENCODER = new TextEncoder();

export async function putExternalR2(account, secretAccessKey, key, body, contentType = "application/octet-stream") {
  const endpoint = endpointFor(account);
  const url = new URL(`/${encodePath(key)}`, endpoint);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const host = url.host;
  const region = account.region || "auto";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${account.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    },
    body
  });

  if (!response.ok) {
    throw new Error(`External R2 upload failed: ${response.status} ${await response.text()}`);
  }

  return { url: url.toString(), key };
}

export function publicUrlFor(account, key) {
  if (!account.publicBaseUrl) return "";
  return `${account.publicBaseUrl.replace(/\/+$/, "")}/${encodePath(key)}`;
}

function endpointFor(account) {
  if (account.endpoint) return account.endpoint.replace(/\/+$/, "");
  return `https://${account.accountId}.r2.cloudflarestorage.com/${account.bucket}`;
}

function encodePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function sha256Hex(value) {
  const data = typeof value === "string" ? ENCODER.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(new Uint8Array(digest));
}

async function hmac(key, value) {
  return crypto.subtle.sign("HMAC", key, typeof value === "string" ? ENCODER.encode(value) : value);
}

async function hmacHex(key, value) {
  return hex(new Uint8Array(await hmac(key, value)));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", typeof secret === "string" ? ENCODER.encode(secret) : secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function getSigningKey(secret, dateStamp, region, service) {
  const kDate = await hmac(await hmacKey(`AWS4${secret}`), dateStamp);
  const kRegion = await hmac(await hmacKey(kDate), region);
  const kService = await hmac(await hmacKey(kRegion), service);
  const kSigning = await hmac(await hmacKey(kService), "aws4_request");
  return hmacKey(kSigning);
}

function hex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
