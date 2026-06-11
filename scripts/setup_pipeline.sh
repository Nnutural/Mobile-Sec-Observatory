#!/usr/bin/env bash
set -euo pipefail

python3 -m venv pipeline/.venv && source pipeline/.venv/bin/activate && pip install -r pipeline/requirements.txt
