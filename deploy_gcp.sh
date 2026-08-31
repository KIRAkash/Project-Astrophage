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
set -e

# Source .env file if it exists to pick up configuration
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# --- Configuration (Adjust or override via environment variables) ---
PROJECT_ID=${GCP_PROJECT_ID}
REGION=${GCP_REGION:-"us-central1"}
API_SERVICE_NAME=${API_SERVICE_NAME:-"astrophage-api"}
WEB_SERVICE_NAME=${WEB_SERVICE_NAME:-"astrophage-web"}
GCS_BUCKET_NAME=${GCS_BUCKET_NAME:-"astrophage-kbs-${PROJECT_ID}"}
GEMINI_MODEL=${GEMINI_MODEL:-"gemini-3.5-flash"}

# Parse target component: "all" (default), "web", or "api"
TARGET=${1:-"all"}
TARGET=$(echo "$TARGET" | tr '[:upper:]' '[:lower:]' | tr -d '-')

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set in your environment or .env file."
  echo "To ensure deployments target the correct project, we no longer fallback to your terminal's default."
  echo "Please set it explicitly (e.g. export GCP_PROJECT_ID=your-project-id) or add it to your .env file."
  exit 1
fi

echo "=================================================================="
echo "🌌 Deploying Project Astrophage to Google Cloud [Target: $TARGET]"
echo "Project ID : $PROJECT_ID"
echo "Region     : $REGION"
echo "GCS Bucket : $GCS_BUCKET_NAME"
echo "AI Model   : $GEMINI_MODEL (via google-genai SDK)"
echo "=================================================================="

# 1. Enable Required GCP APIs (only on full deploy)
if [ "$TARGET" = "all" ]; then
  echo "📡 [1/5] Enabling Google Cloud APIs..."
  gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    --project="$PROJECT_ID"
fi

# 2. Create GCS Bucket for User Uploads & KB Archives (only on full deploy or api)
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
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
fi

# 3. Build & Deploy Backend API to Cloud Run
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo "🚀 [3/5] Deploying FastAPI API & Agent Fleet to Google Cloud Run..."

  # Transform DATABASE_URL to Unix Socket format for Cloud Run if using Cloud SQL
  DB_INSTANCE_NAME=${DB_INSTANCE_NAME:-"astrophage-db"}
  INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"

  CLOUD_SQL_USER=${CLOUD_SQL_USER:-"astrophage-user"}
  CLOUD_SQL_PASSWORD=${CLOUD_SQL_PASSWORD:-"kYXziPFW10QkdywZ"}
  CLOUD_SQL_DB=${CLOUD_SQL_DB:-"astrophage"}

  if [ -n "$CLOUD_DATABASE_URL" ]; then
    CLOUD_RUN_DB_URL="$CLOUD_DATABASE_URL"
  elif [[ "$DATABASE_URL" == *"localhost"* || "$DATABASE_URL" == *"127.0.0.1"* || -z "$DATABASE_URL" ]]; then
    CLOUD_RUN_DB_URL="postgresql+asyncpg://${CLOUD_SQL_USER}:${CLOUD_SQL_PASSWORD}@/${CLOUD_SQL_DB}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"
  else
    CLOUD_RUN_DB_URL=$(python3 -c "
import os
from urllib.parse import urlparse
db_url = os.environ.get('DATABASE_URL', '')
if 'localhost' not in db_url and db_url:
    p = urlparse(db_url)
    print(f'postgresql+asyncpg://{p.username}:{p.password}@/{p.path.lstrip(\"/\")}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}')
else:
    print(f'postgresql+asyncpg://${CLOUD_SQL_USER}:${CLOUD_SQL_PASSWORD}@/${CLOUD_SQL_DB}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}')
")
  fi

  # Memorystore Redis for Cloud Run
  if [[ "$REDIS_URL" == *"localhost"* || "$REDIS_URL" == *"127.0.0.1"* || -z "$REDIS_URL" ]]; then
    CLOUD_RUN_REDIS_URL=${CLOUD_REDIS_URL:-"redis://10.182.167.219:6379/0"}
  else
    CLOUD_RUN_REDIS_URL=$REDIS_URL
  fi

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
    --no-cpu-throttling \
    --set-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
    --set-env-vars="WORKER_MODE=in_process,AI_MODE=remote,GEMINI_MODEL=${GEMINI_MODEL},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GEMINI_RATE_LIMIT_SAFE_MODE=true,DATABASE_URL=${CLOUD_RUN_DB_URL},GITHUB_APP_ID=${GITHUB_APP_ID},GITHUB_APP_INSTALLATION_ID=${GITHUB_APP_INSTALLATION_ID},GITHUB_APP_PRIVATE_KEY=${GITHUB_APP_PRIVATE_KEY},WEBHOOK_SECRET=${WEBHOOK_SECRET},GEMINI_API_KEY=${GEMINI_API_KEY}"

  API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
  echo "✅ API successfully deployed to: $API_URL"
else
  API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "${NEXT_PUBLIC_API_URL}")
  echo "ℹ️  Using existing API URL: $API_URL"
