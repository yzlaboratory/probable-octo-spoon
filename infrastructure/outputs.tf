output "app_instance_id" {
  description = "EC2 instance ID used by ssm:SendCommand in the deploy workflow"
  value       = aws_instance.app.id
}

output "app_public_ip" {
  description = "Elastic IP that the Porkbun A records for svthalexweiler.de + www point at"
  value       = aws_eip.app.public_ip
}

output "github_deploy_role_arn" {
  description = "Role the GitHub Actions deploy job assumes via OIDC"
  value       = aws_iam_role.github_deploy.arn
}

output "sqlite_backup_bucket" {
  description = "S3 bucket the on-host weekly backup cron writes to"
  value       = aws_s3_bucket.sqlite_backups.id
}

output "ig_token_secret_name" {
  description = "Name of the Secrets Manager secret the app reads for the IG token"
  value       = aws_secretsmanager_secret.ig_token.name
}
