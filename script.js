document.documentElement.classList.add('js-enabled');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('is-open', !isOpen);
    menuButton.querySelector('.sr-only').textContent = isOpen ? 'Open navigation' : 'Close navigation';
  });

  const closeMenu = (restoreFocus = false) => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    menuButton.querySelector('.sr-only').textContent = 'Open navigation';
    if (restoreFocus) menuButton.focus();
  };
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', () => closeMenu());
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
}

document.querySelectorAll('[data-story-carousel]').forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll('[data-story-slide]'));
  const dots = Array.from(carousel.querySelectorAll('[data-story-dot]'));
  const status = carousel.querySelector('[data-story-status]');
  const previous = carousel.querySelector('[data-story-previous]');
  const next = carousel.querySelector('[data-story-next]');
  let current = 0;

  const showSlide = (index, moveFocus = false) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.hidden = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (status) status.textContent = `Step ${current + 1} of ${slides.length}`;
    if (moveFocus) slides[current].focus();
  };

  previous?.addEventListener('click', () => showSlide(current - 1));
  next?.addEventListener('click', () => showSlide(current + 1));
  dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => showSlide(dotIndex)));
  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(current - 1, true);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(current + 1, true);
    }
  });
  showSlide(0);
});

document.querySelectorAll('[data-panel-slideshow]').forEach((slideshow) => {
  const slides = Array.from(slideshow.querySelectorAll('[data-panel-slide]'));
  const tabs = Array.from(slideshow.querySelectorAll('[data-panel-tab]'));
  const status = slideshow.querySelector('[data-panel-status]');
  let current = 0;

  const showPage = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
    });
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === current;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (status) status.textContent = `Page ${current + 1} of ${slides.length}`;
  };

  tabs.forEach((tab, index) => tab.addEventListener('click', () => showPage(index)));
  slideshow.querySelector('[data-panel-previous]')?.addEventListener('click', () => showPage(current - 1));
  slideshow.querySelector('[data-panel-next]')?.addEventListener('click', () => showPage(current + 1));
  slideshow.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showPage(current - 1);
    if (event.key === 'ArrowRight') showPage(current + 1);
  });
  showPage(0);
});

document.querySelectorAll('[data-news-slider]').forEach((slider) => {
  const stories = Array.from(slider.querySelectorAll('[data-news-story]'));
  const selectors = Array.from(slider.querySelectorAll('[data-story-select]'));
  const dotsHost = slider.querySelector('[data-news-dots]');
  const counter = slider.querySelector('[data-news-counter]');
  let activeStory = 0;
  let activeSlide = 0;

  const activeSlides = () => Array.from(stories[activeStory].querySelectorAll('[data-news-slide]'));
  const renderSlide = () => {
    const slides = activeSlides();
    activeSlide = (activeSlide + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === activeSlide;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
    });
    dotsHost.replaceChildren(...slides.map((_, index) => {
      const dot = document.createElement('i');
      dot.classList.toggle('is-active', index === activeSlide);
      dot.setAttribute('aria-hidden', 'true');
      return dot;
    }));
    if (counter) counter.textContent = `${activeSlide + 1} / ${slides.length}`;
  };
  const showStory = (index) => {
    activeStory = index;
    activeSlide = 0;
    stories.forEach((story, storyIndex) => {
      const active = storyIndex === activeStory;
      story.hidden = !active;
      story.classList.toggle('is-active', active);
    });
    selectors.forEach((selector) => selector.classList.toggle('is-active', Number(selector.dataset.storySelect) === activeStory));
    renderSlide();
  };

  selectors.forEach((selector) => selector.addEventListener('click', () => showStory(Number(selector.dataset.storySelect))));
  slider.querySelector('[data-news-previous]')?.addEventListener('click', () => { activeSlide -= 1; renderSlide(); });
  slider.querySelector('[data-news-next]')?.addEventListener('click', () => { activeSlide += 1; renderSlide(); });
  slider.querySelectorAll('[data-story-filter]').forEach((filter) => filter.addEventListener('click', () => {
    const category = filter.dataset.storyFilter;
    slider.querySelectorAll('[data-story-filter]').forEach((item) => item.classList.toggle('is-active', item === filter));
    slider.querySelectorAll('.story-index-item').forEach((item) => {
      item.hidden = category !== 'all' && item.dataset.category !== category;
    });
  }));
  showStory(0);
});

