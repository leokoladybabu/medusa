import type { ExecArgs } from "@medusajs/framework/types"
import { Client } from "pg"

// One-off fix: clear provider_id on tax regions that still reference 'taxjar'
export default async function run(_: ExecArgs) {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    const res = await client.query(
      `UPDATE tax_region SET provider_id = NULL WHERE provider_id = 'taxjar'`
    )
    return { updated: res.rowCount ?? 0 }
  } finally {
    await client.end()
  }
}
