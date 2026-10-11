import { createServer } from "node:http";
import { createPaymentHandler } from "../../../lib/payments/http.js";
import { runtime } from "./runtime.js";
const { payments } = runtime();
const handler = createPaymentHandler(payments); // Merchant/status routes deliberately deny access; Next.js supplies sessions.
const port = Number(process.env.PORT ?? 4020);
createServer(async (req, res) => {
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) {
        res.writeHead(413).end();
        return;
      }
    }
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method,
      headers: req.headers as HeadersInit,
      ...(req.method === "GET" || req.method === "HEAD" ? {} : { body }),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(500).end("Server error");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Track B demo server http://localhost:${port}`),
);
