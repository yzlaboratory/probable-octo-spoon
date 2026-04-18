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

  default_tags {
    tags = {
      Project = "svthalexweiler"
      Managed = "terraform"
    }
  }
}

# Alias kept alive only so Terraform can manage the orphaned ACM cert in
# us-east-1 (tied to the legacy CloudFront distribution). The final cleanup
# apply in RUNBOOK §1 Stage C destroys both; remove this alias after.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project = "svthalexweiler"
      Managed = "terraform"
    }
  }
}

data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
