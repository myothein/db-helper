import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/cli.ts", "src/cli-studio.ts"], // include cli-studio
    format: ["cjs"],
    target: "es2020",
    dts: true,
    sourcemap: true,
    clean: true,
    external: [
        "@prisma/client",
        "@prisma/adapter-pg",
        "@prisma/client-runtime-utils",
        "pg",
        "dotenv"
    ]
});
