export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(()=> ({}));
  const { goal, species, target, constraints } = body;

  // Later: call your real SEARCH_API_URL. For now: stub.
  const protocols = [
    { title: `IF for ${target || "Target"}`, url: "https://example.com/protocol", quality: 0.86, notes: "Adapt incubation to species." }
  ];
  const antibodies = [
    { name:`Anti-${target||"TARGET"} mAb`, vendor:"CellSignal", isPrimary:true, conjugate:"Unconjugated", host:"Rabbit", isotype:"IgG", reactivity:[species||"Human"], priceUSD:419, datasheetUrl:"https://example.com/ds" },
    { name:`Anti-Rabbit IgG (Alexa 488)`, vendor:"VendorX", isPrimary:false, conjugate:"Alexa 488", host:"Goat", priceUSD:199, datasheetUrl:"https://example.com/488" }
  ];

  return new Response(JSON.stringify({ protocols, antibodies }), { headers: { "content-type": "application/json" } });
};
