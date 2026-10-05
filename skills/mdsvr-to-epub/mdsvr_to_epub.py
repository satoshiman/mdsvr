#!/usr/bin/env python3
"""
mdsvr_to_epub.py — Convert an mdsvr docs folder into a single valid EPUB 3
ebook.

Understands mdsvr doc-set conventions:

  * Walks the docs tree in sidebar order: `README.md` is each directory's
    index/intro, files and subdirectories are sorted alphabetically by
    basename (so `01-`, `02-` prefixes order the parts), and names starting
    with `_` or `.` (e.g. `_mdsvr/`) are skipped.
  * Reads `<docs>/_mdsvr/settings.json` for default `--title`,
    `--description` and `--language` (site.title / site.description /
    site.language).
  * Accepts `.md` and `.mdx` files. MDX is preprocessed: `import`/`export`
    lines removed, `<Callout>` -> GitHub-style alert, `<Mermaid>` ->
    ```mermaid block, container components (`<Steps>`, `<Tabs>`/`<Tab>`,
    `<Card>`, `<CardGroup>`, `<Accordion>`, `<CodeGroup>`) unwrapped,
    `<Badge>x</Badge>` -> inline code.
  * Resolves mdsvr-style internal links (`./page`, `./page.md`, `./dir/`,
    `../page`, `/absolute/path`, with or without `#anchor`) into internal
    `chapter-NNN.xhtml[#anchor]` links.

Pure Python: stdlib + the `markdown` and `Pillow` packages. Mermaid diagrams
are rendered to PNG via the mermaid.ink API (no Node/pandoc/calibre needed),
landscape diagrams are rotated 90° to fill the page height, and the result
is padded onto a fixed-aspect canvas (default 3:4, portrait ebook friendly).

Usage
-----
    python3 mdsvr_to_epub.py \
        --input docs \
        --output epub/mdsvr-docs.epub \
        --title "mdsvr Documentation" \
        --author "Vuong" --language en
"""

from __future__ import annotations

import argparse
import base64
import datetime as _dt
import json
import re
import sys
import urllib.request
import uuid
import zipfile
from html import escape
from pathlib import Path
from typing import Iterable

try:
    import markdown as _md  # type: ignore
except ImportError:
    sys.stderr.write(
        "ERROR: the `markdown` package is required (pip install markdown).\n"
    )
    sys.exit(1)

try:
    from markdown.extensions.toc import slugify as _slugify  # type: ignore
except ImportError:  # pragma: no cover - very old markdown versions
    import unicodedata

    def _slugify(value: str, separator: str) -> str:
        value = (
            unicodedata.normalize("NFKD", value)
            .encode("ascii", "ignore")
            .decode("ascii")
        )
        value = re.sub(r"[^\w\s-]", "", value).strip().lower()
        return re.sub(r"[%s\s]+" % separator, value, separator)


try:
    from PIL import Image  # type: ignore
    import io as _io

    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False


_DOC_SUFFIXES = (".md", ".mdx")


# ---------------------------------------------------------------------------
# Frontmatter + titles
# ---------------------------------------------------------------------------

_FM_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(md_text: str) -> tuple[dict, str]:
    """Extract a minimal YAML frontmatter block (key: value pairs).

    Returns (meta, body_without_frontmatter)."""
    m = _FM_RE.match(md_text)
    if not m:
        return {}, md_text
    meta: dict = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"^(\w[\w-]*)\s*:\s*(.*)$", line)
        if mm:
            meta[mm.group(1).lower()] = mm.group(2).strip().strip('"').strip("'")
    return meta, md_text[m.end():]


def extract_title(md_text: str, meta: dict) -> str | None:
    if meta.get("title"):
        return meta["title"]
    for line in md_text.splitlines():
        s = line.strip()
        if s.startswith("# ") and not s.startswith("## "):
            return s[2:].strip()
    return None


# ---------------------------------------------------------------------------
# mdsvr settings.json -> epub metadata defaults
# ---------------------------------------------------------------------------


def load_site_settings(docs_root: Path) -> dict:
    """Read `<docs_root>/_mdsvr/settings.json` site block, if present."""
    p = docs_root / "_mdsvr" / "settings.json"
    if not p.is_file():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        sys.stderr.write(f"WARNING: cannot parse {p}: {e}\n")
        return {}
    site = data.get("site") or {}
    return {
        k: site[k]
        for k in ("title", "description", "language")
        if isinstance(site.get(k), str) and site[k]
    }


# ---------------------------------------------------------------------------
# MDX preprocessing -> plain Markdown
# ---------------------------------------------------------------------------

_MDX_IMPEXP_RE = re.compile(
    r"^(?:import\s+(?:[\w*{][^\n]*\bfrom\s+['\"][^'\"]+['\"]|['\"][^'\"]+['\"])"
    r"|export\s+(?:const|let|var|function|default|\{)[^\n]*)"
    r"[ \t]*;?[ \t]*$\n?",
    re.MULTILINE,
)
_MDX_MERMAID_RE = re.compile(
    r"<Mermaid\b[^>]*>(.*?)</Mermaid>", re.DOTALL | re.IGNORECASE
)
_MDX_CALLOUT_RE = re.compile(
    r"<Callout\b([^>]*)>(.*?)</Callout>", re.DOTALL | re.IGNORECASE
)
_MDX_TAB_RE = re.compile(r"<Tab\b([^>]*)/?>", re.IGNORECASE)
_MDX_BADGE_RE = re.compile(
    r"<Badge\b[^>]*>(.*?)</Badge>", re.DOTALL | re.IGNORECASE
)
_MDX_SELFCLOSE_RE = re.compile(r"<[A-Z][A-Za-z0-9]*\b[^>]*/>")
_MDX_TAG_RE = re.compile(r"</?[A-Z][A-Za-z0-9]*\b[^>]*>")
_MDX_ATTR_RE = re.compile(r"(\w+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|\{([^}]*)\})")

