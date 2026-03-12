# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```
abce-padel
├─ .claude
│  └─ skills
│     ├─ coding-standards.md
│     ├─ frontend-patterns.md
│     ├─ postgres-patterns.md
│     ├─ search-first.md
│     └─ verification-loop.md
├─ .claudeignore
├─ .env
├─ CLAUDE.md
├─ eslint.config.js
├─ index.html
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ apple-touch-icon.png
│  ├─ icon-192.png
│  ├─ icon-512.png
│  └─ vite.svg
├─ README.md
├─ src
│  ├─ App.css
│  ├─ App.jsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ clubes
│  │  │  └─ ClubDetalle.jsx
│  │  ├─ layout
│  │  │  ├─ BottomNav.jsx
│  │  │  └─ Header.jsx
│  │  └─ ventas
│  │     ├─ HistorialVentas.jsx
│  │     ├─ VentaEditModal.jsx
│  │     └─ VentaForm.jsx
│  ├─ hooks
│  │  └─ useAuth.jsx
│  ├─ index.css
│  ├─ lib
│  │  └─ supabase.js
│  ├─ main.jsx
│  └─ pages
│     ├─ AuthPage.jsx
│     ├─ ClubesPage.jsx
│     ├─ InventarioPage.jsx
│     └─ VentasPage.jsx
├─ tailwind.config.js
└─ vite.config.js

```