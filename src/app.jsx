import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Configurator from './components/Configurator.jsx';

/**
 * Volt Drive — SPA unificada (About, FAQ, Aurora 72, Halcón 48)
 * - Router hash: #/about, #/faq, #/aurora, #/halcon
 * - Header/Footer consistentes
 * - Fondos (auroras + retícula) y animaciones
 * - Sin Tailwind build: se usa CDN en index.html
 */

// ---------------- Estilos base (animaciones + fondos) -------------------
function GlobalStyles() {
  return (
    <style>{`
      :root { --vd-bg:#0E1116; }
      html, body, #root { height:100%; background: var(--vd-bg); color: #fff; }
      * { box-sizing: border-box; }
      a { color: inherit; text-decoration: none; }

      @keyframes vd-fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      .vd-fade { animation: vd-fade-up .6s ease both; }

      @keyframes vd-auroraA { 0%{transform:translate(-20%,-10%) scale(1); opacity:.55} 50%{transform:translate(5%,10%) scale(1.05); opacity:.75} 100%{transform:translate(-20%,-10%) scale(1); opacity:.55} }
      @keyframes vd-auroraB { 0%{transform:translate(10%,20%) scale(1); opacity:.4} 50%{transform:translate(-10%,-15%) scale(1.08); opacity:.6} 100%{transform:translate(10%,20%) scale(1); opacity:.4} }
      .vd-aurora-a { animation: vd-auroraA 18s ease-in-out infinite; filter: blur(64px); }
      .vd-aurora-b { animation: vd-auroraB 22s ease-in-out infinite; filter: blur(64px); }
      .vd-grid { background-image: linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px); background-size:56px 56px; opacity:.06 }
    `}</style>
  );
}

// ---------------- Iconos inline (SVG mínimos) ---------------------------
function Icon({ path, size = 20, stroke = 1.8, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}
const IChevron = (p)=> <Icon {...p} path="M9 6l6 6-6 6"/>;
const IGauge   = (p)=> <Icon {...p} path="M12 13a3 3 0 100-6 3 3 0 000 6zm0 0l6 6M3 21a9 9 0 1118 0"/>;
const IBattery = (p)=> <Icon {...p} path="M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3V7zm18 4v2"/>;
const IShield  = (p)=> <Icon {...p} path="M12 22s8-3 8-10V6l-8-4-8 4v6c0 7 8 10 8 10z"/>;
const ISpark   = (p)=> <Icon {...p} path="M12 2l2.5 6H21l-5 4 2 8-6-4-6 4 2-8-5-4h6.5L12 2z"/>;
const ISun     = (p)=> <Icon {...p} path="M12 4v2m0 12v2m8-8h-2M6 12H4m11.31 5.31l-1.42-1.42M8.11 8.11L6.69 6.69m10.62 0l-1.42 1.42M8.11 15.89l-1.42 1.42M12 8a4 4 0 100 8 4 4 0 000-8z"/>;
const ISettings= (p)=> <Icon {...p} path="M12 15a3 3 0 110-6 3 3 0 010 6zm7.4-3a7.4 7.4 0 00-.1-1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1l-.4-2.6H9.2l-.4 2.6a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.6h5.6l.4-2.6a7.4 7.4 0 001.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z"/>;
const IPhone   = (p)=> <Icon {...p} path="M22 16.92V21a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h4.09a2 2 0 012 1.72l.57 4.06a2 2 0 01-.55 1.68l-1.24 1.24a16 16 0 006.88 6.88l1.24-1.24a2 2 0 011.68-.55l4.06.57A2 2 0 0122 16.92z"/>;
const IShare   = (p)=> <Icon {...p} path="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v14"/>;
const ILink    = (p)=> <Icon {...p} path="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.1 5M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07L14 18"/>;
const IWhats   = (p)=> <Icon {...p} path="M20.52 3.48A11.8 11.8 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.1 1.5 5.82L0 24l6.4-1.67A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.3-6.21-3.48-8.52zM12 21.5c-1.93 0-3.72-.56-5.23-1.52l-.37-.23-3.1.8.83-3.02-.24-.39A9.47 9.47 0 012.5 12C2.5 6.76 6.76 2.5 12 2.5S21.5 6.76 21.5 12 17.24 21.5 12 21.5zm4.14-6.4c-.23-.12-1.34-.66-1.55-.74-.21-.08-.36-.12-.52.12-.16.23-.6.74-.74.9-.14.16-.27.18-.5.06-.23-.12-.98-.36-1.87-1.12-.69-.55-1.16-1.24-1.3-1.45-.14-.22-.02-.34.1-.46.1-.1.23-.26.35-.39.12-.13.16-.22.24-.37.08-.16.04-.29-.02-.41-.06-.12-.52-1.25-.72-1.72-.19-.46-.37-.4-.52-.41l-.44-.01c-.16 0-.41.06-.63.29-.22.23-.84.82-.84 2 0 1.17.86 2.3.98 2.46.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.06-.1-.21-.16-.44-.28z"/>;
const IMail    = (p)=> <Icon {...p} path="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 0l8 7 8-7"/>;
const ISend    = (p)=> <Icon {...p} path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>;
const ICamera  = (p)=> <Icon {...p} path="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 17a5 5 0 100-10 5 5 0 000 10z"/>;
const IUsers   = (p)=> <Icon {...p} path="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M14 7a4 4 0 11-8 0 4 4 0 018 0M23 21v-2a4 4 0 00-3-3"/>;

// ---------------- Lazy Image Component -----------------------------------
function LazyImage({ src, alt, className, placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%231f2937'/%3E%3C/svg%3E" }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      <img
        src={isInView ? src : placeholder}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
      />
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}

// ---------------- Loading Component --------------------------------------
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
        <p className="text-white/60">Cargando...</p>
      </div>
    </div>
  );
}

// ---------------- Helpers de UI -----------------------------------------
const Pill = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/90 backdrop-blur">
    {children}
  </span>
);

const Section = ({ id, title, subtitle, children }) => (
  <section id={id} className="relative mx-auto max-w-7xl px-4 py-16 vd-fade">
    <div className="mb-8">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">{title}</h2>
      {subtitle && (<p className="mt-2 max-w-3xl text-white/70 leading-relaxed">{subtitle}</p>)}
    </div>
    {children}
  </section>
);

function GradientBG() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="vd-aurora-a absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/20 via-emerald-500/10 to-cyan-500/20"/>
      <div className="vd-aurora-b absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-cyan-400/10 via-emerald-500/10 to-emerald-700/10"/>
      <div className="vd-grid absolute inset-0"/>
    </div>
  );
}

// ---------------- Header & Footer (consistentes) ------------------------
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <a href="#/about" className="flex items-center gap-3" aria-label="Ir al inicio">
          <img src="/assets/home/LOGOVOLTDRIVE.png" alt="Volt Drive" className="h-6 w-6"/>
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-lg font-semibold text-transparent">Volt Drive</span>
        </a>
        <nav className="hidden gap-6 md:flex">
          <a href="#modelos" className="text-sm text-white/80 hover:text-white">Modelos</a>
          <a href="#/aurora" className="text-sm text-white/80 hover:text-white">Aurora 72</a>
          <a href="#/halcon" className="text-sm text-white/80 hover:text-white">Halcón 48</a>
          <a href="#usos" className="text-sm text-white/80 hover:text-white">Usos</a>
          <a href="#configurador" className="text-sm text-white/80 hover:text-white">Configurador</a>
          <a href="#accesorios" className="text-sm text-white/80 hover:text-white">Accesorios</a>
          <a href="#soporte" className="text-sm text-white/80 hover:text-white">Soporte</a>
          <a href="#contacto" className="text-sm text-white/80 hover:text-white">Contacto</a>
        </nav>
        <a href="#contacto" className="hidden items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 md:inline-flex">
          Solicitar demo
        </a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-white/60 md:flex-row">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 100 100"><path d="M14 35L36 70c1.9 3 6.3 3 8.2 0l22.4-35" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M56 30h12c16 0 28 12 28 27s-12 27-28 27H56" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Volt Drive</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="#modelos" className="hover:text-white">Modelos</a>
          <a href="#usos" className="hover:text-white">Usos</a>
          <a href="#configurador" className="hover:text-white">Configurador</a>
          <a href="#accesorios" className="hover:text-white">Accesorios</a>
          <a href="#soporte" className="hover:text-white">Soporte</a>
          <a href="#contacto" className="hover:text-white">Contacto</a>
        </div>
        <div className="text-xs">© {new Date().getFullYear()} Volt Drive — Todos los derechos reservados</div>
      </div>
    </footer>
  );
}

