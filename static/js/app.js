/**
 * Gemini AI Agent Dashboard Frontend Controller
 * Manages Chat, Live Website Preview, Code Explorer, Project Zipping & Tool Monitoring
 */

document.addEventListener("DOMContentLoaded", () => {
  // Navigation & Header elements
  const currentModelDisplay = document.getElementById("currentModelDisplay");
  const charCount = document.getElementById("charCount");
  const btnNewChat = document.getElementById("btnNewChat");
  const btnViewTools = document.getElementById("btnViewTools");
  const toolsModal = document.getElementById("toolsModal");
  const btnCloseToolsModal = document.getElementById("btnCloseToolsModal");
  const toolsListContainer = document.getElementById("toolsListContainer");

  // Chat elements
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const messagesContainer = document.getElementById("messagesContainer");

  // Preview elements
  const previewIframe = document.getElementById("previewIframe");
  const previewAddress = document.getElementById("previewAddress");
  const projectSelect = document.getElementById("projectSelect");
  const btnReloadPreview = document.getElementById("btnReloadPreview");
  const btnOpenExternal = document.getElementById("btnOpenExternal");
  const btnDownloadZip = document.getElementById("btnDownloadZip");
  const iframeContainer = document.getElementById("iframeContainer");
  const viewportTag = document.getElementById("viewportTag");
  const emptyPreviewNotice = document.getElementById("emptyPreviewNotice");
  const projectCount = document.getElementById("projectCount");

  // Code Explorer elements
  const projectFileList = document.getElementById("projectFileList");
  const currentEditingFile = document.getElementById("currentEditingFile");
  const codeEditorTextarea = document.getElementById("codeEditorTextarea");
  const btnSaveFile = document.getElementById("btnSaveFile");

  // Gallery & Toast
  const galleryGrid = document.getElementById("galleryGrid");
  const toastContainer = document.getElementById("toastContainer");

  // State
  let currentProject = "";
  let projectFilesCache = {};
  let currentSelectedFile = "index.html";

  // Auto-resize textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
    charCount.textContent = `${userInput.value.length} chars`;
  });

  // Enter to send (Shift+Enter for newline)
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (userInput.value.trim()) {
        chatForm.dispatchEvent(new Event("submit"));
      }
    }
  });

  // Fetch initial projects list
  loadProjects();

  // Handle Chat Submit
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    // Append user message card
    appendMessage("user", message);
    userInput.value = "";
    userInput.style.height = "auto";
    charCount.textContent = "0 chars";
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Add typing indicator
    const typingId = appendTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await res.json();
      removeTypingIndicator(typingId);

      if (data.error) {
        appendMessage("assistant", `❌ **Error:** ${data.error}`);
      } else {
        // Update model badge if changed
        if (data.model) {
          currentModelDisplay.textContent = data.model;
        }

        // Render assistant response with tool calls telemetry
        appendMessage("assistant", data.response, data.latest_project, data.tool_calls);

        // If a project was created/modified, update preview
        if (data.latest_project) {
          currentProject = data.latest_project;
          loadProjects(currentProject);
          loadPreview(currentProject);
          showToast(`🚀 Website ready: ${currentProject}`);
        }
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage("assistant", `❌ **Connection error:** ${err.message}`);
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  });

  // Quick Starter Prompts
  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      userInput.value = prompt;
      userInput.style.height = "auto";
      userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
      chatForm.dispatchEvent(new Event("submit"));
    });
  });

  // New Chat / Reset
  btnNewChat.addEventListener("click", async () => {
    if (!confirm("Start a new conversation session?")) return;
    try {
      await fetch("/api/reset", { method: "POST" });
      messagesContainer.innerHTML = `
        <div class="message-card assistant">
          <div class="avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </div>
          <div class="bubble">
            <div class="bubble-header">TEAM 31</div>
            <div class="bubble-content">
              <p>Conversation reset. How can I help you today? You can ask a question, execute Python code, or request a new website to be built!</p>
            </div>
          </div>
        </div>
      `;
      showToast("Conversation cleared.");
    } catch (err) {
      showToast(`Error resetting: ${err.message}`);
    }
  });

  // Tools Modal
  btnViewTools.addEventListener("click", async () => {
    toolsModal.style.display = "flex";
    toolsListContainer.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Loading tools metadata...</div>`;
    try {
      const res = await fetch("/api/tools");
      const data = await res.json();
      const tools = data.tools || [];
      toolsListContainer.innerHTML = "";
      tools.forEach((t) => {
        const item = document.createElement("div");
        item.className = "tool-item-card";
        item.innerHTML = `
          <div class="tool-item-header">
            <span class="tool-name-badge">${t.name}</span>
          </div>
          <p class="tool-desc-text">${escapeHtml(t.doc)}</p>
        `;
        toolsListContainer.appendChild(item);
      });
    } catch (e) {
      toolsListContainer.innerHTML = `<div style="color: #ef4444;">Failed to load tools: ${e.message}</div>`;
    }
  });

  btnCloseToolsModal.addEventListener("click", () => {
    toolsModal.style.display = "none";
  });

  toolsModal.addEventListener("click", (e) => {
    if (e.target === toolsModal) {
      toolsModal.style.display = "none";
    }
  });

  // Tab Navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));

      btn.classList.add("active");
      const tabName = btn.getAttribute("data-tab");
      if (tabName === "preview") {
        document.getElementById("tabPreview").classList.add("active");
      } else if (tabName === "code") {
        document.getElementById("tabCode").classList.add("active");
        if (currentProject) loadCodeExplorer(currentProject);
      } else if (tabName === "projects") {
        document.getElementById("tabProjects").classList.add("active");
        renderProjectsGallery();
      }
    });
  });

  // Viewport Switcher
  document.querySelectorAll(".vp-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".vp-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const width = btn.getAttribute("data-width");
      if (width === "100%") {
        iframeContainer.style.width = "calc(100% - 32px)";
        viewportTag.textContent = "100%";
      } else {
        iframeContainer.style.width = width;
        viewportTag.textContent = width;
      }
    });
  });

  // Project Dropdown Change
  projectSelect.addEventListener("change", (e) => {
    currentProject = e.target.value;
    if (currentProject) {
      loadPreview(currentProject);
      loadCodeExplorer(currentProject);
    }
  });

  // Reload Preview
  btnReloadPreview.addEventListener("click", () => {
    if (currentProject) {
      previewIframe.src = `/preview/${currentProject}/?_t=${Date.now()}`;
      showToast("Preview reloaded.");
    }
  });

  // Open External Browser Tab
  btnOpenExternal.addEventListener("click", () => {
    if (currentProject) {
      window.open(`/preview/${currentProject}/`, "_blank");
    }
  });

  // Download ZIP Button
  btnDownloadZip.addEventListener("click", () => {
    if (currentProject) {
      window.location.href = `/api/project/${currentProject}/download`;
      showToast(`Downloading ${currentProject}.zip...`);
    } else {
      showToast("No active project to download.");
    }
  });

  // Save File in Code Editor
  btnSaveFile.addEventListener("click", async () => {
    if (!currentProject || !currentSelectedFile) return;
    const content = codeEditorTextarea.value;

    try {
      const res = await fetch(`/api/project/${currentProject}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: currentSelectedFile,
          content: content
        })
      });

      const data = await res.json();
      if (data.success) {
        projectFilesCache[currentSelectedFile] = content;
        showToast(`Saved ${currentSelectedFile} successfully!`);
        // Reload preview frame
        previewIframe.src = `/preview/${currentProject}/?_t=${Date.now()}`;
      } else {
        showToast(`Save failed: ${data.error}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });

  // Helper: Append Message to Chat
  function appendMessage(role, text, projectKey = null, toolCalls = []) {
    const card = document.createElement("div");
    card.className = `message-card ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = role === "user" ? "You" : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const header = document.createElement("div");
    header.className = "bubble-header";
    header.textContent = role === "user" ? "You" : "TEAM 31";

    const content = document.createElement("div");
    content.className = "bubble-content";

    // Parse Markdown safely
    try {
      content.innerHTML = marked.parse(text);
      // Code highlighting and copy button
      content.querySelectorAll("pre code").forEach((el) => {
        hljs.highlightElement(el);
        const pre = el.parentElement;
        const wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-code-btn";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(el.textContent);
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
        });
        wrapper.appendChild(copyBtn);
      });
    } catch (e) {
      content.textContent = text;
    }

    bubble.appendChild(header);
    bubble.appendChild(content);

    // If tool calls executed, render execution tray
    if (toolCalls && toolCalls.length > 0) {
      const tray = document.createElement("div");
      tray.className = "tool-tray";
      toolCalls.forEach((tc) => {
        const pill = document.createElement("div");
        pill.className = "tool-pill";
        const icon = getToolIcon(tc.tool);
        pill.innerHTML = `
          <span class="tool-pill-icon">${icon}</span>
          <span>${tc.tool}</span>
          <span class="tool-pill-summary">${escapeHtml(tc.result_summary || "")}</span>
        `;
        tray.appendChild(pill);
      });
      bubble.appendChild(tray);
    }

    // If website action detected, add quick action card
    if (projectKey && role === "assistant") {
      const badge = document.createElement("div");
      badge.className = "tool-badge-card";
      badge.innerHTML = `
        <div class="tool-badge-info">
          <span>🌐 Project: <strong>${projectKey}</strong></span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="tool-badge-btn" onclick="window.previewProject('${projectKey}')">
            View Live Preview ➔
          </button>
          <button class="tool-badge-btn" style="background: rgba(16, 185, 129, 0.2); color: #10b981;" onclick="window.downloadProjectZip('${projectKey}')">
            Download ZIP
          </button>
        </div>
      `;
      bubble.appendChild(badge);
    }

    card.appendChild(avatar);
    card.appendChild(bubble);

    messagesContainer.appendChild(card);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function getToolIcon(name) {
    if (name.includes("website") || name.includes("project")) return "🌐";
    if (name.includes("python") || name.includes("code")) return "🐍";
    if (name.includes("file")) return "📄";
    if (name.includes("web") || name.includes("fetch")) return "🔍";
    if (name.includes("zip")) return "📦";
    return "⚡";
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Global helper for badge click
  window.previewProject = function (name) {
    currentProject = name;
    projectSelect.value = name;
    loadPreview(name);
    document.querySelector('.tab-btn[data-tab="preview"]').click();
  };

  window.downloadProjectZip = function (name) {
    window.location.href = `/api/project/${name}/download`;
    showToast(`Downloading ${name}.zip...`);
  };

  window.deleteProject = async function (name) {
    if (!confirm(`Are you sure you want to permanently delete project '${name}'?`)) return;
    try {
      const res = await fetch(`/api/project/${name}/delete`, { method: "POST" });
      const data = await res.json();
      showToast(data.message || `Deleted ${name}`);
      if (currentProject === name) currentProject = "";
      loadProjects();
      renderProjectsGallery();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // Helper: Typing Indicator
  function appendTypingIndicator() {
    const id = "typing-" + Date.now();
    const card = document.createElement("div");
    card.id = id;
    card.className = "message-card assistant";
    card.innerHTML = `
      <div class="avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg></div>
      <div class="bubble">
        <div class="bubble-header">TEAM 31</div>
        <div class="bubble-content" style="color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
          <span>Reasoning & executing tools...</span>
          <span class="pulse-dot"></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(card);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Helper: Load Projects List
  async function loadProjects(selectProjectName = null) {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const projects = data.projects || [];

      projectCount.textContent = projects.length;

      // Populate dropdown
      projectSelect.innerHTML = "";
      if (projects.length === 0) {
        projectSelect.innerHTML = `<option value="" disabled selected>No projects yet</option>`;
        emptyPreviewNotice.style.display = "flex";
        previewIframe.style.display = "none";
        return;
      }

      emptyPreviewNotice.style.display = "none";
      previewIframe.style.display = "block";

      projects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.file_count} files)`;
        projectSelect.appendChild(opt);
      });

      // Default select
      if (selectProjectName && projects.some((p) => p.name === selectProjectName)) {
        currentProject = selectProjectName;
      } else if (!currentProject && projects.length > 0) {
        currentProject = projects[0].name;
      }

      projectSelect.value = currentProject;
      if (currentProject) {
        loadPreview(currentProject);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }

  // Helper: Load Preview
  function loadPreview(name) {
    if (!name) return;
    const url = `/preview/${name}/`;
    previewIframe.src = url;
    previewAddress.textContent = window.location.origin + url;
  }

  // Helper: Load Code Explorer
  async function loadCodeExplorer(name) {
    if (!name) return;
    try {
      const res = await fetch(`/api/project/${name}/files`);
      const data = await res.json();
      projectFilesCache = data.files || {};

      projectFileList.innerHTML = "";
      const fileNames = Object.keys(projectFilesCache);

      if (fileNames.length === 0) {
        projectFileList.innerHTML = `<div style="padding: 10px; color: var(--text-muted);">No files found.</div>`;
        codeEditorTextarea.value = "";
        return;
      }

      if (!fileNames.includes(currentSelectedFile)) {
        currentSelectedFile = fileNames[0];
      }

      fileNames.forEach((file) => {
        const item = document.createElement("div");
        item.className = `file-item ${file === currentSelectedFile ? "active" : ""}`;
        item.textContent = file;
        item.addEventListener("click", () => {
          document.querySelectorAll(".file-item").forEach((el) => el.classList.remove("active"));
          item.classList.add("active");
          currentSelectedFile = file;
          currentEditingFile.textContent = file;
          codeEditorTextarea.value = projectFilesCache[file] || "";
        });
        projectFileList.appendChild(item);
      });

      currentEditingFile.textContent = currentSelectedFile;
      codeEditorTextarea.value = projectFilesCache[currentSelectedFile] || "";
    } catch (err) {
      console.error("Failed to load code explorer", err);
    }
  }

  // Helper: Render Projects Gallery
  async function renderProjectsGallery() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const projects = data.projects || [];

      galleryGrid.innerHTML = "";
      if (projects.length === 0) {
        galleryGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No projects created yet. Prompt the AI agent to build one!</p>`;
        return;
      }

      projects.forEach((p) => {
        const card = document.createElement("div");
        card.className = "project-card";
        card.innerHTML = `
          <div class="project-card-header">
            <span class="project-card-name">${p.name}</span>
            <span class="project-card-files">${p.file_count} files</span>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); word-break: break-all;">Files: ${p.files.join(", ")}</p>
          <div class="project-card-actions">
            <button class="btn-card primary" onclick="window.previewProject('${p.name}')">Preview</button>
            <button class="btn-card secondary" onclick="window.open('/preview/${p.name}/', '_blank')">New Window</button>
            <button class="btn-card download" onclick="window.downloadProjectZip('${p.name}')">ZIP</button>
            <button class="btn-card danger" onclick="window.deleteProject('${p.name}')">Delete</button>
          </div>
        `;
        galleryGrid.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to render gallery", err);
    }
  }

  // Helper: Show Toast
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
});
