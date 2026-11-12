// Supabase Edge Function: reads a photo of a receipt with Claude and returns its details as JSON.
// The Claude API key stays here on the server (as the ANTHROPIC_API_KEY secret), never in the app.
// Only signed-in Keepr users can call it, because Supabase checks their sign-in token first.

import Anthropic from "npm:@anthropic-ai/sdk@^1.8.0";

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_BASE64_LENGTH = 7_000_000; // About 5 MB of image data.
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    is_receipt: { type: "boolean", description: "False if the image isn't a receipt or order confirmation." },
    retailer: { type: ["string", "null"], description: "Shop or company name." },
    product: {
      type: ["string", "null"],
      description: "The main item bought. If there are several items, the most expensive one.",
    },
    total_pence: { type: ["integer", "null"], description: "Total paid, in pence. £79.99 is 7999." },
    purchase_date: { type: ["string", "null"], description: "Date of purchase as YYYY-MM-DD." },
    channel: { type: ["string", "null"], enum: ["in_store", "online", null] },
    payment_method: { type: ["string", "null"], enum: ["credit_card", "debit_card", "cash", "other", null] },
    return_window_days: { type: ["integer", "null"], description: "Only if the receipt states a returns period." },
    warranty_months: { type: ["integer", "null"], description: "Only if the receipt states a warranty or guarantee." },
  },
  required: [
    "is_receipt",
    "retailer",
    "product",
    "total_pence",
    "purchase_date",
    "channel",
    "payment_method",
    "return_window_days",
    "warranty_months",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You read photos of UK shop receipts and online order confirmations for Keepr, an app that tracks return and warranty deadlines.
Extract only what the image shows. Use null for anything that isn't visible or that you would have to guess.
Card payments marked "Visa Credit", "Mastercard Credit" or "Amex" are credit_card; "Debit", "Contactless debit" or "Visa Debit" are debit_card.
An emailed order confirmation or delivery note is "online"; a till receipt is "in_store".`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  let image: string;
  let mediaType: (typeof ALLOWED_MEDIA_TYPES)[number];
  try {
    const body = await request.json();
    image = String(body.image ?? "");
    mediaType = body.mediaType;
  } catch {
    return json({ error: "Send JSON with image and mediaType" }, 400);
  }
  if (!image || image.length > MAX_IMAGE_BASE64_LENGTH) return json({ error: "The photo is missing or too large" }, 400);
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) return json({ error: "Use a JPEG, PNG, WebP or GIF photo" }, 400);

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RECEIPT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Extract the details of this receipt." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return json({ error: "Couldn't read this image" }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Couldn't read this receipt fully" }, 422);

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return json({ error: "Couldn't read this receipt" }, 422);
    return json(JSON.parse(text.text));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Too many scans right now. Try again in a minute." }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "Receipt scanning isn't set up on the server" }, 500);
    if (error instanceof Anthropic.APIError) return json({ error: "The scanning service had a problem. Try again." }, 502);
    if (error instanceof SyntaxError) return json({ error: "Couldn't read this receipt" }, 422);
    throw error;
  }
});
