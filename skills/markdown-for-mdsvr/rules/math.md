# Mathematical Expressions (LaTeX)

mdsvr renders math written in LaTeX syntax, following the GitHub standard.
Inline and block math work in both `.md` and `.mdx` files — use it for
formulas, equations, matrices, and symbols.

## Syntax

| Syntax      | Type   | Example                       |
| ----------- | ------ | ----------------------------- |
| `$...$`     | Inline | `$E = mc^2$`                  |
| `` $`...`$ `` | Inline | `` $`\sqrt{3x-1}`$ ``         |
| `$$...$$`   | Block  | `$$x = \frac{-b}{2a}$$`       |
| ` ```math ` | Block  | code block with `math` language |

## Quick examples

Inline (flowing inside a sentence):

```markdown
The identity $e^{i\pi} + 1 = 0$ links five constants.
```

Block — `$$` delimiters (own line or wrapped):

```markdown
**The Cauchy-Schwarz Inequality**

$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$
```

Block — ` ```math ` fence (no `$$` needed inside):

````markdown
```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```
````

## Authoring rules

1. **Delimiter adjacency.** The opening `$` must be followed by a non-space
   character and the closing `$` preceded by one — `$ x $` does NOT render as
   math. The closing `$` must not be followed by a digit (protects currency
   like `$5 and $10` from being eaten as math).
2. **Literal dollar signs.** Inside a math expression escape with `\$`
   (`$\sqrt{\$4}$`). Outside math but on the same line, wrap the `$` in a span:
   `To split <span>$</span>100 in half`.
3. **Prefer `$`...`$` backtick form** (`$`...`$`) when the expression contains
   characters that clash with Markdown (e.g. `*` or `_`): `` $`a_i * b_j`$ ``.
4. **KaTeX subset.** mdsvr renders via KaTeX — standard LaTeX math commands
   (`\frac`, `\sqrt`, `\sum`, `\int`, `\begin{pmatrix}`, `\begin{aligned}`,
   Greek letters, relation symbols) all work; text-mode commands like `\text`
   accents may warn in strict mode.
5. **Blocks vs inline.** Use `$$`/` ```math ` for display equations; inline
   `$...$` keeps the sentence flow. A ` ```math ` fence never needs `$$`
   inside it.

## Common mistakes

| ❌ Wrong              | ✅ Correct             | Why                                          |
| --------------------- | ---------------------- | -------------------------------------------- |
| `$ x^2 $`             | `$x^2$`                | spaces inside delimiters break the match     |
| `$$\frac{a}{b}$$` text on the fence line inside ` ```math ` | bare `\frac{a}{b}` | ` ```math ` blocks take the formula directly |
| `costs $5 to $10`     | `costs <span>$</span>5 to $10` | two `$` on one line become a math delimiter pair |
| `$\text{it\'s}$`-style text accents | math-mode only | KaTeX warns: accents like `` \` `` are text-mode |

## Behavior notes

- **Static export:** math renders to static HTML too — no runtime needed
  beyond KaTeX assets already shipped by mdsvr.
- **EPUB export:** `mdsvr-to-epub` renders `$...$`, `$$...$$`, and
  ` ```math ` to PNG images (e-readers can't run KaTeX).
- **Search:** formula source text is indexed like normal text.
