export const onRequestPost: PagesFunction = async (ctx) => {
  const body = await ctx.request.json().catch(()=> ({}));
  const { experiment } = body;

  const html = `
  <html><head><meta charset="utf-8"><title>${escapeHtml(experiment?.title || "Experiment")}</title></head>
  <body>
    <h1>${escapeHtml(experiment?.title || "Experiment")}</h1>
    <h2>Summary</h2><pre>${escapeHtml(experiment?.summary || "")}</pre>
    <h2>Inputs</h2>${table(experiment?.inputsTable || [])}
    ${experiment?.blastResults ? `<h2>BLAST Results</h2><pre>${escapeHtml(JSON.stringify(experiment.blastResults,null,2))}</pre>`:""}
    <h2>Bill of Materials</h2>${table(experiment?.bomTable || [])}
    <h2>Protocol</h2>${experiment?.protocolHtml || ""}
  </body></html>`;

  const dataUrl = "data:text/html;base64," + btoa(unescape(encodeURIComponent(html)));
  return new Response(JSON.stringify({ pdfUrl: dataUrl }), { headers: { "content-type": "application/json" } });

  function escapeHtml(s: string){ return (s||"").replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)); }
  function table(rows: any[][]){ if(!rows.length) return "<p>—</p>"; return "<table border=1 cellpadding=6>"+rows.map(r=>"<tr>"+r.map(c=>`<td>${escapeHtml(String(c||''))}</td>`).join("")+"</tr>").join("")+"</table>"; }
};
