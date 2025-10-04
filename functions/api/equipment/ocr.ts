export const onRequestPost: PagesFunction = async (ctx) => {
  const form = await ctx.request.formData();
  const files = form.getAll("file"); // later: run vision/OCR on these
  // For now, return a canned list so the UI moves forward.
  const equipment = ["Generic Fluorescence Microscope (DAPI/FITC)", "CO2 Incubator", "Rocking Shaker"];
  return new Response(JSON.stringify({ equipment }), { headers: { "content-type": "application/json" } });
};
