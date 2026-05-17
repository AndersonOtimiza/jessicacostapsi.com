// =====================================================================
// utils.js — helpers compartilhados.
// =====================================================================

/** Escapa texto para inserção segura em HTML. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa texto para uso em atributo HTML (mesmo conjunto). */
export const escapeAttr = escapeHtml;

/** Formata centavos como R$ pt-BR. */
export function formatBRL(centavos) {
  const v = (Number(centavos) || 0) / 100;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Gera ID curto (timestamp + 8 bytes aleatórios em base36). */
export function newId(prefix = '') {
  const t = Date.now().toString(36);
  const r = crypto.getRandomValues(new Uint8Array(8));
  const rand = Array.from(r, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
  return `${prefix}${prefix ? '_' : ''}${t}_${rand}`;
}

/** Converte ArrayBuffer/Uint8Array em hex. */
export function bufToHex(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < u8.length; i++) out += u8[i].toString(16).padStart(2, '0');
  return out;
}

/** Converte hex string em Uint8Array. */
export function hexToBuf(hex) {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array(0);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Comparação em tempo constante (apenas strings de mesmo tamanho). */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** HMAC-SHA256 de uma string com uma chave (também string). Retorna hex. */
export async function hmacSHA256Hex(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return bufToHex(sig);
}

/** Resposta JSON padrão. */
export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

/** Resposta HTML padrão. */
export function htmlResponse(html, init = {}) {
  return new Response(html, {
    status: init.status || 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': init.cache || 'no-store',
      ...(init.headers || {}),
    },
  });
}

/** Redirect 302 padrão. */
export function redirect(url, status = 302, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: { location: url, 'cache-control': 'no-store', ...extraHeaders },
  });
}

/** Parse simples de cookies do header Cookie. */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** Helper para ler form-encoded body. */
export async function readForm(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await request.formData();
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = typeof v === 'string' ? v : '';
    return obj;
  }
  if (ct.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }
  return {};
}

/** Normaliza email (lowercase + trim). */
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Slug seguro a partir de texto livre. */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** IP do cliente (Cloudflare). */
export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
}

/** Log estruturado. */
export function log(scope, level, msg, extra = {}) {
  const payload = { ts: new Date().toISOString(), scope, level, msg, ...extra };
  // Workers concatena JSON em uma linha — visível em wrangler tail
  console.log(JSON.stringify(payload));
}
