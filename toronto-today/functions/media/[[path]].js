// Cloudflare Pages Function: GET/HEAD /media/*
//
// Serves the Toronto Today media cache from the R2 bucket bound to this
// Pages project as MEDIA. Object keys mirror the path under /media/:
//   /media/b5f05b18ddfeec22.png  -> key "b5f05b18ddfeec22.png"
//   /media/icons/day-113.png     -> key "icons/day-113.png"
// Media filenames are content hashes, so responses carry immutable cache
// headers, matching the old server.mjs behaviour. Missing objects return a
// real 404, never the SPA shell, so a broken image is visible as broken.
export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const parts = Array.isArray(params.path) ? params.path : [params.path];
  const key = parts.join("/");
  if (!key || key.includes("..")) {
    return new Response("Not Found", { status: 404 });
  }
  const object = await env.MEDIA.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
