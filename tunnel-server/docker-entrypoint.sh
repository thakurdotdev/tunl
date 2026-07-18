#!/bin/sh
set -e

HOST_KEY_DIR="${HOST_KEY_DIR:-/data/ssh}"
HOST_KEY_PATH="${HOST_KEY_DIR}/ssh_host_ed25519_key"

mkdir -p "$HOST_KEY_DIR"

if [ ! -f "$HOST_KEY_PATH" ]; then
    echo "Generating persistent SSH host key..."
    ssh-keygen -t ed25519 -f "$HOST_KEY_PATH" -N ""
fi

export SSH_HOST_KEY_PATH="$HOST_KEY_PATH"
exec /usr/local/bin/tunneld "$@"
