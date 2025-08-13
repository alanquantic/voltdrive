## Volt Drive — Checklist de Release y Deploy (Vercel Opción A)

Usar este checklist en cada entrega para evitar errores básicos.

### 1) Antes de commitear
- [ ] Código compila: `npm run build`
- [ ] App carga local: `npm start` → `http://localhost:3000`
- [ ] Secciones navegan por hash: `#/aurora`, `#/halcon`, `#/faq`, `#configurador`
- [ ] Assets locales existen y responden 200 OK
  - [ ] `public/assets/models/aurora/hero.webp`
  - [ ] `public/assets/models/halcon/hero.webp`
  - [ ] (Opcional) `public/assets/models/<modelo>/gallery-0X.webp`
  - [ ] `public/assets/home/home-card-01.mp4`
- [ ] Si agregaste imágenes de galería, actualizaste `MODELS.*.gallery` en `src/app.jsx`
- [ ] No quedan duplicados innecesarios en `public/`

### 2) Commit y push
```
git add -A
git commit -m "feat/fix: descripción breve"
git push
```

### 3) Vercel (Opción A - Estático)
- Build Command: `npm run build`
- Output Directory: `public`
- No se requiere `server.js` en producción ni rewrites (uso de hash routing)

### 4) Post‑deploy (sanidad)
- [ ] Abrir home y validar carga visual
- [ ] Rutas hash funcionan y no recargan el documento completo
- [ ] Imágenes muestran sin CORS ni 404
- [ ] Tamaños y pesos aceptables (LCP razonable)

### 5) Notas
- Mantener Node 18+ en entorno de build.
- Optimizar imágenes a WEBP cuando sea posible.

