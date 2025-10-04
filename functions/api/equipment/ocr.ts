// /functions/api/equipment/ocr.ts  (Vision-based equipment extraction)
export const onRequestPost: PagesFunction = async (ctx) => {
  const { OPENAI_API_KEY, OPENAI_MODEL_VISION } = ctx.env as any;
  const MODEL = OPENAI_MODEL_VISION || "gpt-4o";

  const form = await ctx.request.formData();
  const files = form.getAll("file") as File[];

  // Build multi-modal message: each image as data URL
  const parts: any[] = [
    { type: "text", text: "Identify lab equipment (brand, model) and microscopy channels/filters if visible. Return JSON: {equipment: string[]}" },
  ];
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    parts.push({
      type: "image_url",
      image_url: { url: `data:${f.type};base64,${base64}` },
    });
  }

  // Call OpenAI (vision input in chat is supported; see docs) 
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a vision assistant for lab equipment identification. Always answer in compact JSON." },
        { role: "user", content: parts },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  const data = await r.json();
  let out = { equipment: [] as string[] };
  try {
    out = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
  } catch {}
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
};
