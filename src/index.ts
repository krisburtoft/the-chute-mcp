import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

export const THE_CHUTE_MCP_ENDPOINT = 'https://www.thechute.app/api/mcp';

export type TheChuteMcpOptions = {
  /** An access token issued for the signed-in user's The Chute account. */
  accessToken?: string;
  /** The production endpoint or a local development endpoint on loopback. */
  endpoint?: string | URL;
};

/**
 * Connect to The Chute's hosted MCP service or a local development server.
 * A token is required for user data and tool calls, but not tool discovery.
 * The caller owns the returned client and should close it when finished.
 */
export async function connectToTheChute({
  accessToken,
  endpoint = THE_CHUTE_MCP_ENDPOINT,
}: TheChuteMcpOptions): Promise<Client> {
  if (accessToken !== undefined && !accessToken.trim()) {
    throw new Error('The access token cannot be empty.');
  }

  const url = new URL(endpoint);
  const localEndpoint =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    url.pathname === '/api/mcp' &&
    !url.search &&
    !url.hash;
  if (url.href !== THE_CHUTE_MCP_ENDPOINT && !localEndpoint) {
    throw new Error('Only The Chute production or a localhost MCP endpoint is allowed.');
  }

  const client = new Client({ name: 'the-chute-mcp-client', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  try {
    await client.connect(transport);
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}
