import { useId } from "react";

/** The MyStock mark: rising bars in a gradient badge. Scales to any size. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.5" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#${id})`} />
      <rect x="8" y="18" width="3.5" height="6" rx="1.75" fill="#fff" opacity="0.95" />
      <rect x="14.25" y="13" width="3.5" height="11" rx="1.75" fill="#fff" opacity="0.95" />
      <rect x="20.5" y="8" width="3.5" height="16" rx="1.75" fill="#fff" opacity="0.95" />
    </svg>
  );
}
