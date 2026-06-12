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

    if (request.method === "POST" && url.pathname === "/parse-list") {
      const { text } = await request.json();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `חלצי את פריטי הקניות מהטקסט הבא. החזירי כל פריט בשורה נפרדת בלבד, ללא מספרים ללא מקפים ללא כוכביות ללא כמויות.\n\nטקסט: "${text}"`,
          }],
        }),
      });
      const data = await res.json();
      const items = (data.content?.[0]?.text || "").split("\n").map(s => s.trim()).filter(Boolean);
      return new Response(JSON.stringify({ items }), { headers: { ...CORS, "content-type": "application/json" } });
    }

    if (request.method === "POST" && url.pathname === "/summarize-email") {
      const { subject, sender, body, format } = await request.json();

      const formatInstructions = {
        bullets:  "סכמי את המייל ב-3-5 נקודות קצרות בעברית.",
        summary:  "כתבי סיכום קצר של 2-3 משפטים בעברית.",
        tasks:    "חלצי את כל המשימות שיש לבצע מהמייל. כל משימה בשורה נפרדת, ללא מספרים.",
        dates:    "חלצי את כל התאריכים, מועדים ואירועים מהמייל. פורמט: YYYY-MM-DD | תיאור. כל שורה נפרדת.",
      };

      const prompt = `מאת: ${sender}\nנושא: ${subject}\n\nתוכן:\n${body.slice(0, 3000)}\n\n---\n${formatInstructions[format] || formatInstructions.summary}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const result = data.content?.[0]?.text || "";
      return new Response(JSON.stringify({ result }), { headers: { ...CORS, "content-type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
