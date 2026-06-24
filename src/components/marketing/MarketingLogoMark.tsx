/** Amber huis + witte checkmark — merkmark (zelfde als inlogscherm). */
export default function MarketingLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 14.2 16 5l11 9.2V26a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 5 26V14.2Z"
        fill="#d97706"
      />
      <path
        d="m11 17 3.4 3.4L21 14"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
