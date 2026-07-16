# Finance Tools

A personal finance toolkit to help with budgeting, mortgage planning, and other financial calculations.

## Available Tools

### Mortgage Calculator

Plan your mortgage repayments with Australian (Victoria) specific calculations.

**Features:**

- Calculate repayments for weekly, fortnightly, or monthly frequencies
- Victorian stamp duty calculations with support for:
  - Standard buyers
  - First home buyers (exemptions and concessions)
  - Foreign buyers (includes surcharge)
- Purchase costs breakdown (legal fees, inspections, registrations)
- Lenders Mortgage Insurance (LMI) estimates when deposit is below 20%
- Offset account support
- Add recurring expenses (rates, bills, insurance, etc.)
- Per-person cost split for budgeting with a partner
- Visualisations:
  - Loan balance amortisation chart
  - Monthly expense breakdown pie chart
- Auto-save to browser (your data persists between sessions)
- Share calculations via URL

## Upcoming Tools

More finance utilities will be added as needed:

- Savings calculator
- Investment returns
- Budget tracker
- And more...

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4
- [Recharts](https://recharts.org) for charts, [lucide-react](https://lucide.dev) for icons
- No backend/database — everything runs client-side, with state persisted to `localStorage`
  and optionally shareable via a base64-encoded URL param
- [Vitest](https://vitest.dev) + React Testing Library for tests

## Getting Started

```bash
npm install
npm run dev       # start the dev server at http://localhost:3000
```

Other useful commands:

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint        # ESLint
npm run format      # Prettier write
npm run test        # run the test suite once
npm run test:watch  # Vitest in watch mode
```

## License

[MIT](LICENSE)

---

Built with Next.js
