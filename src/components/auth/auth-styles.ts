/**
 * Gedeelde Tailwind-classes voor het split-screen inlogscherm: clean velden op
 * warme beige achtergrond, amber accent (#d97706).
 */
export const authStyles = {
  label: "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#78716c]",
  input:
    "w-full rounded-[8px] border-[0.5px] border-[#e8dfd0] bg-white px-[14px] py-[10px] text-[14px] text-[#1c1917] outline-none transition-shadow placeholder:text-[#a8a29e] focus:border-[#d97706] focus:shadow-[0_0_0_3px_rgba(217,119,6,0.12)]",
  button:
    "flex w-full items-center justify-center rounded-[8px] bg-[#d97706] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-60",
  link: "font-medium text-[#d97706] transition-colors hover:text-[#b45309]",
  alert: (type: "success" | "error") =>
    [
      "mt-6 rounded-[8px] border px-3.5 py-3 text-sm leading-snug",
      type === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
    ].join(" "),
} as const;
