import { buildServer } from "./infrastructure/http/express/Server";
import { env } from "./config/env";

const app = buildServer();

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
