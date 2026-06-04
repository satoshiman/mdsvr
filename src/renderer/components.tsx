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
  // Mermaid diagrams are rendered client-side
  // Server-side we just wrap in a special div for client JS to process
  return (
    <div
      className="mermaid"
      style={{
        textAlign: "center",
        padding: "16px",
      }}
    >
      <pre style={{ display: "none" }}>{children}</pre>
      <div className="mermaid-output">Loading diagram...</div>
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
