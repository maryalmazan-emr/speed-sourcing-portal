// File: server/src/index.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { adminRouter } from "./routes/admin.js";
import { auctionsRouter } from "./routes/auctions.js";
import { invitesRouter } from "./routes/invites.js";

dotenv.config();

const app = express();

const port = Number(process.env.PORT || 3001);
const corsOrigins =
  (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", adminRouter);
app.use("/api", auctionsRouter);
app.use("/api", invitesRouter);

// Always return JSON (prevents "Unexpected token '<'")
app.use((_req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});