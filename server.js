
const http = require("http");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/health" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      assistant: "GOPU",
      message: "GOPU AI is ready."
    }));
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });

    req.on("end", async () => {
      try {
        const input = JSON.parse(body);
        const message = typeof input.message === "string"
          ? input.message.trim()
          : "";

        if (!message) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Please enter a message." }));
          return;
        }

        // Keep only recent, valid conversation messages.
        const history = Array.isArray(input.history)
          ? input.history.slice(-10).filter(item =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
            ).map(item => ({
              role: item.role,
              content: item.content.slice(0, 2000)
            }))
          : [];
// GOPU ki conversation memory
const previousChat = history
  .map(item => `${item.role}: ${item.content}`)
  .join("\n");

  // Remember simple personal facts from conversation history
const combinedHistory = history
  .filter(item => item.role === "user")
  .map(item => item.content)
  .join(" ");

const colourMatch = combinedHistory.match(
  /(?:my favourite colour is|my favorite color is)\s+([a-z]+)/i
);

if (
  colourMatch &&
  /what is my favourite colour|what is my favorite color/i.test(message)
) {
  res.writeHead(200);
  res.end(JSON.stringify({
    reply: "Your favourite colour is " + colourMatch[1] + "."
  }));
  return;
}
const messages = [
  {
    role: "system",
    content:
      "You are GOPU, Gopal's personal AI assistant. " +
      "You must carefully read and use the entire conversation history. " +
      "Remember personal facts Gopal tells you, including his preferences. " +
      "If Gopal says his favourite colour is blue, remember that " +
      "and answer blue when he asks for his favourite colour. " +
      "Never replace a fact Gopal explicitly told you with a generic answer. " +
      "Reply in clear, natural English by default. " +
      "Be friendly, helpful, and concise.\n\n" +
      "Previous conversation:\n" +
      (previousChat || "No previous conversation yet.")
  },
  ...history,
  { role: "user", content: message }
];

        const aiResponse = await fetch(
          "http://127.0.0.1:11434/api/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "qwen2.5:0.5b",
              messages,
              stream: false
            })
          }
        );

        const data = await aiResponse.json();

        if (!aiResponse.ok) {
          res.writeHead(502);
          res.end(JSON.stringify({
            error: data.error || "Ollama request failed."
          }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          reply: data.message?.content || "Sorry, I could not answer that."
        }));
      } catch (error) {
        console.error("GOPU backend error:", error.message);
        res.writeHead(500);
        res.end(JSON.stringify({
          error: "GOPU could not connect to its local AI. Check Ollama."
        }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Route nahi mili" }));
});

server.listen(3000, "127.0.0.1", () => {
  console.log("GOPU AI server: http://127.0.0.1:3000");
  console.log("Chat endpoint: http://127.0.0.1:3000/api/chat");
});
