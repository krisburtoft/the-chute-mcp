import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

export const THE_CHUTE_MCP_ENDPOINT = 'https://www.thechute.app/api/mcp';

export type TheChuteMcpOptions = {
  /** An access token issued for the signed-in user's The Chute account. */
  accessToken: string;
};

/**
 * Connect to The Chute's hosted MCP service with a user access token.
 * The caller owns the returned client and should close it when finished.
 */
export async function connectToTheChute({
  accessToken,
}: TheChuteMcpOptions): Promise<Client> {
  if (!accessToken.trim()) throw new Error('An access token is required.');

  const client = new Client({ name: 'the-chute-mcp-client', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(THE_CHUTE_MCP_ENDPOINT), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  try {
    await client.connect(transport);
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}
