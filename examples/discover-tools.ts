import { connectToTheChute } from "the-chute-mcp";

const accessToken = process.env.CHUTE_ACCESS_TOKEN;
const endpoint = process.env.CHUTE_MCP_ENDPOINT;

const client = await connectToTheChute({
  ...(accessToken ? { accessToken } : {}),
  ...(endpoint ? { endpoint } : {}),
});
try {
  const { tools } = await client.listTools();
  const includeSchemas = process.argv.includes("--schemas");
  for (const tool of tools) {
    console.log(`${tool.name}: ${tool.description ?? "(no description)"}`);
    if (includeSchemas) console.log(JSON.stringify(tool.inputSchema, null, 2));
  }
} finally {
  await client.close();
}
