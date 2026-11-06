# Mortgage Planner

A client-side Australian mortgage planning tool built with Next.js App Router. The app focuses on
one calculator at `/`: repayments, purchase costs, stamp duty, LMI estimates, offset balances, and
amortisation. Household profiles, repayment splitting, and budget planning have been removed.
Future income calculations should take a user's individual or combined income directly in the
mortgage workflow rather than restoring a household profile system.

## Stack and commands

- Next.js 16, React 19, TypeScript, Tailwind CSS v4
- Recharts for the amortisation chart; lucide-react for icons
- Local browser storage and shareable URL parameters; no backend
- `npm run dev`, `npm run build`, `npm run lint`, `npm run format`, `npm run test`
- Vitest and React Testing Library; tests live beside the code they cover

## Structure

- `app/page.tsx` composes the mortgage form, results, purchase costs, amortisation chart, and share modal.
- `components/tools/mortgage/` contains the mortgage UI and `useMortgageCalculator` state hook.
- `components/charts/AmortisationChart.tsx` renders the loan-balance chart.
- `components/layout/` contains `PageContainer` and the unified `ToolHeader`.
- `components/ui/` contains shared form, card, modal, action, and icon components.
- `lib/calculations/mortgage.ts` contains repayment, amortisation, purchase-cost, and LMI calculations.
- `lib/calculations/stampDuty/` contains state schedules and the stamp-duty engine.
- `lib/calculations/format.ts` contains shared currency formatting helpers.
- `lib/storage.ts` saves mortgage inputs and encodes/decodes share links.
- `types/mortgage.ts` defines mortgage inputs, results, and purchase-cost data.

## Conventions

- Keep calculation logic in `lib/calculations/`, separate from React and UI code.
- Reuse the components in `components/ui/` for inputs, buttons, cards, and modals.
- Use `PageContainer` for page-width and horizontal padding, and `ToolHeader` for the calculator title and actions.
- Keep mortgage input state and derived values in `useMortgageCalculator`; keep `app/page.tsx` focused on composing the screen.
- Loading effects defer state updates through `Promise.resolve().then(...)` to satisfy the React hooks lint rule used by this project.
- Keep app metadata and `README.md` aligned with the mortgage-only product scope.
- App icons are `app/icon.png` and `app/apple-icon.png`; the web manifest is `app/manifest.ts`.
