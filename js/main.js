/* ========================================
   Jessica Costa PSI - JavaScript Principal
   ======================================== */

// === Theme Toggle (light/dark) ===
// O atributo data-theme ja foi setado pelo script inline anti-FOUC no <head>.
// Aqui apenas vinculamos o botao e persistimos a preferencia.
(function () {
  function getStoredTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next);
  }
  function init() {
    // Default light: ignora prefers-color-scheme do SO; respeita apenas escolha persistida.
    var current = document.documentElement.getAttribute('data-theme');
    if (!current) current = getStoredTheme() || 'light';
    applyTheme(current);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

document.addEventListener('DOMContentLoaded', function () {

  // === Sticky Header ===
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('sticky', window.scrollY > 80);
    });
  }

  // === Menu Mobile ===
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function () {
      navMenu.classList.toggle('open');
      // Animar hamburger
      menuToggle.classList.toggle('active');
    });

    // Fechar menu ao clicar em link
    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });

    // Fechar menu ao clicar fora
    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('active');
      }
    });
  }

  // === Active Nav Link ===
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY + 100;
      sections.forEach(function (section) {
        var sectionTop = section.offsetTop;
        var sectionHeight = section.offsetHeight;
        var sectionId = section.getAttribute('id');
        var navLink = document.querySelector('.nav-menu a[href="#' + sectionId + '"]');

        if (navLink) {
          if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-menu a').forEach(function (a) {
              a.classList.remove('active');
            });
            navLink.classList.add('active');
          }
        }
      });
    });
  }

  // === Botão Voltar ao Topo ===
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('show', window.scrollY > 400);
    });

    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // === Formulário de Contato ===
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var formData = new FormData(contactForm);

      function fallbackMailto() {
        var nome = formData.get('nome') || '';
        var email = formData.get('email') || '';
        var assunto = formData.get('assunto') || '';
        var mensagem = formData.get('mensagem') || '';
        var mailtoUrl = 'mailto:psiporjessica@gmail.com'
          + '?subject=' + encodeURIComponent(assunto + ' - ' + nome)
          + '&body=' + encodeURIComponent(
            'Nome: ' + nome + '\n'
            + 'Email: ' + email + '\n'
            + 'Telefone: ' + (formData.get('telefone') || '') + '\n\n'
            + mensagem
          );
        window.location.href = mailtoUrl;
      }

      // Formspree ainda não configurado — pula o POST e abre direto o mailto.
      if (!contactForm.action || contactForm.action.indexOf('YOUR_FORM_ID') !== -1) {
        fallbackMailto();
        return;
      }

      fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
      .then(function (response) {
        if (response.ok) {
          if (formSuccess) formSuccess.classList.add('show');
          contactForm.reset();
          setTimeout(function () {
            formSuccess.classList.remove('show');
          }, 5000);
        } else {
          fallbackMailto();
        }
      })
      .catch(fallbackMailto);
    });
  }

  // === Mensagem padrão nos links do WhatsApp ===
  // Identifica que o visitante veio do site e, quando possível, de qual página/artigo.
  (function () {
    function buildWhatsAppMessage() {
      var path = (window.location.pathname || '').toLowerCase();
      var origem = 'Site Jessica Costa PSI';

      if (path.indexOf('/artigos/') !== -1) {
        var h1 = document.querySelector('h1');
        var titulo = h1 ? h1.textContent.trim() : (document.title || '').split('-')[0].trim();
        return 'Olá, Jessica! Vim pelo ' + origem + ', li o artigo "' + titulo + '" e gostaria de mais informações sobre os atendimentos.';
      }
      if (path.indexOf('biografia') !== -1) {
        return 'Olá, Jessica! Vim pelo ' + origem + ' (página Biografia) e gostaria de agendar uma consulta.';
      }
      if (path.indexOf('manifesto') !== -1) {
        return 'Olá, Jessica! Li o seu manifesto no site e me identifiquei. Gostaria de conversar sobre um atendimento.';
      }
      if (path.indexOf('blog') !== -1) {
        return 'Olá, Jessica! Vim pelo ' + origem + ' (página Blog) e gostaria de mais informações sobre os atendimentos.';
      }
      return 'Olá, Jessica! Vim pelo ' + origem + ' e gostaria de agendar uma consulta.';
    }

    var mensagem = encodeURIComponent(buildWhatsAppMessage());
    var links = document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]');
    links.forEach(function (link) {
      try {
        var url = new URL(link.href);
        url.searchParams.set('text', decodeURIComponent(mensagem));
        link.href = url.toString();
      } catch (e) {
        var sep = link.href.indexOf('?') === -1 ? '?' : '&';
        link.href = link.href + sep + 'text=' + mensagem;
      }
    });
  })();

  // === Animação de entrada (Intersection Observer) ===
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  document.querySelectorAll('.card, .blog-card, .depoimento-card, .local-card, .diferencial-badge, .timeline-item').forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

});
