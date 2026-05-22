import type { ReactNode } from "react";

export default function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-renovation-border bg-renovation-elevated p-4 text-foreground shadow-sm dark:border-renovation-border dark:bg-renovation-elevated dark:text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
