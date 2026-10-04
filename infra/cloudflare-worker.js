/**
 * Cloudflare Worker Reverse Proxy for FlySmart
 * Route: https://flight24.hadijawaheri63.workers.dev/*
 * Target: http://141.11.107.22.sslip.io:80 (Caddy Reverse Proxy)
 * Note: Cloudflare Workers requires a domain name (FQDN) like sslip.io to avoid Error 1003 (Direct IP access).
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, "http://141.11.107.22.sslip.io:80");

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
