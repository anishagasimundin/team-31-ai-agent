"""
Interactive Command-Line Interface (CLI) for the Gemini AI Agent.
Allows chatting, answering questions, building websites, running Python code, and managing projects.
"""

import os
import sys
import time

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent_core import GeminiAgent
from tools import (
    list_all_projects,
    preview_project_website,
    create_project_zip,
    delete_project,
    ALL_TOOLS,
    BASE_PROJECTS_DIR
)

BANNER = r"""
========================================================================
   ____ ____ __  __ ___ _   _ ___      _    ___      _    ____ _____ _   _ _____ 
  / ___| ____|  \/  |_ _| \ | |_ _|    / \  |_ _|    / \  / ___| ____| \ | |_   _|
 | |  _|  _| | |\/| || ||  \| || |    / _ \  | |    / _ \| |  _|  _| |  \| | | |  
 | |_| | |___| |  | || || |\  || |   / ___ \ | |   / ___ \ |_| | |___| |\  | | |  
  \____|_____|_|  |_|___|_| \_|___| /_/   \_\___| /_/   \_\____|_____|_| \_| |_|  
========================================================================
   TEAM 31 AI Agent // Connected: Google Gemini API (gemini-3.8-flash)
   Capabilities: General Q&A, Code Runner, Web Scaffolding, Live Preview, ZIP Export
   Type '/help' for a list of commands, or '/exit' to quit.
========================================================================
"""

HELP_TEXT = """
Available Commands:
  /help               - Show this help message
  /tools              - List all agent tools & capabilities
  /projects           - List all created website projects
  /preview <name>     - Launch live preview server and open in browser
  /zip <name>         - Package project as a .zip file
  /delete <name>      - Delete a project
  /reset              - Clear current conversation history
  /exit or /quit      - Exit the CLI

Interactive Prompts you can try:
  - "Explain how Transformer self-attention mechanisms work."
  - "Run a Python script to compute prime numbers up to 1000 and calculate their distribution."
  - "Build a cyberpunk-themed pomodoro timer website named 'cyber_pomo'."
  - "Create a high-converting SaaS landing page for an AI Developer Tool."
  - "Design an interactive Brick Breaker arcade game in HTML5 canvas."
"""

def main():
    print(BANNER)
    
    try:
        agent = GeminiAgent()
    except Exception as e:
        print(f"\n[!] Error initializing GeminiAgent: {e}")
        print("Please ensure GEMINI_API_KEY is configured in your .env file.\n")
        sys.exit(1)

    while True:
        try:
            user_input = input("\n\033[1;36mUser > \033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Goodbye!")
            break

        if not user_input:
            continue

        # Handle slash commands
        cmd = user_input.lower()
        if cmd in ["/exit", "/quit", "exit", "quit"]:
            print("Shutting down AI Agent. Goodbye!")
            break
        elif cmd == "/help":
            print(HELP_TEXT)
            continue
        elif cmd == "/tools":
            print("\n--- Available Agent Tools ---")
            for t in ALL_TOOLS:
                doc_first_line = (t.__doc__ or "").strip().split("\n")[0]
                print(f"  * \033[1;32m{t.__name__}\033[0m: {doc_first_line}")
            continue
        elif cmd == "/projects":
            print(f"\n{list_all_projects()}")
            continue
        elif cmd.startswith("/preview"):
            parts = user_input.split(maxsplit=1)
            if len(parts) > 1:
                proj_name = parts[1].strip()
                result = preview_project_website(proj_name, open_in_browser=True)
                print(f"\n[Preview] {result}")
            else:
                print("Usage: /preview <project_name>")
            continue
        elif cmd.startswith("/zip"):
            parts = user_input.split(maxsplit=1)
            if len(parts) > 1:
                proj_name = parts[1].strip()
                result = create_project_zip(proj_name)
                print(f"\n[ZIP] {result}")
            else:
                print("Usage: /zip <project_name>")
            continue
        elif cmd.startswith("/delete"):
            parts = user_input.split(maxsplit=1)
            if len(parts) > 1:
                proj_name = parts[1].strip()
                confirm = input(f"Are you sure you want to delete '{proj_name}'? (y/n): ").strip().lower()
                if confirm == 'y':
                    result = delete_project(proj_name)
                    print(f"\n[Delete] {result}")
                else:
                    print("Cancelled.")
            else:
                print("Usage: /delete <project_name>")
            continue
        elif cmd == "/reset":
            agent.reset_chat()
            print("\n[i] Conversation history cleared.")
            continue

        # Send query to agent
        print("\033[1;33m[*] Agent is thinking & executing tools...\033[0m", flush=True)
        start_time = time.time()
        
        result_payload = agent.send_message_full(user_input)
        response = result_payload.get("response", "")
        tool_calls = result_payload.get("tool_calls", [])
        elapsed = result_payload.get("duration", time.time() - start_time)

        # Print tool calls if any were executed
        if tool_calls:
            print(f"\n\033[1;34m[⚡ Tools Executed ({len(tool_calls)})]:\033[0m")
            for tc in tool_calls:
                tool_name = tc.get("tool", "unknown")
                summary = tc.get("result_summary", "")
                print(f"  -> \033[1;35m{tool_name}\033[0m: {summary}")

        print(f"\n\033[1;32mTEAM 31 ({result_payload.get('model', agent.current_model)}) [{elapsed}s]:\033[0m")
        print(response)

        # Check if new project was created recently and notify user
        if os.path.exists(BASE_PROJECTS_DIR):
            projects = os.listdir(BASE_PROJECTS_DIR)
            if projects:
                proj_dirs = [os.path.join(BASE_PROJECTS_DIR, p) for p in projects if os.path.isdir(os.path.join(BASE_PROJECTS_DIR, p))]
                if proj_dirs:
                    latest = max(proj_dirs, key=os.path.getmtime)
                    if time.time() - os.path.getmtime(latest) < 20:
                        pname = os.path.basename(latest)
                        print(f"\n\033[1;35m>>> Detected active project: '{pname}'! Type '/preview {pname}' to open preview anytime.\033[0m")

if __name__ == "__main__":
    main()
