# Vault API (Node.js + PostgreSQL)

A production-structured API for a vault app with:
- User registration/login (JWT)
- Vault entry CRUD (text content)
- PostgreSQL persistence
- **Intentional IDOR-vulnerable endpoints** for security testing

## Important security note

IDOR is a **server-side authorization bug**. In real systems, it is usually in the API/backend endpoint logic, not in the frontend alone.

This project is intentionally vulnerable for testing:
read/update/delete by entry ID skip ownership checks by design.

Use this only in a private lab/testing environment.

## Data model

### `users`
- `id` (serial, PK)
- `email` (unique)
- `password_hash`
- `created_at`

### `vault_entries`
- `id` (serial, PK)
- `user_id` (FK -> users.id)
- `title`
- `content` (any text)
- `entry_type` (e.g., note/password/story/literary)
- `created_at`
- `updated_at`

## Quick start (local)

1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `copy .env.example .env`
3. Edit `.env` with your `DATABASE_URL` and `JWT_SECRET`
4. Start API:
   - `npm run dev`

Health check:
- `GET /health`

## Render deployment

This repository includes `render.yaml` for one-click Render Blueprint deployment:
- Web service: `vault-api`
- PostgreSQL service: `vault-postgres`

### Steps

1. Push this project to GitHub.
2. In Render, choose **New + -> Blueprint**.
3. Select your repository.
4. Render reads `render.yaml` and provisions API + DB.
5. Keep or change environment variables:
   - `JWT_SECRET` (auto-generated)
   - `DATABASE_URL` (from Render database)

## API endpoints

### Auth
- `POST /api/auth/register`
  - Body: `{ "email": "user@example.com", "password": "StrongPass123" }`
- `POST /api/auth/login`
  - Body: `{ "email": "user@example.com", "password": "StrongPass123" }`

### Vault (requires `Authorization: Bearer <token>`)
- `GET /api/vault` - list current user's entries
- `POST /api/vault` - create entry
  - Body: `{ "title": "My note", "content": "Any text here", "entryType": "story" }`
- `GET /api/vault/:id` - get one entry
- `PATCH /api/vault/:id` - update title/content/entryType
- `DELETE /api/vault/:id` - delete entry

## Vulnerability behavior

Intentional IDOR vulnerability exists in:
- `GET /api/vault/:id`
- `PATCH /api/vault/:id`
- `DELETE /api/vault/:id`

These endpoints do not validate that the entry belongs to the authenticated user.

## Minimal example payloads

Create entry:

```json
{
  "title": "My Password Note",
  "content": "email:pass123",
  "entryType": "password"
}
```

Update entry:

```json
{
  "content": "Updated text"
}
```
