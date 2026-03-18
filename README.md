# Quotation Portal (MVP)

This is a Next.js MVP that:
- Accepts Excel (.xlsx) uploads
- Generates a redacted customer PDF (no costs/margins)
- Creates a secure link (JWT)
- Logs QuoteCreated/Viewed on Sepolia via a minimal events contract

## Quick start
```bash
npm install
cp .env.example .env
# Fill LINK_TOKEN_SECRET, TOKEN_TTL_HOURS, SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
npm run dev
```

Generated 2026-03-13T00:11:20.397065Z
Update

