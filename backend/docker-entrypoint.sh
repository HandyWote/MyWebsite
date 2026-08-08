#!/bin/sh
set -eu

upload_folder="${UPLOAD_FOLDER:-uploads}"
mkdir -p "$upload_folder"
chown -R app:app "$upload_folder"

exec su-exec app "$@"