_CALLOUT_KIND = {
    "info": "NOTE",
    "note": "NOTE",
    "tip": "TIP",
    "success": "TIP",
    "warning": "WARNING",
    "danger": "CAUTION",
    "caution": "CAUTION",
    "important": "IMPORTANT",
}


def _mdx_attrs(attr_text: str) -> dict[str, str]:
    return {
        m.group(1): next(g for g in m.groups()[1:] if g is not None)
        for m in _MDX_ATTR_RE.finditer(attr_text)
    }


def _quote_md(text: str) -> str:
    """Prefix every markdown line with `> ` to form a blockquote."""
    return "\n".join(
        f"> {line}" if line.strip() else ">" for line in text.split("\n")
    )


_FENCE_RE = re.compile(r"^\s*(```+|~~~+)")


def _apply_outside_fences(md_text: str, fn, fence_fn=None) -> str:
    """Apply `fn` to markdown segments outside fenced code blocks.

    Tracks the opening fence marker (``` or ~~~, any length); a block only
    closes on a marker of the same char and at least the same length, so
    ``` fences nested inside ```` blocks don't break parity. Fenced
    segments pass through `fence_fn` when given, else verbatim."""
    out: list[str] = []
    normal: list[str] = []
    fenced: list[str] | None = None
    marker = ""

    def _flush_fenced():
        out.append(
            (fence_fn or (lambda s: s))("\n".join(fenced))
        )

    for line in md_text.split("\n"):
        m = _FENCE_RE.match(line)
        if fenced is None:
            if m:
                if normal:
                    out.append(fn("\n".join(normal)))
                    normal = []
                fenced = [line]
                marker = m.group(1)
            else:
                normal.append(line)
        else:
            fenced.append(line)
            if (
                m
                and m.group(1)[0] == marker[0]
                and len(m.group(1)) >= len(marker)
            ):
                _flush_fenced()
                fenced = None
    if fenced is not None:
        _flush_fenced()
    if normal:
        out.append(fn("\n".join(normal)))
    return "\n".join(out)


def preprocess_mdx(md_text: str) -> str:
    """Downgrade MDX syntax to plain Markdown so the `markdown` package can
    render it. mdsvr components are unwrapped or mapped to equivalents.
    Fenced code blocks are left untouched so component examples in docs
    survive verbatim."""

    def _fix(text: str) -> str:
        text = _MDX_IMPEXP_RE.sub("", text)

        def _mermaid(m: re.Match) -> str:
            return f"\n\n```mermaid\n{m.group(1).strip()}\n```\n\n"

        text = _MDX_MERMAID_RE.sub(_mermaid, text)

        def _callout(m: re.Match) -> str:
            attrs = _mdx_attrs(m.group(1))
            kind = _CALLOUT_KIND.get(attrs.get("type", "").lower(), "NOTE")
            title = attrs.get("title", "").strip()
            body = m.group(2).strip("\n")
            inner = f"[!{kind}]"
            if title:
                inner += f"\n> **{title}**"
            if body.strip():
                inner += "\n" + _quote_md(body)
            return f"\n\n> {inner}\n\n"

        text = _MDX_CALLOUT_RE.sub(_callout, text)

        def _tab(m: re.Match) -> str:
            label = _mdx_attrs(m.group(1)).get("label") or _mdx_attrs(
                m.group(1)
            ).get("title")
            return f"\n\n**{label.strip()}**\n\n" if label else "\n\n"

        text = _MDX_TAB_RE.sub(_tab, text)
        text = _MDX_BADGE_RE.sub(lambda m: f"`{m.group(1).strip()}`", text)
        text = _MDX_SELFCLOSE_RE.sub("", text)
        # Unwrap any remaining component tags (Steps, Tabs, Card, CardGroup,
        # Accordion, CodeGroup, ...) keeping their markdown children.
        return _MDX_TAG_RE.sub("", text)

    return _apply_outside_fences(md_text, _fix)


# ---------------------------------------------------------------------------
# GitHub alerts -> styled blockquotes (post-processed on HTML)
# ---------------------------------------------------------------------------

_ALERT_HTML_RE = re.compile(
    r"<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*<br\s*/?>\s*",
    re.IGNORECASE,
)
_ALERT_HTML_RE_NL = re.compile(
    r"<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*\n?",
    re.IGNORECASE,
)


def style_alerts(html: str) -> str:
    """Turn `<blockquote><p>[!WARNING] ...` into an alert-class blockquote."""

    def _sub(m: re.Match) -> str:
        kind = m.group(1).lower()
        return (
            f'<blockquote class="alert alert-{kind}">'
            f"<p><strong>{kind.upper()}</strong><br/>"
        )

    html = _ALERT_HTML_RE.sub(_sub, html)
    return _ALERT_HTML_RE_NL.sub(_sub, html)


