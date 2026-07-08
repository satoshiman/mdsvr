---
title: Mathematical Expressions
description: Write and render mathematical expressions using LaTeX syntax
---

# Mathematical Expressions

mdsvr supports rendering mathematical expressions using LaTeX syntax, following the [GitHub standard](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions) for writing math in Markdown.

Math rendering is powered by LaTeX syntax — a widely used markup language for mathematical notation.

## Inline Expressions

To include a math expression inline within your text, delimit the expression with a dollar symbol `$`:

```markdown
This sentence uses `$` delimiters to show math inline: $\sqrt{3x-1}+(1+x)^2$
```

renders as:

This sentence uses `$` delimiters to show math inline: $\sqrt{3x-1}+(1+x)^2$

Alternatively, you can use the <code>$\`...\`$</code> syntax to explicitly declare inline math, which is useful when the expression contains characters that overlap with Markdown syntax:

```markdown
This sentence uses $` and `$ delimiters to show math inline: $`\sqrt{3x-1}+(1+x)^2`$
```

renders as:

This sentence uses $` and `$ delimiters to show math inline: $`E = mc^2`$

## Block Expressions

To add a math expression as a block, start a new line and delimit the expression with two dollar symbols `$$`:

```markdown
**The Cauchy-Schwarz Inequality**

$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$
```

renders as:

**The Cauchy-Schwarz Inequality**

$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$

Alternatively, you can use the `math` code block syntax to display a math expression as a block. With this syntax, you don't need to use `$$` delimiters:

````markdown
**The Cauchy-Schwarz Inequality**

```math
\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)
```
````

renders as:

**The Cauchy-Schwarz Inequality**

```math
\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)
```

## Writing Dollar Signs in Line with and Within Mathematical Expressions

To display a dollar sign as a character in the same line as a mathematical expression, you need to escape the non-delimiter `$` to ensure the line renders correctly.

Within a math expression, add a `\` symbol before the explicit `$`:

```markdown
This expression uses `\$` to display a dollar sign: $\sqrt{\$4}$
```

renders as:

This expression uses `\$` to display a dollar sign: $\sqrt{\$4}$

Outside a math expression, but on the same line, use span tags around the explicit `$`:

```markdown
To split <span>$</span>100 in half, we calculate \$100/2
```

renders as:

To split <span>$</span>100 in half, we calculate $100/2$

## Common Examples

### Fractions and Roots

```markdown
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

### Summations and Integrals

```markdown
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

$$\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}$$
```

$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

$$\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}$$

### Matrices

```markdown
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$
```

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

### Greek Letters and Symbols

```markdown
$\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega$

$\leq, \geq, \neq, \approx, \equiv, \infty, \partial, \nabla, \in, \subset, \cup, \cap$
```

$\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega$

$\leq, \geq, \neq, \approx, \equiv, \infty, \partial, \nabla, \in, \subset, \cup, \cap$

### Aligned Equations

```markdown
$$
\begin{aligned}
(a+b)^2 &= (a+b)(a+b) \\
        &= a^2 + ab + ba + b^2 \\
        &= a^2 + 2ab + b^2
\end{aligned}
$$
```

$$
\begin{aligned}
(a+b)^2 &= (a+b)(a+b) \\
        &= a^2 + ab + ba + b^2 \\
        &= a^2 + 2ab + b^2
\end{aligned}
$$

## Syntax Summary

| Syntax                 | Type   | Example                         |
| ---------------------- | ------ | ------------------------------- |
| `$...$`                | Inline | `$E = mc^2$`                    |
| <code>$\`...\`$</code> | Inline | <code>$\`E = mc^2\`$</code>     |
| `$$...$$`              | Block  | `$$E = mc^2$$`                  |
| ` ```math `            | Block  | Code block with `math` language |

## Further Reading

- [Writing mathematical expressions on GitHub](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions)
- [LaTeX/Mathematics on Wikibooks](https://en.wikibooks.org/wiki/LaTeX/Mathematics)
