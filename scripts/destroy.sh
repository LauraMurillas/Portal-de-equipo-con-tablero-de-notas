#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:?Define AWS_REGION}"
STACK_PREFIX="${STACK_PREFIX:-portal-equipo}"
BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' --output text 2>/dev/null || true)"
if [[ -n "$BUCKET" && "$BUCKET" != "None" ]]; then aws s3 rm "s3://$BUCKET" --recursive --region "$AWS_REGION"; fi
aws cloudformation delete-stack --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_PREFIX-frontend" --region "$AWS_REGION"
aws cloudformation delete-stack --stack-name "$STACK_PREFIX-api" --region "$AWS_REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_PREFIX-api" --region "$AWS_REGION"
aws cloudformation delete-stack --stack-name "$STACK_PREFIX-metrics" --region "$AWS_REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_PREFIX-metrics" --region "$AWS_REGION"