# ---------------------------------------------------------------------------
# Mermaid -> PNG via mermaid.ink, padded to a fixed aspect ratio
# ---------------------------------------------------------------------------

_MERMAID_RE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)


def _mermaid_fetch_img(code: str) -> bytes | None:
    """Render via mermaid.ink. `type=png` gives real PNG output and
    `width=2000` keeps very wide diagrams under the service's size limit
    (unbounded requests return HTTP 400)."""
    encoded = base64.urlsafe_b64encode(code.encode("utf-8")).decode("ascii")
    url = (
        f"https://mermaid.ink/img/{encoded}"
        "?bgColor=white&type=png&width=2000"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except Exception as e:  # noqa: BLE001
        sys.stderr.write(f"WARNING: mermaid render failed: {e}\n")
        return None


_MAX_IMG_SIDE = 1600  # cap rendered diagram size for e-readers


def _cap_size(img: "Image.Image") -> "Image.Image":
    m = max(img.size)
    if m <= _MAX_IMG_SIDE:
        return img
    scale = _MAX_IMG_SIDE / m
    return img.resize(
        (round(img.width * scale), round(img.height * scale)),
        Image.LANCZOS,
    )


def _open_flat(raw: bytes) -> "Image.Image":
    """Open rendered image, flattening transparency onto white."""
    img = Image.open(_io.BytesIO(raw))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[3])
        return bg
    return img.convert("RGB")


