# AWS Infrastructure Setup Guide

This guide will help you deploy your CIFAR-10 DeepDream application to AWS using ECS (Elastic Container Service) with Fargate.

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   ```
   You'll need:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
   - Output format (json)

2. **Docker installed**
   - Docker Desktop for Windows

3. **AWS Account with appropriate permissions**
   - ECS permissions
   - ECR permissions
   - IAM permissions for roles

## Step-by-Step Deployment

### 1. Set up IAM Roles

Create two IAM roles in the AWS Console:

#### ECS Task Execution Role
- Role name: `ecsTaskExecutionRole`
- Attach policy: `AmazonECSTaskExecutionRolePolicy`

#### ECS Task Role (optional, for additional AWS services)
- Role name: `ecsTaskRole`
- Attach policies as needed for your application

### 2. Set up VPC and Security Groups

1. **VPC**: Use default VPC or create a new one
2. **Subnets**: Ensure you have public subnets for Fargate
3. **Security Group**: Create a security group that allows:
   - Inbound: Port 8000 (HTTP) from 0.0.0.0/0
   - Outbound: All traffic

### 3. Update Configuration Files

1. **Update task-definition.json**:
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID
   - Update region if not using us-east-1
   - Update role ARNs with your actual role ARNs

2. **Update deploy scripts** (if needed):
   - Change region in deployment scripts
   - Update subnet IDs and security group IDs

### 4. Deploy the Application

#### Option A: Using PowerShell (Windows)
```powershell
cd c:\Users\Sud\Desktop\cifar10-app
.\deployment\deploy-to-aws.ps1 -Region "us-east-1"
```

#### Option B: Using Bash (if you have WSL/Git Bash)
```bash
cd /c/Users/Sud/Desktop/cifar10-app
chmod +x deployment/deploy-to-aws.sh
./deployment/deploy-to-aws.sh
```

### 5. Create ECS Service

After running the deployment script, create the ECS service:

```bash
aws ecs create-service \
    --cluster cifar10-deepdream-cluster \
    --service-name cifar10-deepdream-service \
    --task-definition cifar10-deepdream-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
    --region us-east-1
```

Replace:
- `subnet-xxxxxxxx` with your public subnet ID
- `sg-xxxxxxxx` with your security group ID

### 6. Access Your Application

1. Go to AWS ECS Console
2. Find your cluster: `cifar10-deepdream-cluster`
3. Click on the service: `cifar10-deepdream-service`
4. Go to "Tasks" tab and click on the running task
5. Find the public IP address
6. Access your app at: `http://PUBLIC_IP:8000`

## Alternative Deployment Options

### AWS App Runner (Simpler)
For a simpler deployment without managing ECS:

1. Push your image to ECR using the deployment script
2. Go to AWS App Runner console
3. Create a new service
4. Choose "Container registry" as source
5. Select your ECR image
6. Configure service settings (port 8000)
7. Deploy

### AWS Elastic Beanstalk with Docker
1. Create a `Dockerrun.aws.json` file
2. Deploy using Elastic Beanstalk console or CLI

## Monitoring and Logs

- **CloudWatch Logs**: Check `/ecs/cifar10-deepdream` log group
- **ECS Console**: Monitor service health and task status
- **CloudWatch Metrics**: Monitor CPU, memory usage

## Cost Optimization

- Use Fargate Spot for cost savings
- Set up auto-scaling based on CPU/memory usage
- Consider using smaller instance sizes if performance allows

## Troubleshooting

1. **Task keeps stopping**: Check CloudWatch logs for errors
2. **Can't access the app**: Verify security group allows port 8000
3. **Image pull errors**: Ensure ECR permissions are correct
4. **Health check failures**: Verify the /health endpoint works locally

## Security Best Practices

1. Use HTTPS in production (Application Load Balancer + SSL certificate)
2. Implement proper IAM roles with minimal permissions
3. Use AWS Secrets Manager for sensitive configuration
4. Enable VPC Flow Logs for network monitoring