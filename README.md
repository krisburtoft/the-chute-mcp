# The Chute MCP client

An open source TypeScript helper for connecting to [The Chute](https://www.thechute.app)'s hosted Model Context Protocol (MCP) endpoint.

This repository contains client-side integration code and examples. The hosted app, authorization service, database, and server implementation remain separate.

## Install

```sh
npm install @modelcontextprotocol/client
```

Until this project publishes to npm, install directly from GitHub:

```sh
npm install github:krisburtoft/the-chute-mcp
```

## Connect and discover tools

The caller must obtain a user access token through The Chute's OAuth flow. Never use a service-role key or another shared secret in a client application.

```ts
import { connectToTheChute } from 'the-chute-mcp-client';

const client = await connectToTheChute({ accessToken });
try {
  const { tools } = await client.listTools();
  console.log(tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })));
} finally {
  await client.close();
}
```

The client discovers the live tool catalog with MCP `tools/list`, so the server's current input schemas remain the source of truth. To call a tool, pass its discovered name and arguments to `client.callTool({ name, arguments })`. The signed-in user's role, ranch membership, and enabled assistant access still govern the request.

## Authentication and access

- Use OAuth authorization code flow with PKCE and the redirect URL registered by your MCP host.
- Access tokens belong to an individual user and should be held in the host's secure token storage.
- The server applies the user's ranch membership, role, access mode, and database row-level security.
- Write tools may prepare drafts; changes requiring confirmation must follow the server's confirmation flow.
- Tool availability and schemas can change. Discover tools at connection time and handle tool errors.

For an end-to-end discovery example, see [`examples/discover-tools.ts`](examples/discover-tools.ts). For protocol and OAuth background, see the [MCP specification](https://modelcontextprotocol.io/) and [official TypeScript client SDK](https://github.com/modelcontextprotocol/typescript-sdk).

With `CHUTE_ACCESS_TOKEN` set in your shell, run `npm run example` from a local checkout to print the live tool catalog.

## License

MIT. See [LICENSE](LICENSE).
