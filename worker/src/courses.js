// =====================================================================
// courses.js — vitrine pública (/cursos), detalhe (/cursos/:slug) e
// build do redirect de compra para a Otimiza.
// =====================================================================

import {
  listPublishedCourses,
  getCourseBySlug,
  getCourseStructure,
  getEnrollment,
  insertOrder,
} from './db.js';
import { renderLayout } from './layout.js';
import { validateCoupon } from './coupon.js';
import { escapeHtml, escapeAttr, formatBRL, newId, redirect, htmlResponse, readForm, log } from './utils.js';

// --------- Vitrine /cursos ------------------------------------------

export async function renderCoursesIndex(env, request, user) {
  const courses = await listPublishedCourses(env);
  const cards = courses
    .map(
      (c) => `
        <article class="course-card">
          <h3>${escapeHtml(c.titulo)}</h3>
          ${c.subtitulo ? `<p>${escapeHtml(c.subtitulo)}</p>` : ''}
          <div class="price">${formatBRL(c.preco_centavos)}</div>
          <a class="btn btn-primary cta" href="/cursos/${encodeURIComponent(c.slug)}">Ver detalhes</a>
        </article>`,
    )
    .join('');

  const empty = courses.length === 0
    ? `<p>Em breve novos cursos. Enquanto isso, conheça o <a href="/blog.html">blog</a>.</p>`
    : '';

  const content = `
    <div class="page-wrap">
      <h1>Cursos da Jessica Costa</h1>
      <p class="lead">Conteúdos práticos, baseados em TCC e ABA, para apoiar pais, cuidadores e educadores no dia a dia com crianças neurodivergentes.</p>
      <div class="courses-grid">
        ${cards}
      </div>
      ${empty}
    </div>
  `;

  return htmlResponse(
    renderLayout({
      title: 'Cursos — Jessica Costa PSI',
      description: 'Cursos online da psicóloga infantojuvenil Jessica Costa: TEA, TDAH, parentalidade e desenvolvimento infantil.',
      content,
      user,
      currentPath: '/cursos',
    }),
  );
}

// --------- Detalhe /cursos/:slug ------------------------------------

export async function renderCourseDetail(env, request, user, slug) {
  const course = await getCourseBySlug(env, slug);
  if (!course || !course.publicado) {
    return htmlResponse(
      renderLayout({
        title: 'Curso não encontrado',
        content: `<div class="page-wrap"><h1>Curso não encontrado</h1><p>Volte para <a href="/cursos">a vitrine</a>.</p></div>`,
        user,
        currentPath: '/cursos',
        noindex: true,
      }),
      { status: 404 },
    );
  }

  const { modules, lessons } = await getCourseStructure(env, course.id);
  const totalAulas = lessons.length;
  const enrollment = user ? await getEnrollment(env, user.id, course.id) : null;

  const moduleHtml = modules
    .map((m) => {
      const ls = lessons
        .filter((l) => l.module_id === m.id)
        .map((l) => `<li>${escapeHtml(l.titulo)}${l.preview ? ' <small>(prévia gratuita)</small>' : ''}</li>`)
        .join('');
      return `<section style="margin-top:18px;">
        <h3>${escapeHtml(m.titulo)}</h3>
        <ol>${ls}</ol>
      </section>`;
    })
    .join('');

  const ctaHtml = enrollment
    ? `<a class="btn btn-primary" href="/aluno/curso/${escapeAttr(course.slug)}">Acessar aulas</a>`
    : `<form method="POST" action="/cursos/${escapeAttr(course.slug)}/comprar" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
         <input type="text" name="cupom" placeholder="Cupom (opcional)" style="padding:10px 14px; border:1px solid #e5d6b2; border-radius:8px;">
         <button type="submit" class="btn btn-primary">Comprar — ${formatBRL(course.preco_centavos)}</button>
       </form>
       <p style="margin-top:8px; font-size:0.85rem; color:var(--text-light);">Pagamento processado de forma segura na Otimiza.</p>`;

  const content = `
    <div class="page-wrap">
      <p><a href="/cursos">← Voltar para Cursos</a></p>
      <h1>${escapeHtml(course.titulo)}</h1>
      ${course.subtitulo ? `<p class="lead">${escapeHtml(course.subtitulo)}</p>` : ''}
      <div class="meta-row">
        <span>📚 ${totalAulas} aula${totalAulas === 1 ? '' : 's'}</span>
        ${course.duracao_min ? `<span>⏱️ ${course.duracao_min} min</span>` : ''}
        <span>💛 Conteúdo da Jessica Costa (CRP 05/56789)</span>
      </div>
      <div style="margin: 24px 0;">${ctaHtml}</div>
      <div>${course.descricao_html || `<p>${escapeHtml(course.descricao_curta || '')}</p>`}</div>
      <h2 style="margin-top:36px;">Conteúdo do curso</h2>
      ${moduleHtml}
    </div>
  `;

  return htmlResponse(
    renderLayout({
      title: `${course.titulo} — Curso`,
      description: course.descricao_curta || 'Curso da Jessica Costa Psi.',
      content,
      user,
      currentPath: `/cursos/${course.slug}`,
      canonical: `https://jessicacostapsi.com/cursos/${course.slug}`,
    }),
  );
}

