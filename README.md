# ShopSphere

ShopSphere is a multi-role marketplace built with Next.js, React, TypeScript, and Supabase. Buyers can discover products, manage a cart, place and track orders, and review products. Sellers can manage listings, stock, and order fulfilment.

> **Important:** Card and UPI checkout are simulations only. No payment provider is integrated and no real payment is collected. Do not use this project to accept real payments or customer orders until a payment provider and production security controls have been implemented and tested.

## Features

- Buyer and seller sign-up and sign-in
- Product search, category filtering, sorting, and pagination
- Seller product, image, stock, and order management
- Buyer cart, saved addresses, checkout, order tracking, cancellations, and reviews
- Supabase Auth, Postgres, and Storage integration

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, and Storage
- ESLint

## Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project
- A GitHub account and (for hosted deployment) a Vercel account

## Run locally

1. Clone the repository and enter the project directory.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and set your project URL and anon/publishable key:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   `.env.local` is ignored by Git. Never put a Supabase `service_role` key, database password, or other privileged secret in a `NEXT_PUBLIC_*` variable.
4. Prepare the Supabase database and storage as described below.
5. Install dependencies and start the development server:

   ```sh
   npm ci
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

The SQL files in this repository are **incremental scripts, not a complete database bootstrap**. They require the earlier/base schema and policies to already exist. That base schema is not included here, so a new Supabase project cannot be initialized from this repository alone.

Before deploying, provide or create and test the base schema, including the tables, constraints, role/profile setup, `get_my_role()` function, Row Level Security (RLS) policies, and `product-images` storage bucket/policies used by the app. In particular, verify that buyers and sellers can only access and change their own records, products, and order items.

Once that base schema is installed:

1. Open the Supabase SQL Editor.
2. Run [`phase4.sql`](./phase4.sql), which adds storefront views for shop names, reviewer names, and product ratings.
3. Run [`phase5.sql`](./phase5.sql), which adds checkout/order functions, payment-method fields, and order-status transitions.
4. In Supabase Authentication settings, set the site URL to your local or deployed site and add the corresponding redirect URLs (for example `http://localhost:3000/**` and your Vercel domain).
5. Create the `product-images` Storage bucket and configure access policies appropriate for public product images and seller-owned uploads.

Review the SQL and RLS policies against your actual schema before applying them to a live database. The application uses the Supabase anon/publishable key in browser code; that key is designed to be public, so RLS is essential. Never expose a `service_role` key or database credentials to the browser.

## Deploy to Vercel

1. Confirm the application builds and linting passes locally:

   ```sh
   npm run lint
   npm run build
   ```

2. Push the reviewed project to GitHub. Inspect the staged files first and confirm `.env.local` or any real credentials are not included:

   ```sh
   git status
   git add .
   git status
   git commit -m "Prepare ShopSphere for deployment"
   git push -u origin main
   ```

   If your default branch is not `main`, replace it with the correct branch name. Do not stage local environment files.
3. In Vercel, choose **Add New → Project**, import the GitHub repository, and keep the detected Next.js build settings.
4. In the Vercel project settings, add these environment variables for **Production**, and also for Preview/Development if you will use those environments:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Use values from the Supabase project's API settings. These are configuration values for the public client; do not add a service-role key.
5. Deploy. After the first deployment, add the generated Vercel domain to Supabase Auth's allowed redirect URLs and verify the site URL.
6. Test buyer and seller sign-up/login, role separation, product uploads, cart updates, checkout, cancellation, and order status changes against a non-production/test Supabase project before directing real users to the site.

Vercel automatically creates Preview deployments for GitHub branches and redeploys Production when changes are pushed to the configured production branch.

## Commands

```sh
npm run dev    # Start the local development server
npm run lint   # Run ESLint
npm run build  # Create an optimized production build
npm run start  # Serve the production build locally
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable client key; safe to expose only when RLS is correctly configured |

Keep actual local values in `.env.local` and production values in the hosting provider's environment settings. The committed `.env.example` contains placeholders only.

## Repository layout

```text
src/
  app/          Next.js routes and pages
  components/   Shared UI components
  lib/          Supabase clients, auth, order, and formatting helpers
  proxy.ts      Supabase session refresh and buyer/seller route protection
phase4.sql      Storefront database views
phase5.sql      Checkout and order database functions
```

## Before production

- Add and verify the missing base database schema and RLS/storage policies.
- Replace simulated Card/UPI checkout with a real payment integration and server-side payment verification.
- Review privacy, data retention, error handling, and production monitoring for your deployment.
- Run `npm run lint` and `npm run build` after every change.
