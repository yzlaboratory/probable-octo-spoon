output "s3_bucket_name" {
  value = aws_s3_bucket.website.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.instagram.api_endpoint
}

output "acm_certificate_arn" {
  value = aws_acm_certificate.website.arn
}

output "dns_validation_records" {
  description = "DNS records to create for ACM certificate validation"
  value = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
