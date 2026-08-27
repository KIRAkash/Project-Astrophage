#!/usr/bin/env bash
# ==============================================================================
# 🌌 Project Astrophage - Google Cloud Deployment Script (Cloud Run + GCS + Cloud SQL)
# ==============================================================================
#
# Prerequisites:
# 1. Google Cloud SDK (gcloud) installed and authenticated (`gcloud auth login`)
# 2. An active GCP Project (`gcloud config set project <YOUR_PROJECT_ID>`)
# 3. Docker running (or use Cloud Build)
#
# Usage:
#   chmod +x deploy_gcp.sh
#   ./deploy_gcp.sh
# ==============================================================================

set -e

# --- Configuration (Adjust or override via environment variables) ---
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
REGION=${GCP_REGION:-"us-central1"}
API_SERVICE_NAME=${API_SERVICE_NAME:-"astrophage-api"}
WEB_SERVICE_NAME=${WEB_SERVICE_NAME:-"astrophage-web"}
GCS_BUCKET_NAME=${GCS_BUCKET_NAME:-"astrophage-kbs-${PROJECT_ID}"}
GEMINI_MODEL=${GEMINI_MODEL:-"gemini-3.5-flash"}

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GCP Project ID is not set. Run 'gcloud config set project <PROJECT_ID>' or set GCP_PROJECT_ID."
  exit 1
fi

echo "=================================================================="
echo "🌌 Deploying Project Astrophage to Google Cloud"
echo "Project ID : $PROJECT_ID"
echo "Region     : $REGION"
echo "GCS Bucket : $GCS_BUCKET_NAME"
echo "AI Model   : $GEMINI_MODEL (via google-genai SDK)"
echo "=================================================================="

# 1. Enable Required GCP APIs
echo "📡 [1/5] Enabling Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  --project="$PROJECT_ID"

# 2. Create GCS Bucket for User Uploads & KB Archives
echo "🪣 [2/5] Setting up Google Cloud Storage bucket: gs://${GCS_BUCKET_NAME}..."
if gcloud storage buckets describe "gs://${GCS_BUCKET_NAME}" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "✅ Bucket gs://${GCS_BUCKET_NAME} already exists."
else
  gcloud storage buckets create "gs://${GCS_BUCKET_NAME}" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
  echo "✅ Bucket gs://${GCS_BUCKET_NAME} created."
fi

# 3. Build & Deploy Backend API to Cloud Run
echo "🚀 [3/5] Deploying FastAPI API & Agent Fleet to Google Cloud Run..."
gcloud run deploy "$API_SERVICE_NAME" \
  --source="./apps/api" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform="managed" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=600 \
  --set-env-vars="AI_MODE=remote,GEMINI_MODEL=${GEMINI_MODEL},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GEMINI_RATE_LIMIT_SAFE_MODE=true"

API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo "✅ API successfully deployed to: $API_URL"

# 4. Build & Deploy Next.js Web Frontend to Cloud Run
echo "🌐 [4/5] Deploying Next.js 14 Frontend to Google Cloud Run..."
gcloud run deploy "$WEB_SERVICE_NAME" \
  --source="./apps/web" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform="managed" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="NEXT_PUBLIC_API_URL=${API_URL}"

WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo "✅ Frontend successfully deployed to: $WEB_URL"

# 5. Summary & Live Demo Instructions
echo "=================================================================="
echo "🎉 PROJECT ASTROPHAGE IS LIVE ON GOOGLE CLOUD!"
echo "=================================================================="
echo "🖥️  Web UI URL        : $WEB_URL"
echo "🔌 API Docs URL      : $API_URL/docs"
echo "🪣 GCS Upload Bucket : gs://$GCS_BUCKET_NAME"
echo ""
echo "🔗 GITHUB WEBHOOK LIVE DEMO CONFIGURATION:"
echo "   In your GitHub repository (Settings -> Webhooks -> Add Webhook):"
echo "   - Payload URL: $API_URL/api/webhooks/github/push"
echo "   - Content type: application/json"
echo "   - Secret: [Your WEBHOOK_SECRET]"
echo "   - Events: Just the push event & Pull requests"
echo "=================================================================="
