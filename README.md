# Manual de progresiones armónicas

App Astro (estática) generada a partir del manual original. Desplegable en Vercel sin configuración adicional.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Despliegue en Vercel

1. Importa el repositorio en Vercel (o ejecuta `vercel`).
2. Vercel detecta Astro automáticamente: comando de build `npm run build`, salida `dist/`.
3. No se requiere adaptador: el sitio es 100% estático.

## Estructura

- `src/pages/index.astro`: página principal.
- `src/components/`: secciones interactivas (transpositor, catálogo, inversiones, ejercicio, emociones).
- `src/scripts/`: teoría musical, audio (Web Audio) y vistas.
- `src/data/`: catálogo de progresiones y modos.
