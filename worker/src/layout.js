// =====================================================================
// layout.js — renderLayout({ title, content, user, currentPath, ... }).
//
// Reproduz o header/footer dos HTMLs estáticos da Jessica para que as
// páginas SSR (vitrine de cursos, login, dashboard) tenham o mesmo
// visual. CSS reaproveitado de /css/style.css (já público). Pequenos
// estilos novos vão num bloco <style> inline aqui — propositalmente NÃO
// editamos o CSS principal do site institucional.
// =====================================================================

import { escapeHtml, escapeAttr } from './utils.js';

const ASSET_BASE = '/'; // tudo na raiz: /css/style.css, /js/main.js

/**
 * @param {object} opts
 * @param {string} opts.title             — title da página (inclui sufixo " - Jessica Costa PSI" se quiser)
 * @param {string} opts.content           — HTML do <main>
 * @param {object|null} [opts.user]       — { nome, email } se logado
 * @param {string} [opts.currentPath]     — para marcar active no menu
 * @param {string} [opts.description]     — meta description
 * @param {string} [opts.canonical]       — URL canonical (default = currentPath)
 * @param {boolean} [opts.noindex]        — robots noindex (default true para áreas privadas)
 * @param {string} [opts.extraHead]       — HTML extra no <head> (schema.org, etc.)
 * @param {string} [opts.bodyClass]       — classe adicional no <body>
 */
