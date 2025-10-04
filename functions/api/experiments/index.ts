let MEM: any[] = []; // Replace with DB later

export const onRequestGet: PagesFunction = async () =>
  new Response(JSON.stringify(MEM), { headers: { "content-type": "application/json" } });

export const onRequestPost: PagesFunction = async (ctx) => {
  const b = await ctx.request.json().catch(()=> ({}));
  const rec = { id: crypto.randomUUID(), ...b, date: new Date().toISOString() };
  MEM.unshift(rec);
  return new Response(JSON.stringify({ id: rec.id }), { headers: { "content-type": "application/json" } });
};
