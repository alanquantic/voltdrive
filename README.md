## Volt Drive — SPA estática (Vercel Opción A)

Proyecto React (SPA) servido como sitio estático. Build con esbuild hacia `public/` y routing por hash (`#/faq`, `#/aurora`, `#/halcon`, `#configurador`), por lo que no requiere rewrites en producción.

### Requisitos
- Node.js 18+ (recomendado LTS)
- npm 9+

### Scripts
- `npm install`: instala dependencias
- `npm run build`: compila `src/app.jsx` a `public/bundle.js`
- `npm start`: servidor Express local (para revisar `public/` en `http://localhost:3000`)

### Estructura
- `src/app.jsx`: aplicación principal (componentes, router por hash, datos de modelos)
- `src/components/Configurator.jsx`: componente autónomo de configurador
- `public/index.html`: shell de la SPA (Tailwind por CDN + `bundle.js`)
- `public/assets/`:
  - `models/aurora/hero.webp`
  - `models/halcon/hero.webp`
  - `home/home-card-01.mp4`

Sugerencia de tamaños:
- Imágenes hero y galería: 1600×900 (WEBP/JPG optimizado <400 KB). Relación 16:9.
- Videos: H.264/H.265 o WEBM con `object-cover`.

### Despliegue en Vercel (Opción A — Estático)
1) Configurar en el Dashboard del proyecto:
   - Build Command: `npm run build`
   - Output Directory: `public`
2) No se requiere `server.js` en Vercel (se usa sólo para desarrollo local).
3) Al usar hash routing no hacen falta rewrites.

### Git (SSH)
Repositorio remoto: `git@github.com:alanquantic/voltdrive.git`

Inicialización típica:
```
git init -b main
git remote add origin git@github.com:alanquantic/voltdrive.git
git add -A
git commit -m "chore: initial import (SPA estática + build a public)"
git push -u origin main
```

### Notas
- Si agregas galerías locales, colócalas en `public/assets/models/<modelo>/gallery-01.webp` (y actualiza `MODELS.*.gallery` en `src/app.jsx`).
- `public/assets/home/home-hero-01.webp` es opcional como póster del video.


