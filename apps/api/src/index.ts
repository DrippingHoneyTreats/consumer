import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function main() {
  process.env.TZ = env.TZ;

  await connectDatabase();
  console.log("Postgres connected");

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/${env.API_PREFIX}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
