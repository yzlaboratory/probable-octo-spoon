# -----------------------------------------------------------------------------
# Route53 — apex and www both point at the Elastic IP (no CloudFront).
# -----------------------------------------------------------------------------

resource "aws_route53_record" "app" {
  for_each = toset(var.domain_names)

  zone_id = data.aws_route53_zone.root.zone_id
  name    = each.value
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
