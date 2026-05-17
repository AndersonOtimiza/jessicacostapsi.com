// =====================================================================
// student.js — dashboard /aluno, player /aluno/curso/:slug, progresso.
//
// Regras:
//   - Toda rota /aluno/* exige sessão (caller já garantiu).
//   - Player só carrega vídeo se houver enrollment ativa.
//   - Stream URL assinada por aula; expira em 4h.
//   - Progresso por aula: marca concluida_em quando >=90% da duração.
//     Quando todas as aulas concluídas → emite certificado.
// =====================================================================

import {
  getCourseBySlug,
  getCourseStructure,
  getEnrollment,
  getLessonById,
  listUserEnrollments,
  listProgressForCourse,
  countLessonsInCourse,
  upsertProgress,
  getCertificateByUserCourse,
} from './db.js';
import { renderLayout } from './layout.js';
import { generateSignedStreamUrl } from './stream.js';
import { maybeIssueCertificate } from './certificate.js';
import {
  escapeHtml,
  escapeAttr,
  newId,
  jsonResponse,
  htmlResponse,
  redirect,
  readForm,
  log,
} from './utils.js';

// --------- /aluno (dashboard) ----------------------------------------

export async function renderStudentDashboard(env, request, user) {
  const enrolls = await listUserEnrollments(env, user.id);

  // Para cada matrícula, calcular progresso
  const items = [];
  for (const e of enrolls) {
    const total = await countLessonsInCourse(env, e.course_id);
    const progress = await listProgressForCourse(env, user.id, e.course_id);
    const concluidas = progress.filter((p) => !!p.concluida_em).length;
    const pct = total === 0 ? 0 : Math.round((concluidas / total) * 100);
    const cert = await getCertificateByUserCourse(env, user.id, e.course_id);
    items.push({
      slug: e.course_slug,
      titulo: e.course_titulo,
      total,
      concluidas,
      pct,
      certHash: cert ? cert.hash_publico : null,
    });
  }

  const cards = items
    .map(
      (it) => `
      <article class="course-card">
        <h3>${escapeHtml(it.titulo)}</h3>
        <small>${it.concluidas} de ${it.total} aulas concluídas (${it.pct}%)</small>
        <div class="progress-bar"><span style="width:${it.pct}%;"></span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;">
          <a class="btn btn-primary" href="/aluno/curso/${escapeAttr(it.slug)}">Continuar</a>
          ${it.certHash ? `<a class="btn btn-outline" href="/certificado/${escapeAttr(it.certHash)}" target="_blank" rel="noopener">Ver certificado</a>` : ''}
        </div>
      </article>`,
    )
    .join('');

  const empty = items.length === 0
    ? `<p>Você ainda não tem cursos. Veja a <a href="/cursos">vitrine</a>.</p>`
    : '';

  const content = `
    <div class="page-wrap">
      <h1>Olá, ${escapeHtml(user.nome.split(' ')[0])}!</h1>
      <p class="lead">Seus cursos:</p>
      <div class="courses-grid">${cards}</div>
      ${empty}
    </div>
  `;

  return htmlResponse(
    renderLayout({
      title: 'Minha área — Jessica Costa PSI',
      content,
      user,
      currentPath: '/aluno',
      noindex: true,
    }),
  );
}

// --------- /aluno/curso/:slug (player) -------------------------------

