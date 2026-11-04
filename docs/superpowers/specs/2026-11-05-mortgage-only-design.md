# Mortgage-only app design

## Intent

Focus Finance Tools on helping people understand an Australian home loan and its purchase costs. Remove the budget planner, dashboard, household profiles and repayment splitting so the mortgage calculator is the app's main experience.

## Goals

- Open the mortgage calculator directly from the home page.
- Keep the existing mortgage inputs and results, including repayments, purchase costs and stamp duty, offset balance, amortisation chart, reset and share.
- Remove household and budget navigation, screens, calculations, storage code and components that no longer have callers.
- Remove income and cost-split concepts from mortgage results and sharing.

## Non-goals

- Add income or borrowing-capacity calculations in this change. A future mortgage-focused calculation may accept one income or combined income directly, without household profiles.
- Add other mortgage features or redesign the calculator's visual style.
- Preserve old budget, household or share-link data. There are no real users, and the app can start fresh.

## Approaches

- **Mortgage-only (selected):** make the calculator the home page and remove budget, dashboard, household and split features. This leaves one clear purpose and removes unused data and UI flows.
- **Keep household profiles:** remove budget and splitting but retain household members and incomes. This leaves profile UI without a current mortgage use, so it does not support the simplification goal.

## Implementation calls

- Use `/` as the calculator route and update generated share links to match. Remove the old `/tools/mortgage` route rather than preserving compatibility routes.
- Keep the current mortgage calculation and purchase-cost behaviour; only remove household splitting and budget-related code.
- Do not proactively erase old browser storage keys. The revised app will not read them, and deleting stored data is unnecessary to remove the features.
- Update or remove tests that cover deleted pages and behaviour. Do not add new dependencies.
