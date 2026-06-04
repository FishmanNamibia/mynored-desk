#!/bin/bash
set -euo pipefail

: "${SUDO_PASSWORD:?SUDO_PASSWORD must be set}"
: "${SUDO_USER:=afanuel}"

printf '%s\n' "$SUDO_PASSWORD" | sudo -S sh -c "echo \"${SUDO_USER} ALL=(ALL) NOPASSWD: ALL\" > /etc/sudoers.d/${SUDO_USER} && chmod 440 /etc/sudoers.d/${SUDO_USER}"
echo "NOPASSWD configured successfully for ${SUDO_USER}"
