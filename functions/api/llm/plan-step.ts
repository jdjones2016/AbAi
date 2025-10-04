export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(() => ({}));
  let { messages = [], design = {}, inventory = [] } = body;

  // ---- 1) Extract facts from the last user message so we never re-ask ----
  const lastUser = [...messages].reverse().find(m => m?.role === 'user')?.content || "";
  if (lastUser) {
    const patch = extractFacts(lastUser, design);
    design = deepMerge(design, patch); // only fill missing
  }

  // ---- 2) If you have a real LLM configured, call it (but guard against repeats) ----
  const USE_LLM = !!(ctx.env.LLM_API_URL && ctx.env.LLM_API_KEY);
  if (USE_LLM) {
    try {
      const payload = normalizeToProvider(messages, design, ctx.env.LLM_MODEL);
      const res = await fetch(ctx.env.LLM_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${ctx.env.LLM_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const facts_patch = {}; // we already merged our own patch
      let assistant_message = "";
      if (res.ok) {
        const data = await res.json();
        assistant_message =
          data?.choices?.[0]?.message?.content ||
          data?.message?.content ||
          data?.output ||
          "";
      } else {
        assistant_message = ""; // fall back to stub logic below
      }

      // If LLM repeats something we already have, nudge to the next missing fact.
      const missing = nextMissing(design);
      if (assistant_message) {
        const L = assistant_message.toLowerCase();
        const repeats =
          (design.species && L.includes("which species")) ||
          (design.target && (L.includes("target") || L.includes("protein") || L.includes("structure"))) ||
          (design.goal && L.includes("goal")) ||
          (hasConstraints(design) && (L.includes("budget") || L.includes("time")));
        if (repeats && missing) assistant_message = missing;
      } else {
        // fall back
        assistant_message = missing || readyMsg(design);
      }

      return json({ assistant_message, facts_patch });
    } catch (err) {
      // fall through to stub
    }
  }

  // ---- 3) Smart stub (works even without LLM) ----
  const missing = nextMissing(design);
  const assistant_message = missing || readyMsg(design);
  const facts_patch = {}; // already merged above
  return json({ assistant_message, facts_patch });

  /* ----------------- helpers ----------------- */

  function json(obj: unknown) {
    return new Response(JSON.stringify(obj), { headers: { "content-type": "application/json" } });
  }

  function readyMsg(d: any) {
    if (d.goal && d.species && d.target) {
      return "Great. I’ll search protocols and candidate antibodies and draft a protocol. You can then accept or tell me what to change.";
    }
    return "Tell me more about your plan.";
  }

  function hasConstraints(d: any) {
    return d?.constraints?.budgetUSD != null && d?.constraints?.timeLimitHours != null;
  }

  function nextMissing(d: any): string | null {
    if (!d.goal) return "What's your experimental goal?";
    if (!d.species) return "Which species are the cells/tissue from?";
    if (!d.target) return "What protein/structure are you targeting?";
    if (!d.availableEquipment || d.availableEquipment.length === 0) return "Optionally, attach microscope/equipment photos — I can auto-detect models/channels.";
    if (!hasConstraints(d)) return "Any constraints? (budget in USD, and time limit in hours)";
    return null;
  }

  function deepMerge(base: any, patch: any) {
    const out = { ...base };
    for (const k of Object.keys(patch)) {
      if (patch[k] == null) continue;
      if (typeof patch[k] === "object" && !Array.isArray(patch[k])) {
        out[k] = deepMerge(base[k] || {}, patch[k]);
      } else {
        // only set if missing/empty
        if (out[k] == null || (Array.isArray(out[k]) && out[k].length === 0) || (typeof out[k] === "string" && !out[k])) {
          out[k] = patch[k];
        }
      }
    }
    return out;
  }

  function extractFacts(text: string, current: any) {
    const t = text.toLowerCase();
    const patch: any = {};

    // goal (only if we don't have one)
    if (!current?.goal && text.trim().length > 20) patch.goal = text.trim();

    // species
    const speciesLex: Record<string,string[]> = {
      human:['human','h.sapiens','homo sapiens'],
      mouse:['mouse','mice','murine','mus musculus','m. musculus'],
      rat:['rat','rattus'],
      cow:['cow','bovine','cattle','bos taurus','b. taurus'],
      pig:['pig','porcine','sus scrofa'],
      sheep:['sheep','ovine','ovis aries','o. aries'],
      rabbit:['rabbit','lapine'],
      zebrafish:['zebrafish','danio rerio','d. rerio'],
      fly:['drosophila','fruit fly','d. melanogaster'],
      yeast:['yeast','saccharomyces','s. cerevisiae'],
      dog:['dog','canine','canis lupus familiaris']
    };
    if (!current?.species) {
      for (const k in speciesLex) {
        if (speciesLex[k].some(s => t.includes(s))) { patch.species = k; break; }
      }
    }

    // target protein/structure
    if (!current?.target) {
      const r = text.match(/\b(target|marker|using|stain(?:ing)? for|antibody against)\s+([A-Za-z0-9\-\/\s]{2,40})/i);
      if (r) {
        const cand = r[2].trim().replace(/\.$/,'');
        if (cand.length >= 2) patch.target = cand;
      } else {
        const g = text.match(/\b([A-Z0-9]{3,12})\b(?!\s*cells)/);
        if (g) patch.target = g[1];
      }
    }

    // constraints
    const c = { ...(current?.constraints || {}) };
    const m1 = text.match(/\$?\s*([0-9]{2,6})(\s*(usd|dollars))?\b/i);
    if (m1 && c.budgetUSD == null) c.budgetUSD = Number(m1[1]);
    const m2 = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|day|days|d)\b/i);
    if (m2 && c.timeLimitHours == null) {
      const n = parseFloat(m2[1]); const unit = m2[2].toLowerCase();
      c.timeLimitHours = /d/.test(unit) ? n*24 : n;
    }
    if (Object.keys(c).length) patch.constraints = c;

    return patch;
  }

  function normalizeToProvider(msgs: any[], d: any, model?: string) {
    const system = [
      { role: "system", content: "You are an assistant that guides scientists through designing an immunostaining experiment. Ask for only the next missing piece of information. Never ask for something already provided in the 'Design' state." },
      { role: "system", content: `Design state: ${JSON.stringify(d)}` }
    ];
    const chat = [...system, ...msgs.map(m => ({ role: m.role, content: String(m.content || "") }))];
    return { model: model || "default-model", messages: chat, temperature: 0.2 };
  }
};
