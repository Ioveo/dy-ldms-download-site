export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  url.pathname = "/admin.html";
  return env.ASSETS.fetch(new Request(url, request));
}
