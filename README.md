# 🤖 TEAM 31 AI Agent & Interactive Web Architect

An autonomous, multi-tool AI Agent built in Python using Google Gemini (via the official `google-genai` SDK). The agent excels at general Q&A, algorithmic calculations & code execution, real-time web fetching, autonomous website scaffolding, live in-dashboard browser previews, and one-click ZIP project exports.

---

## ✨ Features & Capabilities

- **🧠 Powerful Reasoning & General Q&A**: Answers complex questions across software engineering, algorithms, science, design, and logic with clear, structured Markdown responses.
- **⚡ Autonomous Tool Execution (11 Native Tools)**:
  - `create_website`: Atomically generates modern HTML, CSS, and JS web applications and launches a live preview server.
  - `run_python_code`: Safely executes Python code in an isolated subprocess to solve math problems, data manipulation, or algorithmic benchmarks.
  - `fetch_web_content`: Reads and extracts readable text from live web URLs and APIs.
  - `create_project_zip`: Packages entire project workspaces into downloadable `.zip` archives.
  - `delete_project`: Permanently removes workspaces and stops active preview servers.
  - `create_project`, `write_file`, `read_file`, `list_project_files`, `list_all_projects`, `preview_project_website`.
- **🛡️ 3-Tier Multi-Model Resilience**: Automatically falls back between `gemini-3.8-flash`, `gemini-3.5-flash-lite`, and `gemini-3.1-flash-lite` during high demand spikes or rate limits.
- **🖥️ Modern Split-Screen Web Dashboard**:
  - **Left Panel**: AI conversation stream with Markdown formatting, syntax-highlighted code blocks with one-click copy buttons, and tool execution action badges.
  - **Right Panel**:
    - **Live Preview Tab**: Interactive iframe preview with responsive viewport toggles (Desktop 100%, Tablet 768px, Mobile 390px), reload button, new window button, and ZIP download.
    - **Code Explorer Tab**: In-browser file tree and code editor to inspect and edit files directly with real-time saving and instant preview updates.
    - **All Projects Gallery**: Visual grid of all generated web applications with instant preview, ZIP download, and project deletion.
    - **Tools Modal**: Interactive inspector displaying all 11 registered agent tools.
- **💻 Interactive Terminal CLI**: Feature-rich terminal interface with colored banners, timing telemetry, `/tools`, `/projects`, `/preview <name>`, `/zip <name>`, `/delete <name>`, and `/reset` commands.

---

## 📁 Project Structure

```text
├── .env                  # API keys and port configuration
├── requirements.txt      # Python dependencies
├── agent_core.py         # Autonomous GeminiAgent class with multi-model fallback & tool binding
├── tools.py              # Suite of 11 interactive tools & tool execution logger
├── web_app.py            # Flask backend server with REST APIs & live preview endpoints
├── cli.py                # Interactive command-line terminal client
├── test_agent.py         # Quick diagnostic test script
├── templates/
│   └── index.html        # Premium glassmorphic web dashboard template
├── static/
│   ├── css/style.css     # Dark-theme design system with glowing ambient orbs
│   └── js/app.js         # Frontend controller for chat, live preview, and code editor
└── projects/             # Generated website workspaces (e.g. neon_counter, glass_pomodoro)
```

---

## 🚀 Quick Start Guide

### 1. Installation

Ensure Python 3.10+ is installed, then install the required packages:

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Ensure your `.env` file contains your Google Gemini API key:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.8-flash
WEB_SERVER_PORT=5000
```

### 3. Launch the Web Dashboard

Start the Flask web dashboard:

```bash
python web_app.py
```

Open your browser to:
👉 **http://127.0.0.1:5000**

### 4. Or Run the Interactive CLI

Launch the terminal client:

```bash
python cli.py
```

---

## 💡 Example Prompts to Try

1. **Autonomous Website Creation**:
   > *"Build a cyberpunk-themed neon portfolio website with interactive canvas particle effects, project cards, and a contact modal named 'cyber_portfolio'."*

2. **Python Code Runner & Math Simulation**:
   > *"Run a Python script to compute a Monte Carlo estimation of Pi with 100,000 points and calculate the first 25 Fibonacci numbers."*

3. **Web Content Extraction**:
   > *"Fetch the content from https://httpbin.org/json and summarize its data structure."*

4. **Interactive Browser Games**:
   > *"Build a playable retro Brick Breaker arcade game on HTML5 canvas with sound effects, scoring, and particle sparks named 'retro_brick'."*

5. **In-depth Conceptual Explanations**:
   > *"Explain in detail how Transformer self-attention mechanisms work, using ASCII diagrams."*
