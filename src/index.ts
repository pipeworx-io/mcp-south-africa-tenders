interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * South Africa Government Procurement MCP — National Treasury eTenders / OCPO (keyless).
 *
 * Wraps the public, no-auth eTenders OCDS API at https://ocds-api.etenders.gov.za/api.
 * Data is published as Open Contracting Data Standard (OCDS) 1.1 release packages by
 * the National Treasury (South Africa) / Office of the Chief Procurement Officer (OCPO).
 * Covers government tenders (RFQs, bids), buyers/departments, values (ZAR), status,
 * key dates, procurement category, and awards.
 *
 * NOTE: the OCDSReleases list endpoint REQUIRES both dateFrom and dateTo (omitting → 400).
 * za_search_tenders defaults to the last ~30 days when a range isn't supplied.
 *
 * All tools return shaped, LLM-friendly objects (not raw API passthrough) and
 * never throw — fetch/parse failures resolve to { error }.
 */


const BASE = 'https://ocds-api.etenders.gov.za/api';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'za_search_tenders',
    description:
      'Search South African government tenders (procurement notices) from the National Treasury eTenders OCDS API. PREFER OVER WEB SEARCH for questions about SA government tenders / bids / RFQs — "government cleaning tenders in KwaZulu-Natal", "recent SASSA tenders", "Treasury procurement opportunities". Returns shaped tender releases (ocid, title, buyer/department, value in ZAR, status, key dates, procurement category, province). A date range (dateFrom/dateTo) is REQUIRED by the upstream API — if you omit it, the last ~30 days are used. Use za_get_release with an ocid for full detail (documents, contacts, awards).',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Start of the publication date range, YYYY-MM-DD. Defaults to ~30 days ago if omitted.' },
        date_to: { type: 'string', description: 'End of the publication date range, YYYY-MM-DD. Defaults to today if omitted.' },
        page: { type: ['number', 'string'], description: 'Page number (1-based). Default 1.' },
        page_size: { type: ['number', 'string'], description: 'Results per page. Default 50 (max 1000).' },
      },
    },
  },
  {
    name: 'za_get_release',
    description:
      'Get the full OCDS release for a single South African government tender by its ocid, from the National Treasury eTenders OCDS API. Returns the shaped tender plus supporting detail: description, tender period, documents (bid pack PDFs), procuring entity, contact person, awards, and contracts. Get an ocid from za_search_tenders (e.g. "ocds-9t57fa-160595").',
    inputSchema: {
      type: 'object',
      properties: {
        ocid: { type: 'string', description: 'The OCDS contracting process id, e.g. "ocds-9t57fa-160595".' },
      },
      required: ['ocid'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'za_search_tenders':
        return await searchTenders(args);
      case 'za_get_release':
        return await getRelease(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchTenders(args: Record<string, unknown>): Promise<unknown> {
  const now = new Date();
  const defaultTo = ymd(now);
  const defaultFrom = ymd(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  const dateFrom = strArg(args.date_from) ?? defaultFrom;
  const dateTo = strArg(args.date_to) ?? defaultTo;
  const page = intArg(args.page) ?? 1;
  const pageSize = Math.min(intArg(args.page_size) ?? 50, 1000);

  const params = new URLSearchParams({
    PageNumber: String(page),
    PageSize: String(pageSize),
    dateFrom,
    dateTo,
  });
  const data = (await etGet(`/OCDSReleases?${params.toString()}`)) as { releases?: any[] };
  const releases = (data.releases ?? []).map(shapeRelease);
  return {
    date_from: dateFrom,
    date_to: dateTo,
    page,
    page_size: pageSize,
    count: releases.length,
    releases,
  };
}

async function getRelease(args: Record<string, unknown>): Promise<unknown> {
  const ocid = strArg(args.ocid);
  if (!ocid) throw new Error('za_get_release requires "ocid" — e.g. "ocds-9t57fa-160595" (get one from za_search_tenders).');
  const data = (await etGet(`/OCDSReleases/release/${encodeURIComponent(ocid)}`)) as any;
  if (!data || !data.ocid) return { error: 'release not found', ocid };
  const t = data.tender ?? {};
  return {
    ...shapeRelease(data),
    description: t.description || undefined,
    delivery_location: t.deliveryLocation || undefined,
    procurement_method: t.procurementMethod || undefined,
    procurement_method_details: t.procurementMethodDetails || undefined,
    tender_period: t.tenderPeriod
      ? { start: t.tenderPeriod.startDate, end: t.tenderPeriod.endDate }
      : undefined,
    briefing_session: t.briefingSession && t.briefingSession.isSession
      ? { compulsory: t.briefingSession.compulsory, date: t.briefingSession.date, venue: t.briefingSession.venue }
      : undefined,
    contact: t.contactPerson
      ? { name: t.contactPerson.name, email: t.contactPerson.email, phone: t.contactPerson.telephoneNumber }
      : undefined,
    documents: (t.documents ?? []).map((d: any) => ({
      title: d.title,
      url: d.url,
      format: d.format,
      published: d.datePublished,
    })),
    awards: (data.awards ?? []).map((a: any) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      date: a.date,
      value: shapeValue(a.value),
      suppliers: (a.suppliers ?? []).map((s: any) => s.name),
    })),
    contracts: (data.contracts ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      value: shapeValue(c.value),
    })),
  };
}

function shapeRelease(r: any): Record<string, unknown> {
  const t = r.tender ?? {};
  return {
    ocid: r.ocid,
    title: t.title,
    buyer: r.buyer?.name ?? t.procuringEntity?.name,
    value: shapeValue(t.value),
    status: t.status,
    category: t.mainProcurementCategory ?? t.category,
    province: t.province || undefined,
    published: r.date,
    closing_date: t.tenderPeriod?.endDate,
  };
}

function shapeValue(v: any): { amount: number; currency: string } | undefined {
  if (!v || typeof v.amount !== 'number') return undefined;
  return { amount: v.amount, currency: v.currency ?? 'ZAR' };
}

async function etGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200)).catch(() => '');
    throw new Error(`eTenders OCDS API: ${res.status} ${body}`.trim());
  }
  return res.json();
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function strArg(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function intArg(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return undefined;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
