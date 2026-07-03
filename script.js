/* =========================================================
   MH GYM — script.js
   1. Lightfall canvas background (gold streaks on black)
   2. Header state on scroll
   3. Card tilt / glow follow on pointer
   ========================================================= */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Lightfall background — lightweight canvas streaks
  --------------------------------------------------------- */
  const initLightfall = () => {
    const container = document.getElementById('lightfall-bg');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const GOLD = ['#d4af37', '#f2c94c', '#f4e4b0'];

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let streaks = [];
    let rafId = null;
    let mouse = { x: -9999, y: -9999, active: false };

    const STREAK_COUNT = 42;

    const rand = (min, max) => Math.random() * (max - min) + min;

    const makeStreak = () => ({
      x: rand(0, width),
      y: rand(-height, 0),
      len: rand(60, 180),
      speed: rand(1.2, 3.4),
      width: rand(1, 2.2),
      color: GOLD[Math.floor(Math.random() * GOLD.length)],
      opacity: rand(0.15, 0.55),
      twinklePhase: rand(0, Math.PI * 2)
    });

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      streaks = Array.from({ length: STREAK_COUNT }, makeStreak);
    };

    const drawFrame = (time) => {
      ctx.clearRect(0, 0, width, height);

      // ambient vignette
      const grad = ctx.createRadialGradient(
        width / 2, 0, 0,
        width / 2, 0, height * 0.9
      );
      grad.addColorStop(0, 'rgba(212, 175, 55, 0.05)');
      grad.addColorStop(1, 'rgba(10, 10, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      streaks.forEach((s) => {
        s.y += s.speed;
        if (s.y - s.len > height) {
          s.y = rand(-100, -20);
          s.x = rand(0, width);
        }

        // subtle mouse repulsion glow boost near cursor
        let localOpacity = s.opacity;
        if (mouse.active) {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            localOpacity += (1 - dist / 160) * 0.4;
          }
        }

        const twinkle = 0.85 + 0.15 * Math.sin(time / 500 + s.twinklePhase);

        const lineGrad = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
        lineGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
        lineGrad.addColorStop(1, s.color);

        ctx.strokeStyle = lineGrad;
        ctx.globalAlpha = Math.min(localOpacity * twinkle, 1);
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.len);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    };

    const loop = (time) => {
      drawFrame(time);
      rafId = requestAnimationFrame(loop);
    };

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const onPointerLeave = () => {
      mouse.active = false;
    };

    resize();
    seed();

    if (prefersReducedMotion) {
      // draw a single static frame, no animation loop
      drawFrame(0);
    } else {
      rafId = requestAnimationFrame(loop);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
    }

    const ro = new ResizeObserver(() => {
      resize();
      seed();
    });
    ro.observe(container);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && !rafId && !prefersReducedMotion) {
        rafId = requestAnimationFrame(loop);
      }
    });
  };

  /* ---------------------------------------------------------
     2. Header state on scroll
  --------------------------------------------------------- */
  const initHeaderScroll = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const toggle = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };

    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
  };

/* ---------------------------------------------------------
     3. Card tilt / glow follow on pointer (hero card + nav card)
  --------------------------------------------------------- */
  const initCardInteraction = (selector, maxTilt = 6) => {
    if (prefersReducedMotion) return;

    const card = document.querySelector(selector);
    if (!card) return;

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;

      card.style.transform =
        `perspective(700px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`;

      const glow = card.querySelector('.hero-card-glow');
      if (glow) {
        glow.style.transform = `translate(${px * 20}px, ${py * 20}px)`;
      }
    };

    const onLeave = () => {
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
      const glow = card.querySelector('.hero-card-glow');
      if (glow) glow.style.transform = 'translate(0, 0)';
    };

    card.style.transition = 'transform 0.4s ease';
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
  };

/* ---------------------------------------------------------
     4. Site loader — hides once the page AND hero video are ready
  --------------------------------------------------------- */
  const initSiteLoader = () => {
    const loader = document.getElementById('site-loader');
    if (!loader) return;

    const video = document.querySelector('.hero-card-media');

    let pageReady = document.readyState === 'complete';
    let videoReady = !video; // no video on the page = nothing to wait for

    const hideLoader = () => {
      loader.classList.add('is-hidden');
      // remove from tab order / DOM flow once faded out
      window.setTimeout(() => {
        loader.setAttribute('aria-hidden', 'true');
      }, prefersReducedMotion ? 0 : 600);
    };

    const tryHide = () => {
      if (pageReady && videoReady) hideLoader();
    };

    if (!pageReady) {
      window.addEventListener('load', () => {
        pageReady = true;
        tryHide();
      });
    }

    if (video && !videoReady) {
      // readyState 3+ means enough data is buffered to play through
      if (video.readyState >= 3) {
        videoReady = true;
      } else {
        video.addEventListener('loadeddata', () => {
          videoReady = true;
          tryHide();
        });
      }
    }

    // 8s safety net — hide anyway if the video never fires loadeddata
    // (bad network, blocked source, etc.) so users aren't stuck forever
    window.setTimeout(() => {
      if (!videoReady) {
        videoReady = true;
        tryHide();
      }
    }, 8000);

    tryHide();
  };

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initSiteLoader();
    initLightfall();
    initHeaderScroll();
    initCardInteraction('#hero-card', 5);
  });
})();
