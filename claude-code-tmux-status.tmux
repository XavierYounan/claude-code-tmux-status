#!/usr/bin/env bash
# tpm entry point: tpm runs every executable *.tmux file at a plugin's root.
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmux source-file "$CURRENT_DIR/tmux/claude-status.tmux"
