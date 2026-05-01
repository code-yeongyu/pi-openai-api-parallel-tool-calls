# pi-openai-api-parallel-tool-calls

OpenAI parallel tool call policy extension for the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). It ports the senpi-mono builtin `openai-api-parallel-tool-calls` extension into a standalone pi extension.

## Behavior

The extension does not register a new tool. It intercepts provider requests before they are sent and adds `parallel_tool_calls: true` when all of these conditions hold:

| Case | Result |
|------|--------|
| OpenAI-family API payload has non-empty `tools` | adds `parallel_tool_calls: true` |
| Payload already has `parallel_tool_calls` | preserves the explicit value |
| Payload has no tools | leaves payload unchanged |
| Non-OpenAI API payload | leaves payload unchanged |

Covered APIs are `openai-completions`, `openai-responses`, `openai-codex-responses`, and `azure-openai-responses`.

It also appends a system-prompt section that tells the model to batch independent tool calls and gather enough context before editing.

## Installation

The package targets the [`pi`](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) coding agent. Pi loads extensions from `~/.pi/agent/extensions/`, project `.pi/extensions/`, or via the `--extension` / `-e` CLI flag.

```bash
# From npm (once published)
pi install npm:pi-openai-api-parallel-tool-calls

# From git
pi install git:github.com/code-yeongyu/pi-openai-api-parallel-tool-calls

# Manual placement
git clone https://github.com/code-yeongyu/pi-openai-api-parallel-tool-calls ~/.pi/agent/extensions/pi-openai-api-parallel-tool-calls
cd ~/.pi/agent/extensions/pi-openai-api-parallel-tool-calls && npm install

# Dev / one-shot test
pi -e /path/to/pi-openai-api-parallel-tool-calls/src/index.ts
```

After installation, restart pi or run `/reload` inside an interactive session.

## Development

```bash
npm install
npm test
npm run typecheck
npm run check
pi -e ./src/index.ts
```

The test suite uses vitest. TypeScript is strict, Node-only, and uses ESM imports with `.js` suffixes.

## Origin

Ported from `packages/coding-agent/src/core/extensions/builtin/openai-api-parallel-tool-calls.ts` in `code-yeongyu/senpi-mono`.

## License

[MIT](LICENSE).
