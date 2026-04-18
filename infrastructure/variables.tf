# DNS records are managed at the registrar (Porkbun), not Route53 — the
# svthalexweiler.de zone does not live in this account. The `domain_names`
# list would have been used by the removed `aws_route53_record` resources;
# keeping it documented here makes the Porkbun cutover checklist explicit.
variable "domain_names" {
  description = "Hostnames that must be pointed at aws_eip.app at the Porkbun DNS panel"
  type        = list(string)
  default     = ["svthalexweiler.de", "www.svthalexweiler.de"]
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "yzlaboratory/probable-octo-spoon"
}

variable "ig_access_token" {
  description = "Instagram Graph API access token (rotated by the refresh Lambda)"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "instance_type" {
  description = "EC2 instance type for the app host"
  type        = string
  default     = "t4g.small"
}

variable "app_data_volume_size_gb" {
  description = "Size in GB of the EBS data volume mounted at /var/lib/clubsoft"
  type        = number
  default     = 20
}

variable "root_volume_size_gb" {
  description = "Size in GB of the root EBS volume"
  type        = number
  default     = 16
}

variable "backup_bucket_name" {
  description = "S3 bucket name for SQLite weekly snapshots (ADR 0007)"
  type        = string
  default     = "svthalexweiler-sqlite-backups"
}
