# SubTrack

A mobile-responsive app for tracking software subscriptions: monthly cost,
billing period, renewal date, and cancellation status — with automatic email
reminders 30 days before a subscription renews.

## Stack

- Next.js (App Router) + React + Tailwind CSS
- SQLite via Node's built-in `node:sqlite` (no native build step) — data
  stored in `data/subtrack.db`
- [Resend](https://resend.com) for outbound email

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (Next.js will pick another port automatically if
3000 is already in use). Add subscriptions from the "+ Add" button — enter
the name, monthly cost, billing period (weekly/monthly/quarterly/yearly),
and next renewal date. Use **Cancel subscription** to mark one cancelled
(it stops counting toward totals and stops sending reminders, but stays in
history under "Cancelled") or **Delete** to remove it permanently.

## Email reminders — one-time setup

Reminders go to `kirsten_yong@tech.gov.sg` and `wee_wern_chau@tech.gov.sg`
(configurable via `EMAIL_TO` in `.env.local`) for any active subscription
renewing within the next 30 days. Each subscription only triggers one email
per renewal cycle.

1. **Get a Resend API key.** Sign up at https://resend.com, create an API
   key, and put it in `.env.local` (copy `.env.local.example` if you haven't
   already):

   ```
   RESEND_API_KEY=re_your_key_here
   ```

2. **Verify a sending domain.** Without a verified domain, Resend's sandbox
   sender can only deliver to the email address of the Resend account
   owner — it will *not* reach `@tech.gov.sg` addresses. Verify a domain at
   https://resend.com/domains, then set:

   ```
   EMAIL_FROM="SubTrack <reminders@your-verified-domain.com>"
   ```

   Until a domain is verified, reminder sends will be skipped with a logged
   warning rather than silently failing (nothing is marked as "sent," so it
   will retry on the next check once this is set up).

3. **Test it.** With the dev server running, click **Check now** on the
   dashboard, or run:

   ```bash
   npm run check-expiring
   ```

## Scheduling the daily check (Windows Task Scheduler)

The check does **not** require the app to be running — `scripts/check-expiring.ts`
talks to the same SQLite database and Resend account directly. Wire it up
to run once a day:

1. Open **Task Scheduler** → **Create Task…**
2. **General tab:** name it "SubTrack expiry check"; select "Run whether
   user is logged on or not" if you want it to fire even when you're logged
   out.
3. **Triggers tab:** New trigger → Daily, pick a time (e.g. 8:00 AM).
4. **Actions tab:** New action → Start a program:
   - Program/script: `C:\3Vibe1\Subscription Tracking\subtrack\scripts\run-check-expiring.bat`
   - Start in: `C:\3Vibe1\Subscription Tracking\subtrack`
5. Save. Output/errors are appended to `logs\check-expiring.log` in the
   project folder each run, so you can confirm it's working.

## Project structure

- `lib/subscriptions.ts` — data access (create/update/cancel/delete/list,
  and the "expiring soon" query)
- `lib/email.ts` — builds and sends the reminder email via Resend
- `lib/db.ts` — SQLite connection/schema
- `app/api/subscriptions/**` — REST API used by the UI
- `app/api/check-expiring/route.ts` — manual trigger for the reminder check
  (used by the "Check now" button)
- `scripts/check-expiring.ts` — standalone version of the same check, run
  by Windows Task Scheduler
