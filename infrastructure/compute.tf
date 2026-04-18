# -----------------------------------------------------------------------------
# Single EC2 + EBS + Traefik topology (ADR 0008).
# -----------------------------------------------------------------------------

resource "aws_security_group" "app" {
  name        = "svthalexweiler-app"
  description = "Ingress 80/443 from the internet; SSH closed, SSM only"

  ingress {
    description      = "HTTP"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = "HTTPS"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    description      = "Egress all"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# Instance profile — IAM role the EC2 assumes. SSM-managed-instance policy
# enables `aws ssm send-command` and Session Manager without opening port 22.
resource "aws_iam_role" "ec2_app" {
  name = "svthalexweiler-ec2-app"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_app_ssm" {
  role       = aws_iam_role.ec2_app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Inline policy: read the IG secret (so the app can bootstrap the token),
# read/write the SQLite backup bucket (weekly cron uploads snapshots).
resource "aws_iam_role_policy" "ec2_app_inline" {
  name = "app-runtime"
  role = aws_iam_role.ec2_app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_secretsmanager_secret.ig_token.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.sqlite_backups.arn,
          "${aws_s3_bucket.sqlite_backups.arn}/*",
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_app" {
  name = "svthalexweiler-ec2-app"
  role = aws_iam_role.ec2_app.name
}

# Data volume — separate from the root volume so we can re-image the instance
# (AMI upgrade, kernel replacement) without losing the SQLite file or uploaded
# media. Mounted at /var/lib/clubsoft by cloud-init.
resource "aws_ebs_volume" "app_data" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.app_data_volume_size_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "svthalexweiler-app-data"
  }

  lifecycle {
    # Never destroy the data volume as a side effect of config changes.
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "app_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.app_data.id
  instance_id = aws_instance.app.id

  # Detach cleanly on instance replacement so Terraform can reattach to the
  # successor rather than blocking on a volume-in-use error.
  stop_instance_before_detaching = true
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023_arm64.id
  instance_type               = var.instance_type
  availability_zone           = data.aws_availability_zones.available.names[0]
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_app.name
  associate_public_ip_address = true

  user_data = file("${path.module}/user-data.sh.tpl")

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size_gb
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 only.
    http_endpoint = "enabled"
  }

  tags = {
    Name = "svthalexweiler-app"
  }

  lifecycle {
    # user_data updates force a replace; treat explicitly.
    ignore_changes = [user_data]
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "svthalexweiler-app"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