def _to_png(raw: bytes) -> bytes:
    img = _cap_size(_open_flat(raw))
    buf = _io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def pad_img_to_aspect(raw: bytes, aspect: tuple[int, int]) -> bytes:
    """Fit a rendered diagram onto a white canvas with ratio w:h = aspect.

    If the diagram is wider than the canvas ratio (landscape on a portrait
    page), rotate it 90° clockwise so it exploits the page height instead
    of being shrunk to fit the width. Always outputs PNG."""
    img = _open_flat(raw)
    aw, ah = aspect
    target = aw / ah
    if img.width / img.height > target:
        img = img.transpose(Image.ROTATE_270)
    w, h = img.size
    if w / h > target:  # still too wide -> canvas height grows
        cw, ch = w, round(w / target)
    else:               # too tall -> canvas width grows
        cw, ch = round(h * target), h
    canvas = _cap_size(Image.new("RGB", (cw, ch), "white"))
    cw, ch = canvas.size
    if w > cw or h > ch:  # canvas shrank -> scale diagram down to fit
        s = min(cw / w, ch / h)
        img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
        w, h = img.size
    canvas.paste(img, ((cw - w) // 2, (ch - h) // 2))
    buf = _io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def render_mermaid_blocks(
    md_text: str,
    file_stem: str,
    cache_dir: Path,
    aspect: tuple[int, int] | None,
) -> tuple[str, list[Path]]:
    """Replace ```mermaid blocks with ![](images/mermaid/*.png) refs.

    Returns (new_markdown, list_of_png_paths)."""
    produced: list[Path] = []
    counter = 0

    def _sub(m: re.Match) -> str:
        nonlocal counter
        counter += 1
        code = m.group(1).strip()
        cache_dir.mkdir(parents=True, exist_ok=True)
        out = cache_dir / f"{file_stem}-diagram-{counter}.png"
        rel = f"{cache_dir.parent.name}/{cache_dir.name}/{out.name}"
        if out.exists():  # cached render
            produced.append(out)
            return f"![diagram]({rel})"
        raw_path = cache_dir / "raw" / out.name
        raw = (
            raw_path.read_bytes()
            if raw_path.exists()
            else _mermaid_fetch_img(code)
        )
        if raw is not None and not raw_path.exists():
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_bytes(raw)
        if raw is None:
            sys.stderr.write(
                f"WARNING: keeping mermaid source block in {file_stem}#{counter}\n"
            )
            return f"```\n{code}\n```"
        if _HAS_PIL:
            data = pad_img_to_aspect(raw, aspect) if aspect else _to_png(raw)
        else:
            if aspect:
                sys.stderr.write(
                    "WARNING: Pillow not installed — saving mermaid image "
                    "without aspect padding (pip install pillow).\n"
                )
            data = raw
        out.write_bytes(data)
        produced.append(out)
        return f"![diagram]({rel})"

    def _fence_fn(seg: str) -> str:
        # Only standalone ```mermaid blocks render — mermaid examples
        # nested inside ```` example fences stay as code.
        if re.match(r"^\s*```mermaid\s*$", seg.split("\n", 1)[0]):
            return _MERMAID_RE.sub(_sub, seg)
        return seg

    return _apply_outside_fences(
        md_text, lambda seg: _MERMAID_RE.sub(_sub, seg), _fence_fn
    ), produced


# ---------------------------------------------------------------------------
# Wide markdown tables -> PNG (drawn locally with Pillow)
# ---------------------------------------------------------------------------

_TABLE_LINE_RE = re.compile(r"^\s*\|.*\|\s*$")
_TABLE_SEP_RE = re.compile(r"^\s*\|?[\s:|-]+\|?\s*$")

_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]
_FONT_BOLD_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
_font_cache: dict[tuple[int, bool], object] = {}


def _load_font(size: int, bold: bool = False):
    if not _HAS_PIL:
        return None
    key = (size, bold)
    if key not in _font_cache:
        from PIL import ImageFont

        for cand in (_FONT_BOLD_CANDIDATES if bold else _FONT_CANDIDATES):
            try:
                _font_cache[key] = ImageFont.truetype(cand, size)
                break
            except OSError:
                continue
        else:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def _split_table_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _wrap_cell(draw, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines or [""]


def _table_to_png(table_md: str) -> bytes | None:
    """Draw a markdown table to a PNG. Returns None without Pillow."""
    if not _HAS_PIL:
        return None
    from PIL import ImageDraw

    rows = [
        _split_table_row(l)
        for l in table_md.strip().splitlines()
        if not _TABLE_SEP_RE.match(l)
    ]
    if not rows:
        return None
    ncols = max(len(r) for r in rows)
    rows = [r + [""] * (ncols - len(r)) for r in rows]

    size, pad, line_h = 26, 14, 38
    font = _load_font(size)
    bold = _load_font(size, bold=True)
    probe = Image.new("RGB", (8, 8))
    draw = ImageDraw.Draw(probe)

    # Column widths: natural text width, clamped.
    col_w = []
    for c in range(ncols):
        w = max(
            draw.textlength(r[c], font=(bold if i == 0 else font))
            for i, r in enumerate(rows)
        )
        col_w.append(int(min(max(w + 2 * pad, 110), 560)))

    # Wrap cells, compute row heights.
    wrapped = [
        [_wrap_cell(draw, r[c], bold if i == 0 else font, col_w[c] - 2 * pad)
         for c in range(ncols)]
        for i, r in enumerate(rows)
    ]
    row_h = [max(len(c) for c in r) * line_h + 2 * pad for r in wrapped]

    W = sum(col_w) + 1
    H = sum(row_h) + 1
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    y = 0
    for i, r in enumerate(wrapped):
        x = 0
        if i == 0:
            draw.rectangle([0, y, W - 1, y + row_h[0]], fill="#eaeef4")
        for c in range(ncols):
            f = bold if i == 0 else font
            for li, line in enumerate(r[c]):
                draw.text(
                    (x + pad, y + pad + li * line_h),
                    line, font=f, fill="#1a1a1a",
                )
            draw.rectangle([x, y, x + col_w[c], y + row_h[i]], outline="#999")
            x += col_w[c]
        y += row_h[i]

    buf = _io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def render_wide_tables(
    md_text: str,
    file_stem: str,
    cache_dir: Path,
    max_cols: int | None,
    aspect: tuple[int, int] | None,
) -> tuple[str, list[Path]]:
    """Replace markdown tables with more than `max_cols` columns by PNG refs.

    Returns (new_markdown, list_of_png_paths)."""
    if max_cols is None or not _HAS_PIL:
        return md_text, []
    produced: list[Path] = []
    out_lines: list[str] = []
    lines = md_text.splitlines()
    i, counter = 0, 0
    fence: str | None = None
    while i < len(lines):
        fm = _FENCE_RE.match(lines[i])
        if fence is not None:
            if fm and fm.group(1)[0] == fence[0] and len(fm.group(1)) >= len(fence):
                fence = None
            out_lines.append(lines[i])
            i += 1
        elif fm:
            fence = fm.group(1)
            out_lines.append(lines[i])
            i += 1
        elif _TABLE_LINE_RE.match(lines[i]) and (
            i + 1 < len(lines) and _TABLE_SEP_RE.match(lines[i + 1])
        ):
            j = i
            while j < len(lines) and _TABLE_LINE_RE.match(lines[j]):
                j += 1
            block = "\n".join(lines[i:j])
            ncols = len(_split_table_row(lines[i]))
            if ncols > max_cols:
                counter += 1
                raw = _table_to_png(block)
                if raw is not None:
                    cache_dir.mkdir(parents=True, exist_ok=True)
                    out = cache_dir / f"{file_stem}-table-{counter}.png"
                    rel = (
                        f"{cache_dir.parent.name}/{cache_dir.name}/{out.name}"
                    )
                    if not out.exists():
                        out.write_bytes(
                            pad_img_to_aspect(raw, aspect) if aspect else raw
                        )
                    produced.append(out)
                    out_lines.append(f"![table]({rel})")
                    i = j
                    continue
            out_lines.append(block)
            i = j
        else:
            out_lines.append(lines[i])
            i += 1
    return "\n".join(out_lines), produced


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------

_IMG_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def _resolve_asset(src: str, base_dir: Path, root_dir: Path) -> Path:
    """Resolve an image path relative to the doc file, or to the docs root
    for site-absolute paths (`/assets/...`)."""
    if src.startswith("/"):
        return (root_dir / src.lstrip("/")).resolve()
    return (base_dir / src).resolve()


def collect_images(
    md_text: str, base_dir: Path, root_dir: Path
) -> list[Path]:
    found: list[Path] = []
    seen: set[str] = set()

    def _collect(seg: str) -> str:
        for m in _IMG_RE.finditer(seg):
            if _inside_code_span(seg, m.start()):
                continue
            src = m.group(2).strip()
            if src.startswith(("http://", "https://")):
                continue
            path = _resolve_asset(src, base_dir, root_dir)
            if str(path) in seen or not path.exists():
                continue
            seen.add(str(path))
            found.append(path)
        return seg

    _apply_outside_fences(md_text, _collect)
    return found


def _img_media_type(path: Path) -> str:
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
    }.get(path.suffix.lower(), "application/octet-stream")


# ---------------------------------------------------------------------------
# mdsvr doc discovery (sidebar order)
# ---------------------------------------------------------------------------


def discover_docs(docs_root: Path) -> list[Path]:
    """Walk `docs_root` in mdsvr sidebar order.

    Each directory contributes its README.md / README.mdx / index.* first
    (the section index page), then files and subdirectories interleaved in
    alphabetical order by lowercase basename — mirroring the auto-generated
    sidebar. Names starting with `_` or `.` are mdsvr-hidden and skipped."""

    def _walk(dir_path: Path) -> list[Path]:
        readme: Path | None = None
        entries: list[Path] = []
        try:
            children = sorted(dir_path.iterdir(), key=lambda p: p.name.lower())
        except OSError:
            return []
        for child in children:
            if child.name.startswith(("_", ".")):
                continue
            if child.is_dir():
                entries.append(child)
            elif child.suffix.lower() in _DOC_SUFFIXES:
                # Sidebar sort key strips the extension for files.
                key = child.stem.lower()
                if key in ("readme", "index"):
                    readme = readme or child
                else:
                    entries.append(child)
        # Re-sort mixed entries by mdsvr sortBy key (files: stem, dirs: name).
        entries.sort(
            key=lambda p: (
                p.name.lower()
                if p.is_dir()
                else p.stem.lower()
            )
        )
        out: list[Path] = [readme] if readme else []
        for entry in entries:
            out.extend(_walk(entry) if entry.is_dir() else [entry])
        return out

    return _walk(docs_root)


# ---------------------------------------------------------------------------
# mdsvr link resolution -> epub chapter links
# ---------------------------------------------------------------------------

_LINK_RE = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def _resolve_doc_link(
    href: str,
    base_dir: Path,
    root_dir: Path,
    doc_index: set[Path],
) -> tuple[Path, str] | None:
    """Resolve an mdsvr-style href to (doc_path, fragment).

    Handles `./page`, `./page.md`, `./dir` / `./dir/` (dir index README),
    `../page`, root-absolute `/path`, and bare `#anchor`. Returns None for
    external URLs and links that don't resolve to a doc in the set."""
    if href.startswith(("http://", "https://", "mailto:", "tel:")):
        return None
    path_part, _, frag = href.partition("#")
    path_part = path_part.split("?")[0]
    if not path_part:
        return (base_dir, frag)  # same-page anchor (caller maps base_dir)
    if path_part.startswith("/"):
        target = (root_dir / path_part.lstrip("/")).resolve()
    else:
        target = (base_dir / path_part).resolve()

    candidates: list[Path] = []
    if target.suffix.lower() in _DOC_SUFFIXES:
        candidates.append(target)
    else:
        # Explicit dir links (`./dir/`, `./`, `../`) prefer the dir index.
        if path_part.endswith("/") or target.is_dir():
            candidates += [target / f"{idx}{ext}"
                           for idx in ("README", "index")
                           for ext in _DOC_SUFFIXES]
        candidates += [
            Path(str(target) + ext) for ext in _DOC_SUFFIXES
        ]
        candidates += [target / f"{idx}{ext}"
                       for idx in ("README", "index")
                       for ext in _DOC_SUFFIXES]
    for cand in candidates:
        if cand in doc_index:
            return cand, frag
    return None


def _inside_code_span(text: str, start: int) -> bool:
    """True if offset `start` sits inside an odd number of backticks on its
    line (approximate inline-code detection)."""
    line_start = text.rfind("\n", 0, start) + 1
    return text[line_start:start].count("`") % 2 == 1


def _rewrite_links(
    md_text: str,
    doc_path: Path,
    chapter_file: str,
    root_dir: Path,
    doc_index: set[Path],
    doc_first_chapter: dict[Path, str],
    anchor_map: dict[tuple[Path, str], str],
) -> str:
    base_dir = doc_path.parent

    def _rewrite_segment(seg: str) -> str:
        def _sub(m: re.Match) -> str:
            if _inside_code_span(seg, m.start()):
                return m.group(0)
            label, href = m.group(1), m.group(2).strip()
            resolved = _resolve_doc_link(
                href, base_dir, root_dir, doc_index
            )
            if resolved is None:
                return m.group(0)
            target_doc, frag = resolved
            if target_doc == base_dir:  # bare #anchor -> this file
                target_doc = doc_path
            ch_file = (
                anchor_map.get((target_doc, frag))
                if frag
                else doc_first_chapter.get(target_doc)
            ) or doc_first_chapter.get(target_doc)
            if ch_file is None:
                return m.group(0)
            new_href = ch_file + (f"#{frag}" if frag else "")
            if new_href == chapter_file:
                new_href = frag and f"#{frag}" or new_href
            return f"[{label}]({new_href})"

        return _LINK_RE.sub(_sub, seg)

    return _apply_outside_fences(md_text, _rewrite_segment)


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_MD_INLINE_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def _chapter_slugs(body_md: str) -> set[str]:
    """Collect toc-extension slugs for all headings in a chapter body."""
    slugs: set[str] = set()
    fence: str | None = None
    for line in body_md.splitlines():
        fm = _FENCE_RE.match(line)
        if fence is not None:
            if fm and fm.group(1)[0] == fence[0] and len(fm.group(1)) >= len(fence):
                fence = None
            continue
        if fm:
            fence = fm.group(1)
            continue
        m = _HEADING_RE.match(line)
        if not m:
            continue
        text = _MD_INLINE_RE.sub(r"\1", m.group(2))
        text = re.sub(r"[*_`~]", "", text).strip()
        if text:
            slugs.add(_slugify(text, "-"))
    return slugs


# ---------------------------------------------------------------------------
# Chapter splitting
# ---------------------------------------------------------------------------


def split_chapters(md_text: str, file_label: str,
                   intro_label: str = "Introduction") -> list[tuple[str, str]]:
    """Split at `## ` headings; the heading line stays in the chapter body so
    it keeps its `id` anchor in the generated HTML. Leading content becomes
    `intro_label`."""
    chunks: list[tuple[str, str]] = []
    title: str | None = None
    current: list[str] = []
    fence: str | None = None

    def flush():
        nonlocal title, current
        body = "\n".join(current).strip()
        if body or title is not None:
            chunks.append((title or intro_label, body))
        current = []

    for line in md_text.splitlines():
        s = line.strip()
        fm = _FENCE_RE.match(line)
        if fence is not None:
            if fm and fm.group(1)[0] == fence[0] and len(fm.group(1)) >= len(fence):
                fence = None
            current.append(line)
        elif fm:
            fence = fm.group(1)
            current.append(line)
        elif s.startswith("## ") and not s.startswith("### "):
            flush()
            title = s[3:].strip()
            current.append(line)
        else:
            current.append(line)
    flush()

    cleaned: list[tuple[str, str]] = []
    for t, body in chunks:
        if not cleaned:
            body = _strip_doc_header(body)
        if body.strip() or t:
            cleaned.append((t, body))
    return cleaned or [(file_label, md_text)]


def _strip_doc_header(body: str) -> str:
    """Drop the leading `# Title` line (used as part label) and blank lines."""
    out: list[str] = []
    skip = True
    for line in body.splitlines():
        s = line.strip()
        if skip:
            if s == "" or s == "---":
                continue
            if s.startswith("# ") and not s.startswith("## "):
                continue
            skip = False
        out.append(line)
    return "\n".join(out).strip()


# ---------------------------------------------------------------------------
# EPUB assembly
# ---------------------------------------------------------------------------

XHTML_TEMPLATE = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="{lang}">
<head>
<meta charset="utf-8"/>
<title>{title}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
{body}
</body>
</html>
"""

STYLE_CSS = """
@charset "utf-8";
body { font-family: serif; line-height: 1.6; margin: 5% 8%; }
h1, h2, h3 { font-family: sans-serif; line-height: 1.25; }
h1 { font-size: 1.6em; text-align: center; margin: 1.5em 0 0.5em; }
h2 { font-size: 1.3em; margin: 1.4em 0 0.6em; page-break-before: always; }
h3 { font-size: 1.1em; margin: 1em 0 0.4em; }
p { margin: 0 0 0.8em; text-align: justify; }
blockquote { margin: 0.8em 1em; padding: 0.4em 1em; border-left: 3px solid #ccc; color: #444; }
blockquote.alert { font-style: normal; color: #222; border-left-width: 4px; padding: 0.6em 1em; }
blockquote.alert-note { border-left-color: #1a5fb4; background: #eef4fc; }
blockquote.alert-tip { border-left-color: #2ec27e; background: #eefaf3; }
blockquote.alert-important { border-left-color: #9141ac; background: #f6effa; }
blockquote.alert-warning { border-left-color: #e5a50a; background: #fdf6e3; }
blockquote.alert-caution { border-left-color: #c01c28; background: #fceeee; }
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
ul, ol { margin: 0.4em 0 0.8em 1.4em; }
li { margin: 0.2em 0; }
table { border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
th, td { border: 1px solid #ccc; padding: 0.3em 0.6em; }
code { font-family: monospace; font-size: 0.9em; background: #f4f4f4; padding: 0 0.2em; }
pre { background: #f4f4f4; padding: 0.8em; overflow-x: auto; font-size: 0.85em; }
pre code { background: none; padding: 0; }
a { color: #1a5fb4; text-decoration: none; }
"""

CONTAINER_XML = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""

COVER_XHTML = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="{lang}">
<head>
<meta charset="utf-8"/>
<title>Cover</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body style="margin:0">
<div><img src="images/{cover_href}" alt="Cover" style="width:100%;max-height:100vh;object-fit:contain;margin:0"/></div>
</body>
</html>
"""


def build_epub(
    inputs: list[Path],
    root_dir: Path,
    output: Path,
    title: str,
    author: str,
    language: str = "en",
    description: str | None = None,
    mermaid_aspect: tuple[int, int] | None = (3, 4),
    table_cols: int | None = 4,
    cover: Path | None = None,
) -> dict:
    book_uid = str(uuid.uuid4())
    modified = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    intro_label = "Mở đầu" if language.lower().startswith("vi") else "Introduction"
    toc_title = "Mục Lục" if language.lower().startswith("vi") else "Contents"

    doc_index = {p.resolve() for p in inputs}

    # Pass 1 — process each doc to chapter markdown and record its title.
    image_registry: dict[Path, tuple[str, str]] = {}
    cover_path: Path | None = cover

    def register_image(path: Path) -> str:
        if path in image_registry:
            return image_registry[path][0]
        href = f"img-{len(image_registry):03d}{path.suffix.lower()}"
        image_registry[path] = (href, _img_media_type(path))
        return href

    docs: list[dict] = []
    for src in inputs:
        src = src.resolve()
        text = src.read_text(encoding="utf-8")
        base_dir = src.parent
        meta, text = parse_frontmatter(text)
        if src.suffix.lower() == ".mdx" or re.search(
            r"<[A-Z][A-Za-z0-9]*\b", text
        ) or _MDX_IMPEXP_RE.search(text):
            text = preprocess_mdx(text)

        if "```mermaid" in text:
            text, _ = render_mermaid_blocks(
                text, src.stem, base_dir / "images" / "mermaid", mermaid_aspect
            )
        text, _ = render_wide_tables(
            text, src.stem, base_dir / "images" / "tables",
            table_cols, mermaid_aspect,
        )

        for ipath in collect_images(text, base_dir, root_dir):
            register_image(ipath)

        file_title = extract_title(text, meta) or src.stem
        chapters = split_chapters(
            text, file_label=file_title, intro_label=intro_label
        )
        docs.append(
            {"path": src, "title": file_title, "chapters": chapters}
        )

    # Assign chapter filenames sequentially across the doc set.
    chapters: list[dict] = []
    doc_first_chapter: dict[Path, str] = {}
    anchor_map: dict[tuple[Path, str], str] = {}
    for doc in docs:
        for ch_title, body_md in doc["chapters"]:
            fname = f"chapter-{len(chapters) + 1:03d}.xhtml"
            doc_first_chapter.setdefault(doc["path"], fname)
            for slug in _chapter_slugs(body_md):
                anchor_map.setdefault((doc["path"], slug), fname)
            chapters.append(
                {
                    "file": fname,
                    "title": ch_title,
                    "part": doc["title"],
                    "doc": doc["path"],
                    "md": body_md,
                }
            )

    if not chapters:
        raise RuntimeError("No chapters produced — input files empty?")

    # Pass 2 — rewrite internal links + images, then markdown -> HTML.
    for ch in chapters:
        body_md = _rewrite_links(
            ch["md"], ch["doc"], ch["file"], root_dir,
            doc_index, doc_first_chapter, anchor_map,
        )

        base_dir = ch["doc"].parent

        def _rewrite_img_seg(seg: str) -> str:
            def _rewrite_img(m: re.Match) -> str:
                if _inside_code_span(seg, m.start()):
                    return m.group(0)
                src_img = m.group(2).strip()
                if src_img.startswith(("http://", "https://")):
                    return m.group(0)
                ipath = _resolve_asset(src_img, base_dir, root_dir)
                if not ipath.is_file():
                    return m.group(0)
                href = register_image(ipath)
                return f"![{m.group(1)}](images/{href})"

            return _IMG_RE.sub(_rewrite_img, seg)

        body_md = _apply_outside_fences(body_md, _rewrite_img_seg)
        body_html = _md.markdown(
            body_md, extensions=["extra", "sane_lists", "toc"]
        )
        body_html = style_alerts(body_html)
        ch["html"] = body_html

    # Part titles (<h1>) only when the book has more than one doc page.
    if len(docs) > 1:
        seen_parts: set[Path] = set()
        for ch in chapters:
            if ch["doc"] not in seen_parts:
                seen_parts.add(ch["doc"])
                ch["html"] = (
                    f"<h1>{escape(ch['part'])}</h1>\n" + ch["html"]
                )

    if cover_path is not None:
        register_image(cover_path)
    elif image_registry:
        # First available image as cover.
        cover_path = next(iter(image_registry))
    cover_href = image_registry[cover_path][0] if cover_path else None

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "mimetype", "application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )
        zf.writestr("META-INF/container.xml", CONTAINER_XML)
        zf.writestr("OEBPS/style.css", STYLE_CSS)

        for ipath, (href, _mt) in image_registry.items():
            zf.writestr(f"OEBPS/images/{href}", ipath.read_bytes())

        if cover_href is not None:
            zf.writestr(
                "OEBPS/cover.xhtml",
                COVER_XHTML.format(lang=language, cover_href=cover_href),
            )

        chapter_files: list[str] = []
        for ch in chapters:
            body = ch["html"]
            stripped = body.lstrip()
            if not stripped.startswith(("<h1", "<h2")):
                body = f"<h2>{escape(ch['title'])}</h2>\n" + body
            zf.writestr(
                f"OEBPS/{ch['file']}",
                XHTML_TEMPLATE.format(
                    lang=language, title=escape(ch["title"]), body=body
                ),
            )
            chapter_files.append(ch["file"])

        nav_items = []
        if cover_href is not None:
            nav_items.append('<li><a href="cover.xhtml">Cover</a></li>')
        current_part: str | None = None
        multi = len(docs) > 1
        for fname, ch in zip(chapter_files, chapters):
            part = ch["part"] if multi else None
            if part and part != current_part:
                if current_part is not None:
                    nav_items.append("  </ol></li>")
                nav_items.append(f"  <li><span>{escape(part)}</span><ol>")
                current_part = part
            nav_items.append(
                f'    <li><a href="{fname}">{escape(ch["title"])}</a></li>'
            )
        if current_part is not None:
            nav_items.append("  </ol></li>")

        nav_xhtml = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="{language}">
<head>
<meta charset="utf-8"/>
<title>Table of Contents</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<nav epub:type="toc" id="toc">
<h1>{escape(toc_title)}</h1>
<ol>
{chr(10).join(nav_items)}
</ol>
</nav>
</body>
</html>
"""
        zf.writestr("OEBPS/nav.xhtml", nav_xhtml)

        manifest_items = [
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
            '<item id="css" href="style.css" media-type="text/css"/>',
        ]
        if cover_href is not None:
            manifest_items.append(
                '<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>'
            )
            manifest_items.append(
                f'<item id="cover-image" href="images/{cover_href}" '
                f'media-type="{_img_media_type(cover_path)}" properties="cover-image"/>'
            )
        for ipath, (href, mtype) in image_registry.items():
            if href == cover_href:
                continue
            manifest_items.append(
                f'<item id="img-{href}" href="images/{href}" media-type="{mtype}"/>'
            )
        for fname in chapter_files:
            cid = Path(fname).stem
            manifest_items.append(
                f'<item id="{cid}" href="{fname}" media-type="application/xhtml+xml"/>'
            )

        spine_items = []
        if cover_href is not None:
            spine_items.append('<itemref idref="cover-page" linear="yes"/>')
        spine_items.append('<itemref idref="nav" linear="yes"/>')
        for fname in chapter_files:
            spine_items.append(
                f'<itemref idref="{Path(fname).stem}" linear="yes"/>'
            )

        opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="{language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="BookId">urn:uuid:{book_uid}</dc:identifier>
<dc:title>{escape(title)}</dc:title>
<dc:creator>{escape(author)}</dc:creator>
<dc:language>{language}</dc:language>
<dc:description>{escape(description or "")}</dc:description>
<meta property="dcterms:modified">{modified}</meta>
</metadata>
<manifest>
{chr(10).join("  " + m for m in manifest_items)}
</manifest>
<spine>
{chr(10).join("  " + s for s in spine_items)}
</spine>
</package>
"""
        zf.writestr("OEBPS/content.opf", opf)

    return {
        "output": str(output),
        "docs": len(docs),
        "chapters": len(chapters),
        "images": len(image_registry),
        "has_cover": cover_path is not None,
        "title": title,
        "author": author,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _expand_inputs(specs: Iterable[str]) -> tuple[list[Path], Path]:
    """Expand --input specs. A directory is walked in mdsvr sidebar order;
    files are included as given. Returns (doc_files, docs_root)."""
    out: list[Path] = []
    root: Path | None = None
    for spec in specs:
        p = Path(spec).expanduser().resolve()
        if p.is_dir():
            docs = discover_docs(p)
            if not docs:
                sys.stderr.write(f"WARNING: no .md/.mdx files in {p}\n")
                continue
            if root is None:
                root = p
            out.extend(docs)
        elif p.is_file():
            if root is None:
                root = p.parent
            out.append(p)
        else:
            sys.stderr.write(f"WARNING: not found: {spec}\n")
    return out, (root or Path.cwd()).resolve()


def _parse_aspect(s: str) -> tuple[int, int]:
    m = re.match(r"^(\d+)\s*[:x/]\s*(\d+)$", s.strip())
    if not m:
        raise argparse.ArgumentTypeError(f"bad aspect ratio: {s!r} (use e.g. 3:4)")
    return int(m.group(1)), int(m.group(2))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Convert an mdsvr docs folder to a single EPUB 3."
    )
    ap.add_argument(
        "--input", "-i", nargs="+", required=True,
        help="Docs directory and/or .md/.mdx files (dirs are walked in "
             "mdsvr sidebar order).",
    )
    ap.add_argument("--output", "-o", required=True, help="Output .epub path.")
    ap.add_argument(
        "--title",
        help="Book title (default: site.title from _mdsvr/settings.json, "
             "else input dir name).",
    )
    ap.add_argument("--author", default="Unknown", help="Book author.")
    ap.add_argument(
        "--language",
        help="ISO language code (default: site.language from settings.json, "
             "else 'en').",
    )
    ap.add_argument("--description", default=None, help="Book description.")
    ap.add_argument("--cover", default=None, help="Cover image path.")
    ap.add_argument(
        "--mermaid-aspect", default="3:4", type=_parse_aspect,
        help="Canvas aspect w:h for rendered mermaid diagrams and table "
             "images (e.g. 3:4, 16:9). Use 'none' to keep natural size.",
    )
    ap.add_argument(
        "--table-image-cols", default="4",
        help="Render markdown tables with more than N columns as images. "
             "Use 'none' to disable.",
    )
    args = ap.parse_args(argv)

    inputs, root_dir = _expand_inputs(args.input)
    if not inputs:
        sys.stderr.write("ERROR: no input markdown files found.\n")
        return 2

    site = load_site_settings(root_dir)

    title = args.title or site.get("title")
    if not title:
        first = Path(args.input[0])
        title = first.stem if first.is_file() else first.name

    summary = build_epub(
        inputs=inputs,
        root_dir=root_dir,
        output=Path(args.output),
        title=title,
        author=args.author,
        language=args.language or site.get("language") or "en",
        description=args.description or site.get("description"),
        mermaid_aspect=args.mermaid_aspect,
        table_cols=(
            None if str(args.table_image_cols).lower() == "none"
            else int(args.table_image_cols)
        ),
        cover=Path(args.cover) if args.cover else None,
    )
    for k, v in summary.items():
        print(f"{k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
