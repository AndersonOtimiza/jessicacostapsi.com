/* ========================================
   Jessica Costa PSI - JavaScript Principal
   ======================================== */

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
          // Fallback: abrir mailto
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
      })
      .catch(function () {
        // Fallback para mailto se Formspree não funcionar
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
      });
    });
  }

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
