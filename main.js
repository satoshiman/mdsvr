/* ===========================
   Theme Toggle
   =========================== */
const html = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

function getStoredTheme() {
  return localStorage.getItem("mdsvr-theme") || "dark";
}

function applyTheme(theme) {
  html.setAttribute("data-theme", theme);
  localStorage.setItem("mdsvr-theme", theme);
}

applyTheme(getStoredTheme());

themeToggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ===========================
   Terminal Typewriter
   =========================== */
const CMD = "npx mdsvr ./docs";
const OUTPUT_LINES = [
  "  \u2714 Settings loaded",
  "  \u2714 Search index built",
  "  \u2714 Serving 12 documents",
  "",
  "  \u25b6  Ready at http://localhost:1800",
];

const typedCmd = document.getElementById("typedCmd");
const cursor = document.getElementById("cursor");
const terminalOutput = document.getElementById("terminalOutput");

let cmdIdx = 0;
let outputDone = false;

function typeCmd() {
  if (cmdIdx < CMD.length) {
    typedCmd.textContent += CMD[cmdIdx];
    cmdIdx++;
    setTimeout(typeCmd, 55 + Math.random() * 30);
  } else {
    cursor.style.display = "none";
    setTimeout(showOutput, 300);
  }
}

function showOutput() {
  let lineIdx = 0;
  function nextLine() {
    if (lineIdx < OUTPUT_LINES.length) {
      const line = document.createElement("div");
      line.textContent = OUTPUT_LINES[lineIdx];
      line.style.opacity = "0";
      line.style.transform = "translateY(4px)";
      line.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      terminalOutput.appendChild(line);
      requestAnimationFrame(() => {
        line.style.opacity = "1";
        line.style.transform = "translateY(0)";
      });
      lineIdx++;
      setTimeout(nextLine, lineIdx === 1 ? 600 : 160);
    }
  }
  nextLine();
}

setTimeout(typeCmd, 800);

/* ===========================
   Copy Command (Hero)
   =========================== */
function copyCmd() {
  navigator.clipboard.writeText("npx mdsvr ./docs").then(() => {
    const btn = document.getElementById("copyBtn");
    const label = document.getElementById("copyLabel");
    btn.classList.add("copied");
    label.textContent = "Copied!";
    setTimeout(() => {
      btn.classList.remove("copied");
      label.textContent = "Copy command";
    }, 2000);
  });
}

/* ===========================
   Copy Code Blocks
   =========================== */
function copyCode(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.classList.add("copied");
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.textContent = orig;
    }, 2000);
  });
}

/* ===========================
   Scroll Fade-in
   =========================== */
const animTargets = document.querySelectorAll(
  ".feature-card, .mdx-card, .qs-step, .vs-card, .perf-card, .section-title, .section-sub, .skill-card, .learn-grid, .journey, .seo-check, .head-card",
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (!prefersReducedMotion) {
  const staggerCount = new Map();
  animTargets.forEach((el) => {
    el.classList.add("fade-in");
    const parent = el.parentElement;
    const idx = staggerCount.get(parent) || 0;
    staggerCount.set(parent, idx + 1);
    el.style.transitionDelay = `${Math.min(idx, 8) * 60}ms`;
    observer.observe(el);
  });
}

/* ===========================
   Performance Bars Animation
   =========================== */
const perfObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll(".perf-bar");
        bars.forEach((bar) => {
          const target = bar.style.width;
          bar.style.width = "0";
          requestAnimationFrame(() => {
            setTimeout(() => {
              bar.style.width = target;
            }, 100);
          });
        });
        perfObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.3 },
);

const perfCard = document.querySelector(".perf-card");
if (perfCard) {
  const bars = perfCard.querySelectorAll(".perf-bar");
  bars.forEach((bar) => {
    bar.dataset.targetWidth = bar.style.width;
    bar.style.width = "0";
  });
  perfObserver.observe(perfCard);
}

/* ===========================
   Mobile nav menu
   =========================== */
const navMenuBtn = document.getElementById("navMenuBtn");
const navMobileMenu = document.getElementById("navMobileMenu");

function closeMobileMenu() {
  nav.classList.remove("open");
  navMenuBtn.classList.remove("open");
  navMenuBtn.setAttribute("aria-expanded", "false");
  navMenuBtn.setAttribute("aria-label", "Open menu");
}