export async function renderPlayerPage(env, request, user, slug, lessonIdQuery) {
  const course = await getCourseBySlug(env, slug);
  if (!course) return redirect('/aluno', 302);

  const enrollment = await getEnrollment(env, user.id, course.id);
  if (!enrollment) {
    // Não matriculado: manda pra página de detalhe pra comprar
    return redirect(`/cursos/${course.slug}`, 302);
  }

  const { modules, lessons } = await getCourseStructure(env, course.id);
  if (lessons.length === 0) {
    return htmlResponse(
      renderLayout({
        title: `${course.titulo} — em produção`,
        content: `<div class="page-wrap"><h1>${escapeHtml(course.titulo)}</h1><p>Os vídeos deste curso ainda estão em produção. Você será avisado quando ficar pronto.</p></div>`,
        user,
        currentPath: `/aluno/curso/${course.slug}`,
        noindex: true,
      }),
    );
  }

  // Seleciona aula corrente
  const currentLesson = (lessonIdQuery && lessons.find((l) => l.id === lessonIdQuery))
    || lessons[0];

  // Progresso desse usuário neste curso (pra marcar ✓ na lista)
  const progressList = await listProgressForCourse(env, user.id, course.id);
  const concluidasIds = new Set(progressList.filter((p) => !!p.concluida_em).map((p) => p.lesson_id));

  // Sidebar com lista de aulas
  const listHtml = modules
    .map((m) => {
      const ls = lessons
        .filter((l) => l.module_id === m.id)
        .map((l) => {
          const active = l.id === currentLesson.id ? ' active' : '';
          const done = concluidasIds.has(l.id) ? ' done' : '';
          return `<a class="${(active + done).trim()}" href="/aluno/curso/${escapeAttr(course.slug)}?aula=${escapeAttr(l.id)}">${escapeHtml(l.titulo)}</a>`;
        })
        .join('');
      return `<div style="margin-top:14px;">
        <strong style="display:block;color:var(--text-light);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${escapeHtml(m.titulo)}</strong>
        <div class="lesson-list">${ls}</div>
      </div>`;
    })
    .join('');

  // Stream player
  const signed = await generateSignedStreamUrl(env, currentLesson.stream_video_uid);
  const playerHtml = signed.kind === 'signed'
    ? `<div class="player-iframe-wrap"><iframe src="${escapeAttr(signed.iframeSrc)}" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
    : `<div class="stream-placeholder"><div><strong>🐝 Vídeo em produção</strong><p style="margin-top:8px;">Esta aula ficará disponível em breve. Você receberá um aviso quando o conteúdo for publicado.</p></div></div>`;

  // Botão "Marcar como assistida" — para o caso de o player não emitir
  // eventos (placeholder ou erro). Em paralelo, o front pode mandar
  // progresso via fetch (Fase 2). Por ora a marcação manual cobre.
  const content = `
    <div class="page-wrap">
      <p style="margin-bottom:8px;"><a href="/aluno">← Minha área</a> · <a href="/cursos/${escapeAttr(course.slug)}">Página do curso</a></p>
      <h1>${escapeHtml(course.titulo)}</h1>
      <div class="player-grid">
        <div>
          <h2 style="font-size:1.3rem;margin-bottom:12px;">${escapeHtml(currentLesson.titulo)}</h2>
          ${playerHtml}
          ${currentLesson.descricao ? `<p style="margin-top:14px;">${escapeHtml(currentLesson.descricao)}</p>` : ''}
          <form method="POST" action="/api/lessons/${escapeAttr(currentLesson.id)}/progress" style="margin-top:16px;display:flex;gap:8px;align-items:center;" id="progressForm">
            <input type="hidden" name="segundos_assistidos" value="${currentLesson.duracao_seg || 0}">
            <input type="hidden" name="redirect_to" value="/aluno/curso/${escapeAttr(course.slug)}?aula=${escapeAttr(currentLesson.id)}">
            <button type="submit" class="btn btn-primary">Marcar como concluída</button>
            ${concluidasIds.has(currentLesson.id) ? `<small style="color:#2e7d32;">✓ Você já concluiu esta aula.</small>` : ''}
          </form>
        </div>
        <aside>${listHtml}</aside>
      </div>
    </div>
  `;

  return htmlResponse(
    renderLayout({
      title: `${course.titulo} — Aula`,
      content,
      user,
      currentPath: `/aluno/curso/${course.slug}`,
      noindex: true,
    }),
  );
}

// --------- POST /api/lessons/:id/progress ----------------------------

export async function handleProgressUpdate(env, request, user, lessonId) {
  const lesson = await getLessonById(env, lessonId);
  if (!lesson) return jsonResponse({ error: 'aula-inexistente' }, { status: 404 });

  const enrollment = await getEnrollment(env, user.id, lesson.course_id);
  if (!enrollment) return jsonResponse({ error: 'sem-acesso' }, { status: 403 });

  const body = await readForm(request);
  const segundos = Math.max(0, parseInt(body.segundos_assistidos || '0', 10) || 0);
  const concluida = (lesson.duracao_seg || 0) > 0
    ? segundos >= 0.9 * lesson.duracao_seg
    : segundos > 0;

  await upsertProgress(env, {
    id: newId('prg'),
    userId: user.id,
    lessonId,
    segundos,
    concluida,
  });

  log('progress', 'info', 'progress.update', {
    user_id: user.id,
    lesson_id: lessonId,
    course_id: lesson.course_id,
    segundos,
    concluida,
  });

  // Tenta emitir certificado se o curso foi concluído
  let cert = null;
  if (concluida) {
    cert = await maybeIssueCertificate(env, { userId: user.id, courseId: lesson.course_id });
    if (cert) {
      log('cert', 'info', 'cert.issued', {
        user_id: user.id,
        course_id: lesson.course_id,
        hash: cert.hash_publico,
      });
    }
  }

  // Compatibilidade com POST de form: se vier redirect_to, faz 303.
  // Whitelist explícita de prefixos seguros para impedir que um POST
  // forjado leve o aluno para /logout, /cadastro?next=..., ou loops
  // estranhos. Open-redirect externo já está bloqueado por startsWith('/')
  // mas a whitelist é mais estrita.
  const redirectToRaw = typeof body.redirect_to === 'string' ? body.redirect_to : '';
  const isSafeRedirect = redirectToRaw.startsWith('/aluno/curso/')
    && !redirectToRaw.includes('//')
    && !redirectToRaw.includes('\n')
    && !redirectToRaw.includes('\r');
  const safeRedirect = isSafeRedirect ? redirectToRaw : '/aluno';
  if (body.redirect_to !== undefined) {
    const dest = cert ? `/certificado/${cert.hash_publico}` : safeRedirect;
    return redirect(dest, 303);
  }

  return jsonResponse({ ok: true, concluida, certificado: cert ? cert.hash_publico : null });
}
