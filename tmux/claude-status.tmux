# tmux side of claude-code-tmux-status (the tmux-status Claude Code mod).
#
# The mod sets the window option @claude_state to working, waiting or done.
# @claude_status turns that into a coloured glyph; put #{E:@claude_status}
# anywhere in a window-status format. "done" shows only on windows you are
# not looking at, so a finished background window stands out until you visit
# it (the next prompt clears it).
#
# Source this AFTER your theme, since most themes overwrite window-status-format:
#   source-file /path/to/claude-code-tmux-status/tmux/claude-status.tmux
#   or with tpm: set -g @plugin 'XavierYounan/claude-code-tmux-status'

set -g @claude_icon_working "#[fg=#f9e2af]●#[fg=default]"
set -g @claude_icon_waiting "#[fg=#f38ba8,bold]●#[fg=default,nobold]"
set -g @claude_icon_done    "#[fg=#a6e3a1]✓#[fg=default]"

set -g @claude_status "#{?#{==:#{@claude_state},working}, #{E:@claude_icon_working},#{?#{==:#{@claude_state},waiting}, #{E:@claude_icon_waiting},#{?#{&&:#{==:#{@claude_state},done},#{!=:#{window_active},1}}, #{E:@claude_icon_done},}}}"

# Prefix the glyph to every window tab (once, so re-sourcing is safe).
# Comment these out if you place #{E:@claude_status} in your own formats.
if -F "#{m:*@claude_status*,#{window-status-format}}" "" \
  "set -gF window-status-format '##{E:@claude_status}#{window-status-format}'"
if -F "#{m:*@claude_status*,#{window-status-current-format}}" "" \
  "set -gF window-status-current-format '##{E:@claude_status}#{window-status-current-format}'"
