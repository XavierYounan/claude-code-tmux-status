import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// Records every tmux invocation.
function fakeTmux(on: On) {
  const calls: string[][] = []
  on('process.run', ($, e) => {
    calls.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return calls
}

const states = (calls: string[][]) =>
  calls.filter(c => c[1] === 'set-option').map(c => (c[2] === '-wqu' ? 'unset' : c[6]))

const turnEnd = { answer: 'ok', durationMs: 5, turnId: 't1', reason: 'answer' } as const

describe('inside tmux', () => {
  test('a turn goes working then done', async ($, on) => {
    mock.env(on, { TMUX_PANE: '%7' })
    const calls = fakeTmux(on)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: 'ok' }))

    await $.turn.start({ text: 'hi', turnId: 't1' })
    await $.turn.complete({ ...turnEnd, isAborted: false })

    expect(states(calls)).toEqual(['working', 'done'])
    expect(calls.find(c => c[1] === 'set-option')).toEqual(
      ['tmux', 'set-option', '-wq', '-t', '%7', '@claude_state', 'working'],
    )
  })

  test('an interrupted turn is done too', async ($, on) => {
    mock.env(on, { TMUX_PANE: '%7' })
    const calls = fakeTmux(on)
    on('turn.complete', () => ({ text: '' }))

    await $.turn.complete({ ...turnEnd, reason: 'aborted', isAborted: true })

    expect(states(calls)).toEqual(['done'])
  })

  test("a subagent's turn leaves the window alone", async ($, on) => {
    mock.env(on, { TMUX_PANE: '%7' })
    const calls = fakeTmux(on)
    on('turn.complete', () => ({ text: 'ok' }))

    await $.turn.complete({ ...turnEnd, isAborted: false, agentId: 'a1' })

    expect(calls).toEqual([])
  })

  test('a permission prompt is waiting, and the tool running resumes', async ($, on) => {
    mock.env(on, { TMUX_PANE: '%7' })
    const calls = fakeTmux(on)
    on('classic.PermissionRequest', () => ({}))
    on('classic.PostToolUse', () => ({}))

    await $.classic.PermissionRequest({
      permission_mode: 'default', tool_name: 'Bash', tool_input: { command: 'ls' },
    } as never)
    await $.classic.PostToolUse({
      permission_mode: 'default', tool_name: 'Bash', tool_input: { command: 'ls' },
      tool_response: '', tool_use_id: 'x',
    } as never)

    expect(states(calls)).toEqual(['waiting', 'working'])
  })
})

test('outside tmux nothing runs', async ($, on) => {
  mock.env(on, {})
  const calls = fakeTmux(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'ok' }))

  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.turn.complete({ ...turnEnd, isAborted: false })

  expect(calls).toEqual([])
})
