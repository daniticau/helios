# Helios — AWS App Runner Deploy Guide

Step-by-step guide to deploy the Helios backend to AWS App Runner. Target
wall-clock time: **~15 minutes** once prerequisites are installed.

App Runner is a managed container host. We push a Docker image to Amazon
Elastic Container Registry (ECR), then point App Runner at it. The service
stays always-warm so the demo never hits a cold start.

---

## Prerequisites

Install once, locally:

- **Docker Desktop** (or Docker Engine on Linux) — https://docs.docker.com/get-docker/
- **AWS CLI v2** — https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- An **AWS account** with billing enabled. DataHacks 2026 provides $200 in
  credits; apply them in the AWS Billing console before you start.
- Sign in: `aws configure` (paste your access key + secret + region
  `us-west-2`, default output `json`). Verify:
  ```bash
  aws sts get-caller-identity
  # -> { "Account": "123456789012", "UserId": "...", "Arn": "..." }
  ```

---

## Conventions used below

Replace these placeholders as you go:

- `<ACCOUNT_ID>` — your 12-digit AWS account ID (from `aws sts get-caller-identity`)
- `<REGION>` — `us-west-2` (Oregon) unless you have a reason to change it

---

## Step 1 — Create the ECR repository

ECR is AWS' private Docker registry. Create one repo for Helios.

**Console path:**

1. Log in to the AWS Console, region selector top-right → **US West (Oregon)**.
2. Navigate to **Elastic Container Registry (ECR)**.
3. Click **Create repository**.
   - Visibility: **Private**
   - Name: `helios-backend`
   - Leave tag immutability and encryption at defaults.
4. Click **Create**.

**CLI path (equivalent):**

```bash
aws ecr create-repository \
  --repository-name helios-backend \
  --region us-west-2
```

After this step, your image URI is:

```
<ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:latest
```

---

## Step 2 — Build + push the image

From the repo root (`~/dev/helios/`):

```bash
# 1. Authenticate Docker to ECR (token valid for 12 hours).
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com

# 2. Build from the backend/ directory. Tag with both `latest` and a
#    short git SHA so you can roll back if a deploy goes sideways.
SHA=$(git rev-parse --short HEAD)
docker build -t helios-backend:latest -t helios-backend:$SHA ./backend

# 3. Tag for ECR.
docker tag helios-backend:latest \
  <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:latest
docker tag helios-backend:$SHA \
  <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:$SHA

# 4. Push both tags.
docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:$SHA
```

On Apple silicon / ARM laptops, force an amd64 build so App Runner's
x86 runtime doesn't reject it:

```bash
docker buildx build --platform linux/amd64 \
  -t helios-backend:latest ./backend --load
```

Expected build time on a modern laptop: **2–4 minutes** (mostly `uv sync`
compiling pandas/numpy wheels on first run; subsequent builds are cached).

---

## Step 3 — Create the App Runner service

**Console path** (fastest during a hackathon):

1. AWS Console → **App Runner** → **Create service**.
2. **Source**:
   - Source type: **Container registry**
   - Provider: **Amazon ECR**
   - Container image URI: click **Browse** → pick `helios-backend` → `latest`.
   - Deployment trigger: **Manual** (to keep the demo stable; you can flip
     to Automatic after submission).
   - ECR access role: **Create new service role** (App Runner will scaffold
     `AppRunnerECRAccessRole` for you).
3. **Configure service**:
   - Service name: `helios-backend`
   - Virtual CPU: **1 vCPU**
   - Memory: **2 GB**
   - Port: **8080**
   - Start command: *(leave blank — Dockerfile `CMD` handles it)*
4. **Auto scaling**: use the default built-in config. 1 min, 1 max keeps
   cost predictable during the hackathon.
5. **Health check**:
   - Protocol: **HTTP**
   - Path: `/api/health`
   - Interval: 10s, Timeout: 5s, Healthy threshold: 1, Unhealthy: 5
6. **Environment variables** — click **Add environment variable** for each:

   | Name | Value | Source |
   |------|-------|--------|
   | `ORTHOGONAL_API_KEY` | *(paste from `.env`)* | Plain text (or Secrets Manager for prod) |
   | `ANTHROPIC_API_KEY` | *(paste from `.env`)* | Plain text |
   | `BACKEND_LOG_LEVEL` | `INFO` | Plain text |
   | `BACKEND_ALLOWED_ORIGINS` | `*` | Plain text |
   | `ORTHOGONAL_TIMEOUT_SECONDS` | `18` | Plain text |
   | `ORTHOGONAL_PARALLELISM` | `10` | Plain text |
   | `CACHE_ENABLED` | `true` | Plain text |

   If the auth agent has wired Supabase, also set:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | *(from Supabase project settings)* |
   | `SUPABASE_JWT_SECRET` | *(from Supabase project settings > API)* |

   For long-term production: migrate secrets to **AWS Secrets Manager** and
   reference them in App Runner via the "Secrets Manager" source option.
   Good enough for the hackathon: plain text env vars.

