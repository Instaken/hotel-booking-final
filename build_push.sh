#!/bin/bash

PROJECT_ID="hotel-booking-system-final"
REGION="europe-west3"
GCR_HOST="gcr.io"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Hotel Booking - Docker Build & Push to GCR${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\n${YELLOW}Setting GCloud project...${NC}"
gcloud config set project ${PROJECT_ID}

echo -e "\n${YELLOW}Configuring Docker authentication for GCR...${NC}"
gcloud auth configure-docker ${GCR_HOST} --quiet

echo -e "\n${GREEN}Building ML Service...${NC}"
cd backend/ml-service
docker buildx build --platform linux/amd64 -t ${GCR_HOST}/${PROJECT_ID}/ml-service:latest --push .
echo -e "${GREEN}✓ ML Service pushed${NC}"
cd ../..

echo -e "\n${GREEN}Building Admin Service...${NC}"
cd backend/admin-service
docker buildx build --platform linux/amd64 -t ${GCR_HOST}/${PROJECT_ID}/admin-service:latest --push .
echo -e "${GREEN}✓ Admin Service pushed${NC}"
cd ../..

echo -e "\n${GREEN}Building Client Service...${NC}"
cd backend/client-service
docker buildx build --platform linux/amd64 -t ${GCR_HOST}/${PROJECT_ID}/client-service:latest --push .
echo -e "${GREEN}✓ Client Service pushed${NC}"
cd ../..

echo -e "\n${GREEN}Building Notification Service...${NC}"
cd backend/notification-service
docker buildx build --platform linux/amd64 -t ${GCR_HOST}/${PROJECT_ID}/notification-service:latest --push .
echo -e "${GREEN}✓ Notification Service pushed${NC}"
cd ../..

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Build & Push Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Pushed Images:${NC}"
echo -e "  • ${GCR_HOST}/${PROJECT_ID}/ml-service:latest"
echo -e "  • ${GCR_HOST}/${PROJECT_ID}/admin-service:latest"
echo -e "  • ${GCR_HOST}/${PROJECT_ID}/client-service:latest"
echo -e "  • ${GCR_HOST}/${PROJECT_ID}/notification-service:latest"
echo ""
echo -e "${YELLOW}Next Step:${NC}"
echo -e "  Cloud Console'dan Cloud Run deploy işlemini manuel olarak yapabilirsiniz."
echo -e "  Region: ${REGION}"
echo ""