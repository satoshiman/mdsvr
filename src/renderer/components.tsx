// Built-in MDX components - React components that render to HTML
import React from "react";

interface CalloutProps {
  type?: "info" | "warning" | "danger" | "success" | "tip";
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = "info", title, children }: CalloutProps) {
  const titles: Record<string, string> = {
    info: "ℹ️ Info",
    warning: "⚠️ Warning",
    danger: "🚫 Danger",
    success: "✅ Success",
    tip: "💡 Tip",
  };

  return (
    <div className={`callout callout-${type}`}>
      <strong style={{ display: "block", marginBottom: "8px" }}>
        {title || titles[type]}
      </strong>
      <div>{children}</div>
    </div>
  );
}

interface CodeGroupProps {
  title?: string;
  children: React.ReactNode;
}

export function CodeGroup({ title, children }: CodeGroupProps) {
  return (
    <div className="code-group">
      {title && <div className="code-group-title">{title}</div>}
      <div style={{ margin: 0 }}>{children}</div>
    </div>
  );
}

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return (
    <div className="steps">
      {React.Children.map(children, (child) => (
        <div className="step-item">{child}</div>
      ))}
    </div>
  );
}

interface CardProps {
  title: string;
  icon?: string;
  href?: string;
  children: React.ReactNode;
}

export function Card({ title, icon, href, children }: CardProps) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper href={href} className="card">
      <div className="card-title">
        {icon && <span>{icon}</span>}
        <span>{title}</span>
      </div>
      <div className="card-description">{children}</div>
    </Wrapper>
  );
}

interface CardGroupProps {
  cols?: number;
  children: React.ReactNode;
}

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  return (
    <div
      className="card-group"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {children}
    </div>
  );
}

interface TabsProps {
  items: string[];
  children: React.ReactNode;
}

export function Tabs({ items, children }: TabsProps) {
  const [active, setActive] = React.useState(0);
  const tabsId = React.useId();

  return (
    <div className="tabs-container" data-tabs-id={tabsId}>
      <div className="tabs">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => setActive(index)}
            className={`tab ${active === index ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {React.Children.toArray(children)[active]}
      </div>
    </div>
  );
}

interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

export function Accordion({ title, children }: AccordionProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="accordion">
      <button onClick={() => setOpen(!open)} className="accordion-summary">
        {title}
        <span className={`accordion-icon ${open ? "open" : ""}`}>▼</span>
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}

interface BadgeProps {
  color?: "green" | "orange" | "red" | "blue" | "purple" | "gray";
  children: React.ReactNode;
}

export function Badge({ color = "gray", children }: BadgeProps) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

interface MermaidProps {
  children: string;
}

export function Mermaid({ children }: MermaidProps) {
  return (
    <div className="mermaid-container">
      <div className="mermaid-toolbar">
        <button className="mermaid-btn mermaid-btn-chart" title="Chart view">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          </svg>
        </button>
        <button
          className="mermaid-btn mermaid-btn-fullscreen"
          title="Fullscreen"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m15 15 6 6" />
            <path d="m15 9 6-6" />
            <path d="M21 16v5h-5" />
            <path d="M21 8V3h-5" />
            <path d="M3 16v5h5" />
            <path d="m3 21 6-6" />
            <path d="M3 8V3h5" />
            <path d="M9 9 3 3" />
          </svg>
        </button>
        <button className="mermaid-btn mermaid-btn-code" title="Show code">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m18 16 4-4-4-4" />
            <path d="m6 8-4 4 4 4" />
            <path d="m14.5 4-5 16" />
          </svg>
        </button>
      </div>
      <div className="mermaid-zoom-controls">
        <button className="mermaid-btn mermaid-btn-zoom-in" title="Zoom in">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="mermaid-btn mermaid-btn-zoom-out" title="Zoom out">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div className="mermaid-chart">
        <div
          className="mermaid"
          style={{ textAlign: "center", padding: "16px" }}
        >
          {children}
        </div>
      </div>
      <pre className="mermaid-source">
        <code>{children}</code>
      </pre>
    </div>
  );
}

// Export all built-in components
export const builtinComponents = {
  Callout,
  CodeGroup,
  Steps,
  Card,
  CardGroup,
  Tabs,
  Accordion,
  Badge,
  Mermaid,
};
