// =====================================================================
// webhook.js — POST /api/webhook/otimiza-payment
//
// Contrato (lado Otimiza envia, lado Jessica recebe):
//
//   Headers
//     x-otimiza-signature: hex(HMAC_SHA256(SHARED_SECRET, body_bruto))
//     content-type:        application/json
//
//   Body (JSON)
//     {
//       "order_id":       "ord_xxx",       // id que a Jessica gerou no redirect
//       "user_id":        "usr_xxx",       // ditto
//       "user_email":     "aluno@email",
//       "course_slug":    "criancas-com-tea-guia-para-pais",
//       "status":         "approved"|"pending"|"rejected"|"refunded",
//       "paid_at":        "2026-05-16T15:30:00Z", // ISO 8601 (null se não pago)
//       "valor_centavos": 9850,
//       "otimiza_payment_id": "mp_payment_id_string" // opcional, p/ trace
//     }
//
//   Resposta esperada
//     200 { "ok": true, "enrollment_id": "...", "duplicated": false }
//     401 { "error": "assinatura inválida" }
//     400 { "error": "payload inválido" }
//     404 { "error": "order não encontrada" } | "user não encontrado" | "curso não encontrado"
//     500 { "error": "...mensagem..." }
//
//   Idempotência
//     - Chave: order_id
//     - SELECT 1 FROM enrollments WHERE order_id=? — se existir, 200 OK com duplicated=true
//
//   Política de status:
//     - "approved" → cria enrollment + marca orders.status='approved' + paga_em
//     - outros     → loga e retorna 200 sem criar enrollment
// =====================================================================

import {
  getOrderById,
  getOrderByOtimizaId,
  markOrderApproved,
  insertEnrollment,
  getEnrollment,
  getCourseBySlug,
  getUserByEmail,
  incrementCouponUsage,
  logWebhookEvent,
} from './db.js';
import { hmacSHA256Hex, timingSafeEqual, jsonResponse, newId, log } from './utils.js';

