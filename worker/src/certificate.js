// =====================================================================
// certificate.js — gera e renderiza certificados (HTML A4 paisagem).
//
// Emissão: chamada por progresso (student.js) quando todas as aulas do
// curso forem concluídas. Idempotente via UNIQUE(user_id, course_id).
//
// QR code: Fase 1 NÃO renderiza um QR — exibe a URL de validação em
// destaque + um link clicável. Justificativa: gerar QR correto em
// Workers exige uma lib testada (peso extra) ou um serviço externo
// (adiciona dependência). Como o certificado é público e o hash é
// curto/digitável, a URL textual cumpre a função de "validar este
// documento". O placeholder de QR está marcado abaixo para virar
// Fase 2 (provavelmente via `qr-code-styling` ou similar).
// =====================================================================

import {
  getCertificateByUserCourse,
  getCertificateByHash,
  insertCertificate,
  countLessonsInCourse,
  listProgressForCourse,
} from './db.js';
import { renderLayout } from './layout.js';
import { newId, bufToHex, escapeHtml, htmlResponse } from './utils.js';

/**
 * Verifica se o usuário concluiu o curso; se sim, garante um certificado.
 * Idempotente.
 */
export async function maybeIssueCertificate(env, { userId, courseId }) {
  const total = await countLessonsInCourse(env, courseId);
  if (total === 0) return null;
  const progress = await listProgressForCourse(env, userId, courseId);
  const concluidas = progress.filter((p) => !!p.concluida_em).length;
  if (concluidas < total) return null;

  const existing = await getCertificateByUserCourse(env, userId, courseId);
  if (existing) return existing;

  const hashBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashPublico = bufToHex(hashBytes);
  const id = newId('cert');
  await insertCertificate(env, { id, userId, courseId, hashPublico });
  return await getCertificateByUserCourse(env, userId, courseId);
}

/** Página pública /certificado/:hash */
export async function renderCertificatePage(env, hash) {
  const cert = await getCertificateByHash(env, hash);
  if (!cert) {
    return htmlResponse(
      renderLayout({
        title: 'Certificado não encontrado',
        content: `<div class="page-wrap"><h1>Certificado não encontrado</h1><p>O link pode estar incorreto.</p></div>`,
        noindex: true,
        currentPath: `/certificado/${hash}`,
      }),
      { status: 404 },
    );
  }

  const url = `https://jessicacostapsi.com/certificado/${cert.hash_publico}`;
  // SQLite CURRENT_TIMESTAMP devolve "YYYY-MM-DD HH:MM:SS" (UTC, sem TZ).
  // Convertemos para ISO 8601 antes de Date.parse para garantir comportamento
  // consistente entre runtimes — concatenar "Z" no formato com espaço NÃO é
  // ISO válido e gera NaN em alguns engines.
  const isoEmitido = String(cert.emitido_em || '').replace(' ', 'T') + 'Z';
  const emitidoEm = new Date(isoEmitido);
  const dataFmt = Number.isFinite(emitidoEm.getTime())
    ? emitidoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const crp = env.CRP_PROFISSIONAL || '05/79764';
  const nomeProf = env.NOME_PROFISSIONAL || 'Jessica Costa';

  // Página com layout próprio (sem header/footer do site) — A4 paisagem print-friendly
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado — ${escapeHtml(cert.course_titulo)}</title>
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Poppins',sans-serif;background:#fdf6e0;color:#333;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .actions{position:fixed;top:14px;right:14px;display:flex;gap:8px}
    .actions button{font-family:inherit;background:#F5A623;color:#fff;border:0;padding:10px 18px;border-radius:50px;cursor:pointer;font-weight:600;font-size:0.9rem}
    .actions a{display:inline-flex;align-items:center;color:#666;font-size:0.85rem;text-decoration:none;padding:10px 14px}
    .certificado{background:#fff;width:100%;max-width:1120px;aspect-ratio:1.414/1;border:14px solid #F5A623;padding:60px;position:relative;box-shadow:0 8px 30px rgba(0,0,0,0.15);display:flex;flex-direction:column;justify-content:space-between}
    .certificado::before,.certificado::after{content:"🐝";position:absolute;font-size:46px;opacity:0.5}
    .certificado::before{top:18px;left:18px}
    .certificado::after{bottom:18px;right:18px}
    h1{font-size:2.6rem;letter-spacing:6px;text-transform:uppercase;color:#D4891A;text-align:center}
    .meio{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:18px}
    .meio p.intro{font-size:1.1rem;color:#666}
    .nome{font-size:2.4rem;font-weight:800;color:#333;border-bottom:2px solid #F5C518;padding-bottom:8px;margin:8px 0}
    .curso{font-size:1.4rem;color:#444;font-style:italic;max-width:80%}
    .rodape{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap}
    .assinatura{text-align:center;flex:1;min-width:240px}
    .assinatura .linha{border-top:1px solid #333;margin-bottom:8px;width:240px;margin-left:auto;margin-right:auto}
    .assinatura strong{display:block;font-size:1.05rem}
    .assinatura small{color:#666}
    .validacao{text-align:right;font-size:0.78rem;color:#666;max-width:300px}
    .validacao strong{display:block;font-size:0.85rem;color:#333;word-break:break-all;margin:4px 0}
    @media print{
      body{background:#fff;padding:0}
      .actions{display:none}
      .certificado{border-width:10px;box-shadow:none;page-break-inside:avoid}
      @page{size:A4 landscape;margin:0}
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <a href="/aluno">Minha área</a>
  </div>
  <article class="certificado">
    <h1>Certificado</h1>
    <div class="meio">
      <p class="intro">Certificamos que</p>
      <div class="nome">${escapeHtml(cert.user_nome)}</div>
      <p class="intro">concluiu com aproveitamento o curso</p>
      <div class="curso">"${escapeHtml(cert.course_titulo)}"</div>
      ${cert.course_duracao_min ? `<p class="intro">Carga horária: ${cert.course_duracao_min} minutos</p>` : ''}
    </div>
    <div class="rodape">
      <div class="assinatura">
        <div class="linha"></div>
        <strong>${escapeHtml(nomeProf)}</strong>
        <small>Psicóloga · CRP ${escapeHtml(crp)}</small>
      </div>
      <div class="validacao">
        Validar autenticidade em:
        <strong>${escapeHtml(url)}</strong>
        <small>Emitido em ${dataFmt}<br>ID: ${escapeHtml(cert.hash_publico.slice(0, 12))}</small>
      </div>
    </div>
  </article>
</body>
</html>`;

  return htmlResponse(html);
}
