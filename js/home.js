/* ============================================================
   L'ATELIER ELENA | Studio home | scroll choreography
   Mirrors the project page's motion language (GSAP + ScrollTrigger
   + Lenis) and degrades gracefully when those are unavailable.
   ============================================================ */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Lazy-load everything below the fold */
  document.querySelectorAll("main img").forEach(function (img) {
    if (!img.closest(".hero")) img.setAttribute("loading", "lazy");
  });

  /* ----------------------------------------------------------
     Fallback: no GSAP (offline) or reduced motion
     ---------------------------------------------------------- */
  if (!hasGsap || reduced) {
    var pre = document.getElementById("preloader");
    if (pre) pre.style.display = "none";
    setupMenuBasic();
    setupLightbox(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ----------------------------------------------------------
     Smooth scroll (Lenis)
     ---------------------------------------------------------- */
  var lenis = null;
  var isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (typeof Lenis !== "undefined" && !isTouch) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    var el = document.querySelector(target);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else el.scrollIntoView({ behavior: "smooth" });
  }

  /* ----------------------------------------------------------
     Split helpers (word-by-word)
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-words]").forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words
      .map(function (w) { return '<span class="w">' + w + "</span>"; })
      .join(" ");
  });

  /* ----------------------------------------------------------
     Preloader + hero reveal
     ---------------------------------------------------------- */
  var preloader = document.getElementById("preloader");
  var counter = { v: 0 };
  var countEl = document.getElementById("preloaderCount");
  var barEl = document.getElementById("preloaderBar");
  var heroImg = document.getElementById("heroImg");
  var heroLines = gsap.utils.toArray("#hero .line-inner");

  gsap.set(heroLines, { yPercent: 135 });
  gsap.set(".hero-img", { scale: 1.18 });
  gsap.set(".hero-meta, .hero-actions, .hero-foot", { opacity: 0, y: 18 });
  gsap.set(".header", { yPercent: -130 });

  var skipIntro = false;
  try { skipIntro = !!sessionStorage.getItem("lae_seen"); sessionStorage.setItem("lae_seen", "1"); } catch (e) {}

  if (skipIntro) {
    // Returning within the same session (page-to-page): no loading screen.
    gsap.set(preloader, { display: "none" });
    gsap.set(heroLines, { yPercent: 0 });
    gsap.set(".hero-img", { scale: 1 });
    gsap.set(".hero-meta, .hero-actions, .hero-foot", { opacity: 1, y: 0 });
    gsap.set(".header", { clearProps: "transform" });
    var seenHeader = document.getElementById("header");
    if (seenHeader) seenHeader.classList.add("is-ready");
  } else {
    var heroReady = (heroImg && heroImg.decode ? heroImg.decode() : Promise.resolve()).catch(function () {});
    var countDone = new Promise(function (resolve) {
      gsap.to(counter, {
        v: 100,
        duration: 1.9,
        ease: "power2.inOut",
        onUpdate: function () { if (countEl) countEl.textContent = Math.round(counter.v); },
        onComplete: resolve
      });
      gsap.to(barEl, { scaleX: 1, duration: 1.9, ease: "power2.inOut" });
    });

    Promise.all([heroReady, countDone]).then(function () {
      var tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });
      tl.to(".preloader-inner, .preloader-line", { opacity: 0, y: -30, duration: 0.6, ease: "power2.in" })
        .to(preloader, { yPercent: -100, duration: 1.1 }, "-=0.1")
        .from(".hero-veil", { opacity: 0, duration: 1.2 }, "<")
        .to(".hero-img", { scale: 1, duration: 2.2, ease: "power3.out" }, "<")
        .to(heroLines, { yPercent: 0, duration: 1.3, stagger: 0.12, ease: "power4.out" }, "-=1.6")
        .to(".header", { yPercent: 0, duration: 1, ease: "power3.out", clearProps: "transform" }, "-=1.0")
        .to(".hero-meta, .hero-actions, .hero-foot", { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power2.out" }, "-=0.7")
        .set(preloader, { display: "none" })
        .call(function () { header.classList.add("is-ready"); });
    });
  }

  /* ----------------------------------------------------------
     Header: hide on scroll down, show on scroll up + progress
     ---------------------------------------------------------- */
  var header = document.getElementById("header");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (self) {
      if (self.scroll() < 80) { header.classList.remove("is-hidden"); return; }
      if (menuOpen) return;
      header.classList.toggle("is-hidden", self.direction === 1);
    }
  });

  gsap.to("#progressBar", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.4 }
  });

  /* ----------------------------------------------------------
     Menu overlay
     ---------------------------------------------------------- */
  var menu = document.getElementById("menu");
  var menuBtn = document.getElementById("menuBtn");
  var menuBtnText = menuBtn.querySelector(".menu-btn-text");
  var menuOpen = false;

  gsap.set(".menu-link-text", { yPercent: 135 });
  gsap.set(".menu-link em, .menu-foot span", { opacity: 0 });

  var menuTl = gsap.timeline({
    paused: true,
    // Visibility + interactivity are governed by the .is-open class (CSS), never by
    // an inline .set() — so an interrupted reverse can't leave the overlay covering
    // the page and swallowing clicks. .is-open is dropped only once close finishes.
    onReverseComplete: function () {
      menu.classList.remove("is-open");
      gsap.set(menu, { clearProps: "visibility,pointerEvents" });
    }
  });
  menuTl
    .fromTo(".menu-bg", { yPercent: -100 }, { yPercent: 0, duration: 0.9, ease: "power4.inOut" }, 0)
    .to(".menu-link-text", { yPercent: 0, duration: 0.9, stagger: 0.07, ease: "power4.out" }, 0.45)
    .to(".menu-link em, .menu-foot span", { opacity: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" }, 0.7);

  function toggleMenu(force) {
    menuOpen = typeof force === "boolean" ? force : !menuOpen;
    menuBtn.setAttribute("aria-expanded", String(menuOpen));
    menu.setAttribute("aria-hidden", String(!menuOpen));
    menuBtnText.textContent = menuOpen
      ? menuBtnText.getAttribute("data-close")
      : menuBtnText.getAttribute("data-open");
    if (menuOpen) {
      menu.classList.add("is-open");
      header.classList.remove("is-hidden");
      if (lenis) lenis.stop();
      menuTl.timeScale(1).play();
    } else {
      if (lenis) lenis.start();
      menuTl.timeScale(1.6).reverse();
    }
  }
  menuBtn.addEventListener("click", function () { toggleMenu(); });

  document.querySelectorAll("[data-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var href = a.getAttribute("href");
      if (menuOpen) {
        toggleMenu(false);
        setTimeout(function () { scrollToTarget(href); }, 450);
      } else {
        scrollToTarget(href);
      }
    });
  });

  /* ----------------------------------------------------------
     Masked line reveals (section heads + statements)
     ---------------------------------------------------------- */
  gsap.utils.toArray(".shead, .ethos-statement, .practice-title, .outro-content").forEach(function (block) {
    var lines = block.querySelectorAll(".line-inner");
    if (!lines.length) return;
    gsap.fromTo(lines, { yPercent: 135 }, {
      yPercent: 0,
      duration: 1.2,
      stagger: 0.12,
      ease: "power4.out",
      scrollTrigger: { trigger: block, start: "top 80%" }
    });
  });

  /* ----------------------------------------------------------
     Fade / rise reveals
     ---------------------------------------------------------- */
  gsap.utils.toArray([
    ".shead-kicker", ".shead-meta", ".manifesto-kicker", ".reveal",
    ".feature-no", ".feature-loc", ".feature-tags", ".cap-no", ".cap-title", ".cap-list",
    ".step", ".band-kicker",
    ".practice-kicker", ".practice-intro", ".practice-loc", ".service-list li",
    ".outro-eyebrow", ".outro-sub", ".outro-cta"
  ].join(",")).forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 26,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });

  /* Feature index number drifts up */
  gsap.utils.toArray(".feature-no").forEach(function (el) {
    gsap.from(el, {
      opacity: 0, y: 50, duration: 1.4, ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* Word-by-word scrub (about section) */
  gsap.utils.toArray("[data-words]").forEach(function (p) {
    gsap.fromTo(p.querySelectorAll(".w"), { opacity: 0.14 }, {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: { trigger: p, start: "top 82%", end: "top 38%", scrub: 0.6 }
    });
  });

  /* Clip-path image reveals */
  gsap.utils.toArray("[data-clip]").forEach(function (fig) {
    var img = fig.querySelector("img");
    gsap.set(fig, { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(img, { scale: 1.22 });
    gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 84%" } })
      .to(fig, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "power4.inOut" })
      .to(img, { scale: 1, duration: 1.8, ease: "power3.out" }, "-=1.1");
  });

  /* Parallax media */
  gsap.utils.toArray("[data-parallax]").forEach(function (fig) {
    var img = fig.querySelector("img");
    gsap.set(img, { scale: 1.16 });
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8,
      ease: "none",
      scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: 0.5 }
    });
  });

  /* Gallery tiles cascade */
  gsap.utils.toArray(".gallery-grid figure").forEach(function (fig, i) {
    gsap.from(fig, {
      opacity: 0, y: 44, duration: 1, delay: (i % 3) * 0.07, ease: "power3.out",
      scrollTrigger: { trigger: fig, start: "top 90%" }
    });
  });

  /* Hero parallax out */
  gsap.to(".hero-content", {
    yPercent: 30, opacity: 0, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom 30%", scrub: 0.5 }
  });
  gsap.to(".hero-img", {
    yPercent: 14, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.5 }
  });

  /* ----------------------------------------------------------
     Seamless marquee — GSAP driven. The track holds two identical
     halves, so an endless xPercel:-50 loop is seamless. Hover ramps
     timeScale to 0 instead of toggling animation-play-state, so it
     eases to a stop in place rather than snapping to a keyframe.
     ---------------------------------------------------------- */
  (function () {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;
    var loop = gsap.to(track, { xPercent: -50, duration: 42, ease: "none", repeat: -1 });
    var marquee = track.closest(".marquee");
    if (marquee && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      marquee.addEventListener("mouseenter", function () {
        gsap.to(loop, { timeScale: 0, duration: 0.6, ease: "power2.out", overwrite: true });
      });
      marquee.addEventListener("mouseleave", function () {
        gsap.to(loop, { timeScale: 1, duration: 0.9, ease: "power2.out", overwrite: true });
      });
    }
  })();

  ScrollTrigger.refresh();

  /* ----------------------------------------------------------
     Magnetic buttons (the custom cursor has been removed)
     ---------------------------------------------------------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    /* Magnetic pull on primary actions */
    document.querySelectorAll(".btn, .outro-cta").forEach(function (btn) {
      var mx = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
      var my = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      btn.addEventListener("mouseleave", function () { mx(0); my(0); });
    });
  }

  /* ----------------------------------------------------------
     Lightbox
     ---------------------------------------------------------- */
  setupLightbox(lenis);

  /* ----------------------------------------------------------
     Shared setup helpers
     ---------------------------------------------------------- */
  function setupMenuBasic() {
    var m = document.getElementById("menu");
    var b = document.getElementById("menuBtn");
    var bg = m.querySelector(".menu-bg");
    var open = false;
    bg.style.transform = "none";
    b.addEventListener("click", function () {
      open = !open;
      m.classList.toggle("is-open", open);
      m.style.visibility = open ? "visible" : "hidden";
    });
    document.querySelectorAll("[data-scroll]").forEach(function (a) {
      a.addEventListener("click", function () {
        open = false;
        m.classList.remove("is-open");
        m.style.visibility = "hidden";
      });
    });
  }

  function setupLightbox(lenisRef) {
    var box = document.getElementById("lightbox");
    var boxImg = document.getElementById("lightboxImg");
    var closeBtn = document.getElementById("lightboxClose");

    function open(src, alt) {
      boxImg.src = src;
      boxImg.alt = alt || "";
      box.classList.add("is-open");
      if (lenisRef) lenisRef.stop();
      if (hasGsap && !reduced) {
        gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
        gsap.fromTo(boxImg, { scale: 0.94, y: 20 }, { scale: 1, y: 0, duration: 0.6, ease: "power3.out" });
      } else {
        box.style.opacity = 1;
      }
    }
    function close() {
      if (hasGsap && !reduced) {
        gsap.to(box, {
          opacity: 0, duration: 0.35, ease: "power2.in",
          onComplete: function () { box.classList.remove("is-open"); }
        });
      } else {
        box.style.opacity = 0;
        box.classList.remove("is-open");
      }
      if (lenisRef) lenisRef.start();
    }

    document.querySelectorAll("[data-lightbox]").forEach(function (fig) {
      fig.addEventListener("click", function () {
        var img = fig.querySelector("img");
        if (img) open(img.src, img.alt);
      });
    });
    closeBtn.addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (box.classList.contains("is-open")) close();
        if (typeof menuOpen !== "undefined" && menuOpen) toggleMenu(false);
      }
    });
  }

  /* Refresh triggers once everything is in */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
