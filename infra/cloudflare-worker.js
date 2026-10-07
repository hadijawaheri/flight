/**
 * Cloudflare Worker Reverse Proxy for FlySmart
 * Set the ORIGIN_URL variable on the Worker (Settings → Variables), e.g. http://<server-ip>.sslip.io:80
 * Note: Cloudflare Workers requires a domain name (FQDN) like sslip.io to avoid Error 1003 (Direct IP access).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, env.ORIGIN_URL);

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", url.hostname);
    headers.set("X-Forwarded-Proto", "https");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });

    return fetch(proxyRequest);
  },
};
