import os
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent_core import GeminiAgent

print("Initializing TEAM 31 Agent...")
agent = GeminiAgent()

print("\n--- Test 1: Answering Questions ---")
response = agent.send_message("Explain what an AI Agent is in 2 concise bullet points.")
print(response)

print("\n--- Test 2: Interactive Task (Building a quick counter website) ---")
build_response = agent.send_message("Create a simple interactive neon counter website named 'neon_counter'.")
print(build_response)

print("\n--- Checking created files in projects/ ---")
projects_dir = os.path.join(os.path.dirname(__file__), "projects")
if os.path.exists(projects_dir):
    for root, dirs, files in os.walk(projects_dir):
        print("Root:", root)
        for f in files:
            print(" - File:", f)
