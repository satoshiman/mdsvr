import type { Settings } from "../settings/index.js";

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

const VERIFICATION_META_NAMES: Record<string, string> = {
  google: "google-site-verification",
  bing: "msvalidate.01",
  yandex: "yandex-verification",
  pinterest: "p:domain_verify",
  naver: "naver-site-verification",
};

/**
 * Render the `<head>` tags for `seo.verification` — one
 * `<meta name="…" content="…">` per configured provider.
 */
export function buildVerificationTags(settings: Settings): string {
  const verification = settings.seo.verification;
  const tags: string[] = [];
  for (const [provider, metaName] of Object.entries(VERIFICATION_META_NAMES)) {
    const value = verification[provider as keyof typeof verification];
    if (value) {
      tags.push(
        `<meta name="${metaName}" content="${escapeHtml(value)}">`,
      );
    }
  }
  return tags.join("\n  ");
}

/**
 * Render the analytics `<head>` snippets for `analytics.*`.
 * `customHead` entries are appended verbatim (trusted content — only ever
 * read from the site owner's `_mdsvr/settings.json`).
 */
export function buildAnalyticsHeadTags(settings: Settings): string {
  const a = settings.analytics;
  const tags: string[] = [];

  if (a.googleAnalytics) {
    const id = escapeHtml(a.googleAnalytics);
    tags.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
      `<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`,
    );
  }

  if (a.googleTagManager) {
    const id = escapeHtml(a.googleTagManager);
    tags.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>`);
  }

  if (a.clarity) {
    const id = escapeHtml(a.clarity);
    tags.push(`<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");</script>`);
  }

  if (a.plausible) {
    tags.push(
      `<script defer data-domain="${escapeHtml(a.plausible.domain)}" src="${escapeHtml(a.plausible.scriptSrc)}"></script>`,
    );
  }

  if (a.umami) {
    tags.push(
      `<script defer data-website-id="${escapeHtml(a.umami.websiteId)}" src="${escapeHtml(a.umami.scriptSrc)}"></script>`,
    );
  }

  tags.push(...a.customHead);
  return tags.filter(Boolean).join("\n  ");
}

/**
 * Tags that must appear immediately after `<body>` — currently only the
 * GTM `<noscript>` iframe.
 */
export function buildBodyStartTags(settings: Settings): string {
  const gtm = settings.analytics.googleTagManager;
  if (!gtm) return "";
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtml(gtm)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}
