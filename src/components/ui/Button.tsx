import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type Props = {
  variant?: ButtonVariant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ variant = "primary", className, children, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-renovation-accent/40 disabled:cursor-not-allowed disabled:opacity-60";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "rounded-lg bg-renovation-accent text-white hover:bg-renovation-steel",
    secondary:
      "border border-renovation-border bg-transparent text-foreground hover:bg-renovation-surface dark:border-renovation-border dark:text-foreground dark:hover:bg-renovation-muted",
    ghost:
      "bg-transparent text-foreground hover:bg-renovation-surface dark:text-foreground dark:hover:bg-renovation-muted",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button {...props} className={[base, variants[variant], className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}
