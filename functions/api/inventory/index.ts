let INV: any[] = []; // Replace with DB later

export const onRequestGet: PagesFunction = async () =>
  new Response(JSON.stringify(INV), { headers: { "content-type": "application/json" } });

export const onRequestPost: PagesFunction = async (ctx) => {
  const item = await ctx.request.json().catch(()=> ({}));
  const rec = { id: crypto.randomUUID(), ...item };
  INV.unshift(rec);
  return new Response(JSON.stringify(rec), { headers: { "content-type": "application/json" } });
};

export const onRequestPatch: PagesFunction = async (ctx) => {
  const patch = await ctx.request.json().catch(()=> ({}));
  if (patch.delete && Array.isArray(patch.ids)) {
    INV = INV.filter(x => !patch.ids.includes(x.id));
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }
  const idx = INV.findIndex(x => x.id === patch.id);
  if (idx >= 0) INV[idx] = { ...INV[idx], ...patch };
  return new Response(JSON.stringify(INV[idx] || null), { headers: { "content-type": "application/json" } });
};

export const onRequestDelete: PagesFunction = async () => {
  INV = [];
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
