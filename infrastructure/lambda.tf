# -----------------------------------------------------------------------------
# Instagram token refresh — the only Lambda that survives ADR 0008. Runs on a
# weekly EventBridge schedule and rotates the long-lived IG token in Secrets
# Manager. The Express app on the EC2 reads the refreshed secret at request
# time and proxies the Graph API directly (no API Gateway, no proxy Lambda).
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
