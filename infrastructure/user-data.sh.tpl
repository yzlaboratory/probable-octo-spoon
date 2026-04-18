#!/bin/bash
# cloud-init bootstrap for the clubsoft app host (ADR 0008).
# Keeps responsibilities minimal: install Docker, mount the data volume,
# prepare /opt/clubsoft. The deploy workflow ships the code and starts the app.
set -euxo pipefail

# --- System packages ---------------------------------------------------------
dnf -y update
dnf -y install docker git jq
systemctl enable --now docker

# Docker Compose v2 plugin (AL2023 has no official package yet).
COMPOSE_VERSION="v2.29.7"
mkdir -p /usr/libexec/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose

# SSM agent is preinstalled on AL2023; just ensure it is enabled.
systemctl enable --now amazon-ssm-agent

# --- Data volume -------------------------------------------------------------
# The attached EBS volume shows up as /dev/nvme1n1 on Nitro instances.
DATA_DEV=""
for candidate in /dev/nvme1n1 /dev/xvdf /dev/sdf; do
  if [ -b "$candidate" ]; then
    DATA_DEV="$candidate"
    break
  fi
done

if [ -z "$DATA_DEV" ]; then
  echo "no data volume found" >&2
  exit 1
fi

if ! blkid "$DATA_DEV"; then
  mkfs.ext4 -L clubsoft-data "$DATA_DEV"
fi

mkdir -p /var/lib/clubsoft
grep -q "LABEL=clubsoft-data" /etc/fstab || \
  echo "LABEL=clubsoft-data /var/lib/clubsoft ext4 defaults,nofail,x-systemd.device-timeout=5 0 2" >> /etc/fstab
mount -a
mkdir -p /var/lib/clubsoft/media
chown -R ec2-user:ec2-user /var/lib/clubsoft

# --- App checkout area -------------------------------------------------------
install -d -o ec2-user -g ec2-user /opt/clubsoft
usermod -aG docker ec2-user

# --- Unattended security upgrades -------------------------------------------
dnf -y install dnf-automatic
sed -i 's/^apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer
