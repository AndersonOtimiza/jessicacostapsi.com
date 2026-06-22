// Bloqueia o serving público de QUALQUER arquivo .md (docs internos como
// CLAUDE.md, README.md, COMPLIANCE-*, metodologia.md, KEYWORDS-* ficam na pasta
// e o `wrangler pages deploy .` os publica — o _redirects NÃO bloqueia porque o
// CF Pages serve o asset estático antes do redirect. Pages Functions middleware
// roda ANTES dos assets, então aqui o bloqueio funciona de fato).
//
// Tudo que não for .md segue o fluxo normal (assets estáticos + /api/*).
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname.toLowerCase().endsWith(".md")) {
    return new Response("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return context.next();
}
