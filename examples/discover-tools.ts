import { connectToTheChute } from 'the-chute-mcp-client';

const accessToken = process.env.CHUTE_ACCESS_TOKEN;
if (!accessToken) throw new Error('Set CHUTE_ACCESS_TOKEN to a user access token.');

const client = await connectToTheChute({ accessToken });
try {
  const { tools } = await client.listTools();
  for (const tool of tools) {
    console.log(`${tool.name}: ${tool.description ?? '(no description)'}`);
    console.log(JSON.stringify(tool.inputSchema, null, 2));
  }
} finally {
  await client.close();
}
