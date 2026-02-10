# BFHL API

Simple Node.js Express API implementing POST `/bfhl` and GET `/health`.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set `OFFICIAL_EMAIL` to your Chitkara email.

3. Run the server:

```bash
npm start
```

Endpoints

- `GET /health` — returns `{ is_success: true, official_email: ... }`
- `POST /bfhl` — accepts exactly one key in the JSON body: `fibonacci` (int), `prime` (int array), `lcm` (int array), `hcf` (int array), `AI` (string question).

AI integration

The implementation includes a placeholder to call an external AI provider. Set `GEMINI_API_KEY` and `GEMINI_API_URL` in `.env` to enable AI. If the key is not present the API will respond with HTTP 501 and explain that the AI integration is not configured.

Response structure

All successful responses follow:

```json
{
  "is_success": true,
  "official_email": "YOUR CHITKARA EMAIL",
  "data": ...
}
```

Errors return `is_success: false` and appropriate HTTP status codes.
