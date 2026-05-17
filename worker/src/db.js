// =====================================================================
// db.js — wrappers finos sobre o D1 (env.DB).
// Mantemos SQL inline (sem ORM). Funções por agregado de domínio.
// =====================================================================

// ----- Users -----------------------------------------------------------

export async function getUserById(env, id) {
  if (!id) return null;
  return await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function getUserByEmail(env, email) {
  if (!email) return null;
  return await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export async function insertUser(env, { id, email, nome, senhaHash, telefone }) {
  await env.DB.prepare(
    `INSERT INTO users (id, email, nome, senha_hash, telefone)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, email, nome, senhaHash, telefone || null)
    .run();
}

export async function updateUserPassword(env, userId, senhaHash) {
  await env.DB.prepare(
    `UPDATE users SET senha_hash = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(senhaHash, userId)
    .run();
}

// ----- Sessions --------------------------------------------------------
//
// Datas mantidas SEMPRE no formato SQLite (`YYYY-MM-DD HH:MM:SS`, UTC).
// expira_em é calculado dentro do SQL via datetime('now', '+N days') para
// garantir consistência com CURRENT_TIMESTAMP na hora de comparar.

export async function insertSession(env, { id, userId, userAgent, ip, expiraDias = 30 }) {
  const dias = Math.max(1, parseInt(expiraDias, 10) || 30);
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, user_agent, ip, expira_em)
     VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' days'))`,
  )
    .bind(id, userId, userAgent || null, ip || null, dias)
    .run();
}

export async function getSession(env, id) {
  if (!id) return null;
  return await env.DB.prepare(
    `SELECT * FROM sessions WHERE id = ? AND datetime(expira_em) > datetime('now')`,
  )
    .bind(id)
    .first();
}

export async function deleteSession(env, id) {
  if (!id) return;
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

export async function deleteSessionsByUser(env, userId) {
  if (!userId) return 0;
  const res = await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  return (res && res.meta && res.meta.changes) || 0;
}

// ----- Login attempts (rate limit) ------------------------------------

export async function recordLoginAttempt(env, { email, ip, sucesso }) {
  await env.DB.prepare(
    `INSERT INTO login_attempts (email, ip, sucesso) VALUES (?, ?, ?)`,
  )
    .bind(email, ip || null, sucesso ? 1 : 0)
    .run();
}

/**
 * Conta falhas recentes separadamente por email e por IP (não soma os dois).
 * Caller bloqueia se QUALQUER dos dois passar do limite — limites diferentes
 * para evitar (a) atacante que sabe o email fazer DoS na conta da vítima e
 * (b) usuários atrás de CGNAT compartilharem cota e se bloquearem.
 *
 * Sugestão de uso: byEmail >= 5 (foco no alvo) OU byIp >= 20 (rede inteira).
 */
export async function countRecentFailures(env, { email, ip, minutos = 15 }) {
  const min = Math.max(1, parseInt(minutos, 10) || 15);
  const ipParam = ip || null;
  const row = await env.DB.prepare(
    `SELECT
        SUM(CASE WHEN email = ? THEN 1 ELSE 0 END)                AS by_email,
        SUM(CASE WHEN ? IS NOT NULL AND ip = ? THEN 1 ELSE 0 END) AS by_ip
       FROM login_attempts
      WHERE sucesso = 0
        AND datetime(ocorreu_em) > datetime('now', '-' || ? || ' minutes')`,
  )
    .bind(email, ipParam, ipParam, min)
    .first();
  return {
    byEmail: Number((row && row.by_email) || 0),
    byIp: Number((row && row.by_ip) || 0),
  };
}

// ----- Courses ---------------------------------------------------------

export async function listPublishedCourses(env) {
  const res = await env.DB.prepare(
    `SELECT * FROM courses WHERE publicado = 1 ORDER BY criado_em DESC`,
  ).all();
  return res.results || [];
}

export async function getCourseBySlug(env, slug) {
  if (!slug) return null;
  return await env.DB.prepare('SELECT * FROM courses WHERE slug = ?').bind(slug).first();
}

export async function getCourseById(env, id) {
  if (!id) return null;
  return await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
}

export async function getCourseStructure(env, courseId) {
  const modules = (
    await env.DB.prepare(
      `SELECT * FROM modules WHERE course_id = ? ORDER BY ordem, titulo`,
    )
      .bind(courseId)
      .all()
  ).results || [];

  if (modules.length === 0) return { modules: [], lessons: [] };

  const moduleIds = modules.map((m) => m.id);
  const placeholders = moduleIds.map(() => '?').join(',');
  const lessons = (
    await env.DB.prepare(
      `SELECT * FROM lessons WHERE module_id IN (${placeholders}) ORDER BY module_id, ordem`,
    )
      .bind(...moduleIds)
      .all()
  ).results || [];

  return { modules, lessons };
}

export async function getLessonById(env, lessonId) {
  if (!lessonId) return null;
  return await env.DB.prepare(
    `SELECT l.*, m.course_id
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
      WHERE l.id = ?`,
  )
    .bind(lessonId)
    .first();
}

// ----- Enrollments -----------------------------------------------------

export async function getEnrollment(env, userId, courseId) {
  return await env.DB.prepare(
    `SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? AND ativa = 1`,
  )
    .bind(userId, courseId)
    .first();
}

export async function listUserEnrollments(env, userId) {
  const res = await env.DB.prepare(
    `SELECT e.*, c.slug AS course_slug, c.titulo AS course_titulo, c.cover_url AS course_cover
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ? AND e.ativa = 1
      ORDER BY e.criada_em DESC`,
  )
    .bind(userId)
    .all();
  return res.results || [];
}

/**
 * Insere matrícula de forma idempotente. UNIQUE(user_id, course_id) garante
 * unicidade; usamos INSERT OR IGNORE e verificamos `meta.changes` para saber
 * se ESTA chamada foi a que inseriu (true) ou se já existia (false).
 *
 * @returns {{ enrollment: object, inserted: boolean }}
 */
export async function insertEnrollment(env, { id, userId, courseId, orderId }) {
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, order_id)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(id, userId, courseId, orderId || null)
    .run();
  const inserted = !!(res && res.meta && res.meta.changes && res.meta.changes > 0);
  const enrollment = await env.DB.prepare(
    `SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?`,
  )
    .bind(userId, courseId)
    .first();
  return { enrollment, inserted };
}

// ----- Orders ----------------------------------------------------------

export async function insertOrder(env, order) {
  await env.DB.prepare(
    `INSERT INTO orders (
       id, user_id, course_id, coupon_id,
       valor_centavos, desconto_centavos, status,
       external_redirect_url
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      order.id,
      order.userId,
      order.courseId,
      order.couponId || null,
      order.valorCentavos,
      order.descontoCentavos || 0,
      order.status || 'pending',
      order.externalRedirectUrl || null,
    )
    .run();
}