// ---------------- About --------------------------------------------------
function AboutPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_50rem_at_50%_-10%,rgba(16,185,129,0.12),rgba(0,0,0,0))] text-white">
      <GlobalStyles/>
      <GradientBG/>
      <Header/>

      <section className="relative mx-auto max-w-7xl px-4 pt-12 vd-fade">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <nav className="text-xs text-white/50"><span className="text-white/70">Quiénes somos</span></nav>
            <h1 className="mt-2 text-4xl md:text-6xl font-semibold tracking-tight text-white">Movilidad eléctrica con propósito</h1>
            <p className="mt-4 max-w-xl text-white/70">En Volt Drive diseñamos experiencias de traslado premium para golf, turismo, hospitalidad y eventos. Integramos confort, seguridad y tecnología en vehículos eléctricos configurables que se adaptan a cada proyecto.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill><IShield/> Seguridad primero</Pill>
              <Pill><ISpark/> Tecnología útil</Pill>
              <Pill><IGauge/> Rendimiento real</Pill>
            </div>
            <div className="mt-6 flex gap-3">
              <a href="#contacto" className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">Solicitar demo <IChevron/></a>
              <a href="#/faq" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white/90 backdrop-blur hover:bg-white/10">Ver FAQ</a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[url('https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center p-6 shadow-2xl" aria-label="Imagen de fondo temática de movilidad eléctrica">
            <div className="rounded-2xl bg-black/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white/90">
                <span className="text-emerald-300"><ISpark/></span>
                Cero emisiones locales • Operación silenciosa • Diseño centrado en personas
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="proposito" title="Nuestro propósito">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[{title:"Misión",text:"Impulsar proyectos de movilidad eléctrica confiables y cómodos para mover personas con estilo y cero emisiones locales."},{title:"Visión",text:"Ser la referencia en soluciones de micro‑movilidad premium para hospitalidad, turismo y comunidades."},{title:"Valores",text:"Seguridad, transparencia, orientación al cliente y mejora continua."}].map((c)=> (
            <div key={c.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-2 inline-flex items-center gap-2 text-emerald-300"><ISpark/> <span className="font-semibold text-white">{c.title}</span></div>
              <p className="text-white/80">{c.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="proceso" title="Cómo trabajamos" subtitle="Acompañamos todo el ciclo: desde el diagnóstico hasta la operación diaria.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {["Diagnóstico","Configuración","Prueba piloto","Entrega y capacitación","Soporte continuo"].map((s,idx)=>(
            <div key={s} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/60">Paso {idx+1}</div>
              <div className="mt-1 text-white font-semibold">{s}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="contacto" title="Construyamos tu proyecto" subtitle="Cuéntanos tu uso y te proponemos la configuración ideal.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-white/70">Nombre y Apellidos</label>
                <input className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Escribe aquí…"/>
              </div>
              <div>
                <label className="block text-sm text-white/70">Email</label>
                <input type="email" className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="correo@dominio.com"/>
              </div>
              <div>
                <label className="block text-sm text-white/70">Mensaje</label>
                <textarea className="mt-1 h-28 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Necesito 4 unidades para traslados en hotel…"/>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">Enviar solicitud <IChevron/></button>
              </div>
              <p className="text-xs text-white/60">Te responderemos en menos de 24 horas hábiles.</p>
            </form>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur">
            <h3 className="text-xl font-semibold text-white">Contacto directo</h3>
            <ul className="mt-4 space-y-2 text-white/80">
              <li>contacto@voltdrive.mx</li>
              <li>+52 (___) ___ ____</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">¿Flotillas? Indica cantidad, uso y ubicación.</div>
          </div>
        </div>
      </Section>

      <Footer/>
    </main>
  );
}

// ---------------- FAQ ----------------------------------------------------
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const safeId = useMemo(() => q.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-_]/g,''), [q]);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5" data-faq-item>
      <button aria-expanded={open} aria-controls={safeId} onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
        <span className="font-medium text-white">{q}</span>
        <IChevron className={`transition ${open?"rotate-90":""}`}/>
      </button>
      {open && (<div id={safeId} className="px-4 pb-4 text-white/80">{a}</div>)}
    </div>
  );
}

