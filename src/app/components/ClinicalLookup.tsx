"use client";
import { useEffect, useId, useState } from "react";
type Result = {
  id: number;
  codigo?: string;
  descripcion?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  cmp?: string;
};
export default function ClinicalLookup({
  kind,
  onSelect,
}: {
  kind: "medicos" | "diagnosticos";
  onSelect: (result: Result) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/${kind}?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("No se pudo realizar la búsqueda");
        setItems(await res.json());
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Error de búsqueda");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind]);
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {kind === "medicos"
          ? "Buscar médico por nombre o CMP"
          : "Buscar diagnóstico CIE-10"}
      </label>
      <input
        id={id}
        className="form-input"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setItems([]);
          setError("");
        }}
        placeholder="Escribe al menos 2 caracteres"
      />
      {error && <p role="alert">{error}</p>}
      {items.length > 0 && (
        <ul className="lookup-results">
          {items.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(x);
                  setQ("");
                  setItems([]);
                }}
              >
                {kind === "medicos"
                  ? [x.nombres, x.apellidoPaterno, x.apellidoMaterno]
                      .filter(Boolean)
                      .join(" ") + ` · CMP ${x.cmp}`
                  : x.codigo + " · " + x.descripcion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
