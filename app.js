/* app.js
   Framework UI controller: picks adapter (Tableau or CSV),
   handles queries, renders replies & charts, and integrates OpenAI.
*/

import { OpenAIAdapter } from "./src/ai/openai.adapter.js";

(async function () {
  const messagesEl = document.getElementById("messages");
  const inputForm = document.getElementById("inputForm");
  const userInput = document.getElementById("userInput");
  const statusEl = document.getElementById("status");
  const csvInput = document.getElementById("csvInput");
  const csvInfo = document.getElementById("csvInfo");
  const apiKeyInput = document.getElementById("openaiKey");
  const saveKeyBtn = document.getElementById("saveKey");

  let activeAdapter = null;
  let adapterName = "none";

  // === API Key Handling ===
  const savedKey = localStorage.getItem("openai_key");
  if (savedKey) {
    OpenAIAdapter.init(savedKey);
    apiKeyInput.value = savedKey;
  }

  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert("Please enter a valid API key.");
    localStorage.setItem("openai_key", key);
    OpenAIAdapter.init(key);
    alert("✅ API key saved!");
  });

  // === UI helpers ===
  function appendMessage(role, text) {
    if (!text) return;
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    wrap.innerHTML = `<div class="msg-text">${escapeHtml(text)}</div>
                      <div class="msg-time">${new Date().toLocaleTimeString()}</div>`;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  async function setAdapter(adapter, name) {
    activeAdapter = adapter;
    adapterName = name;
    const ok = await (adapter?.init ? adapter.init() : Promise.resolve(false));
    statusEl.textContent = `Adapter: ${name} (${ok ? "ready" : "not ready"})`;
    appendMessage("bot", ok
      ? `Adapter ready — ${name}. Try: "Top 5 sales"`
      : `Adapter ${name} not available.`);
  }

  async function detectAdapter() {
    appendMessage("bot", "Detecting environment...");
    if (window.tableau && window.Adapters?.TableauAdapter) {
      await setAdapter(window.Adapters.TableauAdapter, "Tableau");
      return;
    }
    if (window.Adapters?.CSVAdapter) {
      await setAdapter(window.Adapters.CSVAdapter, "CSV");
      appendMessage("bot", "No Tableau detected — upload a CSV to use the CSV adapter.");
      return;
    }
    appendMessage("bot", "No adapter available.");
  }

  csvInput.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    csvInfo.textContent = `Loading ${file.name} ...`;
    try {
      const info = await window.Adapters?.CSVAdapter?.loadFile(file);
      csvInfo.textContent = `${file.name} — ${info.rowCount} rows, ${info.columns.length} cols`;
      await setAdapter(window.Adapters.CSVAdapter, "CSV");
    } catch (err) {
      console.error(err);
      csvInfo.textContent = "Failed to load CSV";
      appendMessage("bot", "Failed to load CSV file.");
    }
  });

  inputForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    userInput.value = "";
    appendMessage("bot", "...");

    try {
      let result;

      // First, try dashboard adapter if available
      if (activeAdapter?.runQuery) {
        result = await activeAdapter.runQuery(text);
      }

      // If adapter didn't return valid data → use OpenAI
      if (!result || (!result.reply && !result.labels)) {
        const aiReply = await OpenAIAdapter.ask(text);
        const last = messagesEl.querySelector(".msg.bot:last-child");
        if (last?.textContent.trim() === "...") last.remove();
        appendMessage("bot", aiReply);
        return;
      }

      // Remove typing placeholder
      const last = messagesEl.querySelector(".msg.bot:last-child");
      if (last?.textContent.trim() === "...") last.remove();

      // Show reply text
      if (result.reply) appendMessage("bot", result.reply);

      // Render chart
      if (result.labels && result.values) {
        window.ChartHelper.drawBarChart(result.labels, result.values, result.measure || "");
      }

    } catch (err) {
      console.error(err);
      const last = messagesEl.querySelector(".msg.bot:last-child");
      if (last?.textContent.trim() === "...") last.remove();
      appendMessage("bot", "Error: " + (err.message || err));
    }
  });

  detectAdapter();
})();
