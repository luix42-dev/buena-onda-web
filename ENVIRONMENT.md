# Environment Variables

R2 CORS must always be managed through Wrangler CLI, never through the Cloudflare dashboard. Use the Wrangler 4.x `{"rules": [...]}` schema, for example: `wrangler r2 bucket cors set buena-onda-radio --file cors.json`.

## Supabase

### NEXT_PUBLIC_SUPABASE_URL
- **Service:** Supabase
- **Required:** Yes
- **Where to get it:** Supabase project dashboard, Project Settings > API > Project URL.
- **Used for:** Browser-safe Supabase client initialization.
- **Vercel:** Yes

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Service:** Supabase
- **Required:** Yes
- **Where to get it:** Supabase project dashboard, Project Settings > API > anon public key.
- **Used for:** Browser-safe Supabase access where RLS applies.
- **Vercel:** Yes

### SUPABASE_SERVICE_ROLE_KEY
- **Service:** Supabase
- **Required:** Yes
- **Where to get it:** Supabase project dashboard, Project Settings > API > service_role secret key.
- **Used for:** Server-side admin reads and writes that bypass RLS.
- **Vercel:** Yes

## Site

### NEXT_PUBLIC_SITE_URL
- **Service:** Site
- **Required:** Yes
- **Where to get it:** Use the canonical production URL for the deployed site.
- **Used for:** Absolute site links, redirects, and public URL generation.
- **Vercel:** Yes

### NEXT_PUBLIC_API_BASE_URL
- **Service:** Site
- **Required:** No
- **Where to get it:** Use the deployed site origin when API calls need an explicit base URL.
- **Used for:** Client-side or script API calls that cannot rely on the current origin.
- **Vercel:** Yes

## Auth

### ADMIN_PASSWORD
- **Service:** Auth
- **Required:** No
- **Where to get it:** Retired; do not create a new value.
- **Used for:** Retired legacy `/admin` authentication. `/studio` now uses `STUDIO_PASSWORD` only.
- **Vercel:** No

### STUDIO_PASSWORD
- **Service:** Auth
- **Required:** Yes
- **Where to get it:** Generate and store a strong password for the `/studio` interface.
- **Used for:** Studio authentication and route protection.
- **Vercel:** Yes

## Resend

### RESEND_API_KEY
- **Service:** Resend
- **Required:** Yes
- **Where to get it:** Resend dashboard, API Keys.
- **Used for:** Sending transactional email.
- **Vercel:** Yes

## Stripe

### STRIPE_SECRET_KEY
- **Service:** Stripe
- **Required:** Yes
- **Where to get it:** Stripe dashboard, Developers > API keys > Secret key.
- **Used for:** Server-side Checkout and payment operations.
- **Vercel:** Yes

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Service:** Stripe
- **Required:** Yes
- **Where to get it:** Stripe dashboard, Developers > API keys > Publishable key.
- **Used for:** Browser-side Stripe initialization.
- **Vercel:** Yes

### STRIPE_WEBHOOK_SECRET
- **Service:** Stripe
- **Required:** Yes
- **Where to get it:** Stripe dashboard, Developers > Webhooks > selected endpoint signing secret.
- **Used for:** Verifying Stripe webhook signatures from the raw request body.
- **Vercel:** Yes

## Cloudflare R2

### R2_ACCOUNT_ID
- **Service:** Cloudflare R2
- **Required:** Yes
- **Where to get it:** Cloudflare dashboard URL or Workers & Pages overview for the account ID.
- **Used for:** Building the R2 S3-compatible endpoint when `R2_ENDPOINT` is not provided.
- **Vercel:** Yes

### R2_ACCESS_KEY_ID
- **Service:** Cloudflare R2
- **Required:** Yes
- **Where to get it:** Cloudflare dashboard, R2 > Manage R2 API Tokens.
- **Used for:** S3-compatible R2 authentication.
- **Vercel:** Yes

### R2_SECRET_ACCESS_KEY
- **Service:** Cloudflare R2
- **Required:** Yes
- **Where to get it:** Cloudflare dashboard, R2 > Manage R2 API Tokens, shown when the key is created.
- **Used for:** S3-compatible R2 authentication.
- **Vercel:** Yes

### R2_BUCKET_NAME
- **Service:** Cloudflare R2
- **Required:** Yes
- **Where to get it:** Cloudflare dashboard, R2 bucket list.
- **Used for:** Selecting the R2 bucket for Player audio, Radio episodes, and uploads.
- **Vercel:** Yes

### R2_ENDPOINT
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Use `https://<account-id>.r2.cloudflarestorage.com`.
- **Used for:** Explicit S3-compatible R2 endpoint override.
- **Vercel:** Yes

### R2_PUBLIC_URL
- **Service:** Cloudflare R2
- **Required:** Yes
- **Where to get it:** Cloudflare dashboard, R2 bucket public access or custom domain settings.
- **Used for:** Public URLs for uploaded media and Player track playback.
- **Vercel:** Yes

### CF_R2_ACCOUNT_ID
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Same value as `R2_ACCOUNT_ID`.
- **Used for:** Fallback alias for older code paths.
- **Vercel:** Yes

