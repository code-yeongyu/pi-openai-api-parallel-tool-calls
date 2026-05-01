import type { Api } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { describe, expect, it } from "vitest";

import openaiApiParallelToolCallsExtension, {
	addOpenAIApiParallelToolCallsToPayload,
	PARALLEL_TOOL_CALLS_SECTION,
} from "../src/index.js";

type ProviderRequestHandler = (
	event: { payload: unknown },
	ctx: { model?: { api?: Api } },
) => unknown | Promise<unknown>;
type AgentStartHandler = (event: { systemPrompt: string }) => unknown | Promise<unknown>;

function requireProviderRequestHandler(handlers: ProviderRequestHandler[]): ProviderRequestHandler {
	const handler = handlers[0];
	if (!handler) {
		throw new Error("missing before_provider_request handler");
	}
	return handler;
}

function requireAgentStartHandler(handlers: AgentStartHandler[]): AgentStartHandler {
	const handler = handlers[0];
	if (!handler) {
		throw new Error("missing before_agent_start handler");
	}
	return handler;
}

function createExtensionApiRecorder(): {
	pi: ExtensionAPI;
	providerRequestHandlers: ProviderRequestHandler[];
	agentStartHandlers: AgentStartHandler[];
} {
	const providerRequestHandlers: ProviderRequestHandler[] = [];
	const agentStartHandlers: AgentStartHandler[] = [];
	const pi = {
		on(eventName: string, handler: ProviderRequestHandler | AgentStartHandler): void {
			if (eventName === "before_provider_request") {
				providerRequestHandlers.push(handler as ProviderRequestHandler);
			}
			if (eventName === "before_agent_start") {
				agentStartHandlers.push(handler as AgentStartHandler);
			}
		},
	} as ExtensionAPI;

	return { pi, providerRequestHandlers, agentStartHandlers };
}

describe("PARALLEL_TOOL_CALLS_SECTION", () => {
	it("#given prompt section #when inspected #then does not reference unavailable concrete tools", () => {
		// given / when / then
		expect(PARALLEL_TOOL_CALLS_SECTION).not.toContain("lsp_");
		expect(PARALLEL_TOOL_CALLS_SECTION).not.toContain("ast_grep");
		expect(PARALLEL_TOOL_CALLS_SECTION).not.toContain("`glob`");
		expect(PARALLEL_TOOL_CALLS_SECTION).not.toContain("`grep`");
		expect(PARALLEL_TOOL_CALLS_SECTION).not.toContain("`read`");
	});

	it("#given prompt section #when inspected #then contains execution and context guidance", () => {
		// given / when / then
		expect(PARALLEL_TOOL_CALLS_SECTION).toContain("Execution Strategy");
		expect(PARALLEL_TOOL_CALLS_SECTION).toContain("Parallel Tool Calls");
		expect(PARALLEL_TOOL_CALLS_SECTION).toContain("Context Breadth");
	});
});

describe("addOpenAIApiParallelToolCallsToPayload", () => {
	it("#given openai completions payload with tools #when transformed #then enables parallel tool calls", () => {
		// given
		const payload = {
			model: "gpt-4o-mini",
			tools: [{ type: "function", function: { name: "ping" } }],
		};

		// when
		const result = addOpenAIApiParallelToolCallsToPayload("openai-completions", payload);

		// then
		expect(result).toEqual({ ...payload, parallel_tool_calls: true });
	});

	it("#given openai responses payload with tools #when transformed #then enables parallel tool calls", () => {
		// given
		const payload = {
			model: "gpt-5",
			tools: [{ type: "function", name: "ping", parameters: { type: "object" } }],
		};

		// when
		const result = addOpenAIApiParallelToolCallsToPayload("openai-responses", payload);

		// then
		expect(result).toEqual({ ...payload, parallel_tool_calls: true });
	});

	it("#given anthropic payload #when transformed #then returns original payload", () => {
		// given
		const payload = {
			model: "claude-sonnet-4-5",
			tools: [{ name: "ping", input_schema: { type: "object" } }],
		};

		// when
		const result = addOpenAIApiParallelToolCallsToPayload("anthropic-messages", payload);

		// then
		expect(result).toBe(payload);
	});

	it("#given payload without tools #when transformed #then returns original payload", () => {
		// given
		const payload = { model: "gpt-4o-mini" };

		// when
		const result = addOpenAIApiParallelToolCallsToPayload("openai-completions", payload);

		// then
		expect(result).toBe(payload);
	});

	it("#given explicit parallel setting #when transformed #then preserves explicit value", () => {
		// given
		const payload = {
			model: "gpt-4o-mini",
			tools: [{ type: "function", function: { name: "ping" } }],
			parallel_tool_calls: false,
		};

		// when
		const result = addOpenAIApiParallelToolCallsToPayload("openai-completions", payload);

		// then
		expect(result).toBe(payload);
	});
});

describe("openaiApiParallelToolCallsExtension", () => {
	it("#given extension api #when installed #then registers provider and prompt handlers", () => {
		// given
		const { pi, providerRequestHandlers, agentStartHandlers } = createExtensionApiRecorder();

		// when
		openaiApiParallelToolCallsExtension(pi);

		// then
		expect(providerRequestHandlers).toHaveLength(1);
		expect(agentStartHandlers).toHaveLength(1);
	});

	it("#given registered provider handler #when openai payload has tools #then returns patched payload", async () => {
		// given
		const { pi, providerRequestHandlers } = createExtensionApiRecorder();
		openaiApiParallelToolCallsExtension(pi);
		const handler = requireProviderRequestHandler(providerRequestHandlers);
		const payload = { tools: [{ type: "function", function: { name: "ping" } }] };

		// when
		const result = await handler({ payload }, { model: { api: "openai-completions" } });

		// then
		expect(result).toEqual({ ...payload, parallel_tool_calls: true });
	});

	it("#given registered prompt handler #when agent starts #then appends guidance", async () => {
		// given
		const { pi, agentStartHandlers } = createExtensionApiRecorder();
		openaiApiParallelToolCallsExtension(pi);
		const handler = requireAgentStartHandler(agentStartHandlers);

		// when
		const result = await handler({ systemPrompt: "Base prompt" });

		// then
		expect(result).toEqual({ systemPrompt: `Base prompt\n${PARALLEL_TOOL_CALLS_SECTION}` });
	});
});
