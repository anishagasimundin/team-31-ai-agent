"""
Tools module for the AI Agent.
Provides interactive capabilities for creating projects, writing code,
running Python scripts, inspecting files, fetching web content, and previewing built websites.
"""

import os
import re
import sys
import time
import socket
import shutil
import zipfile
import threading
import subprocess
import urllib.request
import http.server
import socketserver
import webbrowser
from typing import Dict, Any, List

BASE_PROJECTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "projects"))
os.makedirs(BASE_PROJECTS_DIR, exist_ok=True)

# Track active preview servers: {project_name: {"port": port, "server": server_instance, "thread": thread}}
ACTIVE_SERVERS: Dict[str, Dict[str, Any]] = {}
SERVER_LOCK = threading.Lock()

# Thread-safe log of recent tool execution steps
TOOL_EXECUTION_LOG: List[Dict[str, Any]] = []
TOOL_LOG_LOCK = threading.Lock()


def record_tool_call(name: str, args: Dict[str, Any], result: str):
    """Record a tool invocation for UI display and tracking."""
    with TOOL_LOG_LOCK:
        TOOL_EXECUTION_LOG.append({
            "tool": name,
            "args": args,
            "result_summary": result[:300] if isinstance(result, str) else str(result)[:300],
            "time": time.time()
        })


def get_recent_tool_calls(clear: bool = True) -> List[Dict[str, Any]]:
    """Retrieve and optionally clear the recent tool execution log."""
    with TOOL_LOG_LOCK:
        calls = list(TOOL_EXECUTION_LOG)
        if clear:
            TOOL_EXECUTION_LOG.clear()
        return calls


def _sanitize_name(name: str) -> str:
    """Sanitize project or folder names to prevent directory traversal."""
    cleaned = re.sub(r'[^a-zA-Z0-9_\-]', '_', name.strip())
    return cleaned or "default_project"


def _get_project_dir(project_name: str) -> str:
    """Get the sanitized safe path to a project directory."""
    clean_name = _sanitize_name(project_name)
    target_dir = os.path.abspath(os.path.join(BASE_PROJECTS_DIR, clean_name))
    if not target_dir.startswith(BASE_PROJECTS_DIR):
        raise ValueError("Invalid project path.")
    return target_dir


def _get_free_port() -> int:
    """Find a random open TCP port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def create_project(project_name: str) -> str:
    """Create a new project workspace directory for a website or app.
    
    Args:
        project_name: The name of the project (e.g. 'portfolio', 'ecommerce_store', 'weather_app').
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    os.makedirs(project_dir, exist_ok=True)
    res = f"Project '{clean_name}' created successfully at {project_dir}"
    record_tool_call("create_project", {"project_name": project_name}, res)
    return res


def write_file(project_name: str, file_path: str, content: str) -> str:
    """Write or overwrite a file inside a project directory.
    
    Use this tool to create or update HTML, CSS, JavaScript, JSON, or any other code files for the website.
    
    Args:
        project_name: The name of the project to write to.
        file_path: The relative path of the file (e.g. 'index.html', 'css/style.css', 'js/main.js', 'data.json').
        content: The complete raw source code to write into the file.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    os.makedirs(project_dir, exist_ok=True)

    normalized_path = os.path.normpath(file_path.strip("/\\"))
    full_path = os.path.abspath(os.path.join(project_dir, normalized_path))

    if not full_path.startswith(project_dir):
        res = f"Error: Cannot write outside of project directory: {file_path}"
        record_tool_call("write_file", {"project_name": project_name, "file_path": file_path}, res)
        return res

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

    res = f"Successfully saved '{normalized_path}' ({len(content)} characters) in project '{clean_name}'."
    record_tool_call("write_file", {"project_name": project_name, "file_path": file_path, "size": len(content)}, res)
    return res


def read_file(project_name: str, file_path: str) -> str:
    """Read and return the content of an existing file in a project.
    
    Args:
        project_name: The name of the project.
        file_path: The relative path of the file to inspect.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    normalized_path = os.path.normpath(file_path.strip("/\\"))
    full_path = os.path.abspath(os.path.join(project_dir, normalized_path))

    if not full_path.startswith(project_dir) or not os.path.exists(full_path):
        res = f"Error: File '{file_path}' not found in project '{clean_name}'."
        record_tool_call("read_file", {"project_name": project_name, "file_path": file_path}, res)
        return res

    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        res = f"--- Content of {file_path} ---\n{content}"
        record_tool_call("read_file", {"project_name": project_name, "file_path": file_path}, f"Read {len(content)} characters")
        return res
    except Exception as e:
        res = f"Error reading file '{file_path}': {str(e)}"
        record_tool_call("read_file", {"project_name": project_name, "file_path": file_path}, res)
        return res