export function renderLayout(opts) {
  const {
    title,
    content,
    user = null,
    currentPath = '/',
    description = 'Cursos online da psicóloga infantojuvenil Jessica Costa (CRP 05/56789).',
    canonical,
    noindex = false,
    extraHead = '',
    bodyClass = '',
  } = opts;

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeAttr(description);
  const canonicalUrl = canonical || `https://jessicacostapsi.com${currentPath}`;
  const robotsTag = noindex
    ? '<meta name="robots" content="noindex, nofollow">'
    : '<meta name="robots" content="index, follow">';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${safeDesc}">
  ${robotsTag}
  <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
  <meta name="theme-color" content="#FFD93D">
  <link rel="icon" type="image/svg+xml" href="${ASSET_BASE}favicon.svg">
  <link rel="apple-touch-icon" href="${ASSET_BASE}favicon.svg">
  <link rel="manifest" href="${ASSET_BASE}site.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Jessica Costa PSI">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="https://jessicacostapsi.com/img/og-image.png">
  <title>${safeTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${ASSET_BASE}css/style.css">
  <style>${EXTRA_CSS}</style>
  ${extraHead}
</head>
<body${bodyClass ? ` class="${escapeAttr(bodyClass)}"` : ''}>

  <header class="header" id="header">
    <div class="container">
      <a href="/" class="logo">
        <span class="bee-icon">🐝</span>
        <span>Jessica Costa</span>
      </a>
      ${renderNav(currentPath, user)}
      <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" type="button">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main>
    ${content}
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">
            <span class="bee-icon">🐝</span>
            <span>Jessica Costa</span>
          </div>
          <p style="margin-top:4px; color:var(--primary); font-weight:600; font-size:0.9rem;">Descomplique a infância ✨</p>
          <p style="margin-top:12px;">Psicologia infantil especializada em neurodivergências. TCC, ABA e muito carinho.</p>
        </div>
        <div class="footer-links">
          <h4>Links Rápidos</h4>
          <a href="/">Início</a>
          <a href="/biografia.html">Biografia</a>
          <a href="/blog.html">Blog</a>
          <a href="/cursos">Cursos</a>
          <a href="/#contato">Contato</a>
        </div>
        <div class="footer-contact">
          <h4>Contato</h4>
          <p>📱 (21) 97808-2882</p>
          <p>✉️ psiporjessica@gmail.com</p>
          <p>📍 Vertice Mall - Recreio, RJ</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Jessica Costa PSI. Todos os direitos reservados. | CRP 05/56789</p>
        <p class="footer-legal"><a href="/privacidade.html">Política de Privacidade</a> · <a href="mailto:psiporjessica@gmail.com">Encarregado de Dados (DPO)</a></p>
      </div>
    </div>
  </footer>

  <a href="https://wa.me/5521978082882" target="_blank" rel="noopener noreferrer" class="whatsapp-float" aria-label="WhatsApp">💬</a>
  <button class="back-to-top" id="backToTop" aria-label="Voltar ao topo" type="button">↑</button>

  <script src="${ASSET_BASE}js/main.js"></script>
</body>
</html>`;
}

function renderNav(currentPath, user) {
  const isCursos = currentPath === '/cursos' || currentPath.startsWith('/cursos/');
  const isAluno = currentPath.startsWith('/aluno');
  const cursosClass = (isCursos || isAluno) ? ' class="active"' : '';
  const authBlock = user
    ? `<a href="/aluno"${isAluno ? ' class="active"' : ''}>Minha área</a>
       <form method="POST" action="/logout" class="nav-logout-form"><button type="submit" class="nav-cta nav-logout-btn">Sair</button></form>`
    : `<a href="/login">Entrar</a>
       <a href="/cadastro" class="nav-cta">Criar conta</a>`;
  return `<nav class="nav-menu" id="navMenu">
        <a href="/">Início</a>
        <a href="/biografia.html">Biografia</a>
        <a href="/blog.html">Blog</a>
        <a href="/cursos"${cursosClass}>Cursos</a>
        <a href="/#contato">Contato</a>
        ${authBlock}
      </nav>`;
}

// CSS extra exclusivo das páginas SSR (cursos/aluno/auth). Mantém escopo
// próprio — não conflita com o CSS atual da Jessica.
const EXTRA_CSS = `
  .nav-cta { padding: 6px 14px; border-radius: var(--radius-pill); background: var(--primary); color: var(--white) !important; font-weight: 600; }
  .nav-cta:hover { background: var(--primary-dark); }
  .nav-logout-form { display: inline; margin: 0; padding: 0; }
  .nav-logout-btn { border: none; cursor: pointer; font-family: inherit; font-size: inherit; }
  main { min-height: 60vh; }
  .page-wrap { max-width: 1100px; margin: 0 auto; padding: 100px 20px 60px; }
  .page-wrap--narrow { max-width: 560px; }
  .page-wrap h1 { margin-bottom: 12px; }
  .page-wrap > p.lead { color: var(--text-light); margin-bottom: 32px; }
  .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; margin-top: 32px; }
  .course-card { background: var(--card-bg); border-radius: var(--radius); box-shadow: var(--shadow); padding: 24px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow var(--transition); }
  .course-card:hover { box-shadow: var(--shadow-hover); }
  .course-card h3 { margin: 0; }
  .course-card .price { font-weight: 700; color: var(--primary-dark); font-size: 1.1rem; }
  .course-card .cta { margin-top: auto; }
  .auth-card { background: var(--card-bg); padding: 32px; border-radius: var(--radius); box-shadow: var(--shadow); }
  .auth-card label { display: block; font-weight: 600; margin: 14px 0 6px; }
  .auth-card input { width: 100%; padding: 12px; border: 1px solid #e5d6b2; border-radius: var(--radius-sm); font-family: inherit; font-size: 1rem; }
  .auth-card input:focus { outline: 2px solid var(--primary); }
  .auth-card .alt { margin-top: 20px; font-size: 0.95rem; color: var(--text-light); text-align: center; }
  .auth-card .alt a { color: var(--primary-dark); font-weight: 600; }
  .flash { padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 18px; font-size: 0.95rem; }
  .flash.flash-error { background: #fdecea; color: #b71c1c; border: 1px solid #f5c2bf; }
  .flash.flash-ok { background: #ecf8ec; color: #2e7d32; border: 1px solid #c8e6c9; }
  .progress-bar { background: #f0e6c8; border-radius: 999px; height: 8px; overflow: hidden; }
  .progress-bar > span { display: block; height: 100%; background: var(--primary); transition: width 0.4s; }
  .player-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
  @media (max-width: 900px) { .player-grid { grid-template-columns: 1fr; } }
  .player-iframe-wrap { aspect-ratio: 16 / 9; background: #000; border-radius: var(--radius); overflow: hidden; }
  .player-iframe-wrap iframe, .player-iframe-wrap stream { width: 100%; height: 100%; border: 0; }
  .lesson-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .lesson-list a { display: block; padding: 12px 14px; border-radius: var(--radius-sm); background: #fdf6e0; color: var(--text); font-size: 0.95rem; transition: background var(--transition); }
  .lesson-list a:hover { background: var(--primary-light); }
  .lesson-list a.active { background: var(--primary); color: var(--white); font-weight: 600; }
  .lesson-list a.done::before { content: "✓ "; color: #2e7d32; font-weight: 700; }
  .meta-row { display: flex; gap: 18px; flex-wrap: wrap; color: var(--text-light); font-size: 0.95rem; margin-bottom: 18px; }
  .stream-placeholder { aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; background: #fdf6e0; color: var(--text-light); border-radius: var(--radius); text-align: center; padding: 20px; }
`;
