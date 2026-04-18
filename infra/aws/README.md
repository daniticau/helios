# infra/aws

AWS infrastructure as code / config for Helios' production backend.

## What's here

| File | Purpose |
|------|---------|
| `apprunner.yaml` | App Runner service config (used for the GitHub-source deploy path) |
| `README.md` | You are here |

## Why App Runner?

- Managed container host — no VPC, ALB, ECS, or auto-scaling config to wire.
- Scales from 1 to N instances automatically; we pin to 1 for the demo so
  the backend is always-warm (no cold starts during pitch).
- Qualifies for the DataHacks 2026 AWS challenge track.
- Cost: ~$30–40/month at 1 vCPU / 2 GB always-on. $200 AWS credits cover
  the hackathon plus several months of post-event uptime.

## How to deploy

See `docs/INFRA.md` at the repo root for the step-by-step "click these
buttons" guide. TL;DR:

1. Build + push the image in `backend/Dockerfile` to ECR.
2. Create an App Runner service pulling from that ECR repo.
3. Set env vars (secrets) in the App Runner console.
4. Point the web + mobile apps at the generated `*.awsapprunner.com` URL.

## Region

Default: `us-west-2` (Oregon) — closest App Runner region to UCSD (San Diego).

## What's NOT here

- No Terraform / CDK yet. 36-hour hackathon; manual console setup is faster.
- No custom domain config. Attach `api.helios.daniticau.com` post-deploy via
  the App Runner custom domain tab if desired (docs/INFRA.md covers the
  steps).