def list_project_files(project_name: str) -> str:
    """List all files and subdirectories inside a specific project.
    
    Args:
        project_name: The name of the project to inspect.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)

    if not os.path.exists(project_dir):
        res = f"Project '{clean_name}' does not exist yet."
        record_tool_call("list_project_files", {"project_name": project_name}, res)
        return res

    files_list = []
    for root, dirs, files in os.walk(project_dir):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), project_dir)
            files_list.append(rel.replace("\\", "/"))

    if not files_list:
        res = f"Project '{clean_name}' is currently empty."
    else:
        res = f"Files in project '{clean_name}':\n" + "\n".join(f"- {f}" for f in sorted(files_list))

    record_tool_call("list_project_files", {"project_name": project_name}, f"Found {len(files_list)} files")
    return res


def list_all_projects() -> str:
    """List all projects created so far."""
    if not os.path.exists(BASE_PROJECTS_DIR):
        res = "No projects have been created yet."
        record_tool_call("list_all_projects", {}, res)
        return res

    projects = [d for d in os.listdir(BASE_PROJECTS_DIR) if os.path.isdir(os.path.join(BASE_PROJECTS_DIR, d))]
    if not projects:
        res = "No projects found in the workspace."
    else:
        res = "Available projects:\n" + "\n".join(f"- {p}" for p in sorted(projects))

    record_tool_call("list_all_projects", {}, f"{len(projects)} projects available")
    return res


def preview_project_website(project_name: str, open_in_browser: bool = True) -> str:
    """Start a local web server to preview the built website and optionally open it in the default browser.
    
    Args:
        project_name: The name of the project to preview.
        open_in_browser: Whether to automatically launch the default browser window.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)

    if not os.path.exists(project_dir):
        res = f"Error: Project '{clean_name}' does not exist."
        record_tool_call("preview_project_website", {"project_name": project_name}, res)
        return res

    index_path = os.path.join(project_dir, "index.html")
    if not os.path.exists(index_path):
        res = f"Notice: Project '{clean_name}' does not have an 'index.html' file yet."
        record_tool_call("preview_project_website", {"project_name": project_name}, res)
        return res

    with SERVER_LOCK:
        if clean_name in ACTIVE_SERVERS:
            port = ACTIVE_SERVERS[clean_name]["port"]
            url = f"http://127.0.0.1:{port}/"
            if open_in_browser:
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
            res = f"Website for '{clean_name}' is already running at {url}"
            record_tool_call("preview_project_website", {"project_name": project_name}, res)
            return res

        port = _get_free_port()

        class CustomHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=project_dir, **kwargs)

            def log_message(self, format, *args):
                pass

        try:
            httpd = socketserver.TCPServer(("127.0.0.1", port), CustomHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()

            ACTIVE_SERVERS[clean_name] = {
                "port": port,
                "server": httpd,
                "thread": thread
            }
            url = f"http://127.0.0.1:{port}/"

            if open_in_browser:
                try:
                    webbrowser.open(url)
                except Exception:
                    pass

            res = f"Preview server started for '{clean_name}'! Live URL: {url}"
            record_tool_call("preview_project_website", {"project_name": project_name, "port": port}, res)
            return res
        except Exception as e:
            res = f"Failed to start server for '{clean_name}': {str(e)}"
            record_tool_call("preview_project_website", {"project_name": project_name}, res)
            return res


def create_website(project_name: str, html_content: str, css_content: str = "", js_content: str = "") -> str:
    """Create a complete website project in one atomic operation and start its live preview server.
    
    Args:
        project_name: Name of the project (e.g. 'portfolio', 'saas_landing', 'crypto_tracker', 'pomodoro').
        html_content: The HTML code for index.html.
        css_content: Optional CSS stylesheet content. If provided, saved to 'style.css'.
        js_content: Optional JavaScript code. If provided, saved to 'script.js'.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    os.makedirs(project_dir, exist_ok=True)

    # Save index.html
    index_path = os.path.join(project_dir, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    saved_files = ["index.html"]

    # Save style.css if provided
    if css_content and css_content.strip():
        css_path = os.path.join(project_dir, "style.css")
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(css_content)
        saved_files.append("style.css")

    # Save script.js if provided
    if js_content and js_content.strip():
        js_path = os.path.join(project_dir, "script.js")
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        saved_files.append("script.js")

    # Automatically start preview
    preview_info = preview_project_website(clean_name, open_in_browser=True)

    res = (
        f"Project '{clean_name}' created successfully with files: {', '.join(saved_files)}!\n"
        f"{preview_info}"
    )
    record_tool_call("create_website", {"project_name": project_name, "files": saved_files}, res)
    return res


def run_python_code(code: str) -> str:
    """Execute Python code safely and return its standard output, return value, or errors.
    
    Use this tool to perform complex calculations, test algorithms, analyze data, process JSON,
    or run Python scripts requested by the user.
    
    Args:
        code: The Python source code string to execute.
    """
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=15
        )
        output = proc.stdout.strip()
        errors = proc.stderr.strip()

        result_parts = []
        if output:
            result_parts.append(f"Output:\n{output}")
        if errors:
            result_parts.append(f"Errors/Warnings:\n{errors}")
        if not output and not errors:
            result_parts.append("Code executed successfully with no console output.")

        result_parts.append(f"[Exit code: {proc.returncode}]")
        final_res = "\n\n".join(result_parts)
    except subprocess.TimeoutExpired:
        final_res = "Execution timed out (15 seconds limit)."
    except Exception as e:
        final_res = f"Execution failed: {str(e)}"

    record_tool_call("run_python_code", {"code_snippet": code[:100] + "..."}, final_res)
    return final_res


def fetch_web_content(url: str) -> str:
    """Fetch and extract readable text content from a web URL.
    
    Use this tool to read web documentation, check APIs, or inspect online content.
    
    Args:
        url: The web URL to fetch (must start with http:// or https://).
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        res = "Error: URL must start with http:// or https://"
        record_tool_call("fetch_web_content", {"url": url}, res)
        return res

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GeminiAgent/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            content_type = response.headers.get("Content-Type", "")
            raw = response.read()
            text = raw.decode("utf-8", errors="replace")

            # Simple strip of script, style, and html tags
            text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            clean_text = ' '.join(text.split())

            if len(clean_text) > 3500:
                clean_text = clean_text[:3500] + "... [truncated]"

            res = f"Web content from {url} ({content_type}):\n{clean_text}"
            record_tool_call("fetch_web_content", {"url": url}, f"Fetched {len(clean_text)} chars")
            return res
    except Exception as e:
        res = f"Failed to fetch {url}: {str(e)}"
        record_tool_call("fetch_web_content", {"url": url}, res)
        return res


def create_project_zip(project_name: str) -> str:
    """Package an entire project directory into a downloadable .zip archive.
    
    Args:
        project_name: Name of the project to zip (e.g. 'portfolio', 'neon_counter').
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    if not os.path.exists(project_dir):
        res = f"Error: Project '{clean_name}' does not exist."
        record_tool_call("create_project_zip", {"project_name": project_name}, res)
        return res

    zip_path = os.path.join(BASE_PROJECTS_DIR, f"{clean_name}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(project_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_dir)
                zipf.write(file_path, arcname)

    size_kb = os.path.getsize(zip_path) / 1024
    res = f"Project '{clean_name}' successfully zipped to '{zip_path}' ({size_kb:.1f} KB)."
    record_tool_call("create_project_zip", {"project_name": project_name}, res)
    return res


def delete_project(project_name: str) -> str:
    """Delete a project directory and stop any active preview servers.
    
    Args:
        project_name: Name of the project to remove.
    """
    clean_name = _sanitize_name(project_name)
    project_dir = _get_project_dir(clean_name)
    if not os.path.exists(project_dir):
        res = f"Notice: Project '{clean_name}' does not exist."
        record_tool_call("delete_project", {"project_name": project_name}, res)
        return res

    with SERVER_LOCK:
        if clean_name in ACTIVE_SERVERS:
            try:
                ACTIVE_SERVERS[clean_name]["server"].shutdown()
            except Exception:
                pass
            del ACTIVE_SERVERS[clean_name]

    shutil.rmtree(project_dir, ignore_errors=True)
    zip_path = os.path.join(BASE_PROJECTS_DIR, f"{clean_name}.zip")
    if os.path.exists(zip_path):
        try:
            os.remove(zip_path)
        except Exception:
            pass

    res = f"Project '{clean_name}' has been deleted."
    record_tool_call("delete_project", {"project_name": project_name}, res)
    return res


# Collection of tools available to the AI Agent
ALL_TOOLS = [
    create_website,
    create_project,
    write_file,
    read_file,
    list_project_files,
    list_all_projects,
    preview_project_website,
    run_python_code,
    fetch_web_content,
    create_project_zip,
    delete_project
]
