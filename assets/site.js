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

  // Static-host form handler (GitHub Pages compatible).
  // Contact uses FormSubmit AJAX. Career uses native multipart POST for reliable file uploads.
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

    const formType = form.dataset.form || 'form';
    const recipient = ((formType === 'career' ? (cfg.careerFormRecipient || cfg.formRecipient) : cfg.formRecipient) || '').trim();
    const configuredRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) && !recipient.includes('YOUR_');
    const staticMode = form.hasAttribute('data-static-form');
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    let started = false;

    form.addEventListener('focusin', () => {
      if (!started) { started = true; track('form_start', {form_type: formType}); }
    });

    if (staticMode && formType === 'career') {
      if (configuredRecipient) {
        form.action = 'https://formsubmit.co/' + encodeURIComponent(recipient);
        form.target = '_self';
        const meta = (name, value) => {
          let input = form.querySelector('input[name="'+name+'"]');
          if (!input) { input = document.createElement('input'); input.type='hidden'; input.name=name; form.appendChild(input); }
          input.value=value;
        };
        meta('_subject', 'B2BFX Career Application');
        meta('_template', 'table');
        meta('_url', location.href);
        if (cfg.domain && /^https?:\/\//i.test(cfg.domain) && !cfg.domain.includes('YOUR-USERNAME')) {
          meta('_next', cfg.domain.replace(/\/$/,'') + '/careers.html?applied=1');
        }
      }

      form.addEventListener('submit', e => {
        if (!configuredRecipient) {
          e.preventDefault();
          if (status) status.textContent = 'Form is not configured yet. Add your email in assets/config.js.';
          return;
        }
        track('generate_lead', {form_type: formType});
        if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); }
      });
      return;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (!configuredRecipient && staticMode) {
        if (status) status.textContent = 'Form is not configured yet. Add your email in assets/config.js.';
        return;
      }

      if (status) status.textContent = 'Sending…';
      if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); }

      try {
        const endpoint = 'https://formsubmit.co/ajax/' + encodeURIComponent(recipient);
        const payload = new FormData(form);
        payload.append('_subject', 'B2BFX Project Enquiry');
        payload.append('_template', 'table');
        payload.append('_url', location.href);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: payload,
          headers: {'Accept':'application/json'}
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || (data.success !== 'true' && data.success !== true)) {
          throw new Error((data && (data.message || data.error)) || 'Unable to submit right now. Please try again.');
        }

        if (status) status.textContent = 'Thanks — your project enquiry has been sent.';
        track('generate_lead', {form_type: formType});
        form.reset();
      } catch (err) {
        if (status) status.textContent = err.message || 'Something went wrong. Please try again.';
      } finally {
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
      }
    });
  });

  document.querySelectorAll('[data-career-apply]').forEach(a => {
    a.addEventListener('click', () => track('career_apply_click', {label: (a.textContent || '').trim().slice(0,80)}));
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


  // Career application route: preselect a role when careers links pass ?role=.
  const careerRole = new URLSearchParams(location.search).get('role');
  if (careerRole) {
    const roleSelect = document.querySelector('[data-form="career"] select[name="role"]');
    if (roleSelect) {
      const wantedRole = careerRole.trim().toLowerCase();
      const option = [...roleSelect.options].find(o => o.textContent.trim().toLowerCase() === wantedRole);
      if (option) { roleSelect.value = option.value; }
    }
  }

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
