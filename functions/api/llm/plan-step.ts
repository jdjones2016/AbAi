// /functions/api/llm/plan-step.ts
export const onRequestPost: PagesFunction = async (ctx) => {
  const { OPENAI_API_KEY, OPENAI_MODEL_CHAT } = ctx.env as any;
  const body = await ctx.request.json().catch(() => ({}));
  let { messages = [], design = {}, inventory = [] } = body;

  const API_URL = "https://api.openai.com/v1/chat/completions";
  const MODEL = OPENAI_MODEL_CHAT || "gpt-4o-mini";

  // 1) Build tool so the model can return a JSON patch of facts
  const tools = [
    {
      type: "function",
      function: {
        name: "set_facts_patch",
        description:
          "Return only new facts inferred from the latest user messages. Never repeat fields already present in 'design'.",
        parameters: {
          type: "object",
          properties: {
            facts_patch: {
              type: "object",
              description:
                "Minimal patch to merge into 'design'. Keys may include goal, species, target, availableEquipment (array of strings), constraints {budgetUSD, timeLimitHours}, blastRequired (boolean).",
            },
            assistant_note: { type: "string", description: "Optional short note" },
          },
          required: ["facts_patch"],
        },
      },
    },
  ];

  // Helper: next missing field (keeps the bot from re-asking)
  const needs = (d: any) => {
    if (!d.goal) return "goal";
    if (!d.species) return "species";
    if (!d.target) return "target";
    if (!d.availableEquipment || d.availableEquipment.length === 0) return "equipment";
    const c = d?.constraints || {};
    if (c.budgetUSD == null || c.timeLimitHours == null) return "constraints";
    return null;
  };
  const promptFor = (k: string | null) =>
    k === "goal"
      ? "What's your experimental goal?"
      : k === "species"
      ? "Which species are the cells/tissue from?"
      : k === "target"
      ? "What protein/structure are you targeting?"
      : k === "equipment"
      ? "Optionally, attach microscope/equipment photos — I can auto-detect models/channels."
      : k === "constraints"
      ? "Any constraints? (budget in USD, and time limit in hours)"
      : null;

  // 2) First call — ask the model to emit a tool call with a facts patch
  const sysExtract =
    "You are AbAI. Extract only NEW facts from the latest user message as JSON via the provided function. " +
    "Do not ask questions. Do not include anything already present in the supplied design JSON.";
  const extractPayload = {
    model: MODEL,
    temperature: 0.2,
    tools,
    tool_choice: "auto" as const,
    messages: [
      { role: "system", content: sysExtract },
      { role: "system", content: "Design JSON (read-only): " + JSON.stringify(design) },
      ...messages.map((m: any) => ({ role: m.role, content: String(m.content || "") })),
    ],
  };

  let facts_patch: any = {};
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(extractPayload),
    });
    const data = await r.json();
    const choice = data?.choices?.[0];
    const toolCalls = choice?.message?.tool_calls || [];
    for (const tc of toolCalls) {
      if (tc.function?.name === "set_facts_patch") {
        const args = safeParse(tc.function.arguments);
        if (args?.facts_patch && typeof args.facts_patch === "object") {
          facts_patch = args.facts_patch;
        }
      }
    }
  } catch (e) {
    // If OpenAI call fails, continue; we’ll still return a useful prompt
  }

  // Shallow-merge new facts (prefer existing values)
  design = mergeOnlyMissing(design, facts_patch);

  // 3) Second call — generate the assistant message (one next thing only)
  const next = needs(design);
  const sysChat =
    "You are AbAI. Be concise. If any required field is missing, ask ONLY for the next missing one. " +
    "If all required fields are present, say you will search protocols/antibodies and draft a protocol.";
  let assistant_message = promptFor(next) || "Great. I’ll search protocols and candidate antibodies and draft a protocol. Review the summary on the right.";

  try {
    const chatPayload = {
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: sysChat },
        { role: "system", content: "Design JSON (read-only): " + JSON.stringify(design) },
        ...messages.map((m: any) => ({ role: m.role, content: String(m.content || "") })),
      ],
    };
    const r2 = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(chatPayload),
    });
    const data2 = await r2.json();
    const text = data2?.choices?.[0]?.message?.content?.trim();
    if (text) {
      // guard: if model repeats something we already have, prefer our computed prompt
      const L = text.toLowerCase();
      const repeats =
        (design.species && L.includes("which species")) ||
        (design.target && (L.includes("target") || L.includes("protein") || L.includes("structure"))) ||
        (design.goal && L.includes("goal")) ||
        ((design?.constraints?.budgetUSD != null && design?.constraints?.timeLimitHours != null) &&
          (L.includes("budget") || L.includes("time"))) ||
        ((design.availableEquipment?.length || 0) > 0 && L.includes("attach microscope"));
      assistant_message = repeats ? assistant_message : text;
    }
  } catch (e) {
    // keep fallback assistant_message
  }

  return json({ assistant_message, facts_patch });

  /* ---------------- helpers ---------------- */
  function json(obj: unknown) {
    return new Response(JSON.stringify(obj), { headers: { "content-type": "application/json" } });
  }
  function safeParse(s: string) {
    try { return JSON.parse(s); } catch { return null; }
  }
  function mergeOnlyMissing(base: any, patch: any) {
    if (!patch || typeof patch !== "object") return base;
    const out = { ...base };
    for (const k of Object.keys(patch)) {
      const pv = patch[k];
      if (pv == null) continue;
      if (typeof pv === "object" && !Array.isArray(pv)) {
        out[k] = mergeOnlyMissing(base[k] || {}, pv);
      } else if (Array.isArray(pv)) {
        // only set if base is empty
        if (!Array.isArray(base[k]) || base[k].length === 0) out[k] = pv;
      } else {
        if (base[k] == null || base[k] === "") out[k] = pv;
      }
    }
    return out;
  }
};
