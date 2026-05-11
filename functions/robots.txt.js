export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response([
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin.html",
    "Disallow: /lvtuang",
    "Disallow: /api/admin/",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }
  });
}