export async function getOrderByOtimizaId(env, otimizaOrderId) {
  if (!otimizaOrderId) return null;
  return await env.DB.prepare(
    `SELECT * FROM orders WHERE otimiza_order_id = ?`,
  )
    .bind(otimizaOrderId)
    .first();
}

export async function getOrderById(env, id) {
  if (!id) return null;
  return await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
}

export async function markOrderApproved(env, { orderId, otimizaOrderId, otimizaStatus, pagoEm }) {
  await env.DB.prepare(
    `UPDATE orders SET
       status = 'approved',
       otimiza_order_id = COALESCE(?, otimiza_order_id),
       otimiza_payment_status = ?,
       pago_em = ?,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(otimizaOrderId || null, otimizaStatus || 'approved', pagoEm, orderId)
    .run();
}

// ----- Coupons ---------------------------------------------------------

export async function getCouponByCodigo(env, codigo) {
  if (!codigo) return null;
  return await env.DB.prepare('SELECT * FROM coupons WHERE codigo = ? AND ativo = 1')
    .bind(codigo)
    .first();
}

/**
 * Incremento atômico de uso de cupom. O UPDATE condicional impede passar do
 * uso_maximo mesmo sob race entre webhooks paralelos (cada UPDATE é atômico
 * em D1; quem perder a corrida verá usos_atual já estourado e gravará 0
 * changes). Retorna true se efetivamente incrementou.
 *
 * Chamar APENAS quando a matrícula correspondente foi recém-criada
 * (inserted === true do insertEnrollment), nunca em handler duplicado.
 */
export async function incrementCouponUsage(env, couponId) {
  if (!couponId) return false;
  const res = await env.DB.prepare(
    `UPDATE coupons
        SET usos_atual = usos_atual + 1
      WHERE id = ?
        AND (uso_maximo IS NULL OR usos_atual < uso_maximo)`,
  )
    .bind(couponId)
    .run();
  return !!(res && res.meta && res.meta.changes && res.meta.changes > 0);
}

// ----- Progress --------------------------------------------------------

export async function upsertProgress(env, { id, userId, lessonId, segundos, concluida }) {
  // SQLite UPSERT (ON CONFLICT) — Cloudflare D1 suporta
  await env.DB.prepare(
    `INSERT INTO lesson_progress (id, user_id, lesson_id, segundos_assistidos, concluida_em)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET
       segundos_assistidos = MAX(lesson_progress.segundos_assistidos, excluded.segundos_assistidos),
       concluida_em = COALESCE(lesson_progress.concluida_em, excluded.concluida_em),
       atualizado_em = CURRENT_TIMESTAMP`,
  )
    .bind(id, userId, lessonId, segundos | 0, concluida ? new Date().toISOString() : null)
    .run();
}

export async function listProgressForCourse(env, userId, courseId) {
  const res = await env.DB.prepare(
    `SELECT lp.*
       FROM lesson_progress lp
       JOIN lessons l  ON l.id = lp.lesson_id
       JOIN modules m  ON m.id = l.module_id
      WHERE lp.user_id = ? AND m.course_id = ?`,
  )
    .bind(userId, courseId)
    .all();
  return res.results || [];
}

export async function countLessonsInCourse(env, courseId) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n
       FROM lessons l JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ?`,
  )
    .bind(courseId)
    .first();
  return row ? Number(row.n) : 0;
}

