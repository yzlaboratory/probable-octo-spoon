variable "root_domain" {
  description = "Apex domain the hosted zone is registered under"
  type        = string
  default     = "svthalexweiler.de"
}

variable "domain_names" {
  description = "All hostnames that should resolve to the EC2 instance"
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
