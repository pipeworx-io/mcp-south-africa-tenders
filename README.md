# mcp-south-africa-tenders

South Africa Government Procurement MCP — National Treasury eTenders / OCPO (keyless).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about South Africa Tenders data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
