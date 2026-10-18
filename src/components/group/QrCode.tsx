"use client";

import { useEffect, useState } from "react";
import { Spinner } from "../ui";

/** Renders `value` as an SVG QR code. The encoder is loaded lazily so it never weighs down first load. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((QR) => QR.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }))
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [value]);
  if (failed) return <p className="text-sm text-neg">Couldn&apos;t draw the QR code.</p>;
  return (
    <div role="img" aria-label={label} className="flex size-48 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
      {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <Spinner className="text-neutral-400" />}
    </div>
  );
}
