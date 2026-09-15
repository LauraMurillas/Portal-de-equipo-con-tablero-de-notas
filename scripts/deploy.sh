#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:?Define AWS_REGION}"
: "${API_IMAGE_URI:?Define API_IMAGE_URI}"
: "${AMI_ID:?Define AMI_ID}"
: "${SUBNET_ID:?Define SUBNET_ID}"
: "${SECURITY_GROUP_ID:?Define SECURITY_GROUP_ID}"
ECR_REGISTRY_URI="${ECR_REGISTRY_URI:-}"
STACK_PREFIX="${STACK_PREFIX:-portal-equipo}"
DATABASE_URL_PARAMETER="${DATABASE_URL_PARAMETER:-/portal/DATABASE_URL}"
JWT_SECRET_PARAMETER="${JWT_SECRET_PARAMETER:-/portal/JWT_SECRET}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sam build --template-file "$ROOT/infra/sam/template.yaml" --build-dir "$ROOT/.aws-sam"
sam deploy --template-file "$ROOT/.aws-sam/build/template.yaml" --stack-name "$STACK_PREFIX-metrics" --region "$AWS_REGION" --capabilities CAPABILITY_IAM --resolve-s3 --parameter-overrides "DatabaseUrl=$DATABASE_URL_PARAMETER"
aws cloudformation deploy --template-file "$ROOT/infra/cloudformation/api-ec2.yaml" --stack-name "$STACK_PREFIX-api" --region "$AWS_REGION" --capabilities CAPABILITY_IAM --parameter-overrides "AmiId=$AMI_ID" "InstanceType=$INSTANCE_TYPE" "SubnetId=$SUBNET_ID" "SecurityGroupId=$SECURITY_GROUP_ID" "ApiImageUri=$API_IMAGE_URI" "EcrRegistryUri=$ECR_REGISTRY_URI" "DatabaseUrlParameter=$DATABASE_URL_PARAMETER" "JwtSecretParameter=$JWT_SECRET_PARAMETER"
aws cloudformation deploy --template-file "$ROOT/infra/cloudformation/frontend.yaml" --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION"
BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' --output text)"
npm run build -w apps/web
aws s3 sync "$ROOT/apps/web/dist" "s3://$BUCKET" --delete --region "$AWS_REGION"
DIST_ID="$(aws cloudformation describe-stacks --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'