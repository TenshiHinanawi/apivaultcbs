const express = require("express");
const { z } = require("zod");
const { query } = require("../db");
const { authRequired, requireAdmin, canAccessAdmin } = require("../middleware/auth");

const router = express.Router();

const createVaultEntrySchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().min(1),
  entryType: z.string().trim().min(1).max(40).optional()
});

const updateVaultEntrySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    entryType: z.string().trim().min(1).max(40).optional()
  })
  .refine(
    (data) => data.title !== undefined || data.content !== undefined || data.entryType !== undefined,
    { message: "At least one field is required." }
  );

function parseEntryId(rawId) {
  const parsedId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return null;
  return parsedId;
}

router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id AS "userId", title, content, entry_type AS "entryType", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM vault_entries WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    return res.json({ items: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createVaultEntrySchema.parse(req.body);
    const result = await query(
      `INSERT INTO vault_entries (user_id, title, content, entry_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id AS "userId", title, content, entry_type AS "entryType", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [req.user.id, parsed.title, parsed.content, parsed.entryType || "note"]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.get("/admin", requireAdmin(), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id AS "userId", title, content, entry_type AS "entryType", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM vault_entries ORDER BY updated_at DESC`
    );
    return res.json({ items: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const entryId = parseEntryId(req.params.id);
    if (!entryId) return res.status(400).json({ error: "Invalid vault entry id." });

    const isAdmin = canAccessAdmin(req.user);

    const result = await query(
      `SELECT id, user_id AS "userId", title, content, entry_type AS "entryType", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM vault_entries WHERE id = $1 AND (user_id = $2 OR $3 = true)`,
      [entryId, req.user.id, isAdmin]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Vault entry not found or unauthorized." });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const entryId = parseEntryId(req.params.id);
    if (!entryId) return res.status(400).json({ error: "Invalid vault entry id." });

    const parsed = updateVaultEntrySchema.parse(req.body);
    const isAdmin = canAccessAdmin(req.user);
    
    const result = await query(
      `UPDATE vault_entries
       SET title = COALESCE($1, title), content = COALESCE($2, content), entry_type = COALESCE($3, entry_type)
       WHERE id = $4 AND (user_id = $5 OR $6 = true)
       RETURNING id, user_id AS "userId", title, content, entry_type AS "entryType", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [parsed.title, parsed.content, parsed.entryType, entryId, req.user.id, isAdmin]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Vault entry not found or unauthorized." });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const entryId = parseEntryId(req.params.id);
    if (!entryId) return res.status(400).json({ error: "Invalid vault entry id." });

    const isAdmin = canAccessAdmin(req.user);

    const result = await query(
      "DELETE FROM vault_entries WHERE id = $1 AND (user_id = $2 OR $3 = true) RETURNING id", 
      [entryId, req.user.id, isAdmin]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ error: "Vault entry not found or unauthorized." });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
