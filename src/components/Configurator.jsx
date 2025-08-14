// Configurator.jsx
// Componente autónomo para configurar color, tapicería y (opcional) paquete solar.
// Uso: <Configurator baseImage="..." colorOptions={[...]} seatOptions={[...]} solarAvailable onChange={fn}/>

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

/**
 * @typedef {Object} OptionColor
 * @property {string} name   - Nombre visible del color (ej. "Blanco")
 * @property {string} hex    - HEX del color (ej. "#f5f5f5")
 * @property {string=} imageUrl - (Opcional) Imagen específica para ese color
 *
 * @typedef {Object} OptionSeat
 * @property {string} name - Nombre visible de la tapicería (ej. "Beige")
 * @property {string} hex  - HEX de la tapicería (se usa para la banda inferior del preview)
 */

/**
 * Configurator props
 * @param {string} baseImage            - Imagen base del vehículo (fallback)
 * @param {OptionColor[]} colorOptions  - Opciones de color (pueden traer imageUrl por color)
  * @param {OptionSeat[]} seatOptions    - Opciones de color de asientos
 * @param {boolean=} solarAvailable     - Si el modelo permite paquete solar
 * @param {string=} defaultColor        - Color inicial por nombre
 * @param {string=} defaultSeat         - Tapicería inicial por nombre
 * @param {(cfg: {color:string, seat:string, solar:boolean})=>void=} onChange
 */
export default function Configurator({
  baseImage,
  colorOptions = [],
  seatOptions = [],
  solarAvailable = false,
  defaultColor,
  defaultSeat,
  onQuote,
  imagesByColorSeat, // opcional: { [colorName]: { [seatName]: imageUrl } }
  onChange,
}) {
  const [color, setColor] = useState(defaultColor || colorOptions[0]?.name || "");
  const [seat, setSeat]   = useState(defaultSeat  || seatOptions[0]?.name  || "");
  const [solar, setSolar] = useState(false);

  const activeColor = useMemo(
    () => colorOptions.find((c) => c.name === color) || null,
    [color, colorOptions]
  );
  const activeSeat  = useMemo(
    () => seatOptions.find((s) => s.name === seat) || null,
    [seat, seatOptions]
  );

  // Imagen a mostrar: prioridad por combinación Color×Asientos, luego por color, luego base.
  const imageBySeat = imagesByColorSeat?.[color]?.[seat];
  const activeImage = imageBySeat || activeColor?.imageUrl || baseImage;
  // Si NO hay imagen específica (ni por color, ni por combinación), pintamos overlay con el HEX del color.
  const showColorOverlay = !imageBySeat && !activeColor?.imageUrl && !!activeColor?.hex;

  useEffect(() => {
    onChange?.({ color, seat, solar });
  }, [color, seat, solar]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white/90">
      {/* Preview */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        <img
          src={activeImage}
          alt={`Vista previa del vehículo en color ${color || "por definir"}`}
          className="h-80 w-full object-cover"
          loading="lazy"
        />
        {showColorOverlay && (
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-multiply opacity-60"
            style={{ backgroundColor: activeColor?.hex || "transparent" }}
          />
        )}
        {/* Banda inferior con la tapicería */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-10 opacity-90"
          style={{
            background: `linear-gradient(90deg, ${activeSeat?.hex || "#1f2937"} 0%, ${
              activeSeat?.hex || "#1f2937"
            } 100%)`,
          }}
        />
      </div>

      {/* Controles */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Colores */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <Swatch
                key={c.name}
                title={c.name}
                color={c.hex}
                active={color === c.name}
                onClick={() => setColor(c.name)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">Seleccionado: {color || "—"}</p>
        </div>

        {/* Tapicería */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Color de Asientos</label>
          <div className="flex flex-wrap gap-2">
            {seatOptions.map((s) => (
              <Swatch
                key={s.name}
                title={s.name}
                color={s.hex}
                active={seat === s.name}
                onClick={() => setSeat(s.name)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">Seleccionada: {seat || "—"}</p>
        </div>

        {/* Paquete solar (si aplica) */}
        {solarAvailable && (
          <div className="col-span-1 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-white/80">
              <input
                type="checkbox"
                className="accent-emerald-400"
                checked={solar}
                onChange={(e) => setSolar(e.target.checked)}
              />
              Agregar paquete Solar
            </label>
          </div>
        )}
      </div>

      {/* Resumen y CTA (sin precios) */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoPill label="Color" value={color || "—"} />
         <InfoPill label="Color de Asientos" value={seat || "—"} />
        {solarAvailable ? (
          <InfoPill label="Paquete" value={solar ? "Solar" : "—"} />
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300"
          onClick={() => {
            const cfg = { color, seat, solar };
            onChange?.(cfg);
            onQuote?.(cfg);
          }}
        >
          Solicitar cotización
          <ChevronIcon />
        </button>
        <p className="mt-2 text-xs text-white/60">
          Los precios y la configuración final se confirman en la cotización.
        </p>
      </div>
    </div>
  );
}

/* --- Subcomponentes --- */

function Swatch({ title, color, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`h-8 w-8 rounded-full ring-1 transition ${
        active ? "ring-emerald-400 scale-105" : "ring-white/20 hover:scale-105"
      }`}
      style={{ backgroundColor: color || "#9ca3af" }}
    />
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      <div className="text-white/50">{label}</div>
      <div className="font-medium text-white">{value}</div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// ---------- Prueba de humo en navegador (opcional) -----------------------
(function attachSmoke(){
  if (typeof window === 'undefined') return;
  window.__VD_RUN_CONFIG_SMOKE__ = () => {
    const results = [];
    const push = (name, pass, info="") => results.push({ name, pass, info });
    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      const sampleColors = [
        { name: 'Blanco', hex: '#f5f5f5' },
        { name: 'Azul', hex: '#2563eb' },
      ];
      const sampleSeats = [
        { name: 'Negro', hex: '#1f2937' },
        { name: 'Beige', hex: '#e9dfcf' },
      ];
      let lastCfg = null;
      root.render(
        React.createElement(Configurator, {
          baseImage: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1b?q=80&w=1600&auto=format&fit=crop',
          colorOptions: sampleColors,
          seatOptions: sampleSeats,
          solarAvailable: true,
          onChange: (cfg)=>{ lastCfg = cfg; }
        })
      );
      // Simula click en el segundo color por title
      const btn = Array.from(container.querySelectorAll('button')).find(b=>b.getAttribute('title')==='Azul');
      if (btn) btn.click();
      // Espera microtask
      // Nota: en entornos síncronos debería actualizarse al instante
      const passColor = lastCfg && lastCfg.color === 'Azul';
      push('Cambio de color mediante swatch', !!passColor, JSON.stringify(lastCfg));
    } catch (e) {
      push('Excepción en smoke test', false, String(e));
    }
    return results;
  };
})();


