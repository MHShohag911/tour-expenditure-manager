# Tour Expenditure Manager

A web-based application for managing group tour expenses, tracking individual contributions, and calculating how much each member owes. It helps friends and travel groups organize shared costs transparently, reduce manual calculations, and keep tour finances easy to manage.

## Overview

Tour Expenditure Manager simplifies group expense management by recording expenses, splitting shared costs, tracking individual payments, and calculating each member's financial responsibility. It supports equal splits, custom expense shares, and individual items so that members can pay according to what they actually consumed.

## Key Features

- **Group Management** — Create and manage tour groups and their members.
- **Expense Tracking** — Record expenses with descriptions, amounts, payer names, and timestamps.
- **Equal Expense Splitting** — Divide shared expenses equally among group members.
- **Custom Expense Splitting** — Assign specific amounts to members for flexible expense distribution.
- **Individual Items** — Assign particular items to selected members while distributing the remaining bill as a shared expense.
- **Extra Charges** — Record additional payments or adjustments between individual members.
- **Payment Summary** — Track how much each member has paid and owes.
- **Expense History** — Keep a record of group expenses for easier financial tracking.
- **Tour Completion** — Lock a completed tour to prevent further changes to its financial records.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** MongoDB
- **Deployment:** Vercel

## Purpose

The goal of this project is to make group travel budgeting simpler, more transparent, and more convenient. Instead of calculating expenses manually, group members can use one application to organize costs and understand their financial responsibilities.

## Future Improvements

- Member account balances and advance deposits
- Transaction history for deposits, payments, and cash transfers
- Tracking unused money and returned change
- Improved financial summaries and settlement calculations

## Getting Started

Clone the repository, install the dependencies, configure your MongoDB connection in the environment variables, and run the development server.

```bash
git clone https://github.com/MHShohag911/tour-expenditure-manager.git
cd tour-expenditure-manager
npm install
npm run dev
```

Create a `.env.local` file and add the MongoDB connection string required by the project.

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

## License

This project is developed for learning and practical group expense management. Add a license to the repository if you intend to distribute or reuse the project under specific terms.