### CF_R2_ACCESS_KEY_ID
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Same value as `R2_ACCESS_KEY_ID`.
- **Used for:** Fallback alias for older code paths.
- **Vercel:** Yes

### CF_R2_SECRET_ACCESS_KEY
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Same value as `R2_SECRET_ACCESS_KEY`.
- **Used for:** Fallback alias for older code paths.
- **Vercel:** Yes

### CF_R2_BUCKET_NAME
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Same value as `R2_BUCKET_NAME`.
- **Used for:** Fallback alias for older code paths.
- **Vercel:** Yes

### CF_R2_PUBLIC_URL
- **Service:** Cloudflare R2
- **Required:** No
- **Where to get it:** Same value as `R2_PUBLIC_URL`.
- **Used for:** Fallback alias for older code paths.
- **Vercel:** Yes

## Cloudflare KV

### CLOUDFLARE_ACCOUNT_ID
- **Service:** Cloudflare KV
- **Required:** No
- **Where to get it:** Cloudflare dashboard account overview.
- **Used for:** Cloudflare API access in remaining non-Player KV/debug paths.
- **Vercel:** Yes

### CLOUDFLARE_API_TOKEN
- **Service:** Cloudflare KV
- **Required:** No
- **Where to get it:** Cloudflare dashboard, My Profile > API Tokens.
- **Used for:** Cloudflare API authentication in remaining non-Player KV/debug paths.
- **Vercel:** Yes

### BUENA_ONDA_RADIO_META_NAMESPACE_ID
- **Service:** Cloudflare KV
- **Required:** No
- **Where to get it:** Cloudflare dashboard, Workers & Pages > KV namespaces.
- **Used for:** Legacy KV namespace reference still present outside Player metadata paths.
- **Vercel:** Yes

## Telegram

### TELEGRAM_BOT_TOKEN
- **Service:** Telegram
- **Required:** No
- **Where to get it:** Create or inspect the bot with BotFather in Telegram.
- **Used for:** Sending Telegram notifications and validating webhook traffic.
- **Vercel:** Yes

### TELEGRAM_CHAT_ID
- **Service:** Telegram
- **Required:** No
- **Where to get it:** Get the target chat ID from Telegram bot updates or an admin helper script.
- **Used for:** Selecting the Telegram chat that receives notifications.
- **Vercel:** Yes

### TELEGRAM_WEBHOOK_URL
- **Service:** Telegram
- **Required:** No
- **Where to get it:** Use the deployed webhook URL for `/api/telegram/webhook`.
- **Used for:** Registering the Telegram webhook endpoint.
- **Vercel:** Yes

## Ollama / Local LLM

### OLLAMA_URL
- **Service:** Ollama / Local LLM
- **Required:** Local only
- **Where to get it:** Use the local Ollama server URL, usually `http://127.0.0.1:11434`.
- **Used for:** Local LLM enrichment and intake tooling.
- **Vercel:** No

### OLLAMA_HOST
- **Service:** Ollama / Local LLM
- **Required:** Local only
- **Where to get it:** Use the local Ollama host binding, usually `127.0.0.1:11434`.
- **Used for:** Configuring local Ollama host access.
- **Vercel:** No

### OLLAMA_MODEL
- **Service:** Ollama / Local LLM
- **Required:** Local only
- **Where to get it:** Use an installed local Ollama model name from `ollama list`.
- **Used for:** Selecting the local model for tooling.
- **Vercel:** No

### HERMES_MODEL
- **Service:** Ollama / Local LLM
- **Required:** Local only
- **Where to get it:** Use an installed local model name intended for Hermes enrichment.
- **Used for:** Selecting the Hermes enrichment model.
- **Vercel:** No

## Anthropic

### ANTHROPIC_API_KEY
- **Service:** Anthropic
- **Required:** No
- **Where to get it:** Anthropic Console, API Keys.
- **Used for:** Anthropic-powered tooling or enrichment workflows.
- **Vercel:** Yes

## Other

### HERO_MEDIA_DIR
- **Service:** Local filesystem
- **Required:** Local only
- **Where to get it:** Set to the local directory containing hero media assets.
- **Used for:** Local media tooling that reads hero assets from disk.
- **Vercel:** No

### NODE_ENV
- **Service:** Runtime
- **Required:** Yes
- **Where to get it:** Set automatically by Next.js and Vercel; use `development`, `test`, or `production`.
- **Used for:** Runtime behavior such as secure cookies in production.
- **Vercel:** No

### PATH
- **Service:** Runtime
- **Required:** Local only
- **Where to get it:** Provided by the shell or process manager.
- **Used for:** Local scripts that prepend a Node binary path before spawning commands.
- **Vercel:** No

### RESET_DRAFT
- **Service:** Local script flag
- **Required:** No
- **Where to get it:** Set manually to `1` when running the publish script that should reset draft state.
- **Used for:** Optional behavior in local publishing scripts.
- **Vercel:** No

### TEST_BASE_URL
- **Service:** Local test tooling
- **Required:** Local only
- **Where to get it:** Set to the local dev server URL, for example `http://127.0.0.1:3000`.
- **Used for:** Local scripts that test intake and Telegram webhook endpoints.
- **Vercel:** No
