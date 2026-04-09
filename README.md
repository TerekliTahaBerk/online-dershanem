# onlinedershanem.com Next.js Landing

Conversion-first online education platform template for Turkey market.

## Run

```bash
npm install
npm run dev
```

## Admin + Prisma Setup

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
2. Generate the Prisma client:

```bash
npm run db:generate
```

3. Push the schema to your Postgres database:

```bash
npm run db:push
```

4. Create or update the admin account:

```bash
npm run db:seed-admin
```

5. Start the app and open `/giris`.

## What Is Implemented

- Admin login and logout with `next-auth` credentials flow
- Prisma-backed `LeadSubmission`, `PurchaseIntent`, and `PurchaseEvent` records
- Protected `/admin` dashboard that lists form and purchase flow data
- Landing forms now submit to internal API routes instead of a client-side webhook beacon
- Purchase funnel stores the pre-payment form and logs the payment-link handoff event

## Deployment Notes

- The project no longer uses static export because admin auth, Prisma routes, and dashboard pages require server execution.
- For Vercel, add the same environment variables from `.env.example` to the project settings before the first deployment.
- Real payment confirmation still needs provider-side callback wiring from the payment gateway to your backend if you want fully automatic `PAID`/`FAILED` status transitions.

## Implemented Output Requirements

1. Architecture: App Router + section-based component composition + centralized content layer.
2. Folder Structure: `app`, `components/sections`, `components/ui`, `lib`.
3. React Components: All requested landing components are implemented.
4. Tailwind UI: Premium card/grid/typography structure with consistent spacing scale.
5. Animations: Framer Motion `FadeIn` used across sections.
6. SEO: Metadata, canonical, OpenGraph, Twitter, robots, sitemap, JSON-LD (FAQ + Organization).
# online-dershanem
