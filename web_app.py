"""
Web Application Server for Gemini AI Agent Dashboard.
Provides a modern split-screen UI for chatting with the agent,
monitoring tool executions, code editing, project management, and live interactive website previews.
"""

import os
import sys
import mimetypes
from flask import Flask, render_template, request, jsonify, send_file, abort
from flask_cors import CORS
from agent_core import GeminiAgent
from tools import (
    BASE_PROJECTS_DIR,
    preview_project_website,
    create_project_zip,
    delete_project,
    ALL_TOOLS
)

# Ensure UTF-8 in console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# Initialize singleton agent
agent = GeminiAgent()


@app.route("/")
def index():
    """Render the main AI Agent Dashboard."""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """Process a message with the Gemini AI agent and return full execution telemetry."""
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    # Capture directory state before sending
    before_projects = set(os.listdir(BASE_PROJECTS_DIR)) if os.path.exists(BASE_PROJECTS_DIR) else set()

    # Send message to agent and get rich execution result
    result = agent.send_message_full(user_message)
    response_text = result.get("response", "")
    tool_calls = result.get("tool_calls", [])
    model_used = result.get("model", agent.current_model)
    duration = result.get("duration", 0)

    # Capture state after
    after_projects = set(os.listdir(BASE_PROJECTS_DIR)) if os.path.exists(BASE_PROJECTS_DIR) else set()
    new_projects = list(after_projects - before_projects)

    latest_project = None
    if new_projects:
        latest_project = new_projects[0]
    elif after_projects:
        # Check if any tool called specified a project
        for tc in tool_calls:
            args = tc.get("args", {})
            if "project_name" in args:
                latest_project = args["project_name"]
                break
        if not latest_project:
            proj_paths = [os.path.join(BASE_PROJECTS_DIR, p) for p in after_projects]
            if proj_paths:
                latest = max(proj_paths, key=os.path.getmtime)
                latest_project = os.path.basename(latest)

    return jsonify({
        "response": response_text,
        "tool_calls": tool_calls,
        "model": model_used,
        "duration": duration,
        "latest_project": latest_project,
        "projects": sorted(list(after_projects))
    })


@app.route("/api/projects", methods=["GET"])
def get_projects():
    """List all created projects with metadata and file lists."""
    if not os.path.exists(BASE_PROJECTS_DIR):
        return jsonify({"projects": []})

    projects_info = []
    for d in sorted(os.listdir(BASE_PROJECTS_DIR)):
        full_dir = os.path.join(BASE_PROJECTS_DIR, d)
        if os.path.isdir(full_dir):
            files = []
            for root, _, fs in os.walk(full_dir):
                for f in fs:
                    rel = os.path.relpath(os.path.join(root, f), full_dir).replace("\\", "/")
                    files.append(rel)

            zip_path = os.path.join(BASE_PROJECTS_DIR, f"{d}.zip")
            has_zip = os.path.exists(zip_path)
            zip_size_kb = round(os.path.getsize(zip_path) / 1024, 1) if has_zip else None

            projects_info.append({
                "name": d,
                "files": files,
                "file_count": len(files),
                "modified": os.path.getmtime(full_dir),
                "has_zip": has_zip,
                "zip_size_kb": zip_size_kb
            })

    # Sort newest first
    projects_info.sort(key=lambda x: x["modified"], reverse=True)
    return jsonify({"projects": projects_info})


@app.route("/api/project/<project_name>/files", methods=["GET"])
def get_project_files(project_name):
    """Retrieve all files and file contents for a specific project."""
    project_dir = os.path.join(BASE_PROJECTS_DIR, project_name)
    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    result = {}
    for root, _, files in os.walk(project_dir):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), project_dir).replace("\\", "/")
            full_path = os.path.join(root, f)
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as file_handle:
                    result[rel] = file_handle.read()
            except Exception as e:
                result[rel] = f"[Error reading file: {e}]"

    return jsonify({"project": project_name, "files": result})


@app.route("/api/project/<project_name>/save", methods=["POST"])
def save_project_file(project_name):
    """Save an edited file within a project."""
    data = request.get_json(silent=True) or {}
    file_path = data.get("file_path", "").strip()
    content = data.get("content", "")

    if not file_path:
        return jsonify({"error": "Missing file_path"}), 400

    project_dir = os.path.join(BASE_PROJECTS_DIR, project_name)
    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    target_path = os.path.abspath(os.path.join(project_dir, file_path.strip("/\\")))
    if not target_path.startswith(os.path.abspath(project_dir)):
        return jsonify({"error": "Invalid path"}), 400

    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(content)

    return jsonify({"success": True, "file_path": file_path})


@app.route("/api/project/<project_name>/download", methods=["GET"])
def download_project(project_name):
    """Package and download a project as a ZIP archive."""
    project_dir = os.path.join(BASE_PROJECTS_DIR, project_name)
    if not os.path.exists(project_dir):
        abort(404, description="Project not found")

    zip_info = create_project_zip(project_name)
    zip_path = os.path.join(BASE_PROJECTS_DIR, f"{project_name}.zip")
    if not os.path.exists(zip_path):
        abort(500, description="Failed to create project ZIP archive")

    return send_file(
        zip_path,
        as_attachment=True,
        download_name=f"{project_name}.zip",
        mimetype="application/zip"
    )


@app.route("/api/project/<project_name>", methods=["DELETE"])
@app.route("/api/project/<project_name>/delete", methods=["POST"])
def remove_project(project_name):
    """Delete a project and remove its files."""
    msg = delete_project(project_name)
    return jsonify({"success": True, "message": msg})


@app.route("/api/preview_external/<project_name>", methods=["POST"])
def launch_external_preview(project_name):
    """Open the project in the system's default browser."""
    result = preview_project_website(project_name, open_in_browser=True)
    return jsonify({"result": result})


@app.route("/api/tools", methods=["GET"])
def get_available_tools():
    """Return documentation for all tools available to the AI agent."""
    tools_list = []
    for tool_fn in ALL_TOOLS:
        tools_list.append({
            "name": tool_fn.__name__,
            "doc": tool_fn.__doc__ or "No documentation provided."
        })
    return jsonify({"tools": tools_list, "total": len(tools_list)})


@app.route("/api/reset", methods=["POST"])
def reset_conversation():
    """Reset the agent's conversation history."""
    agent.reset_chat()
    return jsonify({"status": "reset_success"})


@app.route("/preview/<project_name>/", defaults={"filename": "index.html"})
@app.route("/preview/<project_name>/<path:filename>")
def serve_preview(project_name, filename):
    """Serve website files directly for live in-dashboard iframe preview."""
    project_dir = os.path.abspath(os.path.join(BASE_PROJECTS_DIR, project_name))
    if not os.path.exists(project_dir):
        abort(404, description="Project not found")

    target_file = os.path.abspath(os.path.join(project_dir, filename))
    if not target_file.startswith(project_dir) or not os.path.exists(target_file):
        abort(404, description="File not found")

    mime_type, _ = mimetypes.guess_type(target_file)
    return send_file(target_file, mimetype=mime_type or "text/plain")


if __name__ == "__main__":
    port = int(os.getenv("WEB_SERVER_PORT", 5000))
    print(f"\n=======================================================")
    print(f" TEAM 31 AI Agent Web Dashboard running at:")
    print(f" >>> http://127.0.0.1:{port} <<<")
    print(f"=======================================================\n")
    app.run(host="127.0.0.1", port=port, debug=False)
