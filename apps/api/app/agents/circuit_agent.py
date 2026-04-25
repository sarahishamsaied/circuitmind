from __future__ import annotations

import json
import pathlib
from collections.abc import Callable, Awaitable
from typing import Any

import litellm

from app.agents.tools import TOOL_DEFINITIONS, ToolExecutor
from app.config import settings
from app.models.circuit_ir import CircuitIR
from app.services.component_db_service import ComponentDBService
from app.services.simulation_service import SimulationService

_SYSTEM_PROMPT_TEMPLATE = (pathlib.Path(__file__).parent / "prompts" / "system_prompt.txt").read_text()

# Convert our tool definitions (Anthropic-style input_schema) to OpenAI function-calling format
# that LiteLLM uses universally across providers.
def _to_litellm_tools(tool_defs: list[dict]) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tool_defs
    ]


_LITELLM_TOOLS = _to_litellm_tools(TOOL_DEFINITIONS)

_JSON_ECHO_NUDGE = (
    "Your last reply looked like raw circuit JSON instead of using tools. "
    "You must call add_net, add_component, and connect_pins to change the schematic. "
    "Do not paste or return the full circuit JSON."
)


def _tool_calls_present(assistant_msg: Any) -> bool:
    """Some providers set tool_calls even when finish_reason is not the string 'tool_calls'."""
    tc = getattr(assistant_msg, "tool_calls", None)
    return isinstance(tc, list) and len(tc) > 0


def _assistant_text_content(assistant_msg: Any) -> str:
    raw = getattr(assistant_msg, "content", None)
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        parts: list[str] = []
        for p in raw:
            if isinstance(p, dict) and p.get("type") == "text":
                parts.append(str(p.get("text", "")))
            elif isinstance(p, str):
                parts.append(p)
        return "\n".join(parts)
    return ""


def _looks_like_full_circuit_json(text: str) -> bool:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        if len(lines) >= 2 and lines[-1].strip() == "```":
            t = "\n".join(lines[1:-1]).strip()
    if not t.startswith("{"):
        return False
    if '"components"' not in t and "'components'" not in t:
        return False
    try:
        data = json.loads(t)
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and "components" in data and isinstance(data.get("components"), list)


class CircuitAgent:
    """
    Stateful LLM agent that builds Circuit IR incrementally via tool calls.
    Supports any LiteLLM-compatible provider: Claude, Ollama/Llama, OpenAI, etc.
    Set LLM_PROVIDER and the relevant model/key in your .env to switch.
    """

    def __init__(
        self,
        project_id: str,
        initial_ir: CircuitIR,
        ws_sender: Callable[[dict], Awaitable[None]],
        component_db: ComponentDBService | None = None,
    ) -> None:
        self.project_id = project_id
        self.ir = initial_ir
        self.ws_sender = ws_sender
        self.executor = ToolExecutor(
            ir=self.ir,
            ws_sender=ws_sender,
            component_db=component_db,
            simulator=SimulationService(),
        )
        self.conversation_history: list[dict[str, Any]] = []
        self._ir_snapshots: list[CircuitIR] = []

        # Configure LiteLLM
        if settings.llm_provider == "anthropic":
            litellm.anthropic_key = settings.anthropic_api_key
        elif settings.llm_provider == "ollama":
            litellm.api_base = settings.ollama_base_url

    async def run(self, user_prompt: str) -> None:
        self._ir_snapshots.append(self.ir.model_copy(deep=True))
        self.conversation_history.append({"role": "user", "content": user_prompt})
        await self.ws_sender({"type": "agent_thinking", "text": "Analyzing your request…"})

        json_echo_retries = 0
        max_json_echo_retries = 2

        while True:
            messages = [
                {"role": "system", "content": self._build_system_prompt()},
                *self.conversation_history,
            ]

            response = await litellm.acompletion(
                model=settings.litellm_model,
                messages=messages,
                tools=_LITELLM_TOOLS,
                tool_choice="auto",
                max_tokens=8096,
            )

            choice = response.choices[0]
            assistant_msg = choice.message

            # Append assistant turn to history
            self.conversation_history.append(assistant_msg.model_dump(exclude_none=True))

            if _tool_calls_present(assistant_msg):
                tool_results: list[dict] = []

                for tool_call in assistant_msg.tool_calls:
                    fn_name = tool_call.function.name
                    try:
                        fn_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        fn_args = {}

                    await self.ws_sender({
                        "type": "tool_call",
                        "tool_name": fn_name,
                        "args": fn_args,
                    })

                    result = await self.executor.execute(fn_name, fn_args)

                    patch = self.executor.get_last_patch()
                    if patch:
                        await self.ws_sender({"type": "ir_patch", "patch": patch})

                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": fn_name,
                        "content": json.dumps(result),
                    })

                self.conversation_history.extend(tool_results)

            else:
                # end_turn / stop / length — or model echoed JSON instead of calling tools
                text = _assistant_text_content(assistant_msg).strip()
                if (
                    text
                    and _looks_like_full_circuit_json(text)
                    and json_echo_retries < max_json_echo_retries
                ):
                    json_echo_retries += 1
                    self.conversation_history.pop()
                    self.conversation_history.append(
                        {"role": "user", "content": _JSON_ECHO_NUDGE},
                    )
                    await self.ws_sender(
                        {"type": "agent_thinking", "text": "Retrying — use tools to edit the schematic…"},
                    )
                    continue

                await self.ws_sender(
                    {"type": "agent_message", "text": _assistant_text_content(assistant_msg)},
                )
                await self.ws_sender({
                    "type": "ir_complete",
                    "circuit": self.ir.model_dump(by_alias=True),
                })
                break

    async def undo(self) -> None:
        if self._ir_snapshots:
            self.ir = self._ir_snapshots.pop()
            self.executor.ir = self.ir
            await self.ws_sender({
                "type": "ir_complete",
                "circuit": self.ir.model_dump(by_alias=True),
            })

    async def reset(self) -> None:
        self.ir = CircuitIR()
        self.executor.ir = self.ir
        self.conversation_history = []
        self._ir_snapshots = []
        await self.ws_sender({
            "type": "ir_complete",
            "circuit": self.ir.model_dump(by_alias=True),
        })

    def get_ir(self) -> CircuitIR:
        return self.ir

    def get_conversation_history(self) -> list[dict]:
        return self.conversation_history

    def _build_system_prompt(self) -> str:
        return _SYSTEM_PROMPT_TEMPLATE.format(
            circuit_json=self.ir.model_dump_json(indent=2, by_alias=True)
        )
