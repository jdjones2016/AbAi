// /functions/api/protocol/generate.ts
export const onRequestPost: PagesFunction = async (ctx) => {
  const { OPENAI_API_KEY, OPENAI_MODEL_CHAT } = ctx.env as any;
  const { design, inventory } = await ctx.request.json();

  const API_URL = "https://api.openai.com/v1/chat/completions";
  const MODEL = OPENAI_MODEL_CHAT || "gpt-4o-mini";

  const sys =
    "You are AbAI, an expert in immunostaining and microscopy. Write a precise, stepwise protocol in HTML " +
    "(with <h3> section headers and <ul>/<ol> lists), tailored to the design JSON. " +
    "Include exact buffer compositions, concentrations, incubation times, wash steps, and imaging guidance that matches available equipment. " +
    "If the species is non-standard or the selected antibodies are indirect, add notes and controls. Keep safety disclaimers short.";

  const user =
    "Design JSON:\n" +
    JSON.stringify({
      goal: design?.goal,
      species: design?.species,
      target: design?.target,
      availableEquipment: design?.availableEquipment,
      constraints: design?.constraints,
      selectedAntibodies: design?.selectedAntibodies,
      blastResult: design?.blastResult,
    });

  const r = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await r.json();
  const html = data?.choices?.[0]?.message?.content || "<p>(No protocol generated)</p>";
  return new Response(JSON.stringify({ protocolHtml: html }), {
    headers: { "content-type": "application/json" },
  });
};
