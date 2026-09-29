document.documentElement.classList.add('js-ready');

(() => {
  const cfg = window.B2BFX_CONFIG || {};
  const path = location.pathname.replace(/\/+/g,'/');
  const page = (path.split('/').pop() || 'index.html').toLowerCase();
  const isNested = /\/(services|work|blog)\//.test(path);

  // Google Analytics (optional; only loads after an ID is supplied).
  const gaId = (cfg.googleAnalyticsId || '').trim();
  if (/^G-[A-Z0-9]+$/.test(gaId)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
  }

  // Google Tag Manager (optional; only loads after an ID is supplied).
  const gtmId = (cfg.googleTagManagerId || '').trim();
  if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({'gtm.start': new Date().getTime(), event:'gtm.js'});
    const g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);
    document.head.appendChild(g);
  }

  function track(eventName, params={}) {
    if (typeof window.gtag === 'function') window.gtag('event', eventName, params);
  }

  // Current-page navigation state.
  document.querySelectorAll('[data-nav]').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop().split('#')[0].toLowerCase();
    const target = href || 'index.html';
    if (target === page) { a.classList.add('active'); a.setAttribute('aria-current','page'); }
  });

  // Mobile drawer.
  const toggle = document.querySelector('.mobile-menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  if (toggle && drawer) {
    const close = () => {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    };
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  // Dynamic contact/career links.
  document.querySelectorAll('[data-contact-email]').forEach(a => {
    const email = (cfg.contactEmail || '').trim();
    if (email && !email.includes('YOUR_')) {
      a.href = 'mailto:' + email;
      a.textContent = a.dataset.contactLabel || email;
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled','true');
      a.classList.add('is-configured-off');
    }
  });
  document.querySelectorAll('[data-career-email]').forEach(a => {
    const email = (cfg.careerEmail || '').trim();
    if (email && !email.includes('YOUR_')) {
      a.href = 'mailto:' + email;
      a.textContent = a.dataset.careerLabel || email;
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled','true');
      a.classList.add('is-configured-off');
    }
  });

  // Social / WhatsApp links. Hidden automatically until real URLs are configured.
  const socials = {
    instagram: cfg.instagram,
    linkedin: cfg.linkedin,
    youtube: cfg.youtube,
    whatsapp: cfg.whatsapp
  };
  document.querySelectorAll('[data-social]').forEach(a => {
    const key = a.getAttribute('data-social');
    const url = (socials[key] || '').trim();
    const bare = new Set(['https://instagram.com/','https://linkedin.com/','https://youtube.com/','https://wa.me/']);
    if (url && /^https?:\/\//i.test(url) && !bare.has(url)) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.removeAttribute('hidden');
    } else {
      a.setAttribute('hidden','hidden');
    }
  });

  // Floating WhatsApp action appears only when configured.
  const wa = document.querySelector('[data-whatsapp-float]');
  if (wa) {
    const url = (cfg.whatsapp || '').trim();
    if (url && /^https?:\/\//i.test(url) && url !== 'https://wa.me/') {
      wa.href = url;
      wa.removeAttribute('hidden');
    } else {
      wa.setAttribute('hidden','hidden');
    }
  }

  // Lightweight attribution: keep the landing page/referrer/UTM context with each form submission.
  const qs = new URLSearchParams(location.search);
  const attribution = {
    page: location.href,
    referrer: document.referrer || '',
    utm_source: qs.get('utm_source') || '',
    utm_medium: qs.get('utm_medium') || '',
    utm_campaign: qs.get('utm_campaign') || ''
  };

  // Shared form handler for the PHP endpoints.
  document.querySelectorAll('form[data-form]').forEach(form => {
    Object.entries(attribution).forEach(([key, value]) => {
      let field = form.querySelector('input[name="'+key+'"]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = key;
        form.appendChild(field);
      }
      field.value = value;
    });
    let started = false;
    form.addEventListener('focusin', () => {
      if (!started) { started = true; track('form_start', {form_type: form.dataset.form || 'form'}); }
    });
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (status) status.textContent = 'Sending…';
      if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); }
      try {
        const response = await fetch(form.getAttribute('action') || '', {
          method: 'POST',
          body: new FormData(form),
          headers: {'X-Requested-With':'fetch', 'Accept':'application/json'}
        });
        const data = await response.json().catch(() => ({ok:false, message:'Unexpected server response.'}));
        if (!response.ok || !data.ok) throw new Error(data.message || 'Could not submit the form.');
        if (status) status.textContent = data.message || 'Thanks — your message has been sent.';
        const formType = form.dataset.form || 'form';
        track('generate_lead', {form_type: formType});
        form.reset();
      } catch (err) {
        if (status) status.textContent = err.message || 'Something went wrong. Please try again.';
      } finally {
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
      }
    });
  });

  // CTA / outbound-link analytics.
  document.querySelectorAll('a[href]').forEach(a => {
    a.addEventListener('click', () => {
      const href = a.href || '';
      const label = (a.textContent || '').trim().slice(0,80);
      if (a.matches('.btn,.navbtn,.cta,.project-link') || /^https?:\/\//.test(href) && !href.includes(location.hostname)) {
        track('cta_click', {label, href});
      }
      if (a.matches('[data-social="whatsapp"], [data-whatsapp-float]')) {
        track('whatsapp_click', {label, href});
      }
    });
  });


  // Project-intent links: prefill the contact form from engagement cards.
  const intentParams = new URLSearchParams(location.search);
  const intentService = intentParams.get('service');
  if (intentService) {
    const serviceSelect = document.querySelector('#service[name="service"]');
    if (serviceSelect) {
      const wanted = intentService.trim().toLowerCase();
      const option = [...serviceSelect.options].find(o => o.textContent.trim().toLowerCase() === wanted);
      if (option) serviceSelect.value = option.value;
      const label = document.querySelector('.contact-sub');
      if (label) label.textContent = 'You are starting from: ' + option?.textContent + '. Add the details below and we will shape the scope with you.';
    }
    track('project_intent', {service: intentService.slice(0,80)});
  }

  // Contact action analytics.
  document.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]').forEach(a => {
    a.addEventListener('click', () => track('contact_action', {type: a.href.split(':')[0]}));
  });

  // Shared year marker.
  document.querySelectorAll('[data-year]').forEach(x => x.textContent = new Date().getFullYear());
})();
