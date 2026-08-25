import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // O Prisma CLI roda DDL: usa a conexão direta do Neon (sem pooler),
    // já que o PgBouncer em modo transação atrapalha migrations.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
