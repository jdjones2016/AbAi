import data from './data.json';

type ValidationEvidence = {
  western?: boolean;
  icc?: boolean;
  ihc?: boolean;
  flow?: boolean;
  ip?: boolean;
  knockoutValidated?: boolean;
  citationCount?: number;
};

type Antibody = {
  id: string;
  name: string;
  target: string;
  clone?: string;
  vendor: string;
  catalogNumber: string;
  host: string;
  isMonoclonal: boolean;
  applicationValidated: string[];
  reactivity: string[];
  conjugate?: string;
  form: 'Liquid' | 'Lyophilized';
  concentration?: string;
  size: string;
  priceUSD: number;
  datasheetUrl: string;
  rrid?: string;
  isotype?: string;
  epitope?: string;
  validation: ValidationEvidence;
  notes?: string;
};

function score(a: Antibody, q: string, apps: string[], species: string[]) {
  let s = 0;
  const ql = q.trim().toLowerCase();
  if (ql) {
    if (a.target.toLowerCase().includes(ql)) s += 12;
    if (a.name.toLowerCase().includes(ql)) s += 6;
    if (a.clone && a.clone.toLowerCase().includes(ql)) s += 6;
  }
  apps.forEach(app => {
    if (a.applicationValidated.includes(app)) s += 5;
  });
  species.forEach(sp => {
    if (a.reactivity.some(r => r.toLowerCase() === sp.toLowerCase())) s += 3;
  });
  if (a.validation?.citationCount) s += Math.min(10, Math.floor(a.validation.citationCount / 50));
  if ((a.validation as any)?.knockoutValidated) s += 8;
  return s;
}

// Cloudflare Pages Functions handler
export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';
  const apps = (url.searchParams.get('apps') || '').split(',').filter(Boolean);
  const species = (url.searchParams.get('species') || '').split(',').filter(Boolean);
  const sort = url.searchParams.get('sort') || 'score';

  const items = (data as any).antibodies as Antibody[];
  const filtered = items
    .map(a => ({ ...a, _score: score(a, q, apps, species) }))
    .filter(a => {
      const ql = q.toLowerCase();
      if (ql && !(a.target.toLowerCase().includes(ql) || a.name.toLowerCase().includes(ql) || (a.clone||'').toLowerCase().includes(ql))) return false;
      if (apps.length && !apps.every(app => a.applicationValidated.includes(app))) return false;
      if (species.length && !species.some(sp => a.reactivity.map(r=>r.toLowerCase()).includes(sp.toLowerCase()))) return false;
      return true;
    })
    .sort((a:any,b:any) => sort === 'price' ? a.priceUSD - b.priceUSD : b._score - a._score);

  return new Response(JSON.stringify({ count: filtered.length, items: filtered }), {
    headers: { 'content-type': 'application/json; charset=UTF-8' }
  });
};