if (navMenuBtn && navMobileMenu) {
  navMenuBtn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    navMenuBtn.classList.toggle("open", isOpen);
    navMenuBtn.setAttribute("aria-expanded", String(isOpen));
    navMenuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  navMobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeMobileMenu();
      navMenuBtn.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target)) {
      closeMobileMenu();
    }
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900 && nav.classList.contains("open")) {
        closeMobileMenu();
      }
    },
    { passive: true },
  );
}

/* ===========================
   Nav scroll effect
   =========================== */
const nav = document.querySelector(".nav");
window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY > 20) {
      nav.style.borderBottomColor = "var(--border)";
    } else {
      nav.style.borderBottomColor = "transparent";
    }
  },
  { passive: true },
);

/* ===========================
   Live npm version
   =========================== */
fetch("https://registry.npmjs.org/mdsvr/latest")
  .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
  .then((data) => {
    if (data && data.version) {
      document
        .querySelectorAll(".npm-version")
        .forEach((el) => (el.textContent = `v${data.version}`));
    }
  })
  .catch(() => {
    /* keep the fallback version already in the markup */
  });

/* ===========================
   KaTeX math rendering
   =========================== */
let katexRetries = 0;
function renderMath() {
  if (typeof katex === "undefined") {
    if (++katexRetries < 25) {
      setTimeout(renderMath, 200);
    } else {
      document
        .querySelectorAll(".math-render[data-tex]")
        .forEach((el) => (el.textContent = el.dataset.tex));
    }
    return;
  }
  document.querySelectorAll(".math-render[data-tex]").forEach((el) => {
    const tex = el.dataset.tex;
    try {
      katex.render(tex, el, {
        displayMode: !el.hasAttribute("data-inline"),
        throwOnError: false,
      });
    } catch (e) {
      el.textContent = tex;
    }
  });
}
renderMath();

/* ===========================
   MDX tabs demo
   =========================== */
document.querySelectorAll(".mdx-tabs").forEach((tabs) => {
  tabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".mdx-tab");
    if (!tab) return;
    tabs.querySelectorAll(".mdx-tab").forEach((t) => {
      const active = t === tab;
      t.classList.toggle("mdx-tab--active", active);
      t.setAttribute("aria-selected", String(active));
    });
    const content = tabs.parentElement.querySelector(".mdx-tab-content code");
    if (content && tab.dataset.cmd) {
      content.textContent = tab.dataset.cmd;
    }
  });
});

document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const expanded = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!expanded));
    const body = header.parentElement.querySelector(".accordion-body");
    if (body) body.hidden = expanded;
  });
});

/* ===========================
   Quiz demo (practice mode)
   =========================== */
const quizDemo = document.getElementById("quizDemo");
if (quizDemo) {
  const questions = quizDemo.querySelectorAll(".quiz-q");
  const scoreEl = document.getElementById("quizScore");

  function updateScore() {
    const done = quizDemo.querySelectorAll(".quiz-q.is-done").length;
    scoreEl.textContent = `${done}/${questions.length}`;
    if (done === questions.length) {
      scoreEl.style.color = "var(--green)";
      scoreEl.textContent += " ✓";
    }
  }

  questions.forEach((q) => {
    const answer = Number(q.dataset.answer);
    const feedback = q.querySelector(".quiz-feedback");
    q.querySelectorAll(".quiz-opt").forEach((opt, i) => {
      opt.addEventListener("click", () => {
        if (q.classList.contains("is-done")) return;
        if (i === answer) {
          q.classList.add("is-done");
          opt.classList.add("is-correct");
          q.querySelectorAll(".quiz-opt").forEach((o) => (o.disabled = true));
          feedback.textContent = "Correct!";
          feedback.className = "quiz-feedback is-good";
          updateScore();
        } else {
          opt.classList.add("is-wrong");
          opt.disabled = true;
          feedback.textContent = "Not quite — try again.";
          feedback.className = "quiz-feedback is-bad";
        }
      });
    });
  });
}

/* ===========================
   Spotlight hover on cards
   =========================== */
document
  .querySelectorAll(".feature-card, .mdx-card, .skill-card, .vs-card")
  .forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

/* ===========================
   Count-up hero metrics
   =========================== */
const metricVals = document.querySelectorAll(".metric-val");
if (metricVals.length && !prefersReducedMotion) {
  const metricObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const match = el.textContent.match(/^(\d+)(.*)$/);
        if (!match) return;
        const target = Number(match[1]);
        const suffix = match[2];
        const duration = 900;
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          el.textContent =
            Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        metricObserver.unobserve(el);
      });
    },
    { threshold: 0.5 },
  );
  metricVals.forEach((el) => metricObserver.observe(el));
}
