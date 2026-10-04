import type { EngineInterface, Register } from 'claude-code'

// What the window option @claude_state holds. Unset means no Claude session
// in that window (or one that has not started a turn yet).
export type State = 'working' | 'waiting' | 'done'

const OPTION = '@claude_state'

type $ = EngineInterface

// The pane this Claude Code runs in; undefined outside tmux, where every hook
// below does nothing.
const paneOf = ($: $) => $.env.get('TMUX_PANE')

const tmux = ($: $, ...argv: string[]) => $.process.run(['tmux', ...argv], { timeoutMs: 2000 })

async function setState($: $, state: State | undefined) {
  const pane = await paneOf($)
  if (pane === undefined) return
  await (state === undefined
    ? tmux($, 'set-option', '-wqu', '-t', pane, OPTION)
    : tmux($, 'set-option', '-wq', '-t', pane, OPTION, state))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await setState($, undefined)
    return started
  })

  on('session.end', async ($, e, next) => {
    await setState($, undefined)
    return next(e)
  })

  // Main-loop turns only: a subagent's run raises no turn.start, and its
  // turn.complete carries an agentId.
  on('turn.start', async ($, e, next) => {
    await setState($, 'working')
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) await setState($, 'done')
    return done
  })

  // Blocked on the person: a permission dialog, an MCP elicitation, or a
  // question the model asked. Answering it resumes the turn.
  on('classic.PermissionRequest', async ($, e, next) => {
    await setState($, 'waiting')
    return next(e)
  })
  on('classic.Elicitation', async ($, e, next) => {
    await setState($, 'waiting')
    return next(e)
  })
  on('classic.PermissionDenied', async ($, e, next) => {
    await setState($, 'working')
    return next(e)
  })
  on('classic.PostToolUse', async ($, e, next) => {
    await setState($, 'working')
    return next(e)
  })
  on('classic.ElicitationResult', async ($, e, next) => {
    await setState($, 'working')
    return next(e)
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await setState($, 'waiting')
    const answered = await next(e)
    await setState($, 'working')
    return answered
  })
}
