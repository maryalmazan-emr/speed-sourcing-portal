// File: server/src/routes/invites.ts
console.log("✅ invitesRouter loaded");

import { Router } from "express";
import { hasSql, getPool } from "../db.js";

export const invitesRouter = Router();

/**
 * ✅ GET /api/invites
 * Optional query: ?auctionId=
 */
invitesRouter.get("/invites", async (req, res) => {
  const { auctionId } = req.query as any;

  // Dev / no‑SQL mode
  if (!hasSql()) {
    return res.json([]);
  }

  const pool = await getPool();

  if (auctionId) {
    const result = await pool
      .request()
      .input("auction_id", auctionId)
      .query(`
        SELECT id, auction_id, email, company, status, created_at
        FROM dbo.Invites
        WHERE auction_id = @auction_id
        ORDER BY created_at ASC;
      `);

    return res.json(result.recordset);
  }

  const result = await pool.request().query(`
    SELECT id, auction_id, email, company, status, created_at
    FROM dbo.Invites
    ORDER BY created_at ASC;
  `);

  return res.json(result.recordset);
});

/**
 * ✅ POST /api/invites
 */
invitesRouter.post("/invites", async (req, res) => {
  const { auction_id, vendors, invite_method } = req.body as any;

  if (!auction_id || !Array.isArray(vendors) || vendors.length === 0) {
    return res.status(400).json({
      message: "auction_id and vendors[] are required",
    });
  }

  if (!hasSql()) {
    return res.status(201).json({
      auction_id,
      invite_method: invite_method ?? "manual",
      count: vendors.length,
    });
  }

  const pool = await getPool();
  const created: any[] = [];

  for (const v of vendors) {
    const result = await pool
      .request()
      .input("auction_id", auction_id)
      .input("email", v.email)
      .input("company", v.company ?? "External Guest")
      .input("invite_method", invite_method ?? "manual")
      .query(`
        INSERT INTO dbo.Invites
          (auction_id, email, company, invite_method)
        OUTPUT
          INSERTED.id,
          INSERTED.auction_id,
          INSERTED.email,
          INSERTED.company,
          INSERTED.status,
          INSERTED.created_at
        VALUES
          (@auction_id, @email, @company, @invite_method);
      `);

    created.push(result.recordset[0]);
  }

  return res.status(201).json(created);
});

/**
 * ✅ POST /api/invites/migrate (stub)
 */
invitesRouter.post("/invites/migrate", async (_req, res) => {
  return res.json({ ok: true, migrated: 0 });
});