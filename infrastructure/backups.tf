# -----------------------------------------------------------------------------
# ADR 0007 — weekly SQLite snapshots into S3 with 12-week lifecycle.
# ADR 0008 — daily EBS snapshots via Data Lifecycle Manager as secondary
# safety net covering the whole data volume (incl. uploaded media).
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "sqlite_backups" {
  bucket = var.backup_bucket_name
}

resource "aws_s3_bucket_public_access_block" "sqlite_backups" {
  bucket                  = aws_s3_bucket.sqlite_backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sqlite_backups" {
  bucket = aws_s3_bucket.sqlite_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "sqlite_backups" {
  bucket = aws_s3_bucket.sqlite_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "sqlite_backups" {
  bucket = aws_s3_bucket.sqlite_backups.id

  rule {
    id     = "expire-old-snapshots"
    status = "Enabled"

    filter {}

    # ADR 0007: retain 12 weekly snapshots, then expire.
    expiration {
      days = 7 * 12
    }

    noncurrent_version_expiration {
      noncurrent_days = 7 * 12
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# -----------------------------------------------------------------------------
# Data Lifecycle Manager — daily EBS snapshots, retain 7.
# -----------------------------------------------------------------------------

resource "aws_iam_role" "dlm" {
  name = "svthalexweiler-dlm"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "app_data_daily" {
  description        = "Daily snapshot of the clubsoft app data volume"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      Name = "svthalexweiler-app-data"
    }

    schedule {
      name = "daily-7d"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        count = 7
      }

      tags_to_add = {
        SnapshotCreator = "dlm"
      }

      copy_tags = true
    }
  }
}
