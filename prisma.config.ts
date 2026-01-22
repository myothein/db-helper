import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
    schema: 'prisma/system/system.prisma',          // point to system schema
    migrations: { path: 'prisma/system/migrations' }, // correct migrations path
    datasource: {
        url: env('SYSTEM_DATABASE_URL'),
    },
})
