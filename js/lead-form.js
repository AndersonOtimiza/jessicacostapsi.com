/**
 * Lead capture form para o site da Jessica Costa Psi.
 * Padrao adaptado do `lead-cta.js` da Otimiza (otimizapro.com).
 *
 * Captura: nome, telefone (obrigatorio), email (opcional), motivo (segmento),
 * idade da crianca (opcional). Envia para o CRM da Otimiza
 * (https://novo-crm.otimizapro.com/api/leads) e depois redireciona
 * para WhatsApp com mensagem pre-populada com o nome do lead.
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

  var CRM_ENDPOINT = 'https://novo-crm.otimizapro.com/api/leads';
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

      // Validacao basica
      var phoneDigits = phone.replace(/\D/g, '');
      if (!name || phoneDigits.length < 10) {
        showMsg(msgBox, 'Por favor preencha seu nome e WhatsApp com DDD.', 'error');
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg(msgBox, 'Email invalido. Pode deixar em branco se preferir.', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      // Payload no formato do CRM Otimiza
      var leadType = form.dataset.leadType || motivo || 'primeira-consulta';
      var formSource = form.dataset.leadSource || 'jessica-site';
      var payload = {
        name: name,
        email: email || (phoneDigits + '@jessica.lead'),
        company: 'Paciente Particular', // CRM exige company; fixo p/ B2C
        phone: phoneDigits,
        employees: motivo || leadType, // reaproveita campo existente do CRM
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

      // Mensagem prepopulada WhatsApp
      var waMsg = 'Olá, Jessica! Sou ' + name + '.';
      if (motivo === 'avaliacao-neuropsicologica') {
        waMsg += ' Tenho interesse em avaliação neuropsicológica para meu filho(a).';
      } else if (motivo === 'primeira-consulta') {
        waMsg += ' Gostaria de agendar uma primeira consulta.';
      } else if (motivo === 'duvida') {
        waMsg += ' Tenho uma dúvida que gostaria de esclarecer.';
      } else if (motivo) {
        waMsg += ' Vim pelo site para falar sobre: ' + motivo + '.';
      }
      if (crianca_idade) {
        waMsg += ' Idade da criança: ' + crianca_idade + '.';
      }

      var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waMsg);

      showMsg(msgBox, 'Pronto! Abrindo WhatsApp...', 'success');

      // Pequeno delay pra usuario ver mensagem de sucesso
      setTimeout(function () {
        window.location.href = waUrl;
      }, 600);
    });
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
