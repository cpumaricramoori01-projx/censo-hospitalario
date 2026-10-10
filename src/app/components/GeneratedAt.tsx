"use client";
import { useEffect, useState } from "react";
import { fechaHospital } from "@/lib/hospital";
export default function GeneratedAt({ version }: { version: unknown }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () => setValue(fechaHospital(new Date(), true)),
      0,
    );
    return () => clearTimeout(timer);
  }, [version]);
  return <span>{value || "—"} · hora de Perú</span>;
}
