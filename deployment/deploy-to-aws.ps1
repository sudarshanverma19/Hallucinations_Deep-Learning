# PowerShell script for Windows deployment to AWS ECS
# Make sure to configure AWS CLI before running this script

param(
    [string]$Region = "us-east-1",
    [string]$AppName = "cifar10-deepdream"
)

$ErrorActionPreference = "Stop"

# Configuration
$ECR_REPOSITORY = $AppName
$CLUSTER_NAME = "${AppName}-cluster"
$SERVICE_NAME = "${AppName}-service"
$TASK_DEFINITION = "${AppName}-task"
$AWS_REGION = $Region

Write-Host "🚀 Starting deployment of $AppName..." -ForegroundColor Green
Write-Host "Region: $AWS_REGION" -ForegroundColor Cyan

# Get AWS Account ID
try {
    $AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
    Write-Host "AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get AWS Account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

# Step 1: Create ECR repository if it doesn't exist
Write-Host "📦 Creating ECR repository..." -ForegroundColor Yellow
try {
    aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>$null
    Write-Host "✅ ECR repository already exists" -ForegroundColor Green
} catch {
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
    Write-Host "✅ ECR repository created" -ForegroundColor Green
}

# Step 2: Get ECR login token
Write-Host "🔐 Logging in to ECR..." -ForegroundColor Yellow
$loginCommand = aws ecr get-login-password --region $AWS_REGION
$loginCommand | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Step 3: Build Docker image
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
docker build -t $AppName .

# Step 4: Tag image for ECR
Write-Host "🏷️ Tagging image..." -ForegroundColor Yellow
docker tag "${AppName}:latest" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest"

# Step 5: Push image to ECR
Write-Host "📤 Pushing image to ECR..." -ForegroundColor Yellow
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest"

# Step 6: Update task definition with actual account ID
Write-Host "📋 Updating task definition..." -ForegroundColor Yellow
$taskDefContent = Get-Content "deployment/task-definition.json" -Raw
$taskDefContent = $taskDefContent.Replace("YOUR_ACCOUNT_ID", $AWS_ACCOUNT_ID)
$taskDefContent = $taskDefContent.Replace("us-east-1", $AWS_REGION)
$taskDefContent | Set-Content "deployment/task-definition-updated.json"

# Step 7: Create ECS cluster if it doesn't exist
Write-Host "🎯 Creating ECS cluster..." -ForegroundColor Yellow
try {
    aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION 2>$null
    Write-Host "✅ ECS cluster already exists" -ForegroundColor Green
} catch {
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
    Write-Host "✅ ECS cluster created" -ForegroundColor Green
}

# Step 8: Register task definition
Write-Host "📋 Registering task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://deployment/task-definition-updated.json --region $AWS_REGION

Write-Host "✅ Deployment preparation completed!" -ForegroundColor Green
Write-Host "🔗 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure VPC, subnets, and security groups in AWS Console" -ForegroundColor White
Write-Host "2. Create ECS service manually or update the script with your network configuration" -ForegroundColor White
Write-Host "3. Check ECS console: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION" -ForegroundColor White