#script principal de despliegue de la infraestructura y la aplicación

[CmdletBinding()]
param(
  [string]$Region = $env:AWS_REGION,
  [string]$StackPrefix = $(if ($env:STACK_PREFIX) { $env:STACK_PREFIX } else { 'portal-equipo' }),
  [string]$ApiImageUri = $env:API_IMAGE_URI,
  [string]$EcrRegistryUri = $env:ECR_REGISTRY_URI,
  [string]$AmiId = $env:AMI_ID,
  [string]$SubnetId = $env:SUBNET_ID,
  [string]$SecurityGroupId = $env:SECURITY_GROUP_ID,
  [string]$DatabaseUrlParameter = $(if ($env:DATABASE_URL_PARAMETER) { $env:DATABASE_URL_PARAMETER } else { '/portal/DATABASE_URL' }),
  [string]$JwtSecretParameter = $(if ($env:JWT_SECRET_PARAMETER) { $env:JWT_SECRET_PARAMETER } else { '/portal/JWT_SECRET' }),
  [string]$InstanceType = $(if ($env:INSTANCE_TYPE) { $env:INSTANCE_TYPE } else { 't3.micro' })
)
$ErrorActionPreference = 'Stop'
if (-not $Region) { throw 'Define AWS_REGION o pasa -Region.' }
if (-not $ApiImageUri -or -not $AmiId -or -not $SubnetId -or -not $SecurityGroupId) {
  throw 'Define API_IMAGE_URI, AMI_ID, SUBNET_ID y SECURITY_GROUP_ID.'
}
$root = Split-Path -Parent $PSScriptRoot
$samStack = "$StackPrefix-metrics"
$apiStack = "$StackPrefix-api"
$frontendStack = "$StackPrefix-frontend"
sam build --template-file "$root/infra/sam/template.yaml" --build-dir "$root/.aws-sam"
sam deploy --template-file "$root/.aws-sam/build/template.yaml" --stack-name $samStack --region $Region --capabilities CAPABILITY_IAM --resolve-s3 --parameter-overrides "DatabaseUrl=$DatabaseUrlParameter"
aws cloudformation deploy --template-file "$root/infra/cloudformation/api-ec2.yaml" --stack-name $apiStack --region $Region --capabilities CAPABILITY_IAM --parameter-overrides "AmiId=$AmiId" "InstanceType=$InstanceType" "SubnetId=$SubnetId" "SecurityGroupId=$SecurityGroupId" "ApiImageUri=$ApiImageUri" "EcrRegistryUri=$EcrRegistryUri" "DatabaseUrlParameter=$DatabaseUrlParameter" "JwtSecretParameter=$JwtSecretParameter"
aws cloudformation deploy --template-file "$root/infra/cloudformation/frontend.yaml" --stack-name $frontendStack --region $Region
$bucket = aws cloudformation describe-stacks --stack-name $frontendStack --region $Region --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' --output text
npm run build -w apps/web
aws s3 sync "$root/apps/web/dist" "s3://$bucket" --delete --region $Region
$distributionId = aws cloudformation describe-stacks --stack-name $frontendStack --region $Region --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text
aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*'