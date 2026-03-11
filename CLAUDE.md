# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

No test runner is configured.

## Environment

Requires a `.env` file (or equivalent) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The app throws at startup if these are missing (`src/lib/supabase.js`).

## Architecture

**Stack:** React 18 + Vite + Tailwind CSS + Supabase (auth + database + realtime)

**Entry point:** `src/main.jsx` → `src/App.jsx`

### Auth flow (`src/hooks/useAuth.jsx`)

`AuthProvider` wraps the entire app and manages a single `auth` state object `{ session, profile, ready }`. The boot sequence uses `getSession()` + `fetchProfile()` resolved atomically in one `setState` call to avoid flash-of-wrong-screen. `onAuthStateChange` handles subsequent events but ignores `INITIAL_SESSION` (already handled at boot). An 8-second emergency timeout forces `ready = true` if Supabase hangs.

`App.jsx` renders one of four states based on auth:
1. `loading` → `SplashScreen`
2. `!session` → `LoginRegisterView`
3. `needsOnboarding` (session exists but `full_name` is empty) → `OnboardingView`
4. Otherwise → `MainApp`

### Supabase tables

- **`profiles`** — `id` (= auth user id), `full_name`, `is_admin`
- **`ventas`** — sales records; `vendedor_id` FK to profiles, `comision` column is 20% of `monto_total`
- **`venta_items`** — line items per sale; inserting/deleting rows triggers a DB-side stock update on `productos`
- **`productos`** — `id`, `nombre`, `descripcion`, `stock`, `precio_referencia`, `activo`
- **`clubes`** — `id`, `nombre`, `categoria` (`'Club'` | `'Tienda'`), `telefono_atencion`, `telefono_dueno`
- **`registro_llamadas`** — call log per `(club_id, vendedor_id)`; `fecha_contacto_3/4/5` are auto-calculated server-side every 4 days after `fecha_llamada_2`

### Page/component structure

`MainApp` is a single-page tab layout (no router). Tab state lives in `App.jsx` and is passed down:

- **`VentasPage`** — sale type selector → `VentaForm` + always-visible `HistorialVentas`. `refreshKey` integer triggers re-fetch after a new sale. `VentaEditModal` handles edits (delete-old-items + re-insert pattern to let DB triggers recalculate stock).
- **`InventarioPage`** — read-only product list with realtime Supabase subscription (`postgres_changes`).
- **`ClubesPage`** — filterable list of clubs/stores; clicking a row opens `ClubDetalle` modal for editing phone numbers and call dates.

### Key conventions

- **Currency logic:** `Pago Móvil` / `Transferencia` → VES; all other payment methods → USD. Auto-set in `VentaForm` on payment method change.
- **Commission:** always 20% of `monto_total`, displayed live in forms and stored in the `comision` column.
- **Modal / BottomNav:** `VentaEditModal` adds `modal-open` to `<body>` on mount; CSS in `index.css` hides `.bottom-nav` when that class is present.
- **Primary color:** `#1a56db` (defined as `primary` in `tailwind.config.js`). Use `text-primary`, `bg-primary`, etc.
- **Client autocomplete in `VentaForm`:** only clubs from the `clubes` table are valid clients; `clienteValido` must be `true` to enable form submission.
- **Stock validation:** done client-side in `VentaForm` before insert, and enforced server-side via DB trigger on `venta_items`.