function FAQPage() {
  const groups = [
    { title: 'Compra y entrega', items: [
      { q: '¿Cómo solicito una cotización?', a: 'Desde el configurador o el formulario de contacto. Enviamos propuesta con equipamiento y tiempos.' },
      { q: '¿Hacen envíos a todo el país?', a: 'Coordinamos entrega nacional con partners logísticos.' },
      { q: '¿Renta o leasing?', a: 'Sí, con aliados. Indica horizonte y unidades.' },
    ]},
    { title: 'Batería y carga', items: [
      { q: '¿Qué batería usan?', a: 'LiFePO₄ con BMS (72V/48V).' },
      { q: '¿Cargar en tomacorriente normal?', a: 'Sí, 100–240V con cargadores incluidos.' },
      { q: '¿Techo solar ayuda?', a: 'En Halcón 48 puede aportar ~20% adicional en condiciones favorables.' },
    ]},
    { title: 'Servicio y garantía', items: [
      { q: '¿Garantía?', a: 'Cobertura contra defectos de fabricación según contrato.' },
      { q: '¿Mantenimiento?', a: 'Plan preventivo y capacitación de operadores.' },
      { q: '¿Refacciones?', a: 'Sí, catálogo bajo pedido. Precios sólo en cotización.' },
    ]},
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_50rem_at_50%_-10%,rgba(16,185,129,0.12),rgba(0,0,0,0))] text-white">
      <GlobalStyles/>
      <GradientBG/>
      <Header/>

      <section className="relative mx-auto max-w-7xl px-4 pt-12 vd-fade">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div>
            <nav className="text-xs text-white/50"><span className="text-white/70">Preguntas frecuentes</span></nav>
            <h1 className="mt-2 text-4xl md:text-6xl font-semibold tracking-tight text-white">Respuestas claras, sin rodeos</h1>
            <p className="mt-4 max-w-xl text-white/70">Compra, operación, batería, servicio y personalización. Todo aquí.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[url('https://images.unsplash.com/photo-1544829879-2fa3f3a5153f?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center p-6 shadow-2xl" aria-label="Imagen de fondo temática para FAQ">
            <div className="rounded-2xl bg-black/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white/90">
                <span className="text-emerald-300"><ISpark/></span>
                Operación silenciosa • Paquetes por uso
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="faq" title="Preguntas por tema">
        <div className="space-y-8">
          {groups.map((g)=> (
            <div key={g.title} data-faq-group className="space-y-3">
              <h3 className="text-xl font-semibold text-white">{g.title}</h3>
              <div className="space-y-3">
                {g.items.map((it)=> (<FAQItem key={it.q} q={it.q} a={it.a}/>))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Footer/>
    </main>
  );
}

// ---------------- Datos & Model Pages -----------------------------------
const COLOR_HEX = { Blanco: '#f5f5f5', Azul: '#2563eb', Negro: '#0f172a', Gris: '#9ca3af', Rojo: '#ef4444' };
const SEAT_HEX  = { Beige: '#e9dfcf', Negro: '#1f2937', Naranja: '#f97316', Gris: '#9ca3af', 'Marrón toffee': '#b7791f' };

const MODELS = {
  aurora: {
    key: 'aurora',
    name: 'Aurora 72',
    tagline: 'Potencia y tecnología para experiencias premium',
    hero: '/assets/models/aurora/hero.webp',
    gallery: [
      '/assets/models/aurora/aurora_galeria0.webp',
      '/assets/models/aurora/aurora_galeria1.webp',
      '/assets/models/aurora/aurora_galeria2.webp',
      '/assets/models/aurora/aurora_galeria3.webp',
      '/assets/models/aurora/aurora_galeria4.webp',
    ],
    imagesByColor: {
      'Azul': '/assets/models/aurora/aurora72-azul.webp',
      'Blanco': '/assets/models/aurora/aurora-72-blanco.webp',
      'Gris': '/assets/models/aurora/aurora-72-gris.webp',
      'Negro': '/assets/models/aurora/aurora-72-negro.webp',
      'Rojo': '/assets/models/aurora/aurora-72-rojo.webp',
    },
    imagesByColorSeat: {
      'Azul': {
        'Gris': '/assets/models/aurora/aurora72-azul-asientosgris_q90.webp',
        'Naranja': '/assets/models/aurora/aurora72-azul-asientosnaranja_q90.webp'
      },
      'Blanco': {
        'Gris': '/assets/models/aurora/aurora-72-blanco-asientosgris_q90.webp',
        // Nota: el archivo tiene un nombre con "narjana"; lo referenciamos tal cual
        'Naranja': '/assets/models/aurora/aurora-72-blanco-asientosnarjana_q90.webp'
      },
      'Gris': {
        'Gris': '/assets/models/aurora/aurora-72-gris-asientosgris_q90.webp',
        'Naranja': '/assets/models/aurora/aurora-72-gris-asientosnaranja_q90.webp'
      },
      'Negro': {
        'Gris': '/assets/models/aurora/aurora-72-negro-asientosgris_q90.webp',
        'Naranja': '/assets/models/aurora/aurora-72-negro-asientosnaranja_q90.webp'
      },
      'Rojo': {
        'Gris': '/assets/models/aurora/aurora-72-rojo-asientosgris_q90.webp',
        // El archivo está como "asientonaranja"
        'Naranja': '/assets/models/aurora/aurora-72-rojo-asientonaranja_q90.webp'
      },
    },
    colors: ['Blanco', 'Azul', 'Negro', 'Gris', 'Rojo'],
    seats: ['Naranja', 'Gris'],
    variants: [
      { name: 'Rider (urbano)', details: ['Suspensión afinada para confort', 'Neumático mixto 14"', 'Iluminación LED'] },
      { name: 'Explorer (todo terreno)', details: ['Neumático AT 14"', 'Mayor despeje', 'Protecciones y faldones'] },
    ],
    highlights: [
      { icon: <IGauge/>, title: '25 mph', text: 'Velocidad máxima' },
      { icon: <IBattery/>, title: '~80 km', text: 'Autonomía (uso típico)' },
      { icon: <IShield/>, title: 'F/R Disco + EPB', text: 'Frenado confiable' },
      { icon: <ISpark/>, title: 'TFT 12.3"*', text: 'Paquete tecnología' },
    ],
    specs: {
      'Plataforma': '72V LiFePO₄ (≈7.7 kWh)',
      'Motor': 'AC 72V 6.3 kW',
      'Controlador': '72V 350A (AC)',
      'Cargador': 'AC 100–240V → DC 72V 20A',
      'Pasajeros': '4',
      'Velocidad máx.': '25 mph (40 km/h)',
      'Autonomía': 'hasta ~80 km a 30 km/h',
      'Cap. ascenso': '30%',
      'Frenos': 'Discos F/R + freno eléctrico (EPB)',
      'Suspensión': 'Del: Doble A‑arm • Tras: eje con brazos tirados',
      'Dimensiones': '3045 × 1400 × 1990–2030 mm',
      'Iluminación': 'LED completa con DRL',
    },
    accessories: [
      { sku: 'LL-2255014', name: 'Juego de llantas 225/50R14 WR028 (x4)', cat: 'Exteriores' },
      { sku: 'RN-147JBLK', name: 'Rines aluminio 14×7J ET‑25 (x4, negro)', cat: 'Exteriores' },
      { sku: 'PS-12.3', name: 'Pantalla multimedia 12.3"', cat: 'Tecnología' },
      { sku: 'SB-LED', name: 'Sound bar con iluminación rítmica', cat: 'Confort' },
    ],
  },
  halcon: {
    key: 'halcon',
    name: 'Halcón 48',
    tagline: 'Eficiencia y versatilidad para rutas y tours',
    hero: '/assets/models/halcon/hero.webp',
    gallery: [
      '/assets/models/halcon/galeria_halcon0.webp',
      '/assets/models/halcon/galeria_halcon1.webp',
      '/assets/models/halcon/galeria_halcon2.webp',
      '/assets/models/halcon/galeria_halcon3.webp',
      '/assets/models/halcon/galeria_halcon4.webp',
    ],
    imagesByColor: {
      'Blanco': '/assets/models/halcon/halcon48-blanco.webp',
      'Azul': '/assets/models/halcon/halcon48-azul.webp',
      'Negro': '/assets/models/halcon/halcon48-negro.webp',
      'Gris': '/assets/models/halcon/halcon48-gris.webp',
      'Rojo': '/assets/models/halcon/halcon48-rojo.webp',
    },
    imagesByColorSeat: {
      'Blanco': {
        'Negro': '/assets/models/halcon/halcon48-blanco-asientosnegros.webp',
        'Marrón toffee': '/assets/models/halcon/halcon48-blanco-asientosmarron.webp'
      },
      'Azul': {
        'Negro': '/assets/models/halcon/halcon48-azul-asientosnegros.webp',
        'Marrón toffee': '/assets/models/halcon/halcon48-azul-asientosmarron.webp'
      },
      'Negro': {
        'Negro': '/assets/models/halcon/halcon48-negro-asientosnegros.webp',
        'Marrón toffee': '/assets/models/halcon/halcon48-negro-asientosmarron.webp'
      },
      'Gris': {
        'Negro': '/assets/models/halcon/halcon48-gris-asientosnegros.webp',
        'Marrón toffee': '/assets/models/halcon/halcon48-gris-asientosmarron.webp'
      },
      'Rojo': {
        'Negro': '/assets/models/halcon/halcon48-rojo-asientosnegros.webp',
        'Marrón toffee': '/assets/models/halcon/halcon48-rojo-asientosmarron.webp'
      },
    },
    colors: ['Blanco', 'Azul', 'Negro', 'Gris', 'Rojo'],
    seats: ['Negro', 'Marrón toffee'],
    variants: [
      { name: 'Rider (urbano)', details: ['Dirección suave para recorridos largos', 'Neumático mixto 14"', 'DRL y faro LED'] },
      { name: 'Explorer (todo terreno)', details: ['Neumático AT 14"', 'Barras y protecciones', 'Mayor despeje'] },
    ],
    highlights: [
      { icon: <IGauge/>, title: '25 mph', text: 'Velocidad máxima' },
      { icon: <IBattery/>, title: '>56 km', text: 'Autonomía mínima' },
      { icon: <IShield/>, title: 'F/R Disco + EPB', text: 'Frenado confiable' },
      { icon: <ISun/>, title: 'Techo solar*', text: '+~20% autonomía' },
    ],
    specs: {
      'Plataforma': '48V LiFePO₄ 105Ah',
      'Motor': 'AC 48V 5 kW',
      'Controlador': '48V 350A (AC)',
      'Cargador': 'AC 100–240V → DC 48V 20A',
      'Pasajeros': '4',
      'Velocidad máx.': '25 mph (40 km/h)',
      'Autonomía': '> 56 km',
      'Cap. ascenso': '≤ 30%',
      'Frenos': 'Discos F/R + freno eléctrico (EPB)',
      'Suspensión': 'Del: Doble A‑arm • Tras: eje integral aluminio',
      'Dimensiones': '≈ 2900 × 1390 × 2030 mm',
      'Iluminación': 'LED completa con DRL',
    },
    accessories: [
      { sku: 'EV-EP3', name: 'Cargador portátil EVSE EP3 16A 5m', cat: 'Energía' },
      { sku: 'RN-147JBLK', name: 'Rines aluminio 14×7J ET‑25 (x4, negro)', cat: 'Exteriores' },
      { sku: 'PK-PUSH', name: 'Kit push‑to‑start con Bluetooth', cat: 'Tecnología' },
      { sku: 'NFC-2', name: 'Tarjetas NFC (x2)', cat: 'Tecnología' },
    ],
  },
};

// --------- Accesorios globales (compat por modelo) -----------------------
const ACCESSORIES = [
  { sku: 'LL-2255014', name: 'Juego de llantas 225/50R14 WR028 (x4)', compat: ['aurora','halcon'], cat: 'Exteriores' },
  { sku: 'RN-147JBLK', name: 'Rines aluminio 14×7J ET‑25 (x4, negro)', compat: ['aurora','halcon'], cat: 'Exteriores' },
  { sku: 'EV-EP3', name: 'Cargador portátil EVSE EP3 16A 5m', compat: ['halcon','aurora'], cat: 'Energía' },
  { sku: 'PS-12.3', name: 'Pantalla multimedia 12.3"', compat: ['aurora'], cat: 'Tecnología' },
  { sku: 'SB-LED', name: 'Sound bar con iluminación rítmica', compat: ['aurora'], cat: 'Confort' },
  { sku: 'PK-PUSH', name: 'Kit push‑to‑start con Bluetooth', compat: ['halcon'], cat: 'Tecnología' },
  { sku: 'NFC-2', name: 'Tarjetas NFC (x2)', compat: ['halcon'], cat: 'Tecnología' },
];

// --------- Home data (stats y usos) --------------------------------------
const STATS = [
  { label: 'Velocidad máxima', value: '25 mph (40 km/h)' },
  { label: 'Autonomía por carga', value: 'hasta ~80 km*' },
  { label: 'Capacidad de ascenso', value: 'hasta 30%' },
];

const USES = [
  { icon: <Icon path="M5 12h14M12 5v14"/>, title: 'Golf', text: 'Traslados silenciosos y confortables para 18 hoyos.' },
  { icon: <Icon path="M3 21V8l9-5 9 5v13"/>, title: 'Hoteles & Resorts', text: 'Experiencias VIP con asientos premium y cámara de reversa.' },
  { icon: <Icon path="M21 10l-9 11L3 10l9-7 9 7z"/>, title: 'Tours & Turismo', text: 'Halcón 48 con techo solar para rutas diarias.' },
  { icon: <Icon path="M2 21l10-6 10 6M2 21V9l10-6 10 6v12"/>, title: 'Eventos & Bodas', text: 'Flotas por color, luz ambiente y sonido.' },
  { icon: <Icon path="M4 22V2h16v20M8 6h8M8 10h8"/>, title: 'Campus & Comunidades', text: 'Seguridad con frenos de disco e iluminación LED.' },
  { icon: <Icon path="M3 3h7l4 4h7v14H3z"/>, title: 'Parques / Industria', text: 'Versión Explorer para superficies mixtas.' },
];

function ColorSeatPreview({ img, colorName, seatName }) {
  const colorHex = COLOR_HEX[colorName] || 'transparent';
  const seatHex  = SEAT_HEX[seatName]  || '#1f2937';
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <img src={img} alt="Vista del modelo" className="h-80 w-full object-cover"/>
      <div className="absolute inset-0 mix-blend-multiply opacity-60" style={{ background: colorName ? colorHex : 'transparent' }}/>
      <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: `linear-gradient(90deg, ${seatHex} 0%, ${seatHex} 100%)`, opacity: .9 }}/>
    </div>
  );
}

function SpecsTable({ specs }) {
  const entries = Object.entries(specs || {});
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {entries.map(([k,v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-white/50">{k}</div>
            <div className="mt-1 text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Variants({ variants }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {variants.map((v)=> (
        <div key={v.name} className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-2 inline-flex items-center gap-2 text-emerald-300"><ISettings/> <span className="font-semibold text-white">{v.name}</span></div>
          <ul className="list-disc pl-6 text-white/80">
            {v.details.map((d)=> (<li key={d}>{d}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Gallery({ images }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* 1 grande izquierda (span 2) + 1 derecha */}
      {images[0] && (
        <div className="overflow-hidden rounded-3xl border border-white/10 md:col-span-2">
          <LazyImage src={images[0]} alt="Galería imagen 1" className="h-56 w-full object-cover md:h-64"/>
        </div>
      )}
      {images[1] && (
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <LazyImage src={images[1]} alt="Galería imagen 2" className="h-56 w-full object-cover md:h-64"/>
        </div>
      )}
      {/* 3 abajo: 2 medianas + 1 grande (span 2) */}
      {images[2] && (
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <LazyImage src={images[2]} alt="Galería imagen 3" className="h-56 w-full object-cover md:h-64"/>
        </div>
      )}
      {images[3] && (
        <div className="overflow-hidden rounded-3xl border border-white/10 md:col-span-2">
          <LazyImage src={images[3]} alt="Galería imagen 4" className="h-56 w-full object-cover md:h-64"/>
        </div>
      )}
      {images[4] && (
        <div className="overflow-hidden rounded-3xl border border-white/10 md:col-span-3">
          <LazyImage src={images[4]} alt="Galería imagen 5" className="h-56 w-full object-cover md:h-64"/>
        </div>
      )}
    </div>
  );
}

function Accessories({ items }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="grid grid-cols-12 bg-white/5 text-sm text-white/70">
        <div className="col-span-7 p-3">Accesorio</div>
        <div className="col-span-3 p-3">Categoría</div>
        <div className="col-span-2 p-3 text-right">Disponibilidad</div>
      </div>
      <div className="divide-y divide-white/10">
        {items.map((a) => (
          <div key={a.sku} className="grid grid-cols-12 items-center p-3 text-white/90">
            <div className="col-span-7">
              <div className="font-medium text-white">{a.name}</div>
              <div className="text-xs text-white/50">SKU: {a.sku}</div>
            </div>
            <div className="col-span-3 text-sm">{a.cat}</div>
            <div className="col-span-2 text-right text-xs text-emerald-300">Bajo pedido</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Cards Home ---------------------------------------------
function ModelCard({ m }) {
  const go = ()=> { window.location.hash = `#/${m.key}`; setTimeout(()=> window.scrollTo({ top: 0, behavior: 'instant' }), 0); };
  return (
    <div onClick={go} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') go(); }} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur vd-fade cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/10"/>
      <img src={m.hero} alt={m.name} className="h-64 w-full object-cover" />
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Pill><ISpark className="text-emerald-300"/> {m.specs['Plataforma']}</Pill>
          <Pill><IUsers className="text-emerald-300"/> {m.specs['Pasajeros']} pasajeros</Pill>
        </div>
        <h3 className="text-2xl font-semibold text-white">{m.name}</h3>
        <p className="max-w-lg text-white/70">{m.tagline}</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-white/80 md:grid-cols-2">
          <li className="flex items-center gap-2"><IGauge/> {m.specs['Velocidad máx.']}</li>
          <li className="flex items-center gap-2"><IBattery/> {m.specs['Autonomía']}</li>
          <li className="flex items-center gap-2"><IShield/> {m.specs['Frenos']}</li>
          <li className="flex items-center gap-2"><ISettings/> {m.specs['Suspensión']}</li>
        </ul>
        <div className="pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 font-medium text-emerald-950 transition group-hover:bg-emerald-300">
            Ver {m.name} <IChevron/>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------- Advanced Configurator (full) ----------------------------
function AdvancedConfigurator() {
  const [model, setModel] = useState('aurora');
  const [version, setVersion] = useState('');
  const [color, setColor] = useState('');
  const [seats, setSeats] = useState('');
  const [roof, setRoof] = useState('Estándar');
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ name:'', email:'', phone:'', type:'Compra', units:'1', city:'', country:'México' });

  const modelData = useMemo(() => MODELS[model], [model]);
  useEffect(() => {
    const firstVariant = (modelData?.variants?.[0]?.name) || (Array.isArray(modelData?.variants)? modelData.variants[0]: '');
    setVersion(firstVariant || '');
  }, [model, modelData]);

  const accessoryOptions = useMemo(() => ACCESSORIES.filter(a => a.compat.includes(model)), [model]);
  const colorHex = COLOR_HEX[color] || '#9ca3af';
  const seatHex = SEAT_HEX[seats] || '#1f2937';
  const previewImg = modelData?.hero;

  // Estado sticky CTA en móvil
  const stickyCta = (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-black/70 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="text-xs text-white/70 truncate">{modelData?.name} • {color || '—'} • {seats || '—'}</div>
        <QuoteModalTrigger form={form} setForm={setForm} configuration={{ model, version, color, seats, roof, packages, selectedAccessories: selected }} />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {stickyCta}
      <div className="lg:col-span-7">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-xl font-semibold text-white">Selecciona tu configuración</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-white/70">Modelo</label>
              <select value={model} onChange={(e)=>setModel(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none">
                <option value="aurora">Aurora 72</option>
                <option value="halcon">Halcón 48</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70">Versión</label>
              <select value={version} onChange={(e)=>setVersion(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none">
                {(modelData?.variants||[]).map(v => {
                  const label = typeof v === 'string' ? v : v.name;
                  return <option key={label} value={label}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70">Color de carrocería</label>
              <select value={color} onChange={(e)=>setColor(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none">
                <option value="">Selecciona…</option>
                {(modelData?.colors||[]).map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
              <div className="mt-2 flex gap-2">
                {(modelData?.colors||[]).map(c => (
                  <button key={c} onClick={()=>setColor(c)} title={c} className="h-6 w-6 rounded-full ring-1 ring-white/20" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }}/>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70">Color de Asientos</label>
              <select value={seats} onChange={(e)=>setSeats(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none">
                <option value="">Selecciona…</option>
                {(modelData?.seats||[]).map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
              <div className="mt-2 flex gap-2">
                {(modelData?.seats||[]).map(s => (
                  <button key={s} onClick={()=>setSeats(s)} title={s} className="h-6 w-6 rounded-full ring-1 ring-white/20" style={{ backgroundColor: SEAT_HEX[s] || '#1f2937' }}/>
                ))}
              </div>
            </div>
            <div className={model!=="halcon"?"opacity-50 pointer-events-none":""}>
              <label className="block text-sm text-white/70">Techo</label>
              <select value={roof} onChange={(e)=>setRoof(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none">
                <option>Estándar</option>
                <option>Techo solar (+~20% autonomía)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70">Paquetes</label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {["Base","Tecnología","Confort"].map(p => {
                  const active = packages.includes(p);
                  return (
                    <button key={p} onClick={()=>setPackages(s => s.includes(p)? s.filter(i=>i!==p): [...s,p])} className={`rounded-full px-3 py-2 text-left transition ${active?"bg-emerald-500 text-emerald-950":"bg-white/10 text-white"}`}>
                      <div className="flex items-center gap-2">
                        <Icon path="M20 6L9 17l-5-5" className={`${active?"opacity-100":"opacity-30"}`}/>
                        {p}
                      </div>
                    </button>
                  );
                })}
                {model==='halcon' && (
                  <button onClick={()=>setPackages(s => s.includes('Solar')? s.filter(i=>i!=='Solar'): [...s,'Solar'])} className={`rounded-full px-3 py-2 text-left transition ${packages.includes('Solar')?"bg-emerald-500 text-emerald-950":"bg-white/10 text-white"}`}>
                    <div className="flex items-center gap-2"><ISun/>Solar</div>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70">Accesorios</label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {accessoryOptions.map(a => {
                const active = selected.includes(a.sku);
                return (
                  <button key={a.sku} onClick={()=> setSelected(s => s.includes(a.sku)? s.filter(i=>i!==a.sku) : [...s, a.sku])} className={`flex items-center justify-between rounded-2xl border border-white/10 p-3 text-left transition ${active?"bg-emerald-500/10 ring-1 ring-emerald-400":"bg-white/5"}`}>
                    <div className="flex items-center gap-3">
                      <ICamera className="text-white/50"/>
                      <div>
                        <p className="text-sm text-white">{a.name}</p>
                        <p className="text-xs text-white/50">SKU: {a.sku} • {a.cat}</p>
                      </div>
                    </div>
                    <div className={`h-3 w-3 rounded-full ${active?"bg-emerald-400":"bg-white/20"}`}/>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-24 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-0 backdrop-blur">
            <div className="relative">
              <img src={modelData?.imagesByColorSeat?.[color]?.[seats] || modelData?.imagesByColor?.[color] || previewImg} alt={`Preview ${modelData?.name||''}`} className="h-72 w-full object-cover"/>
              <div className="absolute inset-0 mix-blend-multiply opacity-60" style={{ background: (!modelData?.imagesByColorSeat?.[color]?.[seats] && !modelData?.imagesByColor?.[color] && color) ? colorHex : 'transparent'}}/>
              <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: `linear-gradient(90deg, ${seatHex} 0%, ${seatHex} 100%)`, opacity: 0.9 }}/>
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Pill><IUsers/> {modelData?.specs?.Pasajeros || '4'} pax</Pill>
                <Pill><IGauge/> {modelData?.specs?.['Velocidad máx.'] || ''}</Pill>
                {packages.includes('Solar') && model==='halcon' && (
                  <Pill><ISun/> Techo solar</Pill>
                )}
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-lg font-semibold text-white">{modelData?.name} — Vista previa</h4>
              <p className="mt-1 text-sm text-white/70">Color: <span className="text-white">{color || '—'}</span> • Color de Asientos: <span className="text-white">{seats || '—'}</span> • Techo: <span className="text-white">{model==='halcon' ? roof : 'Estándar'}</span></p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                {packages.map(p => (<Pill key={p}><Icon path="M20 6L9 17l-5-5" className="text-emerald-300"/> {p}</Pill>))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <QuoteModalTrigger
                  form={form}
                  setForm={setForm}
                  configuration={{ model, version, color, seats, roof, packages, selectedAccessories: selected }}
                  label="Enviar cotización"
                />
                <button onClick={()=>{
                  const params = new URLSearchParams({ model, color, seats }).toString();
                  const shareUrl = `${window.location.origin}${window.location.pathname}#/${model}?${params}`;
                  navigator.clipboard.writeText(shareUrl).then(()=> showToast('Configuración copiada'));
                }} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/90 backdrop-blur hover:bg-white/10">Compartir configuración</button>
              </div>
              <p className="mt-3 text-xs text-white/60">Accesorios seleccionados: <span className="text-white">{selected.length}</span>. Los precios se comparten solo en cotización.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
            <p className="text-xs">Aviso: Las especificaciones y equipamientos pueden variar por lote. Autonomía sujeta a condiciones de manejo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteModalTrigger({ form, setForm, configuration, label='Solicitar cotización' }){
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const invalid = !form.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email||'') || !form.phone || !form.city;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Escucha evento global para abrir el modal desde otros componentes (configurador)
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.form && typeof setForm === 'function') {
        setForm(e.detail.form);
      }
      setOpen(true);
    };
    window.addEventListener('vd_open_quote', handler);
    return () => window.removeEventListener('vd_open_quote', handler);
  }, [setForm]);

  async function submit(){
    if (invalid) return;
    setSending(true);
    try {
      const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? '/api/quote' : '/api/quote';
      const r = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customer: form, configuration }) });
      if (!r.ok) throw new Error('Solicitud fallida');
      setOpen(false);
      showToast('Solicitud enviada. Te contactaremos pronto.');
    } catch(e){
      showToast('No se pudo enviar la solicitud. Inténtalo más tarde.');
    } finally { setSending(false); }
  }

  return (
    <>
      <button onClick={()=>setOpen(true)} className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">
        {label} <IChevron className="transition group-hover:translate-x-0.5"/>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="quote-title">
          <div className="absolute inset-0 bg-black/60" onClick={()=>!sending && setOpen(false)}></div>
          <div className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-6 text-white backdrop-blur" tabIndex={-1}>
            <h3 id="quote-title" className="text-xl font-semibold">Resumen y datos para cotización</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 p-4">
                <div className="text-sm text-white/60">Resumen</div>
                <div className="mt-2 space-y-1 text-sm">
                  {Object.entries({
                    Modelo: configuration.model,
                    Versión: configuration.version,
                    Color: configuration.color,
                    'Color de Asientos': configuration.seats,
                    Techo: configuration.roof,
                    Paquetes: (configuration.packages||[]).join(', ') || '—',
                    Accesorios: (configuration.selectedAccessories||[]).join(', ') || '—'
                  }).map(([k,v]) => (<div key={k}><span className="text-white/60">{k}: </span><span className="text-white">{v}</span></div>))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <label className="block text-white/60">Nombre y Apellidos</label>
                    <input autoFocus value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400"/>
                    {!form.name && (<div className="mt-1 text-xs text-rose-300">Campo requerido</div>)}
                  </div>
                  <div>
                    <label className="block text-white/60">Email</label>
                    <input type="email" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400"/>
                    {form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) && (<div className="mt-1 text-xs text-rose-300">Email inválido</div>)}
                  </div>
                  <div>
                    <label className="block text-white/60">Teléfono / WhatsApp</label>
                    <input value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400"/>
                    {!form.phone && (<div className="mt-1 text-xs text-rose-300">Campo requerido</div>)}
                  </div>
                  <div>
                    <label className="block text-white/60">Intención</label>
                    <div className="mt-1 flex gap-2">
                      {['Compra','Renta','Leasing'].map(t => (
                        <button key={t} type="button" onClick={()=>setForm({ ...form, type: t })} className={`rounded-full px-3 py-1.5 ${form.type===t?'bg-emerald-400 text-emerald-950':'bg-white/10 text-white'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/60">Unidades</label>
                    <input type="number" min="1" value={form.units} onChange={(e)=>setForm({ ...form, units: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400"/>
                  </div>
                  <div>
                    <label className="block text-white/60">Ciudad</label>
                    <input value={form.city} onChange={(e)=>setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-400"/>
                    {!form.city && (<div className="mt-1 text-xs text-rose-300">Campo requerido</div>)}
                  </div>
                  <div>
                    <label className="block text-white/60">País</label>
                    <select value={form.country} onChange={(e)=>setForm({ ...form, country: e.target.value })} className="mt-1 w-full rounded-xl bg-white/10 p-2.5 text-white outline-none">
                      {['México','Panamá','Costa Rica'].map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button disabled={sending} onClick={()=>setOpen(false)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/90 backdrop-blur hover:bg-white/10">Cancelar</button>
              <button disabled={sending||invalid} onClick={submit} className={`rounded-full px-5 py-2 font-medium ${sending||invalid? 'bg-emerald-400/50 text-emerald-950/80' : 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'}`}>{sending? 'Enviando…' : 'Enviar cotización'}</button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

function Comparison() {
  const modelList = [MODELS.aurora, MODELS.halcon];
  const rows = [
    { k: 'Plataforma', f: (m)=>m.specs['Plataforma'] },
    { k: 'Pasajeros', f: (m)=>m.specs['Pasajeros'] },
    { k: 'Velocidad máx.', f: (m)=>m.specs['Velocidad máx.'] },
    { k: 'Autonomía típica', f: (m)=>m.specs['Autonomía'] },
    { k: 'Cap. ascenso', f: (m)=>m.specs['Cap. ascenso'] },
    { k: 'Frenos', f: (m)=>m.specs['Frenos'] },
    { k: 'Dimensiones', f: (m)=>m.specs['Dimensiones'] },
    { k: 'Motor', f: (m)=>m.specs['Motor'] },
    { k: 'Cargador', f: (m)=>m.specs['Cargador'] },
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="grid grid-cols-3 bg-white/5 text-white">
        <div className="p-4 text-sm text-white/60">&nbsp;</div>
        {modelList.map((m) => (
          <div key={m.key} className="p-4 text-center text-lg font-semibold">{m.name}</div>
        ))}
      </div>
      <div className="divide-y divide-white/10 text-white/80">
        {rows.map((row) => (
          <div key={row.k} className="grid grid-cols-3">
            <div className="p-4 text-sm font-medium text-white/70">{row.k}</div>
            {modelList.map((m) => (
              <div key={m.key+row.k} className="p-4 border-l border-white/10">{row.f(m)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Home (One‑page) ----------------------------------------
function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_50rem_at_50%_-10%,rgba(16,185,129,0.12),rgba(0,0,0,0))] text-white">
      <GlobalStyles/>
      <GradientBG/>
      <Header/>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 vd-fade">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Movilidad eléctrica <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 bg-clip-text text-transparent">premium</span> para golf, turismo y eventos
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Carritos eléctricos silenciosos, cómodos y personalizables. Ideales para hoteles, recorridos turísticos, eventos, campus y comunidades.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
          <a href="#configurador" className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">
                Solicitar cotización <IChevron/>
              </a>
              <a href="#modelos" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white/90 backdrop-blur hover:bg-white/10">Ver modelos</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Pill><IGauge/> 25 mph</Pill>
              <Pill><IBattery/> hasta ~80 km*</Pill>
              <Pill><IShield/> Frenos de disco F/R</Pill>
              <Pill><ISpark/> Pantalla 12.3"*</Pill>
              <Pill><ISun/> Techo solar (Halcón)</Pill>
            </div>
            <p className="mt-2 text-xs text-white/50">*Disponibilidad según modelo y paquete.</p>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <video
                src="/assets/home/home-card-01.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster="/assets/home/home-hero-01.webp"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/0 to-black/40"/>
              <div className="absolute left-4 top-4 rounded-2xl bg-black/40 p-3 text-white/90 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-300"><ISpark/></span>
                  Cero emisiones locales • Operación silenciosa
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-tr from-emerald-400/20 to-cyan-400/20 p-3 ring-1 ring-white/10"><IGauge className="text-emerald-300"/></div>
              <div>
                <p className="text-white/70">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modelos */}
      <Section id="modelos" title="Conoce la línea Volt Drive" subtitle="Elige entre Aurora 72 (72V) y Halcón 48 (48V con techo solar opcional). Seguridad, confort y tecnología para trasladar personas con estilo.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[MODELS.aurora, MODELS.halcon].map((m) => (<ModelCard key={m.key} m={m} />))}
        </div>
        <div className="mt-12"><Comparison /></div>
      </Section>

      {/* Usos */}
      <Section id="usos" title="Soluciones por industria" subtitle="Volt Drive se adapta a golf, hoteles, turismo, eventos, campus y parques industriales.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {USES.map((u) => (
            <div key={u.title} className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 p-3 ring-1 ring-white/10 text-emerald-300">
                {u.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{u.title}</h3>
              <p className="mt-1 text-white/70">{u.text}</p>
              <a href="#contacto" className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200" aria-label={`Solicitar propuesta para ${u.title}`}>
                Solicitar propuesta <IChevron/>
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* Configurador */}
      <Section id="configurador" title="Arma tu Volt Drive" subtitle="Personaliza tu vehículo y solicita una cotización con tu configuración.">
        <AdvancedConfigurator />
      </Section>

      {/* Accesorios */}
      <Section id="accesorios" title="Accesorios y refacciones" subtitle="Amplía funciones y renueva componentes con piezas compatibles. Los precios se comparten solo en cotización.">
        <Accessories items={[...MODELS.aurora.accessories, ...MODELS.halcon.accessories]} />
      </Section>

      {/* Soporte */}
      <Section id="soporte" title="Soporte y garantía" subtitle="Refacciones, capacitación y servicio técnico. Manuales y fichas descargables.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[{title:'Garantía',icon:<IShield/>,text:'Cobertura por defectos de fabricación y materiales según contrato.'},{title:'Mantenimiento',icon:<ISettings/>,text:'Plan preventivo: revisión de frenos, suspensión y batería/BMS.'},{title:'Descargables',icon:<ISend/>,text:'Ficha técnica, manual del usuario y catálogo de refacciones.'}].map((c)=> (
            <div key={c.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 inline-flex items-center gap-2 text-emerald-300">{c.icon}<span className="font-medium text-white">{c.title}</span></div>
              <p className="text-white/70">{c.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-white/60">*Especificaciones sujetas a cambio sin previo aviso. Autonomía y desempeño dependen de condiciones reales.</div>
      </Section>

      {/* Contacto */}
      <Section id="contacto" title="Hablemos de tu Volt Drive" subtitle="Agenda una demostración o solicita una cotización personalizada.">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form className="grid grid-cols-1 gap-4">
              {[
                {label:'Nombre y Apellidos', type:'text'},
                {label:'Empresa / Organización', type:'text'},
                {label:'Email', type:'email'},
                {label:'Teléfono / WhatsApp', type:'tel'},
              ].map((f)=> (
                <div key={f.label}>
                  <label className="block text-sm text-white/70">{f.label}</label>
                  <input type={f.type} className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Escribe aquí…"/>
                </div>
              ))}
              <div>
                <label className="block text-sm text-white/70">Mensaje</label>
                <textarea className="mt-1 h-28 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Cuéntanos sobre tu proyecto…"/>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">
                  Enviar solicitud <ISend/>
                </button>
                <a href="tel:+52XXXXXXXXXX" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white/90 backdrop-blur hover:bg-white/10">
                  <IPhone/> Llamar
                </a>
              </div>
              <p className="text-xs text-white/60">Te responderemos en menos de 24 horas hábiles.</p>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur">
            <h3 className="text-xl font-semibold text-white">Datos de contacto</h3>
            <ul className="mt-4 space-y-2 text-white/80">
              <li className="flex items-center gap-2"><IMail className="text-emerald-300"/> contacto@voltdrive.mx</li>
              <li className="flex items-center gap-2"><IPhone className="text-emerald-300"/> +52 (___) ___ ____</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              ¿Necesitas una propuesta para <strong>flotillas</strong> (venta, renta o leasing)? Incluye en el mensaje: número de unidades, uso, horarios y ubicación.
            </div>
            <div className="mt-6 text-xs text-white/60">Aviso de Privacidad • Términos y Condiciones</div>
          </div>
        </div>
      </Section>

      <Footer/>
    </main>
  );
}

// ---------------- Configurador: usar componente de components -------------
// Eliminada la implementación local duplicada. Se importa desde ./components/Configurator.jsx

function ConfiguratorPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_50rem_at_50%_-10%,rgba(16,185,129,0.12),rgba(0,0,0,0))] text-white">
      <GlobalStyles/>
      <GradientBG/>
      <Header/>
      <Section id="configurador" title="Arma tu Volt Drive" subtitle="Personaliza tu vehículo y solicita una cotización con tu configuración.">
        <Configurator/>
      </Section>
      <Footer/>
    </main>
  );
}

function FAQInline() {
  const qs = [
    { q: '¿Incluye garantía?', a: 'Sí, cobertura por defectos de fabricación y materiales según contrato.'},
    { q: '¿Puedo solicitar techo solar?', a: 'Disponible para Halcón 48 como paquete "Solar".'},
    { q: '¿Entregan con factura y opciones de financiamiento?', a: 'Sí, contamos con proveedores para venta, renta o leasing.'},
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {qs.map((i)=> (
        <div key={i.q} className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-2 inline-flex items-center gap-2 text-emerald-300"><ISpark/> <span className="font-semibold text-white">{i.q}</span></div>
          <p className="text-white/80">{i.a}</p>
        </div>
      ))}
    </div>
  );
}

function ModelPage({ m }) {
  const [config, setConfig] = useState({ color: '', seat: '', solar: false });
  const [leadForm, setLeadForm] = useState({ name:'', email:'', phone:'', type:'Compra', units:'1', city:'', country:'México' });

  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_50rem_at_50%_-10%,rgba(16,185,129,0.12),rgba(0,0,0,0))]">
      <GlobalStyles/>
      <GradientBG/>
      <Header/>

      <section className="relative mx-auto max-w-7xl px-4 pt-12 vd-fade">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <nav className="text-xs text-white/50"><a href="#/aurora" className="hover:text-white">Modelos</a> / <span className="text-white/70">{m.name}</span></nav>
            <h1 className="mt-2 text-4xl md:text-6xl font-semibold tracking-tight text-white">{m.name}</h1>
            <p className="mt-4 max-w-xl text-white/70">{m.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill><IGauge/> {m.specs['Velocidad máx.']}</Pill>
              <Pill><IBattery/> {m.specs.Autonomía}</Pill>
              <Pill><IShield/> {m.specs.Frenos}</Pill>
              {m.key==='halcon' && <Pill><ISun/> Techo solar (opcional)</Pill>}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <QuoteModalTrigger
                form={leadForm}
                setForm={setLeadForm}
                configuration={{
                  model: m.name,
                  version: '',
                  color: config.color,
                  seats: config.seat,
                  roof: m.key==='halcon' && config.solar? 'Techo solar' : 'Estándar',
                  packages: m.key==='halcon' && config.solar? ['Solar'] : [],
                  selectedAccessories: []
                }}
                label="Quiero estrenar"
              />
              <button onClick={()=>{ document.getElementById('especificaciones')?.scrollIntoView({ behavior:'smooth' }); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white/90 backdrop-blur hover:bg-white/10">Ver especificaciones</button>
            </div>

            <ProductMeta m={m}/>
          </div>
          <div>
            <Configurator
              baseImage={m.hero}
              colorOptions={(m.colors||[]).map(name => ({ name, hex: COLOR_HEX[name] || '#9ca3af' }))}
              seatOptions={(m.seats||[]).map(name => ({ name, hex: SEAT_HEX[name] || '#1f2937' }))}
              solarAvailable={m.key==='halcon'}
              imagesByColorSeat={m.imagesByColorSeat}
              onChange={(cfg)=> setConfig({ color: cfg.color, seat: cfg.seat, solar: cfg.solar })}
              onQuote={(cfg)=> {
                const form = { name:'', email:'', phone:'', type:'Compra', units:'1', city:'', country:'México' };
                const packages = [];
                if (m.key==='halcon' && cfg.solar) {
                  packages.push('Solar');
                }
                const configuration = { model: m.name, version: '', color: cfg.color, seats: cfg.seat, roof: (m.key==='halcon' && cfg.solar)? 'Techo solar':'Estándar', packages: packages, selectedAccessories: [] };
                // Llama al mismo modal de QuoteModalTrigger
                const ev = new CustomEvent('vd_open_quote', { detail: { form, configuration } });
                window.dispatchEvent(ev);
              }}
            />
          </div>
        </div>
      </section>

      <Section id="resumen" title="Resumen rápido">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {m.highlights.map((h)=> (
            <div key={h.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 inline-flex items-center gap-2 text-emerald-300">{h.icon}<span className="font-semibold text-white">{h.title}</span></div>
              <p className="text-white/70">{h.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="especificaciones" title="Especificaciones técnicas" subtitle="Valores sujetos a cambio según lote y paquete.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpecsTable specs={m.specs}/>
            <SpecAccordions m={m}/>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 text-sm text-white/60">Paquetes</div>
              <ul className="list-disc pl-5 text-white/80 text-sm space-y-1">
                {(m.key==='aurora'?
                  ['Base: LED completo, frenos disco F/R, cinturones, cargador a bordo, USB',
                   'Tecnología: pantalla 12.3”, cámara de reversa, conectividad smartphone',
                   'Confort: sound bar, luz ambiente en techo, cargador inalámbrico, tapicería premium']:
                  ['Base: LED completo, frenos disco F/R, cinturones, cargador a bordo, USB',
                   'Tecnología: cámara de reversa, conectividad ampliada',
                   'Confort: asientos premium con descansabrazos, luz ambiente',
                   'Solar: techo fotovoltaico (+~20% autonomía)']).map((t)=> (<li key={t}>{t}</li>))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 text-sm text-white/60">Energía y carga</div>
              <div className="text-white/80 text-sm">
                Voltaje: 110–240V AC • Tiempo: 6–8 h • EVSE EP3 16A 5 m (IP44)
              </div>
            </div>
            {/* Brand card con logo */}
            <a href="#/about" className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-0">
              <div className="relative flex h-56 items-center justify-center md:h-72">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(16,185,129,0.18), rgba(0,0,0,0))' }}/>
                <img
                  src="/assets/home/LOGOVOLTDRIVE.png"
                  alt="Volt Drive"
                  width="400"
                  height="400"
                  className="relative h-28 w-28 md:h-40 md:w-40 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </a>
          </div>
        </div>
      </Section>

      <Section id="variantes" title="Versiones y paquetes">
        <Variants variants={m.variants}/>
        <p className="mt-3 text-xs text-white/60">*Disponibilidad de paquetes y equipamiento puede variar por región.</p>
      </Section>

      <Section id="galeria" title="Galería">
        <Gallery images={m.gallery}/>
      </Section>

      <Section id="accesorios" title="Accesorios recomendados" subtitle="Los precios se comparten únicamente en cotización.">
        <Accessories items={m.accessories}/>
      </Section>

      <Section id="faq" title="Preguntas frecuentes">
        <FAQInline/>
      </Section>

      <Section id="contacto" title={`Hablemos de tu ${m.name}`} subtitle="Agenda una demostración o solicita una cotización personalizada.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-white/70">Nombre y Apellidos</label>
                <input className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Escribe aquí…"/>
              </div>
              <div>
                <label className="block text-sm text-white/70">Empresa / Organización</label>
                <input className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="Escribe aquí…"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-white/70">Email</label>
                  <input type="email" className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="correo@dominio.com"/>
                </div>
                <div>
                  <label className="block text-sm text-white/70">Teléfono / WhatsApp</label>
                  <input type="tel" className="mt-1 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder="+52 ..."/>
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/70">Mensaje</label>
                <textarea className="mt-1 h-28 w-full rounded-xl bg-white/10 p-3 text-white outline-none" placeholder={`Estoy interesado en ${m.name} (${config.color || 'color a elegir'}, ${config.seat || 'tapicería a elegir'}${m.key==='halcon' && config.solar? ', paquete Solar':''}).`}/>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-300">
                  Enviar solicitud <ISend/>
                </button>
              </div>
              <p className="text-xs text-white/60">Te responderemos en menos de 24 horas hábiles.</p>
            </form>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur">
            <h3 className="text-xl font-semibold text-white">Datos de contacto</h3>
            <ul className="mt-4 space-y-2 text-white/80">
              <li className="flex items-center gap-2"><IMail className="text-emerald-300"/> contacto@voltdrive.mx</li>
              <li className="flex items-center gap-2"><IPhone className="text-emerald-300"/> +52 (___) ___ ____</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              ¿Necesitas una propuesta para <strong>flotillas</strong>? Indica cantidad, uso y ubicación.
            </div>
          </div>
        </div>
      </Section>

      <Footer/>
    </main>
  );
}

function ProductMeta({ m }){
  const url = typeof window!== 'undefined' ? window.location.href : 'https://voltdrive.vercel.app';
  const shareText = `Volt Drive — ${m.name}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(url)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText+" "+url)}`;
  function copyLink(){
    try { navigator.clipboard.writeText(url); alert('Enlace copiado'); } catch(e){ /* noop */ }
  }
  const resumen = m.key==='aurora'
    ? 'Carrito eléctrico de 4 pasajeros con plataforma 72V LiFePO₄. Pantalla 12.3” (según paquete), frenos de disco F/R con EPB y conducción silenciosa y confortable.'
    : 'Carrito eléctrico 48V para tours y eventos. Techo solar opcional (+~20% autonomía), modos ECO/SPORT y arranque push‑to‑start.';
  return (
    <div className="mt-6 max-w-2xl text-white/80">
      <p>{resumen}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-white/60">Compartir:</span>
        <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"><IWhats/> WhatsApp</a>
        <a href={mailHref} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"><IMail/> Correo</a>
        <button onClick={copyLink} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"><ILink/> Copiar enlace</button>
        {typeof navigator!=='undefined' && navigator.share && (
          <button onClick={()=>navigator.share({ title: shareText, url })} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"><IShare/> Compartir</button>
        )}
      </div>
    </div>
  );
}

// Simple toast (no dependencia externa)
function showToast(message){
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.bottom = '20px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.background = 'rgba(16,185,129,.95)';
  el.style.color = '#052e1a';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '9999px';
  el.style.fontWeight = '600';
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(()=> el.remove(), 300); }, 1800);
}

function SpecAccordions({ m }){
  const groups = m.key==='aurora' ? [
    { t: 'Dimensiones y pesos', c: [
      '3045 × 1400 × 1990–2030 mm • Eje ≈ 1660 mm • Altura libre ≈ 150 mm',
      'Radio de giro ≈ 3.5 m • Peso ≈ 550–560 kg • Carga útil ≈ 360 kg'
    ]},
    { t: 'Tren motriz y electricidad', c: [
      'Motor AC 72V 6.3 kW • Controlador 72V 350A',
      'Batería LiFePO₄ 73.6V 105Ah (≈7.7 kWh) con BMS • Cargador 72V 20A',
      'Tiempo de carga 6–8 h • DC/DC 72→12V 300W'
    ]},
    { t: 'Seguridad y confort', c: [
      'Frenos de disco F/R + EPB • Cinturones retráctiles • Defensas',
      'Asientos espuma moldeada con descansabrazos'
    ]},
    { t: 'Tecnología y conectividad', c: [
      'Pantalla TFT 12.3” (paquete Tecnología) • Cámara de reversa',
      'Bluetooth/CarPlay/Android Auto (según paquete)'
    ]},
    { t: 'Mantenimiento y legales', c: [
      'Diario: presión de llantas y nivel de carga',
      'Mensual: frenos/suspensión • Semestral: BMS/batería',
      'Especificaciones sujetas a cambio sin previo aviso'
    ]},
  ] : [
    { t: 'Dimensiones y pesos', c: [
      '≈ 2900 × 1390 × 2030 mm • Eje ≈ 1660 mm • Altura 145 mm',
      'Radio de giro ≤ 3.5 m • Peso ≈ 550 kg • Carga útil ≈ 360 kg'
    ]},
    { t: 'Tren motriz y electricidad', c: [
      'Motor AC 48V 5 kW • Controlador 48V 350A',
      'Batería LiFePO₄ 48V 105Ah • Cargador 48V 20A (110–240V)',
      'Tiempo de carga 6–8 h • DC/DC 48→12V 300W'
    ]},
    { t: 'Seguridad y confort', c: [
      'Frenos de disco F/R + EPB • Cinturones retráctiles',
      'Asientos negro o marrón toffee con descansabrazos'
    ]},
    { t: 'Tecnología y conectividad', c: [
      'Push‑to‑start con Bluetooth y NFC • Modos ECO/SPORT',
      'Cargas USB/USB‑C • Techo solar opcional (+~20% autonomía)'
    ]},
    { t: 'Mantenimiento y legales', c: [
      'Diario: presión de llantas y nivel de carga',
      'Mensual: frenos/suspensión • Semestral: BMS/batería',
      'Especificaciones sujetas a cambio sin previo aviso'
    ]},
  ];
  const [open, setOpen] = React.useState(null);
  return (
    <div className="mt-6 space-y-3">
      {groups.map((g, i) => (
        <div key={g.t} className="overflow-hidden rounded-2xl border border-white/10">
          <button onClick={()=> setOpen(open===i? null : i)} className="flex w-full items-center justify-between bg-white/5 px-4 py-3 text-left">
            <span className="font-medium text-white">{g.t}</span>
            <IChevron className={`transition ${open===i? 'rotate-90':''}`}/>
          </button>
          {open===i && (
            <ul className="space-y-1 px-4 pb-4 text-sm text-white/80 list-disc pl-6">
              {g.c.map((t)=> (<li key={t}>{t}</li>))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------- Router hash -------------------------------------------
function getRouteFromHash() {
  const h = (window.location.hash || '').toLowerCase();
  if (h.includes('faq')) return 'faq';
  if (h.includes('aurora')) return 'aurora';
  if (h.includes('halcon')) return 'halcon';
  return 'about';
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHash);
    // Actualiza OG/Twitter dinámico por modelo al cambiar ruta (best effort en SPA)
    const updateOg = (r)=>{
      const m = r==='aurora'? MODELS.aurora : r==='halcon'? MODELS.halcon : null;
      const title = m? `Volt Drive — ${m.name}` : 'Volt Drive — Movilidad eléctrica premium';
      const desc = m? (m.tagline || 'Carritos eléctricos personalizables') : 'Carritos eléctricos personalizables';
      const img = m? (m.hero || '/assets/models/aurora/hero.webp') : '/assets/models/aurora/hero.webp';
      const set = (p,c)=>{
        let el = document.querySelector(`meta[property='${p}']`) || document.querySelector(`meta[name='${p}']`);
        if (!el) { el = document.createElement('meta'); if (p.startsWith('og:')) el.setAttribute('property', p); else el.setAttribute('name', p); document.head.appendChild(el); }
        el.setAttribute('content', c);
      };
      set('og:title', title); set('twitter:title', title);
      set('og:description', desc); set('twitter:description', desc);
      set('og:image', img); set('twitter:image', img);
    };
    updateOg(getRouteFromHash());
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'faq') return <FAQPage/>;
  if (route === 'aurora') {
    setTimeout(()=> window.scrollTo({ top: 0, behavior: 'instant' }), 0);
    return <ModelPage m={MODELS.aurora}/>;
  }
  if (route === 'halcon') {
    setTimeout(()=> window.scrollTo({ top: 0, behavior: 'instant' }), 0);
    return <ModelPage m={MODELS.halcon}/>;
  }
  if (route === 'configurador') return <ConfiguratorPage/>;
  // Home por defecto
  return <HomePage/>;
}

class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(error, info){ console.error('VoltDrive ErrorBoundary', error, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: '#fff', background: '#0E1116' }}>
          <h2 style={{ fontWeight: 700 }}>Se produjo un error en la UI</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#fca5a5' }}>{String(this.state.error)}</pre>
          <p style={{ color: '#9ca3af' }}>Revisa la consola del navegador para más detalles.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById('root'));
console.log('Volt Drive boot: render App');
root.render(
  <ErrorBoundary>
    <App/>
  </ErrorBoundary>
);


