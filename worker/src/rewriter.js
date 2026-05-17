// =====================================================================
// rewriter.js — injeta o link "Cursos" no <nav class="nav-menu"> dos
// HTMLs estáticos (servidos via env.ASSETS), antes do link "Contato",
// para que toda navegação do site institucional ganhe o novo módulo
// SEM que precisemos editar 24 arquivos HTML à mão.
//
// Estratégia: HTMLRewriter intercepta o último <a> dentro de .nav-menu
// e injeta um sibling antes dele com `before(html, { html: true })`.
// A âncora "Cursos" só é injetada uma vez por response (controle via
// state local).
// =====================================================================

const CURSOS_LINK_HTML = `<a href="/cursos">Cursos</a>`;

/** Atualiza o user-block do menu para refletir login/logout. */
function authLinksHtml(user) {
  const ctaStyle = 'padding:6px 14px;border-radius:50px;background:var(--primary);color:#fff;font-weight:600;border:none;cursor:pointer;font-family:inherit;font-size:inherit;';
  if (user) {
    return `<a href="/aluno">Minha área</a><form method="POST" action="/logout" style="display:inline;margin:0;padding:0;"><button type="submit" style="${ctaStyle}">Sair</button></form>`;
  }
  return `<a href="/login">Entrar</a><a href="/cadastro" class="nav-cta" style="${ctaStyle.replace('border:none;cursor:pointer;font-family:inherit;font-size:inherit;', '')}">Criar conta</a>`;
}

/**
 * Embrulha a resposta dos assets para injetar Cursos + bloco de auth.
 *
 * @param {Response} response — vindo de env.ASSETS.fetch
 * @param {object|null} user
 * @returns {Response}
 */
export function rewriteNav(response, user) {
  // Só mexe em HTML
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return response;

  let injectedCursos = false;
  const rewriter = new HTMLRewriter()
    // Injetamos "Cursos" antes do primeiro link cujo href seja o de Contato.
    // No site da Jessica, os menus apontam para `#contato` (raiz) ou
    // `index.html#contato` (artigos), ou `/contato` (alias de _redirects).
    .on('nav.nav-menu a', {
      element(el) {
        if (injectedCursos) return;
        const href = el.getAttribute('href') || '';
        if (href.endsWith('#contato') || href === '/contato' || href === 'contato.html') {
          el.before(CURSOS_LINK_HTML, { html: true });
          injectedCursos = true;
        }
      },
    })
    // Após processar todo o <nav>, se não injetamos ainda (algum HTML sem
    // link de contato), anexamos no final. Também anexamos o bloco
    // auth ao final do nav.
    .on('nav.nav-menu', {
      element(el) {
        el.onEndTag((endTag) => {
          let html = '';
          if (!injectedCursos) html += CURSOS_LINK_HTML;
          html += authLinksHtml(user);
          endTag.before(html, { html: true });
        });
      },
    });

  return rewriter.transform(response);
}
