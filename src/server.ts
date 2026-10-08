/**
 * Applies The Chute's MCP OAuth behavior to an MCP SDK protocol server.
 *
 * Keep product data access in the host application. This helper only adds the
 * protocol-level OAuth declaration to listed tools and rejects tool calls on
 * unauthenticated server instances with an MCP OAuth challenge.
 */
export type McpProtocolServer = {
  setRequestHandler: (...args: unknown[]) => void;
};

export type OAuthToolSecurityOptions = {
  authenticated: boolean;
  resourceMetadataUrl: string;
  unauthenticatedMessage?: string;
};

export function installOAuthToolSecurity(
  protocol: McpProtocolServer,
  {
    authenticated,
    resourceMetadataUrl,
    unauthenticatedMessage = "Sign in to The Chute to access ranch records.",
  }: OAuthToolSecurityOptions,
): () => void {
  const originalSetRequestHandler = protocol.setRequestHandler.bind(protocol);
  let toolsListHandler:
    ((...args: unknown[]) => Promise<unknown> | unknown) | undefined;
  let toolCallHandler:
    ((...args: unknown[]) => Promise<unknown> | unknown) | undefined;

  protocol.setRequestHandler = (...args: unknown[]) => {
    if (typeof args[1] === "function") {
      if (args[0] === "tools/list") {
        toolsListHandler = args[1] as (
          ...handlerArgs: unknown[]
        ) => Promise<unknown> | unknown;
      } else if (args[0] === "tools/call") {
        toolCallHandler = args[1] as (
          ...handlerArgs: unknown[]
        ) => Promise<unknown> | unknown;
      }
    }
    originalSetRequestHandler(...args);
  };

  // Call after the host registers application tools. MCP SDK tool descriptors
  // currently omit securitySchemes, and calls need an OAuth challenge until
  // the host has authenticated the request.
  return () => {
    if (!toolsListHandler || !toolCallHandler) {
      throw new Error("MCP tools could not be initialized.");
    }
    originalSetRequestHandler("tools/list", async (...args: unknown[]) => {
      const result: unknown = await toolsListHandler!(...args);
      if (typeof result !== "object" || result === null || !("tools" in result))
        return result;
      const tools = (result as { tools: unknown }).tools;
      if (!Array.isArray(tools)) return result;
      return {
        ...result,
        tools: tools.map((tool) =>
          typeof tool === "object" && tool !== null
            ? { ...tool, securitySchemes: [{ type: "oauth2", scopes: [] }] }
            : tool,
        ),
      };
    });
    originalSetRequestHandler("tools/call", async (...args: unknown[]) => {
      if (!authenticated) {
        return {
          content: [{ type: "text", text: unauthenticatedMessage }],
          isError: true,
          _meta: {
            "mcp/www_authenticate": [
              `Bearer resource_metadata="${resourceMetadataUrl}", ` +
                `error="invalid_token", error_description="${unauthenticatedMessage}"`,
            ],
          },
        };
      }
      return toolCallHandler!(...args);
    });
  };
}
