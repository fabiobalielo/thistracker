#!/bin/bash

# Local deployment script for Cloud Run
# This script builds and deploys the app locally for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="thistracker"
SERVICE_NAME="thistracker"
REGION="us-central1"

echo -e "${BLUE}🚀 Deploying ThisTracker to Cloud Run${NC}"
echo "====================================="
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first:${NC}"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated with gcloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Get current commit hash for tagging
COMMIT_HASH=$(git rev-parse --short HEAD)
TAG="${COMMIT_HASH}-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}📦 Building Docker image...${NC}"
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$TAG .

echo -e "${BLUE}📤 Pushing image to Container Registry...${NC}"
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$TAG

echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo "Service URL: $SERVICE_URL"
echo "Image tag: $TAG"
echo ""

# Optional: Open the service in browser
read -p "Would you like to open the service in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open $SERVICE_URL
fi
