import type { ReactNode } from "react";

export function PageHeading({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}
