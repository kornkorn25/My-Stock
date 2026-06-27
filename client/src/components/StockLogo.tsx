import { useState } from "react";
import { useProfile } from "../hooks/useProfile";

const BG = [
  "bg-sky-500", "bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500",
  "bg-violet-500", "bg-pink-500", "bg-teal-500", "bg-orange-500", "bg-slate-500",
];

function colorFor(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) % BG.length;
  return BG[h];
}

/** Company logo from Finnhub with a colored letter-avatar fallback. */
export function StockLogo({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const { data } = useProfile(symbol);
  const [imgError, setImgError] = useState(false);
  const logo = data?.profile.logo;

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full bg-white object-contain ring-1 ring-slate-200"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${colorFor(symbol)}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
