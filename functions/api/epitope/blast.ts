export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(()=> ({}));
  const { target = "TARGET", species = "Species" } = body;

  // Later: call your real BLAST microservice here.
  const out = {
    epitopeSequence: "PEPTIDESEQPEPTIDE",
    bestHitTarget: `${target} (Human)`,
    identityPct: 82.3,
    candidateAntibody: `Anti-${target} (Rabbit mAb)`
  };
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
};
