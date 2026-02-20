import { Router } from "express";

export const invitesRouter = Router();

/**
 * POST /api/invites/migrate
 * Stub endpoint to unblock your frontend's migration step.
 */
invitesRouter.post("/invites/migrate", async (_req, res) => {
  return res.json({ ok: true, migrated: 0 });
});