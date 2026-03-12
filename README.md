
# Quotation Portal (MVP)

Web-based portal that:
- Accepts Excel (.xlsx) uploads
- Generates redacted customer PDF (no costs/margins)
- Creates a secure link for the customer
- Logs quote lifecycle on Sepolia testnet (Created, Viewed, Revised)

## Quick start
```bash
npm install
cp .env.example .env
# Fill LINK_TOKEN_SECRET, SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
npm run dev
# open http://localhost:3000
```

## Notes
- Storage uses local `storage/` for demo. Replace with S3/Azure in prod.
- Email sending is simulated by returning the secure link in the API response; integrate your mail provider.
- The viewer page logs `QuoteViewed` on-chain. For production, use a stable server-side salt to compute viewerRefHash.

Generated on 2026-03-11T23:28:25.593609Z
