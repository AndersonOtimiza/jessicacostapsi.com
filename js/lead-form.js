/**
 * Lead capture form para o site da Jessica Costa Psi.
 * Padrao adaptado do `lead-cta.js` da Otimiza (otimizapro.com).
 *
 * Captura: nome, telefone, email, motivo (segmento), idade da crianca
 * — TODOS OBRIGATORIOS desde 2026-05-18 (decisao Anderson).
 * Envia para o CRM da Otimiza (https://novo-crm.otimizapro.com/api/leads)
 * e depois redireciona para WhatsApp com mensagem pre-populada com o nome do lead.
 *
 * Como usar no HTML:
 *   <form class="lcta-form" data-lead-form data-lead-source="jessica-home" data-lead-type="primeira-consulta">
 *     ...campos...
 *   </form>
 *
 * Atributos:
 *   data-lead-form           — marker obrigatorio
 *   data-lead-source         — ex.: "jessica-home", "jessica-landing-avaliacao"
 *   data-lead-type           — ex.: "primeira-consulta", "avaliacao-neuropsicologica", "duvida"
 *
 * Sticky WA button: injetado automaticamente em todas as paginas.
 */
(function () {
  'use strict';

  // Endpoint relativo — Cloudflare Pages Function em functions/api/lead.js
  // que server-to-server envia ao CRM da Otimiza. Resolve o CORS.
  var CRM_ENDPOINT = '/api/lead';
  var WHATSAPP_NUMBER = '5521978082882';

  // ------ Sticky WhatsApp button ----------------------------------
  function injectStickyWA() {
    if (document.querySelector('.sticky-wa')) return;
    var btn = document.createElement('a');
    btn.className = 'sticky-wa';
    btn.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Olá, Jessica! Vim pelo site jessicacostapsi.com.');
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Falar com Jessica no WhatsApp');
    btn.innerHTML = '<span class="sticky-wa-icon">💬</span> <span>WhatsApp</span>';
    document.body.appendChild(btn);
  }

  // ------ UTM / gclid capture ------------------------------------
  function getUTM(name) {
    try {
      var t = new URLSearchParams(window.location.search);
      return t.get(name) || undefined;
    } catch (e) {
      return undefined;
    }
  }

  function getGclid() {
    var g = getUTM('gclid');
    if (g) {
      try {
        localStorage.setItem('jcp_gclid', JSON.stringify({ v: g, t: Date.now() }));
      } catch (e) {}
      return g;
    }
    try {
      var stored = JSON.parse(localStorage.getItem('jcp_gclid') || 'null');
      if (stored && stored.v && Date.now() - stored.t < 90 * 86400000) return stored.v;
    } catch (e) {}
    return undefined;
  }

  // ------ Visitor ID -----------------------------------------------
  function getVisitorId() {
    try {
      var vid = localStorage.getItem('jcp_visitor_id');
      if (!vid) {
        vid =
          'v_' +
          Date.now().toString(36) +
          '_' +
          Math.random().toString(36).substr(2, 8);
        localStorage.setItem('jcp_visitor_id', vid);
      }
      return vid;
    } catch (e) {
      return null;
    }
  }

  // ------ Form submission ------------------------------------------
  function bindForm(form) {
    if (form.dataset.leadBound === '1') return;
    form.dataset.leadBound = '1';

    // Newsletter (email-only): fluxo dedicado, sem redirect WhatsApp.
    if (form.dataset.leadType === 'newsletter') {
      bindNewsletterForm(form);
      return;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('.lcta-btn');
      var msgBox = form.querySelector('.lcta-msg');
      var formData = new FormData(form);
      var name = (formData.get('name') || '').toString().trim();
      var phone = (formData.get('phone') || '').toString().trim();
      var email = (formData.get('email') || '').toString().trim();
      var motivo = (formData.get('motivo') || '').toString().trim();
      var crianca_idade = (formData.get('crianca_idade') || '').toString().trim();
      var mensagem = (formData.get('mensagem') || '').toString().trim();

      // Campos obrigatorios sao condicionais a presenca no form:
      // nem todo form tem select de motivo ou idade da crianca (ex.: form de FAQ).
      var hasField = function (n) {
        return !!form.querySelector('[name="' + n + '"]');
      };

      // Validacao basica — name/phone/email sempre obrigatorios
      var phoneDigits = phone.replace(/\D/g, '');
      if (!name) {
        showMsg(msgBox, 'Por favor informe seu nome.', 'error');
        return;
      }
      if (phoneDigits.length < 10) {
        showMsg(msgBox, 'Informe seu WhatsApp com DDD (mínimo 10 dígitos).', 'error');
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg(msgBox, 'Informe um e-mail válido.', 'error');
        return;
      }
      if (hasField('crianca_idade') && !crianca_idade) {
        showMsg(msgBox, 'Informe a idade da criança.', 'error');
        return;
      }
      if (hasField('motivo') && !motivo) {
        showMsg(msgBox, 'Selecione o motivo do contato.', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      // Payload no formato do CRM Otimiza
      var leadType = form.dataset.leadType || motivo || 'primeira-consulta';
      var formSource = form.dataset.leadSource || 'jessica-site';
      // Mapa de tipos para texto legivel (vai pra company — CRM rejeita employees > 10c)
      var typeLabel = {
        'primeira-consulta': 'Primeira Consulta',
        'avaliacao-neuropsicologica': 'Avaliação Neuropsicológica',
        'duvida': 'Dúvida / Orientação',
        'outro': 'Outro',
      };
      var companyText = 'Jessica Costa Psi · ' + (typeLabel[leadType] || leadType);
      var payload = {
        name: name,
        email: email, // 2026-05-18: email agora e obrigatorio no form, fallback removido
        company: companyText, // discriminador legivel no CRM (em vez de "Paciente Particular" fixo)
        phone: phoneDigits,
        // employees: campo do CRM aceita apenas valores curtos (1-10, 11-50, etc) — omitido em B2C
        formSource: formSource,
        formPage: window.location.origin + window.location.pathname,
        visitorId: getVisitorId(),
        source: getUTM('utm_source'),
        medium: getUTM('utm_medium'),
        campaign: getUTM('utm_campaign'),
        term: getUTM('utm_term'),
        content: getUTM('utm_content'),
        gclid: getGclid(),
        // Metadata especifica do site da Jessica (custom)
        meta: {
          siteOrigem: 'jessicacostapsi.com',
          tipoSolicitacao: leadType,
          criancaIdade: crianca_idade || undefined,
          mensagem: mensagem || undefined,
        },
      };

      // POST com fallback gracioso — mesmo se CRM falhar, WhatsApp abre
      var leadId = null;
      try {
        var resp = await fetch(CRM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await resp.json().catch(function () {
          return {};
        });
        if (data && data.success && data.leadId) leadId = data.leadId;
      } catch (err) {
        // Falha silenciosa — nao bloqueia o usuario
        if (window.console && console.warn) {
          console.warn('CRM lead POST falhou:', err);
        }
      }

      // Mensagem prepopulada WhatsApp — usa motivo (select) ou leadType (dataset)
      var intent = motivo || leadType;
      var waMsg = 'Olá, Jessica! Sou ' + name + '.';
      if (intent === 'avaliacao-neuropsicologica') {
        waMsg += ' Tenho interesse em avaliação neuropsicológica.';
      } else if (intent === 'primeira-consulta') {
        waMsg += ' Gostaria de agendar uma primeira consulta.';
      } else if (intent === 'duvida') {
        waMsg += ' Tenho uma dúvida que gostaria de esclarecer.';
      } else if (intent) {
        waMsg += ' Vim pelo site para falar sobre: ' + intent + '.';
      }
      if (crianca_idade) {
        waMsg += ' Idade da criança: ' + crianca_idade + '.';
      }
      if (mensagem) {
        waMsg += ' Minha dúvida: ' + mensagem;
      }

      var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waMsg);

      showMsg(msgBox, 'Pronto! Abrindo WhatsApp...', 'success');

      // Pequeno delay pra usuario ver mensagem de sucesso
      setTimeout(function () {
        window.location.href = waUrl;
      }, 600);
    });
  }

  // ------ Newsletter form (email-only, no WhatsApp redirect) -------
  // Fluxo paralelo ao bindForm padrao para forms data-lead-type="newsletter".
  // - Campo unico de email (required); nome derivado de email.split('@')[0]
  // - Phone: enviamos placeholder "00000000000" (Pages Function exige truthy)
  // - Sucesso: substitui o form por mensagem de confirmacao inline
  // - NAO redireciona pro WhatsApp
  function bindNewsletterForm(form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"], .footer-mega-news-btn, .lcta-btn');
      var msgBox = ensureNewsletterMsgBox(form);
      var formData = new FormData(form);
      var email = (formData.get('email') || '').toString().trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg(msgBox, 'Informe um email válido.', 'error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.dataset.origText = btn.textContent;
        btn.textContent = 'Enviando...';
      }

      var formSource = form.dataset.leadSource || 'jessica-newsletter-footer';
      var derivedName = email.split('@')[0] || 'Inscrito Newsletter';
      var payload = {
        // Nome derivado (Pages Function exige truthy); pode ser sobrescrito no CRM
        name: derivedName,
        email: email,
        // Discriminador legivel para o time filtrar no CRM
        company: 'Jessica Costa Psi · Newsletter',
        // Pages Function exige `phone` truthy. Placeholder fixo identificavel.
        phone: '00000000000',
        formSource: formSource,
        formPage: window.location.origin + window.location.pathname,
        visitorId: getVisitorId(),
        source: getUTM('utm_source'),
        medium: getUTM('utm_medium'),
        campaign: getUTM('utm_campaign'),
        term: getUTM('utm_term'),
        content: getUTM('utm_content'),
        gclid: getGclid(),
        meta: {
          siteOrigem: 'jessicacostapsi.com',
          tipoSolicitacao: 'newsletter',
          newsletter: true,
        },
      };

      var ok = false;
      try {
        var resp = await fetch(CRM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // Considera sucesso se a Pages Function aceitou (2xx) — CRM upstream
        // pode rejeitar o phone placeholder e ainda retornar erro especifico,
        // mas pra UX do usuario nao bloqueia: o registro fica no log da Function.
        ok = resp.ok;
      } catch (err) {
        if (window.console && console.warn) {
          console.warn('Newsletter POST falhou:', err);
        }
      }

      if (btn) {
        btn.disabled = false;
        if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
      }

      // Substitui o conteudo do form por mensagem de confirmacao inline.
      // Mesmo se o POST falhou, mostramos sucesso (lead-form.js segue padrao
      // gracioso do fluxo principal — falha silenciosa nao bloqueia usuario).
      renderNewsletterSuccess(form);
    });
  }

  function ensureNewsletterMsgBox(form) {
    var box = form.querySelector('.lcta-msg');
    if (box) return box;
    box = document.createElement('div');
    box.className = 'lcta-msg';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    form.appendChild(box);
    return box;
  }

  function renderNewsletterSuccess(form) {
    // Esconde inputs/botao e renderiza confirmacao no lugar
    var row = form.querySelector('.footer-mega-news-row');
    if (row) row.style.display = 'none';
    var box = ensureNewsletterMsgBox(form);
    box.textContent = 'Inscrição confirmada — você receberá os próximos conteúdos da Jessica.';
    box.className = 'lcta-msg lcta-msg--success';
    box.style.display = 'block';
  }

  function showMsg(box, text, kind) {
    if (!box) return;
    box.textContent = text;
    box.className = 'lcta-msg lcta-msg--' + (kind === 'success' ? 'success' : 'error');
    box.style.display = 'block';
  }

  // ------ Init -----------------------------------------------------
  function init() {
    injectStickyWA();
    document.querySelectorAll('form[data-lead-form]').forEach(bindForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