// ----- Certificates ----------------------------------------------------

export async function getCertificateByUserCourse(env, userId, courseId) {
  return await env.DB.prepare(
    `SELECT * FROM certificates WHERE user_id = ? AND course_id = ?`,
  )
    .bind(userId, courseId)
    .first();
}

export async function getCertificateByHash(env, hash) {
  if (!hash) return null;
  return await env.DB.prepare(
    `SELECT c.*, u.nome AS user_nome, co.titulo AS course_titulo, co.duracao_min AS course_duracao_min
       FROM certificates c
       JOIN users u   ON u.id = c.user_id
       JOIN courses co ON co.id = c.course_id
      WHERE c.hash_publico = ?`,
  )
    .bind(hash)
    .first();
}

export async function insertCertificate(env, { id, userId, courseId, hashPublico }) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO certificates (id, user_id, course_id, hash_publico)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(id, userId, courseId, hashPublico)
    .run();
}

// ----- Webhook log -----------------------------------------------------

export async function logWebhookEvent(env, { origem, payload, assinaturaOk, processado, resultado }) {
  await env.DB.prepare(
    `INSERT INTO webhook_events (origem, payload, assinatura_ok, processado, resultado)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      origem,
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      assinaturaOk ? 1 : 0,
      processado ? 1 : 0,
      resultado ? JSON.stringify(resultado) : null,
    )
    .run();
}
