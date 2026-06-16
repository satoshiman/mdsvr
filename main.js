/* ===========================
   Theme Toggle
   =========================== */
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function getStoredTheme() {
  return localStorage.getItem('mdsvr-theme') || 'dark';
}

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('mdsvr-theme', theme);
}

applyTheme(getStoredTheme());

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ===========================
   Terminal Typewriter
   =========================== */
const CMD = 'npx mdsvr ./docs';
const OUTPUT_LINES = [
  '  \u2714 Settings loaded',
  '  \u2714 Search index built',
  '  \u2714 Serving 12 documents',
  '',
  '  \u25b6  Ready at http://localhost:1800',
];

const typedCmd = document.getElementById('typedCmd');
const cursor = document.getElementById('cursor');
const terminalOutput = document.getElementById('terminalOutput');

let cmdIdx = 0;
let outputDone = false;

function typeCmd() {
  if (cmdIdx < CMD.length) {
    typedCmd.textContent += CMD[cmdIdx];
    cmdIdx++;
    setTimeout(typeCmd, 55 + Math.random() * 30);
  } else {
    cursor.style.display = 'none';
    setTimeout(showOutput, 300);
  }
}

function showOutput() {
  let lineIdx = 0;
  function nextLine() {
    if (lineIdx < OUTPUT_LINES.length) {
      const line = document.createElement('div');
      line.textContent = OUTPUT_LINES[lineIdx];
      line.style.opacity = '0';
      line.style.transform = 'translateY(4px)';
      line.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      terminalOutput.appendChild(line);
      requestAnimationFrame(() => {
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
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
  navigator.clipboard.writeText('npx mdsvr ./docs').then(() => {
    const btn = document.getElementById('copyBtn');
    const label = document.getElementById('copyLabel');
    btn.classList.add('copied');
    label.textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      label.textContent = 'Copy command';
    }, 2000);
  });
}

/* ===========================
   Copy Code Blocks
   =========================== */
function copyCode(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.classList.add('copied');
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = orig;
    }, 2000);
  });
}

/* ===========================
   Scroll Fade-in
   =========================== */
const animTargets = document.querySelectorAll(
  '.feature-card, .mdx-card, .qs-step, .vs-card, .perf-card, .section-title, .section-sub'
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animTargets.forEach((el) => {
    el.classList.add('fade-in');
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
        const bars = entry.target.querySelectorAll('.perf-bar');
        bars.forEach((bar) => {
          const target = bar.style.width;
          bar.style.width = '0';
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
  { threshold: 0.3 }
);

const perfCard = document.querySelector('.perf-card');
if (perfCard) {
  const bars = perfCard.querySelectorAll('.perf-bar');
  bars.forEach((bar) => {
    bar.dataset.targetWidth = bar.style.width;
    bar.style.width = '0';
  });
  perfObserver.observe(perfCard);
}

/* ===========================
   Nav scroll effect
   =========================== */
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    nav.style.borderBottomColor = 'var(--border)';
  } else {
    nav.style.borderBottomColor = 'transparent';
  }
}, { passive: true });
