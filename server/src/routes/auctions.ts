import { Router } from "express";
import { hasSql, getPool } from "../db.js";
import { createAuction, getAuction, listAuctions } from "../store.js";

export const auctionsRouter = Router();


/**
 * GET /api/auctions
 */
auctionsRouter.get("/auctions", async (_req, res) => {
  console.log("POST /api/auctions BODY:", _req.body);
  if (!hasSql()) return res.json(listAuctions());

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT id, title, description, status, starts_at, ends_at,
           winner_vendor_email, created_by_admin_email, created_at
    FROM dbo.Auctions
    ORDER BY created_at ASC;
  `);

  return res.json(result.recordset);
});

/**
 * GET /api/auctions/:id
 */
auctionsRouter.get("/auctions/:id", async (req, res) => {
  const { id } = req.params;

  if (!hasSql()) {
    const auction = getAuction(id);
    if (!auction) return res.status(404).json({ message: "Auction not found" });
    return res.json(auction);
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", id)
    .query(`
      SELECT TOP 1 id, title, description, status, starts_at, ends_at,
             winner_vendor_email, created_by_admin_email, created_at
      FROM dbo.Auctions
      WHERE id = @id;
    `);

  if (!result.recordset.length) {
    return res.status(404).json({ message: "Auction not found" });
  }

  return res.json(result.recordset[0]);
});

/**
 * POST /api/auctions
 */
auctionsRouter.post("/auctions", async (req, res) => {
  // ✅ Normalize frontend camelCase → backend snake_case
  const {
    title,
    description,
    status,
    startsAt,
    endsAt,
    winnerVendorEmail,
    createdByAdminEmail,

    // also accept snake_case just in case
    starts_at,
    ends_at,
    winner_vendor_email,
    created_by_admin_email,
  } = req.body as any;

  const createdBy =
    createdByAdminEmail ?? created_by_admin_email;

  if (!createdBy) {
    return res.status(400).json({
      message: "createdByAdminEmail is required",
    });
  }

  const payload = {
    title: title ?? "Untitled Auction",
    description: description ?? "",
    status: status ?? "draft",
    starts_at: startsAt ?? starts_at ?? null,
    ends_at: endsAt ?? ends_at ?? null,
    winner_vendor_email:
      winnerVendorEmail ?? winner_vendor_email ?? null,
    created_by_admin_email: createdBy,
  };

  if (!hasSql()) {
    const created = createAuction(payload);
    return res.status(201).json(created);
  }

  const pool = await getPool();
  const insert = await pool
    .request()
    .input("title", payload.title)
    .input("description", payload.description)
    .input("status", payload.status)
    .input("starts_at", payload.starts_at)
    .input("ends_at", payload.ends_at)
    .input("winner_vendor_email", payload.winner_vendor_email)
    .input("created_by_admin_email", payload.created_by_admin_email)
    .query(`
      INSERT INTO dbo.Auctions
        (title, description, status, starts_at, ends_at,
         winner_vendor_email, created_by_admin_email)
      OUTPUT
        INSERTED.id,
        INSERTED.title,
        INSERTED.description,
        INSERTED.status,
        INSERTED.starts_at,
        INSERTED.ends_at,
        INSERTED.winner_vendor_email,
        INSERTED.created_by_admin_email,
        INSERTED.created_at
      VALUES
        (@title, @description, @status, @starts_at, @ends_at,
         @winner_vendor_email, @created_by_admin_email);
    `);

  return res.status(201).json(insert.recordset[0]);
});