fi

# 4. Build & Deploy Next.js Web Frontend to Cloud Run
if [ "$TARGET" = "all" ] || [ "$TARGET" = "web" ]; then
  echo "🌐 [4/5] Deploying Next.js 14 Frontend to Google Cloud Run..."

  # Next.js inlines NEXT_PUBLIC_* variables at build-time.
  # Generate apps/web/.env.production & apps/web/.env so Cloud Build embeds them during 'next build'.
  cat <<EOF > ./apps/web/.env.production
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
EOF

  cp ./apps/web/.env.production ./apps/web/.env

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
    --set-env-vars="NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}" \
    --set-build-env-vars="NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"

  rm -f ./apps/web/.env.production
  cp .env ./apps/web/.env 2>/dev/null || true

  WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
  echo "✅ Frontend successfully deployed to: $WEB_URL"
else
  WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "${NEXTAUTH_URL}")
fi

# Update .env file with the generated Cloud Run URLs
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
  echo "📝 Updating $ENV_FILE with deployed URLs..."
  # Replace or append WEBHOOK_BASE_URL
  if grep -q "^WEBHOOK_BASE_URL=" "$ENV_FILE"; then
    sed -i.bak "s|^WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=$API_URL|" "$ENV_FILE"
  else
    echo "WEBHOOK_BASE_URL=$API_URL" >> "$ENV_FILE"
  fi

  # Record DEPLOYED_API_URL for reference without breaking local dev NEXT_PUBLIC_API_URL
  if grep -q "^DEPLOYED_API_URL=" "$ENV_FILE"; then
    sed -i.bak "s|^DEPLOYED_API_URL=.*|DEPLOYED_API_URL=$API_URL|" "$ENV_FILE"
  else
    echo "DEPLOYED_API_URL=$API_URL" >> "$ENV_FILE"
  fi

  # Replace or append NEXTAUTH_URL
  if grep -q "^NEXTAUTH_URL=" "$ENV_FILE"; then
    sed -i.bak "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=$WEB_URL|" "$ENV_FILE"
  else
    echo "NEXTAUTH_URL=$WEB_URL" >> "$ENV_FILE"
  fi
  
  rm -f "${ENV_FILE}.bak"
  echo "✅ $ENV_FILE updated successfully."
fi

# Extract hostname for Firebase Authorized Domains
WEB_DOMAIN=$(echo "$WEB_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

# 5. Summary & Live Demo Instructions
echo "=================================================================="
echo "🎉 PROJECT ASTROPHAGE IS LIVE ON GOOGLE CLOUD!"
echo "=================================================================="
echo "🖥️  Web UI URL        : $WEB_URL"
echo "🔌 API Docs URL      : $API_URL/docs"
echo "🪣 GCS Upload Bucket : gs://$GCS_BUCKET_NAME"
echo ""
echo "🔑 FIREBASE AUTHENTICATION (Required for Google Login):"
echo "   If Google Login fails in production with unauthorized-domain:"
echo "   1. Open Firebase Console: https://console.firebase.google.com/"
echo "   2. Go to: Authentication -> Settings (or Sign-in method) -> Authorized domains"
echo "   3. Click 'Add domain' and add: $WEB_DOMAIN"
echo ""
echo "🔗 GITHUB WEBHOOK LIVE DEMO CONFIGURATION:"
echo "   In your GitHub repository (Settings -> Webhooks -> Add Webhook):"
echo "   - Payload URL: $API_URL/api/webhooks/github/push"
echo "   - Content type: application/json"
echo "   - Secret: [Your WEBHOOK_SECRET]"
echo "   - Events: Just the push event & Pull requests"
echo "=================================================================="
