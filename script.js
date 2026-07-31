const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('is-open', !isOpen);
    menuButton.querySelector('.sr-only').textContent = isOpen ? 'Open navigation' : 'Close navigation';
  });

  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }));
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
