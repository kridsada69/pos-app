This is a POS app built with Next.js, Prisma, and PostgreSQL.

## Local setup

1. Copy the environment file and adjust secrets if needed.

```bash
cp .env.example .env
```

2. Start PostgreSQL locally with Docker.

```bash
docker compose up -d
```

3. Install dependencies, sync the schema, and seed sample data.

```bash
npm install
npm run db:setup
```

4. Run the development server.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default seeded login:

- Username: `somchai`
- Password: `123456`

## Deploy notes

For production, set `DATABASE_URL` to a managed PostgreSQL database such as Neon or Supabase, and set a strong `SESSION_SECRET`.

The app is already configured with `output: 'standalone'`, so you can build and run it with:

```bash
npm run build
node server.js
```

You can also package the standalone output for traditional hosting:

```bash
npm run deploy:package
```

## Notes

- Local uploads are still stored in `public/uploads/`.
- For serverless hosting, move uploads to object storage before going live.
- If you changed Prisma providers or datasource settings, rerun `npm run db:generate` before starting the app.