7. **Security**:
   - Instance role: *(optional — only needed if the backend ever calls other
     AWS services. Skip for now.)*
8. **Networking**: default (public ingress, VPC egress not needed).
9. **Create & deploy**.

**Expected deploy time:** 3–5 minutes on first create. Wait for status
**Running**.

---

## Step 4 — Grab the service URL

Once status is **Running**, App Runner gives you a URL like:

```
https://<random-id>.us-west-2.awsapprunner.com
```

Quick smoke test:

```bash
curl https://<random-id>.us-west-2.awsapprunner.com/api/health
# -> {"status":"ok","zenpower_loaded":true,"permits_count":37900}
```

Also hit `/docs` in a browser to see the FastAPI Swagger UI is reachable.

This URL is `BACKEND_URL` — paste it everywhere the clients need it.

---

## Step 5 — Wire the clients to the deployed backend

### Web (Vercel)

```bash
# web/.env.production — edit or create
BACKEND_URL=https://<random-id>.us-west-2.awsapprunner.com
```

Then redeploy on Vercel (push to main or `vercel --prod`).

### Mobile (Expo)

Edit `mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://<random-id>.us-west-2.awsapprunner.com"
    }
  }
}
```

Rebuild:

```bash
cd mobile
pnpm start --clear
# re-scan QR on the phone
```

---

## Step 6 — Redeploy after code changes

Every backend change = rebuild + push + trigger an App Runner deployment.

```bash
# From repo root, after committing changes:
SHA=$(git rev-parse --short HEAD)
docker build -t helios-backend:$SHA -t helios-backend:latest ./backend
docker tag helios-backend:latest \
  <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/helios-backend:latest

# Tell App Runner to pull the new image.
aws apprunner start-deployment \
  --service-arn <PASTE_SERVICE_ARN_HERE> \
  --region us-west-2
```

Find the service ARN in the App Runner console on the service detail page
(top-right), or via:

```bash
aws apprunner list-services --region us-west-2 \
  --query 'ServiceSummaryList[?ServiceName==`helios-backend`].ServiceArn' \
  --output text
```

---

## Step 7 (optional) — Custom domain

To serve the backend at `api.helios.daniticau.com`:

1. App Runner console → your service → **Custom domains** tab → **Link
   domain**.
2. Enter `api.helios.daniticau.com`.
3. App Runner returns two DNS records (a CNAME + an ACM validation
   record). Add both to your DNS provider (Cloudflare / Route 53 / etc).
4. Wait 5–15 minutes for validation. TLS cert is automatic.
5. Update `BACKEND_URL` in web + mobile configs to the custom domain.

Skip this entirely for the hackathon submission — the `*.awsapprunner.com`
URL is production-grade and has valid TLS.

---

## Cost notes

- **1 vCPU / 2 GB, always-on:** ~**$30–40/month** (CPU-hours + memory-hours
  + data transfer).
- **$200 AWS credits from DataHacks** covers the hackathon submission
  window + **4–5 months** of post-event uptime with no out-of-pocket cost.
- **Scale-to-zero** is available in App Runner (set min instances to 0),
  but cold starts add 5–10 seconds to the first request. For demo day,
  **keep min = 1**. Flip to 0 after the event if you want to hibernate.
- **ECR storage** is ~$0.10/GB/month — a 300 MB image is negligible.

---

## AWS challenge submission

In the DataHacks 2026 Devpost submission form, under the AWS challenge:

1. Service ARN: paste from App Runner console (format:
   `arn:aws:apprunner:us-west-2:<ACCOUNT_ID>:service/helios-backend/<uuid>`).
2. Region: `us-west-2`.
3. AWS services used: **App Runner** (container host) + **ECR** (image
   registry).
4. Brief description: "FastAPI backend containerized and deployed to AWS
   App Runner, backing the Helios solar-economics mobile + web clients."

---

## Troubleshooting

**App Runner deploy fails with "image not found":**
Check the ECR push succeeded (`aws ecr list-images --repository-name
helios-backend --region us-west-2`). Ensure the image tag matches what
App Runner is pointed at.

**Health check fails, service stuck in "Operation in progress":**
Hit the container logs from the App Runner console → **Logs** tab. Most
common cause: missing `ORTHOGONAL_API_KEY` env var causing startup crash.
Fix env vars, trigger a fresh deploy.

**`exec format error` in logs:**
Built on ARM (Apple silicon) but App Runner runs amd64. Rebuild with
`docker buildx build --platform linux/amd64 ...` per Step 2.

**CORS errors from the web client:**
`BACKEND_ALLOWED_ORIGINS` is `*` by default (fine for demo). Lock it down
later to your Vercel domain + Expo dev host.

**Image size > 500 MB:**
Check `.dockerignore` is filtering `__pycache__/`, `.venv/`, `econ/tests/`.
The current image should be ~300 MB.
