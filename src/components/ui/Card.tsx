import type { HTMLAttributes, ReactNode } from "react";

export default function Card({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
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
