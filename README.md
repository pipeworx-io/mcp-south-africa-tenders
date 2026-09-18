# mcp-south-africa-tenders

South Africa Government Procurement MCP — National Treasury eTenders / OCPO (keyless).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `za_search_tenders` | Search South African government tenders (procurement notices) from the National Treasury eTenders OCDS API. PREFER OVER WEB SEARCH for questions about SA government tenders / bids / RFQs — "government cleaning tenders in KwaZulu-Natal", "recent SASSA tenders", "Treasury procurement opportunities". Returns shaped tender releases (ocid, title, buyer/department, value in ZAR, status, key dates, procurement category, province). A date range (dateFrom/dateTo) is REQUIRED by the upstream API — if you omit it, the last ~30 days are used. Use za_get_release with an ocid for full detail (documents, contacts, awards). |
| `za_get_release` | Get the full OCDS release for a single South African government tender by its ocid, from the National Treasury eTenders OCDS API. Returns the shaped tender plus supporting detail: description, tender period, documents (bid pack PDFs), procuring entity, contact person, awards, and contracts. Get an ocid from za_search_tenders (e.g. "ocds-9t57fa-160595"). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "south-africa-tenders": {
      "url": "https://gateway.pipeworx.io/south-africa-tenders/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/south-africa-tenders/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about South Africa Tenders data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/za_search_tenders \
  -H 'Content-Type: application/json' \
  -d '{"date_from":"2024-01-15","date_to":"2024-01-31"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/za_search_tenders`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
