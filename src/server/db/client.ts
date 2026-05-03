import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const globalForPool = globalThis as unknown as { __dorothyPgPool?: Pool }

const pool =
  globalForPool.__dorothyPgPool ??
  new Pool({
    connectionString,
    max: 5,
  })

if (!globalForPool.__dorothyPgPool) {
  globalForPool.__dorothyPgPool = pool
}

export const db = drizzle(pool, { schema })
export { schema }
