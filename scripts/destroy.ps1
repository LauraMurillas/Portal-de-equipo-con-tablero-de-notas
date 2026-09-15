[CmdletBinding()]
param(
  [string]$Region = $env:AWS_REGION,
  [string]$StackPrefix = $(if ($env:STACK_PREFIX) { $env:STACK_PREFIX } else { 'portal-equipo' })
)
$ErrorActionPreference = 'Stop'
if (-not $Region) { throw 'Define AWS_REGION o pasa -Region.' }
$frontendStack = "$StackPrefix-frontend"
$bucket = aws cloudformation describe-stacks --stack-name $frontendStack --region $Region --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' --output text 2>$null
if ($bucket -and $bucket -ne 'None') { aws s3 rm "s3://$bucket" --recursive --region $Region }
aws cloudformation delete-stack --stack-name $frontendStack --region $Region
aws cloudformation wait stack-delete-complete --stack-name $frontendStack --region $Region
aws cloudformation delete-stack --stack-name "$StackPrefix-api" --region $Region
aws cloudformation wait stack-delete-complete --stack-name "$StackPrefix-api" --region $Region
aws cloudformation delete-stack --stack-name "$StackPrefix-metrics" --region $Region
aws cloudformation wait stack-delete-complete --stack-name "$StackPrefix-metrics" --region $Region