# Expense Tracker (Mobile Friendly)

A simple expense tracker website with:
- Email/password login
- Online sync via Supabase
- Add/Edit/Delete expenses
- Add/Edit/Delete incomes
- Manage custom income sources
- Category/source filters + period filters (This month / This year / Custom range / All)
- Expense "View all" overview with pie chart breakdown
- Overall net balance (Income - Expense)
- Account-wise net balance in net summary (per source)
- Dark mode
- LKR currency formatting

## 1) Configure Supabase

1. Create a Supabase project.
2. In Supabase SQL editor, run [supabase.sql](supabase.sql).
3. In Authentication, enable Email provider.
4. Copy Project URL and anon public key.
5. Copy [.env.example](.env.example) to `.env.local`.
6. Update `.env.local` values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2) Run locally (Next.js)

Install dependencies and start the Next.js dev server:

```powershell
npm install
npm run dev
```

Then open http://localhost:3000.

## 3) Notes

- The app keeps the same HTML/CSS/JS behavior and is served through Next.js from the `public/` folder.
- The app uses Supabase JS CDN in [public/index.html](public/index.html).
- Supabase keys are loaded from `.env.local` through [pages/api/supabase-config.js](pages/api/supabase-config.js).
- Expense, income, and source records are user-isolated by RLS policies.
- Default categories are in [public/js/constants.js](public/js/constants.js).

## 4) Income Source Rules

- You can add, rename, and delete income sources.
- A source cannot be deleted if it already has income or expense records.
- Only sources you create are shown in income and expense source dropdowns.
- Income source can include optional details/description for better tracking.
- Every expense now requires a deduction source.
- Source balance is calculated as: total income for source minus total expenses deducted from that source.
- Expense create/edit is blocked if selected source balance is insufficient.
- In Deduct from source dropdown, each source shows current balance and sources with insufficient balance for entered expense amount are disabled.
