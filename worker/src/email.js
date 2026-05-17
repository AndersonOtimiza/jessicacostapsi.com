// =====================================================================
// email.js — STUB de envio.
//
// Fase 1: apenas log estruturado (visível em `wrangler tail`). Nada de
// rede. Anderson é a única pessoa autorizada a ativar Resend (Fase 2).
// =====================================================================

import { log } from './utils.js';

export async function sendEmail(env, { to, subject, html, text }) {
  log('email', 'info', 'stub.sendEmail', {
    env: env.ENV || 'unknown',
    to,
    subject,
    bodyLength: (html || text || '').length,
    // Não logamos o HTML inteiro para não poluir o tail; o link de reset
    // aparece na linha imediatamente anterior gerada por auth.js.
  });
  return { ok: true, stub: true };
}
