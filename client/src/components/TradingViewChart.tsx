import { useEffect, useRef } from "react";
import { tradingViewSymbol } from "../lib/format";

/**
 * Embeds the TradingView Advanced Real-Time Chart widget (free, no API quota).
 * EMA 50 / 100 / 200 are added as studies by default. This is for *viewing*
 * only — portfolio numbers use Finnhub quotes from our backend.
 */
export function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Explicit pixel height: autosize doesn't reliably fill the parent here,
    // so we size the iframe directly from the viewport and keep width fluid.
    const height = Math.max(600, Math.round(window.innerHeight * 0.72));

    // Reset any previous widget.
    container.innerHTML = "";
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height,
      symbol: tradingViewSymbol(symbol),
      interval: "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      // EMA 50 / 100 / 200 — object form lets us set each length.
      studies: [
        { id: "STD;EMA", inputs: { length: 50 } },
        { id: "STD;EMA", inputs: { length: 100 } },
        { id: "STD;EMA", inputs: { length: 200 } },
      ],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
    />
  );
}
