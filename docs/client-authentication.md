# Client authentication

The Chute MCP endpoint is `https://www.thechute.app/api/mcp`. Each connection represents an individual The Chute user. Clients must complete OAuth authorization-code flow with PKCE and send the user's access token as a bearer token.

## Connect a client

Use an MCP client SDK that supports Streamable HTTP and OAuth. For TypeScript, see the [official MCP client SDK](https://github.com/modelcontextprotocol/typescript-sdk) and its [OAuth client guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/oauth.md). The SDK performs protected-resource and authorization-server discovery from the MCP endpoint and directs the user through the authorization flow.

For an application that already has a valid access token, this repository's `connectToTheChute` helper opens the MCP connection. It does not obtain or store tokens for you.

## Access rules

- The user must sign in and have active ranch membership.
- The server applies that user's ranch role and assistant access settings to every tool call.
- Tool names and input schemas are returned by the live MCP `tools/list` request. Discover them after connecting instead of copying a stale list into a client.
- Some tools prepare drafts. Follow the server's confirmation flow before applying a change.
- Store OAuth tokens in the host application's secure credential store. Never put a user's access token, OAuth client secret, or service-role key in source code or a public issue.

For account and product support, visit [The Chute support](https://www.thechute.app/support).
