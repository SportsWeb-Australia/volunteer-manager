import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { T } from "../lib/theme";

export function Qr({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let on = true;
    QRCode.toDataURL(value, { margin: 1, width: size, color: { dark: "#0B1424", light: "#ffffff" } })
      .then(d => { if (on) setSrc(d); }).catch(() => {});
    return () => { on = false; };
  }, [value, size]);
  return src
    ? <img src={src} width={size} height={size} alt="Check-in QR code" style={{ borderRadius: 10, border: `1px solid ${T.line}`, display: "block" }} />
    : <div style={{ width: size, height: size, borderRadius: 10, background: "#F1ECE0" }} />;
}
