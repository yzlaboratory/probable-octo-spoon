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

data "aws_route53_zone" "root" {
  name         = "${var.root_domain}."
  private_zone = false
}

data "aws_availability_zones" "available" {
  state = "available"
}
