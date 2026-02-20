import { Router } from "express";
import { hasSql, getPool } from "../db.js";
import { createAuction, getAuction, listAuctions } from "../store.js";

export const auctionsRouter = Router();

/**
 * GET /api/auctions
 */
auctionsRouter.get("/auctions", async (_req, res) => {
  if (!hasSql()) return res.json(listAuctions());

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT id, title, description, status, starts_at, ends_at, winner_vendor_email, created_by_admin_email, created_at
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
      SELECT TOP 1 id, title, description, status, starts_at, ends_at, winner_vendor_email, created_by_admin_email, created_at
      FROM dbo.Auctions
      WHERE id = @id;
    `);

  if (!result.recordset.length) return res.status(404).json({ message: "Auction not found" });
  return res.json(result.recordset[0]);
});

/**
 * POST /api/auctions
 */
auctionsRouter.post("/auctions", async (req, res) => {
  const {
    title,
    description,
    status,
    starts_at,
    ends_at,
    winner_vendor_email,
    created_by_admin_email,
  } = req.body as any;

  if (!created_by_admin_email) {
    return res.status(400).json({ message: "created_by_admin_email is required" });
  }

  if (!hasSql()) {
    const created = createAuction({
      title,
      description,
      status,
      starts_at,
      ends_at,
      winner_vendor_email,
      created_by_admin_email,
    });
    return res.status(201).json(created);
  }

  const pool = await getPool();
  const insert = await pool
    .request()
    .input("title", title ?? "Untitled Auction")
    .input("description", description ?? "")
    .input("status", status ?? "draft")
    .input("starts_at", starts_at ?? null)
    .input("ends_at", ends_at ?? null)
    .input("winner_vendor_email", winner_vendor_email ?? null)
    .input("created_by_admin_email", created_by_admin_email)
    .query(`
      INSERT INTO dbo.Auctions (title, description, status, starts_at, ends_at, winner_vendor_email, created_by_admin_email)
      OUTPUT INSERTED.id, INSERTED.title, INSERTED.description, INSERTED.status, INSERTED.starts_at, INSERTED.ends_at,
             INSERTED.winner_vendor_email, INSERTED.created_by_admin_email, INSERTED.created_at
      VALUES (@title, @description, @status, @starts_at, @ends_at, @winner_vendor_email, @created_by_admin_email);
    `);

  return res.status(201).json(insert.recordset[0]);
});
``