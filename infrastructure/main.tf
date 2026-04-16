terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "svthalexweiler-terraform-state"
    key            = "website/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "svthalexweiler-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-central-1"
}

# ACM certificates must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# -----------------------------------------------------------------------------
# S3 Bucket for static website
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Lambda function for Instagram API proxy
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# Secrets Manager for Instagram token
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "ig_token" {
  name = "svthalexweiler/ig-access-token"
}

resource "aws_secretsmanager_secret_version" "ig_token" {
  secret_id     = aws_secretsmanager_secret.ig_token.id
  secret_string = var.ig_access_token

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# Instagram proxy Lambda
# -----------------------------------------------------------------------------
data "archive_file" "instagram_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda/index.mjs"
  output_path = "${path.module}/lambda/function.zip"
}

resource "aws_iam_role" "lambda" {
  name = "svthalexweiler-instagram-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_secrets" {
  name = "secrets-read"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_secretsmanager_secret.ig_token.arn
      }
    ]
  })
}

resource "aws_lambda_function" "instagram" {
  function_name    = "svthalexweiler-instagram-proxy"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  timeout          = 15
  memory_size      = 128
  filename         = data.archive_file.instagram_lambda.output_path
  source_code_hash = data.archive_file.instagram_lambda.output_base64sha256

  environment {
    variables = {
      SECRET_ID = aws_secretsmanager_secret.ig_token.name
    }
  }
}

# -----------------------------------------------------------------------------
# Token refresh Lambda (runs weekly)
# -----------------------------------------------------------------------------
data "archive_file" "refresh_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda/refresh.mjs"
  output_path = "${path.module}/lambda/refresh.zip"
}

resource "aws_iam_role" "refresh_lambda" {
  name = "svthalexweiler-token-refresh"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "refresh_lambda_basic" {
  role       = aws_iam_role.refresh_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "refresh_lambda_secrets" {
  name = "secrets-read-write"
  role = aws_iam_role.refresh_lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue"
        ]
        Resource = aws_secretsmanager_secret.ig_token.arn
      }
    ]
  })
}

resource "aws_lambda_function" "refresh" {
  function_name    = "svthalexweiler-token-refresh"
  role             = aws_iam_role.refresh_lambda.arn
  handler          = "refresh.handler"
  runtime          = "nodejs22.x"
  timeout          = 15
  memory_size      = 128
  filename         = data.archive_file.refresh_lambda.output_path
  source_code_hash = data.archive_file.refresh_lambda.output_base64sha256

  environment {
    variables = {
      SECRET_ID = aws_secretsmanager_secret.ig_token.name
    }
  }
}

# -----------------------------------------------------------------------------
# FuPa ingest Lambda
# -----------------------------------------------------------------------------
data "archive_file" "fupa_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda/fupa.mjs"
  output_path = "${path.module}/lambda/fupa.zip"
}

resource "aws_iam_role" "fupa_lambda" {
  name = "svthalexweiler-fupa-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "fupa_lambda_basic" {
  role       = aws_iam_role.fupa_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "fupa" {
  function_name    = "svthalexweiler-fupa-proxy"
  role             = aws_iam_role.fupa_lambda.arn
  handler          = "fupa.handler"
  runtime          = "nodejs22.x"
  timeout          = 15
  memory_size      = 256
  filename         = data.archive_file.fupa_lambda.output_path
  source_code_hash = data.archive_file.fupa_lambda.output_base64sha256

  environment {
    variables = {
      FUPA_TEAM_SLUG = var.fupa_team_slug
      FUPA_CLUB_SLUG = var.fupa_club_slug
    }
  }
}

# EventBridge schedule: run every 7 days
resource "aws_scheduler_schedule" "token_refresh" {
  name       = "svthalexweiler-token-refresh"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = "rate(7 days)"

  target {
    arn      = aws_lambda_function.refresh.arn
    role_arn = aws_iam_role.scheduler.arn
  }
}

resource "aws_iam_role" "scheduler" {
  name = "svthalexweiler-scheduler"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "scheduler.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "invoke-refresh-lambda"
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.refresh.arn
      }
    ]
  })
}

# API Gateway HTTP API to expose the Lambda
resource "aws_apigatewayv2_api" "instagram" {
  name          = "svthalexweiler-instagram-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "instagram" {
  api_id                 = aws_apigatewayv2_api.instagram.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.instagram.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "instagram" {
  api_id    = aws_apigatewayv2_api.instagram.id
  route_key = "GET /api/instagram"
  target    = "integrations/${aws_apigatewayv2_integration.instagram.id}"
}

resource "aws_apigatewayv2_integration" "fupa" {
  api_id                 = aws_apigatewayv2_api.instagram.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fupa.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "fupa_standings" {
  api_id    = aws_apigatewayv2_api.instagram.id
  route_key = "GET /api/fupa/standings"
  target    = "integrations/${aws_apigatewayv2_integration.fupa.id}"
}

resource "aws_apigatewayv2_route" "fupa_fixtures" {
  api_id    = aws_apigatewayv2_api.instagram.id
  route_key = "GET /api/fupa/fixtures"
  target    = "integrations/${aws_apigatewayv2_integration.fupa.id}"
}

resource "aws_lambda_permission" "apigw_fupa" {
  statement_id  = "AllowAPIGatewayInvokeFupa"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fupa.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.instagram.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.instagram.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instagram.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.instagram.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# ACM Certificate (must be us-east-1 for CloudFront)
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "website" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_names[0]
  subject_alternative_names = slice(var.domain_names, 1, length(var.domain_names))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "svthalexweiler-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


locals {
  s3_origin_id     = "S3Website"
  lambda_origin_id = "LambdaAPI"
  # API Gateway URL is like https://xxx.execute-api.eu-central-1.amazonaws.com
  lambda_domain = replace(replace(aws_apigatewayv2_api.instagram.api_endpoint, "https://", ""), "/", "")
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = var.domain_names
  price_class         = "PriceClass_100" # Europe + North America

  # S3 origin for static files
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # API Gateway origin for /api/*
  origin {
    domain_name = local.lambda_domain
    origin_id   = local.lambda_origin_id
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior: serve from S3
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # /api/* behavior: proxy to Lambda
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.lambda_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 300  # 5 minute cache for API
    max_ttl     = 600
  }

  # SPA fallback: return index.html for 403/404 (client-side routing)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# -----------------------------------------------------------------------------
# IAM Role for GitHub Actions OIDC
# -----------------------------------------------------------------------------
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["ffffffffffffffffffffffffffffffffffffffff"]
}

resource "aws_iam_role" "github_deploy" {
  name = "svthalexweiler-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "deploy-policy"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.website.arn,
          "${aws_s3_bucket.website.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.website.arn
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode"
        ]
        Resource = [
          aws_lambda_function.instagram.arn,
          aws_lambda_function.fupa.arn,
        ]
      }
    ]
  })
}
