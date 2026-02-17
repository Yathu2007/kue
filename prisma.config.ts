import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: env("DIRECT_URL") ?? process.env.DIRECT_URL, // CLI uses direct connection
    },
});
