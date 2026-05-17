/**
 * Pages Function: proxy para enviar leads ao CRM da Otimiza
 *
 * Resolve o CORS: o browser do site da Jessica chama esse endpoint relativo
 * (mesmo origin), e este worker server-to-server chama o CRM do otimizapro.com.
 *
 * Endpoint: POST /api/lead
 * Body: payload exato esperado pelo CRM (gerado em js/lead-form.js)
 *
 * Configuracao opcional:
 * - Definir env var CRM_LEAD_URL no Cloudflare Pages para override do endpoint
 *   (default: https://novo-crm.otimizapro.com/api/leads)
 */

const CRM_DEFAULT = 'https://novo-crm.otimizapro.com/api/leads';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const isNewsletter =
    body?.meta?.newsletter === true ||
    body?.meta?.tipoSolicitacao === 'newsletter' ||
    (typeof body?.formSource === 'string' && body.formSource.includes('newsletter'));

  // Sanity check minimo (newsletter dispensa phone)
  if (!body.name || !body.formSource || (!isNewsletter && !body.phone)) {
    return jsonResp({ success: false, error: 'Missing required fields' }, 400);
  }

  // Enrichment server-side opcional
  const cfData = request.cf || {};
  const enrichedBody = {
    ...body,
    // Anexa metadados de Cloudflare (geo, ASN) ao payload
    cfMeta: {
      country: cfData.country,
      city: cfData.city,
      region: cfData.region,
      asn: cfData.asn,
      ip: request.headers.get('cf-connecting-ip') || undefined,
    },
  };

  // Newsletter: nao envia phone placeholder upstream; CRM trata como inscricao
  if (isNewsletter && (!enrichedBody.phone || enrichedBody.phone === '00000000000')) {
    delete enrichedBody.phone;
  }

  const crmUrl = env?.CRM_LEAD_URL || CRM_DEFAULT;

  try {
    const upstream = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'jessicacostapsi-pages-function/1.0',
      },
      body: JSON.stringify(enrichedBody),
    });

    const data = await upstream.json().catch(() => ({ success: false, error: 'Upstream returned non-JSON' }));

    return jsonResp(data, upstream.status);
  } catch (err) {
    return jsonResp(
      {
        success: false,
        error: 'CRM upstream unreachable',
        message: String(err && err.message ? err.message : err),
      },
      502
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// fallback: bloqueia outros metodos
export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'POST') return onRequestPost({ request });
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
