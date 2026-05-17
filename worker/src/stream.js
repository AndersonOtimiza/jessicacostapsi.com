// =====================================================================
// stream.js — assinatura de URLs do Cloudflare Stream.
//
// Estratégia: usar o "Stream Signing Keys" do CF (RS256 JWT). Anderson
// gera um par em Stream → Settings → Signing keys, salva:
//   - CF_STREAM_ACCOUNT_ID         (string, account id da CF)
//   - CF_STREAM_SIGNING_KEY_ID     (string, "pk_***")
//   - CF_STREAM_SIGNING_KEY_JWK    (JSON da chave PRIVADA, RSASHA256)
//   - CF_STREAM_SUBDOMAIN          (string, "customer-<code>.cloudflarestream.com")
//
// O subdomain é obrigatório. O domínio antigo `videodelivery.net` é
// deprecated pela CF e não aceita todos os formatos de signed token.
// Sem subdomain → placeholder amigável (e log de warning).
//
// Aqui assinamos localmente um JWT com claim "exp" + "kid" + "sub"=videoUid
// e usamos com `https://customer-<code>.cloudflarestream.com/<jwt>/iframe`
// — o Stream também aceita `iframe?signed=...`, mas o esquema canônico
// é com o JWT no path.
//
// Fallback amigável: se o vídeo tem stream_video_uid === 'placeholder' OU
// se os secrets não estão configurados, retornamos { kind: 'placeholder' }
// e a página renderiza um aviso "Vídeo em produção".
// =====================================================================

import { log } from './utils.js';

/**
 * @returns {Promise<{ kind: 'placeholder' } | { kind: 'signed', iframeSrc: string, posterUrl: string|null }>}
 */
export async function generateSignedStreamUrl(env, videoUid, { expSeconds = 4 * 60 * 60 } = {}) {
  if (!videoUid || videoUid === 'placeholder') {
    return { kind: 'placeholder' };
  }
  const accountId = env.CF_STREAM_ACCOUNT_ID;
  const keyId = env.CF_STREAM_SIGNING_KEY_ID;
  const jwkStr = env.CF_STREAM_SIGNING_KEY_JWK;
  const subdomain = env.CF_STREAM_SUBDOMAIN;
  if (!accountId || !keyId || !jwkStr || !subdomain) {
    log('stream', 'warn', 'signed.missing-secrets', {
      missing: [
        !accountId && 'CF_STREAM_ACCOUNT_ID',
        !keyId && 'CF_STREAM_SIGNING_KEY_ID',
        !jwkStr && 'CF_STREAM_SIGNING_KEY_JWK',
        !subdomain && 'CF_STREAM_SUBDOMAIN',
      ].filter(Boolean),
    });
    return { kind: 'placeholder' };
  }

  let jwk;
  try {
    jwk = typeof jwkStr === 'string' ? JSON.parse(jwkStr) : jwkStr;
  } catch (err) {
    log('stream', 'error', 'signed.jwk-parse', { err: String(err) });
    return { kind: 'placeholder' };
  }

  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const header = { alg: 'RS256', kid: keyId, typ: 'JWT' };
  const payload = { sub: videoUid, kid: keyId, exp };

  const enc = (obj) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const toSign = `${enc(header)}.${enc(payload)}`;

  let jwt;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      new TextEncoder().encode(toSign),
    );
    jwt = `${toSign}.${base64UrlEncode(new Uint8Array(sig))}`;
  } catch (err) {
    log('stream', 'error', 'signed.sign-failed', { err: String(err) });
    return { kind: 'placeholder' };
  }

  // Subdomain canônico customer-<code>.cloudflarestream.com (já validado acima).
  const iframeSrc = `https://${subdomain}/${jwt}/iframe`;
  const posterUrl = `https://${subdomain}/${jwt}/thumbnails/thumbnail.jpg`;

  return { kind: 'signed', iframeSrc, posterUrl };
}

function base64UrlEncode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
