import { Router } from "express";
import { hasSql, getPool } from "../db.js";
import { createAdmin, listAdmins, validateAdmin as validateAdminMem } from "../store.js";
import type { AdminRole } from "../types.js";

export const adminRouter = Router();

/**
 * GET /api/admins
 */
adminRouter.get("/admins", async (_req, res) => {
  if (!hasSql()) {
    return res.json(listAdmins());
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT id, email, company_name, role, created_at
    FROM dbo.Admins
    ORDER BY created_at DESC;
  `);

  return res.json(result.recordset);
});

/**
 * POST /api/admins
 * body: { email, company_name, role, password? }
 */
adminRouter.post("/admins", async (req, res) => {
  const { email, company_name, role } = req.body as {
    email: string;
    company_name: string;
    role: AdminRole;
    password?: string;
  };

  if (!email || !company_name || !role) {
    return res.status(400).json({ message: "email, company_name, and role are required" });
  }

  if (!hasSql()) {
    const created = createAdmin(email, company_name, role);
    return res.status(201).json(created);
  }

  const pool = await getPool();
  const existing = await pool
    .request()
    .input("email", email)
    .query(`SELECT TOP 1 id, email, company_name, role, created_at FROM dbo.Admins WHERE email = @email;`);

  if (existing.recordset.length) {
    return res.status(200).json(existing.recordset[0]);
  }

  const insert = await pool
    .request()
    .input("email", email)
    .input("company_name", company_name)
    .input("role", role)
    .query(`
      INSERT INTO dbo.Admins (email, company_name, role)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.company_name, INSERTED.role, INSERTED.created_at
      VALUES (@email, @company_name, @role);
    `);

  return res.status(201).json(insert.recordset[0]);
});

/**
 * POST /api/admin/login
 * body: { email, password }
 * NOTE: matches your current frontend: validates by email-only (password ignored)
 */
adminRouter.post("/admin/login", async (req, res) => {
  const { email } = req.body as { email: string; password?: string };

  if (!email) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!hasSql()) {
    const admin = validateAdminMem(email);
    if (!admin) return res.status(401).json({ message: "Invalid email or password" });
    return res.json(admin);
  }

  const pool = await getPool();
  const found = await pool
    .request()
    .input("email", email)
    .query(`SELECT TOP 1 id, email, company_name, role, created_at FROM dbo.Admins WHERE email = @email;`);

  if (!found.recordset.length) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  return res.json(found.recordset[0]);
});