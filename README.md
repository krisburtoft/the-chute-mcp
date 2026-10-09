# The Chute MCP server

This public repository contains the MCP server implementation for [The Chute](https://www.thechute.app): the tool catalog, input schemas, server construction, OAuth protocol behavior, and client helpers.

The private web application supplies the authenticated executor for each tool. Its frontend, database queries, ranch business logic, and tenant access checks stay private. MCP requests still run through that host executor so user identity, ranch membership, assistant permissions, and database row-level security apply to every call.

## MCP tool catalog

The server publishes 33 ranch tools covering herd search and records, groups, care, health, breeding, weights, expenses, reminders, animal photos, and owner-confirmed changes. The source of truth for names, descriptions, annotations, and Zod input schemas is [`src/tool-catalog.ts`](src/tool-catalog.ts), with shared input contracts in [`src/schemas.ts`](src/schemas.ts).

## Server adapter

The application creates the MCP server through `createTheChuteMcpServer` and supplies one executor for each catalog tool. It passes each request through `handleTheChuteMcpRequest` for the Streamable HTTP transport. This keeps the public names, descriptions, input validation, annotations, registration, transport, and OAuth behavior in this repo, while the executor implementations remain in the private application.

The server adapter registers the public catalog and adds OAuth security metadata to `tools/list`. Unauthenticated tool calls receive an MCP OAuth challenge. A host must authenticate each request and construct callbacks scoped to that user and ranch before creating an authenticated server.

## Client

The package also exports `connectToTheChute` for TypeScript clients. It connects to the hosted endpoint or a local loopback endpoint and discovers the server's live tool list:

```ts
import { connectToTheChute } from "the-chute-mcp";

const client = await connectToTheChute({ accessToken });
try {
  const { tools } = await client.listTools();
  console.log(tools.map(({ name, description }) => ({ name, description })));
} finally {
  await client.close();
}
```

For local development, use `CHUTE_MCP_ENDPOINT=http://127.0.0.1:3000/api/mcp npm run example`. Access tokens belong to an individual signed-in user and must be stored securely by the client.

## License

MIT. See [LICENSE](LICENSE).