document.querySelectorAll('[data-story-grid]').forEach((grid) => {
  grid.querySelectorAll('[data-card-filter]').forEach((filter) => filter.addEventListener('click', () => {
    const category = filter.dataset.cardFilter;
    grid.querySelectorAll('[data-card-filter]').forEach((item) => item.classList.toggle('is-active', item === filter));
    grid.querySelectorAll('[data-card-category]').forEach((card) => {
      card.hidden = category !== 'all' && card.dataset.cardCategory !== category;
    });
  }));
});

// Keep disclosures mutually exclusive and close them without trapping focus.
const navDisclosures = Array.from(document.querySelectorAll('.site-nav details'));
const closeDisclosures = (except = null) => navDisclosures.forEach((details) => {
  if (details !== except) {
    details.open = false;
    details.querySelector('summary').setAttribute('aria-expanded', 'false');
  }
});
navDisclosures.forEach((details) => {
  details.addEventListener('toggle', () => {
    details.querySelector('summary').setAttribute('aria-expanded', String(details.open));
    if (details.open) closeDisclosures(details);
  });
  details.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      event.stopPropagation();
      details.open = false;
      details.querySelector('summary').setAttribute('aria-expanded', 'false');
      details.querySelector('summary').focus();
    }
  });
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-about')) closeDisclosures();
});
navigation?.addEventListener('focusout', (event) => {
  if (!navigation.contains(event.relatedTarget)) closeDisclosures();
});
menuButton?.addEventListener('click', () => {
  if (menuButton.getAttribute('aria-expanded') === 'false') closeDisclosures();
});
window.matchMedia('(min-width: 901px)').addEventListener('change', () => closeDisclosures());

// Retain incoming fragment links to articles migrated from category pages.
const followLegacyPost = () => {
  const ident = decodeURIComponent(location.hash.slice(1));
  const anchor = document.getElementById(ident);
  if (anchor?.dataset.legacyPost) location.replace(anchor.dataset.legacyPost);
};
try { followLegacyPost(); } catch { /* Malformed fragments leave navigation usable. */ }
window.addEventListener('hashchange', () => { try { followLegacyPost(); } catch {} });

// Share public canonical URLs, including when reviewing the site locally.
document.querySelectorAll('.post-sharing').forEach((area) => {
  const feedback = area.querySelector('.share-feedback');
  const input = area.querySelector('.share-url');
  const copyButton = area.querySelector('[data-copy-link]');
  const shareButton = area.querySelector('[data-native-share]');
  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(input.value);
    } catch {
      const previous = document.activeElement;
      input.focus();
      input.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      if (!copied) {
        feedback.textContent = 'Select and copy the Post URL above. You can paste it into Instagram or another app.';
        return;
      }
      previous?.focus();
    }
    feedback.textContent = 'Link copied. Paste it into Instagram, a message or another app.';
  };
  copyButton.hidden = false;
  shareButton.hidden = false;
  copyButton.addEventListener('click', copyLink);
  shareButton.addEventListener('click', async () => {
    if (!navigator.share) { await copyLink(); return; }
    try {
      await navigator.share({ title: shareButton.dataset.title, url: shareButton.dataset.url });
      feedback.textContent = 'Post link shared.';
    } catch (error) {
      if (error.name === 'AbortError') feedback.textContent = 'Sharing cancelled.';
      else await copyLink();
    }
  });
});
