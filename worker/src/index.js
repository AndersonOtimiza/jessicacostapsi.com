// =====================================================================
// index.js — entrypoint do Worker.
//
// Estratégia de roteamento:
//   1) Rotas dinâmicas do sistema de cursos respondem aqui (SSR/JSON).
//   2) Qualquer outra rota → passthrough para env.ASSETS (Pages assets)
//      + HTMLRewriter para injetar link "Cursos" e bloco de auth no nav
//      dos HTMLs estáticos.
//
// Layout matchers usam padrão simples (startsWith / regex) — sem router
// externo; nada de framework. Fácil de auditar.
// =====================================================================

import { loadUserFromRequest } from './auth.js';
import {
  renderCoursesIndex,
  renderCourseDetail,
  handleBuyRedirect,
} from './courses.js';
import {
  renderSignupPage,
  handleSignupSubmit,
  renderLoginPage,
  handleLoginSubmit,
  handleLogout,
  renderForgotPage,
  handleForgotSubmit,
  renderResetPage,
  handleResetSubmit,
} from './auth_pages.js';
import {
  renderStudentDashboard,
  renderPlayerPage,
  handleProgressUpdate,
} from './student.js';
import { renderCertificatePage } from './certificate.js';
import { handleOtimizaPaymentWebhook } from './webhook.js';
import { rewriteNav } from './rewriter.js';
import { jsonResponse, redirect, log } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      log('worker', 'error', 'unhandled', { err: String(err && err.stack || err) });
      return new Response('Erro interno', { status: 500 });
    }
  },
};

// Paths nunca servíveis publicamente, mesmo que o .assetsignore falhe.
// Defense in depth: bloqueio explícito antes de tocar em env.ASSETS.
const SENSITIVE_PREFIXES = [
  '/worker/', '/.git/', '/.github/', '/.claude/', '/.wrangler/',
  '/node_modules/', '/scripts/', '/migrations/',
];
const SENSITIVE_EXACT = new Set([
  '/.gitignore', '/.assetsignore', '/.editorconfig',
  '/.prettierrc', '/.prettierignore', '/.dev.vars',
  '/CLAUDE.md', '/README.md', '/metodologia.md',
  '/_headers', '/_redirects',
]);

function isSensitivePath(path) {
  if (SENSITIVE_EXACT.has(path)) return true;
  for (const p of SENSITIVE_PREFIXES) if (path.startsWith(p)) return true;
  return false;
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ---------- Bloqueio defensivo de paths sensíveis ------------------
  if (isSensitivePath(path)) {
    return new Response('Not found', { status: 404 });
  }

  // ---------- Webhooks (não precisam de sessão) ----------------------
  if (path === '/api/webhook/otimiza-payment' && method === 'POST') {
    return handleOtimizaPaymentWebhook(env, request);
  }

  // ---------- Healthcheck (útil em monitoring) -----------------------
  if (path === '/api/health' && method === 'GET') {
    return jsonResponse({ ok: true, ts: new Date().toISOString() });
  }

  // ---------- Identifica usuário (para nav + autorização) ------------
  const auth = await loadUserFromRequest(env, request);
  const user = auth ? auth.user : null;
  const session = auth ? auth.session : null;

  // ---------- Páginas públicas SSR -----------------------------------
  // Vitrine
  if (path === '/cursos' && method === 'GET') {
    return renderCoursesIndex(env, request, user);
  }
  // /cursos/:slug/comprar  — aceita POST (form do detalhe) ou GET (link direto)
  const buyMatch = path.match(/^\/cursos\/([^/]+)\/comprar$/);
  if (buyMatch && (method === 'POST' || method === 'GET')) {
    return handleBuyRedirect(env, request, user, decodeURIComponent(buyMatch[1]));
  }
  // /cursos/:slug
  const detailMatch = path.match(/^\/cursos\/([^/]+)$/);
  if (detailMatch && method === 'GET') {
    return renderCourseDetail(env, request, user, decodeURIComponent(detailMatch[1]));
  }

  // ---------- Auth ---------------------------------------------------
  if (path === '/cadastro') {
    return method === 'POST' ? handleSignupSubmit(env, request) : renderSignupPage(env, request);
  }
  if (path === '/login') {
    if (user) return redirect('/aluno', 302);
    return method === 'POST' ? handleLoginSubmit(env, request) : renderLoginPage(env, request);
  }
  if (path === '/logout') {
    if (method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { 'Allow': 'POST' } });
    return handleLogout(env, request, session);
  }
  if (path === '/senha/esqueci') {
    return method === 'POST' ? handleForgotSubmit(env, request) : renderForgotPage(env, request);
  }
  if (path === '/senha/resetar') {
    return method === 'POST' ? handleResetSubmit(env, request) : renderResetPage(env, request);
  }

  // ---------- Área do aluno (exige login) ----------------------------
  if (path === '/aluno' || path.startsWith('/aluno/')) {
    if (!user) {
      const next = encodeURIComponent(path + url.search);
      return redirect(`/login?next=${next}`, 302);
    }
    if (path === '/aluno' && method === 'GET') {
      return renderStudentDashboard(env, request, user);
    }
    const playerMatch = path.match(/^\/aluno\/curso\/([^/]+)$/);
    if (playerMatch && method === 'GET') {
      const aulaId = url.searchParams.get('aula') || null;
      return renderPlayerPage(env, request, user, decodeURIComponent(playerMatch[1]), aulaId);
    }
  }

  // ---------- API progresso ------------------------------------------
  const progMatch = path.match(/^\/api\/lessons\/([^/]+)\/progress$/);
  if (progMatch && method === 'POST') {
    if (!user) return jsonResponse({ error: 'auth-required' }, { status: 401 });
    return handleProgressUpdate(env, request, user, decodeURIComponent(progMatch[1]));
  }

  // ---------- Certificado público ------------------------------------
  const certMatch = path.match(/^\/certificado\/([A-Za-z0-9_-]{6,})$/);
  if (certMatch && method === 'GET') {
    return renderCertificatePage(env, certMatch[1]);
  }

  // ---------- Fallback: passthrough Pages (com rewriter de nav) ------
  // Para o Worker conseguir delegar para o asset binding, basta repassar
  // a request. Aplicamos HTMLRewriter na resposta para injetar Cursos no
  // <nav>. Assets non-HTML passam intactos.
  const assetRes = await env.ASSETS.fetch(request);
  return rewriteNav(assetRes, user);
}