// --------- POST /cursos/:slug/comprar  → form POST autosubmit p/ Otimiza
//
// Por que POST e não 302 redirect: evita expor PII (email, nome) na
// querystring — que vaza para logs de servidor, Referer e histórico
// do navegador. Os mesmos campos vão no body do form, que não aparece
// nesses canais. Contrato: a Otimiza deve aceitar
// `POST /checkout/jessica/:slug` com `application/x-www-form-urlencoded`.
// ---------------------------------------------------------------------

export async function handleBuyRedirect(env, request, user, slug) {
  // Suporta POST (form do detalhe) e GET (link direto/legado).
  const isPost = request.method === 'POST';
  const params = isPost ? await readForm(request) : Object.fromEntries(new URL(request.url).searchParams);
  const codigo = String(params.cupom || '').trim();

  const course = await getCourseBySlug(env, slug);
  if (!course || !course.publicado) {
    return redirect('/cursos', 302);
  }

  // Exige login: sem login não conseguimos linkar a venda ao aluno.
  if (!user) {
    // Manda para login e, depois, repete a tentativa de compra.
    // Usamos GET no retorno (POST não pode ser preservado por redirect).
    const next = encodeURIComponent(`/cursos/${course.slug}`);
    return redirect(`/login?next=${next}`, 302);
  }

  // Cupom (opcional)
  let couponResult = null;
  if (codigo) {
    couponResult = await validateCoupon(env, codigo, course);
  }

  const desconto = couponResult && couponResult.ok ? couponResult.descontoCentavos : 0;
  const couponId = couponResult && couponResult.ok ? couponResult.coupon.id : null;
  const valorFinal = Math.max(0, Number(course.preco_centavos) - desconto);

  const orderId = newId('ord');
  const checkoutBase = env.OTIMIZA_CHECKOUT_BASE || 'https://otimizapro.com/checkout/jessica';
  const checkoutAction = `${checkoutBase}/${encodeURIComponent(course.slug)}`;
  const returnUrl = `https://jessicacostapsi.com/cursos/${course.slug}`;

  await insertOrder(env, {
    id: orderId,
    userId: user.id,
    courseId: course.id,
    couponId,
    valorCentavos: valorFinal,
    descontoCentavos: desconto,
    status: 'pending',
    externalRedirectUrl: checkoutAction,
  });

  log('checkout', 'info', 'order.redirect', {
    order_id: orderId,
    user_id: user.id,
    course_id: course.id,
    valor_centavos: valorFinal,
    desconto_centavos: desconto,
    cupom: codigo || null,
    cupom_valido: couponResult ? couponResult.ok : null,
    cupom_erro: couponResult && !couponResult.ok ? couponResult.error : null,
  });

  const fields = {
    order_id: orderId,
    user_id: user.id,
    email: user.email,
    nome: user.nome,
    course_id: course.id,
    course_slug: course.slug,
    valor_centavos: String(valorFinal),
    return_url: returnUrl,
  };
  if (couponId) {
    fields.coupon = codigo.toUpperCase();
    fields.coupon_id = couponId;
    fields.desconto_centavos = String(desconto);
  }

  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${escapeAttr(k)}" value="${escapeAttr(v)}">`)
    .join('');

  // Auto-submit POST form. Sem JS, exibe botão fallback.
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Indo para pagamento...</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf6e0;color:#333;text-align:center;padding:20px}
    .card{background:#fff;padding:36px;border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,0.06);max-width:420px}
    button{margin-top:18px;padding:12px 24px;background:#F5A623;color:#fff;border:0;border-radius:50px;font-weight:600;font-size:1rem;cursor:pointer}
  </style>
</head>
<body>
  <form id="checkoutForm" method="POST" action="${escapeAttr(checkoutAction)}">
    ${inputs}
    <div class="card">
      <h1 style="margin:0 0 8px;font-size:1.4rem;">Indo para o pagamento...</h1>
      <p>Você está sendo redirecionado para o checkout seguro.</p>
      <noscript><p>JavaScript desabilitado — clique no botão para continuar:</p></noscript>
      <button type="submit">Continuar</button>
    </div>
  </form>
  <script>document.getElementById('checkoutForm').submit();</script>
</body>
</html>`;

  return htmlResponse(html, { headers: { 'cache-control': 'no-store' } });
}
