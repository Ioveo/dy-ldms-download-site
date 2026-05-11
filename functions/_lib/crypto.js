const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export async function encryptSecret(env, value) {
  if (!value) return "";
  const key = await encryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, TEXT_ENCODER.encode(value));
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(env, encrypted) {
  if (!encrypted) return "";
  const [version, ivPart, dataPart] = String(encrypted).split(".");
  if (version !== "v1" || !ivPart || !dataPart) throw new Error("Invalid encrypted secret");
  const key = await encryptionKey(env);
  const iv = fromBase64Url(ivPart);
  const data = fromBase64Url(dataPart);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return TEXT_DECODER.decode(decrypted);
}

async function encryptionKey(env) {
  const secret = env.STORAGE_SECRET;
  if (!secret) throw new Error("STORAGE_SECRET is required for storage credential encryption");
  const digest = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
