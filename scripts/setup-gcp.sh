#!/bin/bash

# Setup script for Google Cloud Platform and Cloud Run
# This script sets up the necessary GCP resources for deploying the app

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
SERVICE_ACCOUNT_NAME="thistracker-deploy"

echo -e "${BLUE}🚀 Setting up Google Cloud Platform for ThisTracker${NC}"
echo "=================================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first:${NC}"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ gcloud CLI is installed and authenticated${NC}"

# Set the project
echo -e "${BLUE}📋 Setting project to $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable iam.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create service account for GitHub Actions
echo -e "${BLUE}👤 Creating service account for GitHub Actions...${NC}"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="ThisTracker Deploy Service Account" \
    --description="Service account for GitHub Actions to deploy to Cloud Run"

# Grant necessary permissions
echo -e "${BLUE}🔑 Granting permissions to service account...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download service account key
echo -e "${BLUE}🔐 Creating service account key...${NC}"
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${GREEN}✅ Service account key created: ./service-account-key.json${NC}"

# Create GitHub secrets instructions
echo ""
echo -e "${YELLOW}📝 Next Steps - GitHub Secrets:${NC}"
echo "=================================="
echo ""
echo "1. Go to your GitHub repository settings"
echo "2. Navigate to Secrets and Variables > Actions"
echo "3. Add these secrets:"
echo ""
echo -e "${BLUE}GCP_PROJECT_ID:${NC} $PROJECT_ID"
echo -e "${BLUE}GCP_SA_KEY:${NC} (Copy the contents of service-account-key.json)"
echo ""
echo "To copy the service account key:"
echo "cat ./service-account-key.json | pbcopy"
echo ""

# Test deployment
echo -e "${BLUE}🧪 Testing Cloud Run deployment...${NC}"
echo "Building and deploying to test the setup..."

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:test .

# Push the image
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:test

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME:test \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10

echo -e "${GREEN}✅ Test deployment completed!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo "Your app is now available at: $SERVICE_URL"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "1. Add the GitHub secrets as shown above"
echo "2. Set up your environment variables in Cloud Run"
echo "3. Configure your domain (optional)"
echo "4. Delete the service-account-key.json file after adding it to GitHub secrets"
