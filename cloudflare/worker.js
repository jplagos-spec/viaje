// Worker de Cloudflare: muestra en jplakes.com/viaje la página publicada
// en GitHub Pages. Ruta del Worker: jplakes.com/viaje*
const ORIGEN = "https://jplagos-spec.github.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/viaje") {
      return Response.redirect(url.origin + "/viaje/" + url.search, 301);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método no permitido", { status: 405 });
    }
    return fetch(ORIGEN + url.pathname + url.search, {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "*/*" },
      redirect: "follow"
    });
  }
};
