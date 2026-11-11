# Agenda

Phone agenda for one Italian salon and two stylists. Shared 4-digit PIN. Tuesday–Saturday, 09:00–18:45, Europe/Rome.

```bash
npm install
npm test
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Copy `.env.example` to `.env`. `DATABASE_URL` is the pooled Neon host. `DIRECT_URL` is the non-pooler host. Do not commit `.env`.
