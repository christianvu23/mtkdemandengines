#!/usr/bin/env node
// Strip YAML frontmatter khỏi raw_text của các lead đã merge.
// Frontmatter (--- title:... meta:... ---) là artifact của browser_run,
// hiển thị lên dashboard thành "summary tiếng Anh" — phải bỏ.

import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: Number(process.env.PGPORT || 6543),
  database: 'postgres',
  user: process.env.PGUSER || 'postgres.emkwknwcyyewevmmoxzj',
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000,
});

const FRONTMATTER_RE = '^---[\\s\\S]*?\\n---[ \\t]*\\r?\\n?';

const client = await pool.connect();
try {
  const before = await client.query(
    `SELECT left(raw_text, 60) AS dau FROM demand_leads WHERE raw_text LIKE '---%' LIMIT 1`
  );
  if (before.rows.length) console.log('TRƯỚC:', JSON.stringify(before.rows[0].dau));

  const upd = await client.query(
    `UPDATE demand_leads
     SET raw_text = ltrim(regexp_replace(raw_text, $1, ''))
     WHERE raw_text LIKE '---%'
     RETURNING left(raw_text, 60) AS dau`,
    [FRONTMATTER_RE]
  );
  console.log(`Đã strip frontmatter: ${upd.rowCount} leads`);
  if (upd.rows[0]) console.log('SAU: ', JSON.stringify(upd.rows[0].dau));

  // Verify không còn lead nào bắt đầu bằng ---
  const con = await client.query(`SELECT count(*) AS n FROM demand_leads WHERE raw_text LIKE '---%'`);
  console.log('Còn lead có frontmatter:', con.rows[0].n);
} finally {
  client.release();
  await pool.end();
}
