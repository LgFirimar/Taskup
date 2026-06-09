const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/breakdown") {
      const { task } = await request.json();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{
            role: "user",
            content: `פרקי את המשימה הבאה ל-3 עד 5 צעדים קטנים וברורים מאוד. החזירי את הצעדים בלבד, כל צעד בשורה נפרדת, ללא מספרים ללא מקפים ללא כוכביות.\n\nמשימה: "${task}"`,
          }],
        }),
      });
      const data = await res.json();
      const steps = (data.content?.[0]?.text || "").split("\n").map(s => s.trim()).filter(Boolean);
      return new Response(JSON.stringify({ steps }), { headers: { ...CORS, "content-type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
