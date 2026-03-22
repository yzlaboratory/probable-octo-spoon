variable "domain_names" {
  description = "Domain names for the website"
  type        = list(string)
  default     = ["svthalexweiler.de", "www.svthalexweiler.de"]
}

variable "bucket_name" {
  description = "S3 bucket name for the static website"
  type        = string
  default     = "svthalexweiler-website"
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "yzlaboratory/probable-octo-spoon"
}

variable "ig_access_token" {
  description = "Instagram Graph API access token"
  type        = string
  sensitive   = true
  default     = "placeholder"
}
