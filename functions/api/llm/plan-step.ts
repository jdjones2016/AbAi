export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(() => ({}));
  const { messages = [], design = {}, inventory = [] } = body;

  // If you later set env vars LLM_API_URL and LLM_API_KEY in Cloudflare:
  // try calling your LLM here. For now we return a deterministic message.

  const last = messages[messages.length - 1]?.content?.toLowerCase() || "";
  const facts_patch: any = {};
  let assistant_message = "Tell me more about your goal.";

  if (!design.goal && last) {
    facts_patch.goal = messages[messages.length - 1].content;
    assistant_message = "Which species are the cells/tissue from?";
  } else if (!design.species) {
    assistant_message = "Which species are the cells/tissue from?";
  } else if (!design.target) {
    assistant_message = "What is your target protein/structure (e.g., MYOGENIN, DESMIN)?";
  } else if (!design.availableEquipment?.length) {
    assistant_message = "List available equipment or upload photos (microscope model, channels, incubator, shaker).";
  } else if (!design.constraints?.budgetUSD || !design.constraints?.timeLimitHours) {
    assistant_message = "Any constraints? (budget in USD, time limit in hours)";
  } else {
    assistant_message = "Great. I can search protocols/antibodies next. Say 'Search now' or 'Run BLAST'.";
  }

  return new Response(JSON.stringify({ assistant_message, facts_patch }), {
    headers: { "content-type": "application/json" },
  });
};
