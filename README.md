# Money Monitor

A minimalist personal finance dashboard with translucent glassmorphism, custom category and budget configuration, and direct Google Sheets sync.

## Features

- **Clean Financial Overview**: Tracks Available Balance, Total Income, Total Expenses, Safe-to-Spend pace, Monthly Budget Progress, Spending by Category, and Recent Transactions.
- **Custom Categories & Budgets**: Create your own expense and income categories, assign colors, set a main monthly budget, and manage individual category limits directly on the **Budgets** page.
- **Google Sheets Sync**: Sign in with Google to create a new Money Monitor spreadsheet or link an existing Google Sheet to push and pull Transactions, Categories, and Settings.
- **Responsive Mobile & Desktop Shell**: Desktop top navigation bar and mobile thumb-zone bottom navigation with responsive bottom-sheet modals.

## Local Development

```bash
npm ci
npm run lint
npm run dev
```

## Production Build & GitHub Pages Deployment

This repository includes `.github/workflows/deploy.yml` configured with least-privilege permissions, Dependabot (`/.github/dependabot.yml`), and automatic `VITE_BASE_PATH` resolution:

1. Push to the `main` branch.
2. In your GitHub repository, open **Settings -> Pages** and set **Source** to **GitHub Actions**.
3. If deploying to a custom domain or GitHub Pages URL, add your deployed domain to **Authorized domains** in your Firebase Authentication settings so Google Sign-In works seamlessly in production.
