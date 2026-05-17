// =====================================================================
// auth.js — PBKDF2-SHA256, sessões, cookies, rate limit, reset de senha.
//
// Resumo das decisões:
//   - Hash: PBKDF2 (Web Crypto), SHA-256, 600.000 iterações, salt 16 bytes.
//     Serializado como  "pbkdf2$600000$<saltHex>$<hashHex>".
//   - Sessão: cookie __Host-sess com token aleatório de 32 bytes hex,
//     HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age = 30 dias.
//   - Reset: token aleatório em KV com TTL de 60min, formato "rst:<token>"
//     → user_id. Fluxo "esqueci senha" cria o token e LOGA o link (stub
//     de email).
// =====================================================================

import {
  getUserByEmail,
  getUserById,
  insertUser,
  insertSession,
  getSession,
  deleteSession,
  deleteSessionsByUser,
  recordLoginAttempt,
  countRecentFailures,
  updateUserPassword,
} from './db.js';
import {
  bufToHex,
  hexToBuf,
  newId,
  parseCookies,
  timingSafeEqual,
  clientIp,
  normalizeEmail,
  log,
} from './utils.js';
import { sendEmail } from './email.js';

const PBKDF2_ITER = 600_000;
const SESSION_DAYS = 30;
const SESSION_COOKIE = '__Host-sess';
const RESET_TTL_SECONDS = 60 * 60;

// --------- Hash / verify --------------------------------------------

export async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(plain, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${bufToHex(salt)}$${bufToHex(hash)}`;
}

export async function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  const salt = hexToBuf(parts[2]);
  const expected = parts[3];
  const got = await pbkdf2(plain, salt, iter);
  return timingSafeEqual(bufToHex(got), expected);
}

async function pbkdf2(plain, salt, iter) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(plain),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    key,
    256,
  );
  return new Uint8Array(bits);
}

// --------- Sessões / cookies ----------------------------------------

function newSessionToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return bufToHex(b);
}

function sessionCookieString(token, { maxAge } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function clearSessionCookieString() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSessionFor(env, request, userId) {
  const token = newSessionToken();
  await insertSession(env, {
    id: token,
    userId,
    userAgent: request.headers.get('user-agent') || '',
    ip: clientIp(request),
    expiraDias: SESSION_DAYS,
  });
  return {
    token,
    cookie: sessionCookieString(token, { maxAge: SESSION_DAYS * 86400 }),
  };
}

/**
 * Carrega o usuário a partir do cookie de sessão. Retorna null se ausente/inválido.
 * Não lança em caso de cookie inválido (apenas null).
 */
export async function loadUserFromRequest(env, request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await getSession(env, token);
  if (!session) return null;
  const user = await getUserById(env, session.user_id);
  if (!user) return null;
  return { user, session };
}

export async function destroySession(env, sessionId) {
  await deleteSession(env, sessionId);
}

// --------- Signup / Login -------------------------------------------

/** Validações simples (devolve string com erro ou null). */
export function validateSignupInput({ nome, email, senha }) {
  if (!nome || nome.trim().length < 2) return 'Informe seu nome.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.';
  if (!senha || senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  return null;
}

export async function signupUser(env, request, { nome, email, senha, telefone }) {
  const emailNorm = normalizeEmail(email);
  const existing = await getUserByEmail(env, emailNorm);
  if (existing) return { error: 'Já existe uma conta com este e-mail.' };

  const id = newId('usr');
  const senhaHash = await hashPassword(senha);
  await insertUser(env, { id, email: emailNorm, nome: nome.trim(), senhaHash, telefone });
  log('auth', 'info', 'user.signup', { user_id: id, email: emailNorm });
  const session = await createSessionFor(env, request, id);
  return { userId: id, session };
}

export async function loginUser(env, request, { email, senha }) {
  const emailNorm = normalizeEmail(email);
  const ip = clientIp(request);

  const { byEmail, byIp } = await countRecentFailures(env, { email: emailNorm, ip });
  // Limites assimétricos: email = 5 (foco no alvo, atacante sabe o email);
  // IP = 20 (CGNAT pode trazer múltiplos usuários legítimos).
  if (byEmail >= 5 || byIp >= 20) {
    log('auth', 'warn', 'login.ratelimit', { email: emailNorm, ip, byEmail, byIp });
    return { error: 'Muitas tentativas. Tente novamente em alguns minutos.' };
  }

  const user = await getUserByEmail(env, emailNorm);
  if (!user) {
    await recordLoginAttempt(env, { email: emailNorm, ip, sucesso: false });
    return { error: 'E-mail ou senha incorretos.' };
  }
  const ok = await verifyPassword(senha, user.senha_hash);
  await recordLoginAttempt(env, { email: emailNorm, ip, sucesso: ok });
  if (!ok) return { error: 'E-mail ou senha incorretos.' };

  const session = await createSessionFor(env, request, user.id);
  log('auth', 'info', 'user.login', { user_id: user.id });
  return { user, session };
}

// --------- Reset de senha (token em KV) -----------------------------

export async function startPasswordReset(env, emailRaw, baseUrl) {
  const email = normalizeEmail(emailRaw);
  const user = await getUserByEmail(env, email);
  // Resposta sempre genérica para não enumerar contas (caller mostra mesma msg).
  if (!user) {
    log('auth', 'info', 'reset.requested.notfound', { email });
    return;
  }
  const tokenBytes = crypto.getRandomValues(new Uint8Array(24));
  const token = bufToHex(tokenBytes);
  await env.KV.put(`rst:${token}`, user.id, { expirationTtl: RESET_TTL_SECONDS });
  const link = `${baseUrl}/senha/resetar?token=${token}`;
  await sendEmail(env, {
    to: user.email,
    subject: 'Redefinição de senha — Jessica Costa Psi',
    html: `<p>Olá, ${user.nome}.</p><p>Para redefinir sua senha, acesse: <a href="${link}">${link}</a> (válido por 1 hora).</p><p>Se não foi você, ignore este e-mail.</p>`,
  });
  log('auth', 'info', 'reset.requested.ok', { user_id: user.id });
}

export async function consumePasswordResetToken(env, token) {
  if (!token) return null;
  const userId = await env.KV.get(`rst:${token}`);
  if (!userId) return null;
  return userId;
}

export async function finishPasswordReset(env, token, novaSenha) {
  const userId = await consumePasswordResetToken(env, token);
  if (!userId) return { error: 'Token inválido ou expirado.' };
  if (!novaSenha || novaSenha.length < 8) return { error: 'A senha precisa ter pelo menos 8 caracteres.' };
  const senhaHash = await hashPassword(novaSenha);
  await updateUserPassword(env, userId, senhaHash);
  // Invalida todas as sessões existentes do usuário: troca de senha implica
  // que dispositivos antigos (incluindo eventual atacante com a senha vazada)
  // devem ser deslogados.
  const revoked = await deleteSessionsByUser(env, userId);
  await env.KV.delete(`rst:${token}`);
  log('auth', 'info', 'reset.completed', { user_id: userId, sessoes_revogadas: revoked });
  return { userId };
}
