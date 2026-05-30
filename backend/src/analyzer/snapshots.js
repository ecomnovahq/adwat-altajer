'use strict';

const db = require('../config/db');

// Auto-create tables on first load (idempotent)
db.query(`
  CREATE TABLE IF NOT EXISTS store_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_url TEXT NOT NULL,
    store_industry TEXT,
    overall_score INTEGER,
    estimated_monthly_loss INTEGER,
    estimated_visitors INTEGER,
    full_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

db.query(`
  CREATE TABLE IF NOT EXISTS action_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_url TEXT NOT NULL,
    issue_id TEXT NOT NULL,
    issue_title TEXT,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','in_progress','done','dismissed')),
    monthly_loss_saved INTEGER DEFAULT 0,
    marked_done_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, store_url, issue_id)
  )
`).catch(() => {});

async function saveSnapshot(userId, storeUrl, result) {
  try {
    await db.query(
      `INSERT INTO store_snapshots(user_id,store_url,store_industry,overall_score,estimated_monthly_loss,estimated_visitors,full_result)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId, storeUrl,
        result.industryKey || result.detectedIndustry || null,
        result.overallScore || null,
        result.totalMonthlyLoss || null,
        result.estimatedVisitors || null,
        result,
      ]
    );
  } catch { /* non-fatal */ }
}

async function getLatestSnapshot(userId, storeUrl) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM store_snapshots WHERE user_id=$1 AND store_url=$2 ORDER BY created_at DESC LIMIT 1`,
      [userId, storeUrl]
    );
    return rows[0] || null;
  } catch { return null; }
}

async function compareSnapshots(userId, storeUrl) {
  try {
    const { rows } = await db.query(
      `SELECT overall_score,estimated_monthly_loss,created_at FROM store_snapshots
       WHERE user_id=$1 AND store_url=$2 ORDER BY created_at DESC LIMIT 2`,
      [userId, storeUrl]
    );
    if (rows.length < 2) return null;
    const [latest, prev] = rows;
    const daysBetween = Math.round(
      (new Date(latest.created_at) - new Date(prev.created_at)) / 86400000
    );
    return {
      scoreDelta: (latest.overall_score || 0) - (prev.overall_score || 0),
      lossDelta:  (latest.estimated_monthly_loss || 0) - (prev.estimated_monthly_loss || 0),
      daysBetween,
      previousScore: prev.overall_score,
      previousLoss:  prev.estimated_monthly_loss,
    };
  } catch { return null; }
}

async function getActions(userId, storeUrl) {
  try {
    const { rows } = await db.query(
      `SELECT issue_id,status,monthly_loss_saved,marked_done_at,updated_at FROM action_status
       WHERE user_id=$1 AND store_url=$2`,
      [userId, storeUrl]
    );
    return rows;
  } catch { return []; }
}

async function upsertAction(userId, storeUrl, issueId, issueTitle, status, monthlyLossSaved) {
  try {
    await db.query(
      `INSERT INTO action_status(user_id,store_url,issue_id,issue_title,status,monthly_loss_saved,marked_done_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT(user_id,store_url,issue_id)
       DO UPDATE SET status=$5,monthly_loss_saved=$6,marked_done_at=$7,updated_at=NOW()`,
      [
        userId, storeUrl, issueId, issueTitle, status,
        monthlyLossSaved || 0,
        status === 'done' ? new Date() : null,
      ]
    );
  } catch { /* non-fatal */ }
}

module.exports = { saveSnapshot, getLatestSnapshot, compareSnapshots, getActions, upsertAction };
