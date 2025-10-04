export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(()=> ({}));
  const { design = {}, inventory = [] } = body;

  const need = (id: string) => !inventory.some((i: any) => (i.id || "").toLowerCase().includes(id));
  const items: any[] = [];

  if (need("triton")) items.push({
    image:"https://upload.wikimedia.org/wikipedia/commons/4/47/Placeholder.png",
    name:"Triton X-100", description:"Permeabilization agent", link:"https://example.com/triton",
    unitCost:42, units:1, total:42, rationale:"Needed; not in inventory"
  });
  if (need("bsa")) items.push({
    image:"https://upload.wikimedia.org/wikipedia/commons/4/47/Placeholder.png",
    name:"BSA (Fraction V)", description:"Blocking agent", link:"https://example.com/bsa",
    unitCost:55, units:1, total:55, rationale:"Needed; not in inventory"
  });

  const grandTotal = items.reduce((s, x)=> s + x.total, 0);
  return new Response(JSON.stringify({ items, grandTotal }), { headers: { "content-type": "application/json" } });
};
