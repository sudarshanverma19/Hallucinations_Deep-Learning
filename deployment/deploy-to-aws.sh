#!/bin/bash

# AWS ECS Deployment Script for CIFAR-10 DeepDream App
# Make sure to configure AWS CLI before running this script

set -e

# Configuration
APP_NAME="cifar10-deepdream"
ECR_REPOSITORY="${APP_NAME}"
CLUSTER_NAME="${APP_NAME}-cluster"
SERVICE_NAME="${APP_NAME}-service"
TASK_DEFINITION="${APP_NAME}-task"
AWS_REGION="us-east-1"  # Change to your preferred region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting deployment of ${APP_NAME}..."
echo "AWS Account ID: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"

# Step 1: Create ECR repository if it doesn't exist
echo "📦 Creating ECR repository..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} 2>/dev/null || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}

# Step 2: Get ECR login token
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 3: Build Docker image
echo "🔨 Building Docker image..."
docker build -t ${APP_NAME} .

# Step 4: Tag image for ECR
echo "🏷️ Tagging image..."
docker tag ${APP_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest

# Step 5: Push image to ECR
echo "📤 Pushing image to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest

# Step 6: Create ECS cluster if it doesn't exist
echo "🎯 Creating ECS cluster..."
aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${AWS_REGION} 2>/dev/null || \
aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${AWS_REGION}

# Step 7: Register task definition
echo "📋 Registering task definition..."
aws ecs register-task-definition \
    --cli-input-json file://deployment/task-definition.json \
    --region ${AWS_REGION}

# Step 8: Create or update ECS service
echo "🔄 Creating/updating ECS service..."
aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} 2>/dev/null && \
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --task-definition ${TASK_DEFINITION} \
    --region ${AWS_REGION} || \
aws ecs create-service \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --task-definition ${TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
    --region ${AWS_REGION}

echo "✅ Deployment completed!"
echo "🔗 Check your ECS console for service status: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${CLUSTER_NAME}/services"