export async function handleOtimizaPaymentWebhook(env, request) {
  const sigHeader = request.headers.get('x-otimiza-signature') || '';
  const raw = await request.text();

  const secret = env.OTIMIZA_X_JESSICA_SECRET;
  if (!secret) {
    log('webhook', 'error', 'webhook.missing-secret');
    return jsonResponse({ error: 'configuração incompleta' }, { status: 500 });
  }

  const expected = await hmacSHA256Hex(secret, raw);
  const ok = timingSafeEqual(sigHeader, expected);
  if (!ok) {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: false,
      processado: false,
      resultado: { reason: 'invalid-signature' },
    });
    log('webhook', 'warn', 'webhook.invalid-signature', { sig_present: !!sigHeader });
    return jsonResponse({ error: 'assinatura inválida' }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: false,
      resultado: { reason: 'invalid-json' },
    });
    return jsonResponse({ error: 'payload inválido' }, { status: 400 });
  }

  const {
    order_id,
    user_id,
    user_email,
    course_slug,
    status,
    paid_at,
    valor_centavos,
    otimiza_payment_id,
    timestamp,
  } = payload || {};

  if (!order_id || !status) {
    return jsonResponse({ error: 'payload inválido' }, { status: 400 });
  }

  // Anti-replay: o timestamp do payload deve estar dentro de 5min do agora.
  // Sem isso, um atacante com cópia de um webhook válido poderia reenviar
  // meses depois. (HMAC sem timestamp = válido eternamente.)
  // Como timestamp faz parte do body, ele é coberto pela mesma assinatura.
  if (!timestamp) {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: false,
      resultado: { reason: 'timestamp-ausente' },
    });
    return jsonResponse({ error: 'timestamp ausente' }, { status: 400 });
  }
  const tsMs = Date.parse(timestamp);
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: false,
      resultado: { reason: 'timestamp-fora-janela', timestamp },
    });
    return jsonResponse({ error: 'timestamp fora da janela de 5min' }, { status: 400 });
  }

  // Idempotência via order_id (interno) ou otimiza_payment_id
  const order = await getOrderById(env, order_id)
    || (otimiza_payment_id ? await getOrderByOtimizaId(env, otimiza_payment_id) : null);

  if (!order) {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: false,
      resultado: { reason: 'order-not-found', order_id },
    });
    return jsonResponse({ error: 'order não encontrada' }, { status: 404 });
  }

  if (status !== 'approved') {
    // Não aprovado: registra estado mas não matricula
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: true,
      resultado: { status, order_id: order.id, no_enrollment: true },
    });
    log('webhook', 'info', 'webhook.non-approved', { order_id: order.id, status });
    return jsonResponse({ ok: true, status, enrollment_id: null });
  }

  // Curso: confiar SEMPRE em order.course_id (registrado quando o aluno
  // clicou em Comprar). Slug do payload só serve para auditoria de
  // divergência — nunca para matricular em outro curso.
  const courseId = order.course_id;
  if (!courseId) {
    return jsonResponse({ error: 'order sem curso' }, { status: 500 });
  }
  if (course_slug) {
    const payloadCourse = await getCourseBySlug(env, course_slug);
    if (payloadCourse && payloadCourse.id !== courseId) {
      log('webhook', 'warn', 'webhook.course-mismatch', {
        order_id: order.id,
        order_course_id: courseId,
        payload_slug: course_slug,
        payload_course_id: payloadCourse.id,
      });
    }
  }

  // Usuário: prioriza order.user_id (linkado no checkout). Email do
  // payload só vale como fallback para orders criadas sem user_id
  // (cenário que NÃO acontece hoje — login é obrigatório antes do
  // redirect — mas mantemos defensivo).
  let userId = order.user_id;
  if (!userId && user_email) {
    const u = await getUserByEmail(env, user_email);
    if (u) userId = u.id;
  }
  if (!userId) {
    return jsonResponse({ error: 'usuário não encontrado' }, { status: 404 });
  }

  // Idempotência por enrollment(user,course): se já existe, retorna OK duplicated
  const existing = await getEnrollment(env, userId, courseId);
  if (existing) {
    await logWebhookEvent(env, {
      origem: 'otimiza-payment',
      payload: raw,
      assinaturaOk: true,
      processado: true,
      resultado: { duplicated: true, enrollment_id: existing.id, order_id: order.id },
    });
    return jsonResponse({ ok: true, duplicated: true, enrollment_id: existing.id });
  }

  // Cria matrícula (atômico via UNIQUE(user, course) + INSERT OR IGNORE).
  // `inserted` distingue criação real de no-op por race condition.
  const enrollmentId = newId('enr');
  const { enrollment, inserted } = await insertEnrollment(env, {
    id: enrollmentId,
    userId,
    courseId,
    orderId: order.id,
  });
  const finalEnrollmentId = enrollment ? enrollment.id : enrollmentId;

  // Atualiza ordem (idempotente — markOrderApproved é UPDATE simples)
  await markOrderApproved(env, {
    orderId: order.id,
    otimizaOrderId: otimiza_payment_id || order.otimiza_order_id || order.id,
    otimizaStatus: 'approved',
    pagoEm: paid_at || new Date().toISOString(),
  });

  // Cupom: incrementa SOMENTE se a matrícula foi criada por ESTE handler.
  // Webhooks paralelos para o mesmo order: só um deles tem inserted=true.
  // Sem isso, dois handlers concorrentes incrementariam o cupom duas vezes
  // mesmo que apenas uma matrícula tenha sido realmente criada.
  let cupomIncrementado = false;
  if (inserted && order.coupon_id) {
    cupomIncrementado = await incrementCouponUsage(env, order.coupon_id);
  }

  await logWebhookEvent(env, {
    origem: 'otimiza-payment',
    payload: raw,
    assinaturaOk: true,
    processado: true,
    resultado: {
      enrollment_id: finalEnrollmentId,
      enrollment_inserted: inserted,
      order_id: order.id,
      user_id: userId,
      course_id: courseId,
      valor_centavos,
      cupom_incrementado: cupomIncrementado,
    },
  });

  log('webhook', 'info', 'webhook.approved', {
    enrollment_id: finalEnrollmentId,
    enrollment_inserted: inserted,
    order_id: order.id,
    user_id: userId,
    course_id: courseId,
  });

  return jsonResponse({
    ok: true,
    enrollment_id: finalEnrollmentId,
    duplicated: !inserted,
  });
}
