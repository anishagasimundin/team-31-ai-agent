import os
import time
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError
from tools import ALL_TOOLS, BASE_PROJECTS_DIR, get_recent_tool_calls

# Load environment variables
load_dotenv()

SYSTEM_INSTRUCTION = """
You are TEAM 31, an autonomous, highly capable AI Agent powered by Google Gemini.
You excel at:
1. Answering user questions across programming, computer science, mathematics, architecture, design, and general knowledge with clear, accurate explanations.
2. Executing complex interactive tasks using your suite of specialized tools:
   - Scaffolding complete, modern, visually stunning websites and web applications (`create_website`, `write_file`, `read_file`, `preview_project_website`).
   - Running Python code and scripts (`run_python_code`) to solve calculations, test algorithms, analyze data, or verify logic.
   - Fetching and inspecting web content (`fetch_web_content`) to retrieve documentation or review URLs.
   - Managing and packaging project archives (`create_project_zip`, `delete_project`, `list_project_files`).

GUIDELINES FOR BUILDING WEBSITES & INTERACTIVE APPS:
- When asked to build, create, or redesign a website:
  1. Pick a descriptive, clean project name (e.g., 'portfolio', 'saas_landing', 'cyber_calc', 'arkanoid_game', 'task_manager').
  2. Use `create_website(project_name, html_content, css_content, js_content)` to create the site and launch its live preview server.
     - You can provide a self-contained `index.html` (with embedded `<style>` and `<script>` for instant complete delivery) OR pass `css_content` and `js_content` separately.
  3. Ensure your web design is visually STUNNING, modern, and responsive:
     - Dark mode or curated harmonious color palette with vibrant accents
     - Modern typography (Inter, Outfit, Space Grotesk, Plus Jakarta Sans)
     - Interactive elements, smooth hover transitions, glassmorphism, flexbox/grid layout
     - Engaging functional JavaScript (buttons work, calculators calculate, inputs process, games play)
  4. If updating an existing project, use `read_file`, `write_file`, and `preview_project_website` to iterate on it.
  5. In your final response, summarize what you built, key features, and provide instructions on how to use it!

GUIDELINES FOR CODING & GENERAL QUESTIONS:
- When a task requires calculating, algorithmic testing, data manipulation, or script execution, use `run_python_code` to execute and verify the result.
- Deliver direct, insightful, and nicely formatted Markdown responses.
- Use code snippets with syntax highlighting when discussing programming.
"""


class GeminiAgent:
    """The Gemini-powered AI Agent with robust execution, multi-model fallback, and interactive tools."""

    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY must be provided or set in .env file.")

        self.primary_model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
        # 3-tier fallback chain for maximum reliability and uptime
        self.model_fallbacks = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
        self.current_model = self.primary_model
        self.client = genai.Client(api_key=self.api_key)
        self.history: List[Dict[str, str]] = []
        self.last_tool_calls: List[Dict[str, Any]] = []
        self._init_chat(self.current_model)

    def _init_chat(self, model_name: str):
        """Initialize or reset the chat session with tools."""
        self.current_model = model_name
        self.chat = self.client.chats.create(
            model=model_name,
            config=types.GenerateContentConfig(
                tools=ALL_TOOLS,
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.7,
            )
        )

    def reset_chat(self):
        """Reset the conversation context."""
        self._init_chat(self.primary_model)
        self.history.clear()
        self.last_tool_calls.clear()

    def send_message(self, prompt: str, max_retries: int = 3) -> str:
        """Send a message to the agent and receive its response text."""
        result = self.send_message_full(prompt, max_retries=max_retries)
        return result.get("response", "")

    def send_message_full(self, prompt: str, max_retries: int = 3) -> Dict[str, Any]:
        """Send a message and return response text, tool calls executed, and model metadata."""
        if not prompt or not prompt.strip():
            return {
                "response": "Please provide a valid prompt.",
                "tool_calls": [],
                "model": self.current_model
            }

        # Clear any leftover tool calls before starting turn
        get_recent_tool_calls(clear=True)

        models_to_try = [self.current_model]
        for fb in self.model_fallbacks:
            if fb not in models_to_try:
                models_to_try.append(fb)

        last_error = None
        start_time = time.time()

        for model_name in models_to_try:
            for attempt in range(1, max_retries + 1):
                try:
                    if self.current_model != model_name:
                        self._init_chat(model_name)

                    response = self.chat.send_message(prompt)
                    output = response.text or "Task executed successfully."

                    # Capture tool calls that occurred during this turn
                    executed_tools = get_recent_tool_calls(clear=True)
                    self.last_tool_calls = executed_tools

                    # Record user & assistant interaction in history
                    self.history.append({"role": "user", "content": prompt})
                    self.history.append({"role": "assistant", "content": output})

                    elapsed = time.time() - start_time
                    return {
                        "response": output,
                        "tool_calls": executed_tools,
                        "model": self.current_model,
                        "duration": round(elapsed, 2)
                    }

                except (ServerError, ClientError) as e:
                    last_error = e
                    error_str = str(e)
                    # Reinitialize chat on tool or session corruption
                    self._init_chat(model_name)

                    if "503" in error_str or "UNAVAILABLE" in error_str:
                        if attempt < max_retries:
                            time.sleep(attempt * 2)
                            continue
                        else:
                            break
                    elif "429" in error_str:
                        # Rate limit reached on this model, switch to next fallback
                        break
                    else:
                        break
                except Exception as e:
                    last_error = e
                    self._init_chat(model_name)
                    break

        executed_tools = get_recent_tool_calls(clear=True)
        return {
            "response": f"Agent Error: {str(last_error)}",
            "tool_calls": executed_tools,
            "model": self.current_model,
            "duration": round(time.time() - start_time, 2)
        }
