This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# StudentOS

A modern student dashboard for managing school tasks, assignments, grades, and substitution plans.

## ✨ Features

- 📊 **Dashboard**: Overview of todos, homework, grades, and upcoming events
- 📅 **Schedule**: Weekly timetable (coming soon)
- 📖 **Subjects**: Subject management (coming soon)
- ✍️ **Homework**: Homework tracker (coming soon)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Push-Erinnerungen für Termine

Termine unterstützen Push-Benachrichtigungen 1 Woche und 1 Tag vor Startzeit.

1. Migrationen ausführen (inkl. `db/migrations/005_push_notifications_for_appointments.sql`)
2. Diese ENV-Variablen setzen:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=ein-langes-zufallsgeheimnis
```

3. Regelmäßig den Endpoint ausführen (z. B. jede 5 Minuten):

```bash
POST /api/notifications/process
Authorization: Bearer <CRON_SECRET>
```

4. Auf iPad: App zum Home-Bildschirm hinzufügen und dann im Termine-Tab `Push aktivieren` drücken.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
