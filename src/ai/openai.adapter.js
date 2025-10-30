// src/ai/openai.adapter.js
export const OpenAIAdapter = {
  apiKey: "",

  init(key) {
    this.apiKey = key;
  },

  async ask(prompt) {
    if (!this.apiKey) return "⚠️ Please set your OpenAI API key first.";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an AI assistant for analytics dashboards. Keep answers concise and relevant." },
            { role: "user", content: prompt }
          ],
          max_tokens: 300
        })
      });

      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim() || "No response from AI.";
    } catch (err) {
      console.error("OpenAI error:", err);
      return "⚠️ Failed to connect to OpenAI API.";
    }
  }
};
