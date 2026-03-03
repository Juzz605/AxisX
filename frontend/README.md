# AxisX Frontend

Production-grade React command center UI for AxisX.

## Stack
- React + Vite + TypeScript
- TailwindCSS
- Recharts
- Axios
- React Router

## Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

## Tailwind Setup Notes
- Tailwind is configured in `tailwind.config.ts`.
- PostCSS plugin wiring is in `postcss.config.js`.
- Global Tailwind imports are in `src/styles/index.css`.
- Content scanning includes `index.html` and all files in `src/**/*.{ts,tsx}`.

## Build
```bash
npm run build
```

## Preview Production Build
```bash
npm run preview
```

## Deployment

### Vercel
1. Import repository to Vercel.
2. Set project root to `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add env var: `VITE_API_BASE_URL`.

### Render Static Site
1. Create new Static Site.
2. Root directory: `frontend`.
3. Build command: `npm install && npm run build`.
4. Publish directory: `dist`.
5. Add env var: `VITE_API_BASE_URL`.

## Production Optimization Notes
- Use route-level code splitting for heavy future pages.
- Enable Brotli/Gzip at hosting layer.
- Keep Recharts dataset windowed for very large histories.
- Serve API behind HTTPS and set strict CORS allow-list.
- Configure immutable caching for hashed JS/CSS assets.
