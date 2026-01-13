# Google Cloud API Gateway Setup Script
# Run these commands after deploying your Cloud Run services

# Variables - UPDATE THESE
PROJECT_ID="hotel-booking-system-final"
REGION="europe-west1"
API_NAME="hotel-booking-api"
API_CONFIG_NAME="hotel-booking-config-v1"
GATEWAY_NAME="hotel-booking-gateway"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable apigateway.googleapis.com --project=$PROJECT_ID
gcloud services enable servicecontrol.googleapis.com --project=$PROJECT_ID
gcloud services enable servicemanagement.googleapis.com --project=$PROJECT_ID

# Create API
echo "Creating API..."
gcloud api-gateway apis create $API_NAME \
    --project=$PROJECT_ID

# Create API Config from OpenAPI spec
echo "Creating API Config..."
gcloud api-gateway api-configs create $API_CONFIG_NAME \
    --api=$API_NAME \
    --openapi-spec=openapi-spec.yaml \
    --project=$PROJECT_ID \
    --backend-auth-service-account=api-gateway-sa@$PROJECT_ID.iam.gserviceaccount.com

# Create Gateway
echo "Creating Gateway..."
gcloud api-gateway gateways create $GATEWAY_NAME \
    --api=$API_NAME \
    --api-config=$API_CONFIG_NAME \
    --location=$REGION \
    --project=$PROJECT_ID

# Get Gateway URL
echo "Getting Gateway URL..."
gcloud api-gateway gateways describe $GATEWAY_NAME \
    --location=$REGION \
    --project=$PROJECT_ID \
    --format="value(defaultHostname)"

echo ""
echo "API Gateway setup complete!"
echo "Your API will be available at: https://[GATEWAY_URL]"
