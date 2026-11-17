// Supabase Edge Function: reads a photo of a receipt with Google Gemini and returns its details as JSON.
// The Gemini API key stays here on the server (as the GEMINI_API_KEY secret), never in the app.
// Only Keepr app users can call it: the function asks Supabase Auth to confirm the caller's sign-in
// token first. Signed-out users get an anonymous Supabase session from the app, so they can scan too. Deploy it with "Verify JWT with legacy secret" turned OFF (--no-verify-jwt), because that
// older check also lets anyone with the app's public key through.

import { GoogleGenAI } from "npm:@google/genai@^3.2.0";

/** A free-tier Gemini model. Change it here if Google retires it. */
const MODEL = "gemini-3.5-flash-lite";
const MAX_IMAGE_BASE64_LENGTH = 7_000_000; // About 5 MB of image or PDF data.
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Only is_receipt is required: anything not visible on the receipt is simply left out. */
const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    is_receipt: { type: "boolean", description: "False if the image isn't a receipt or order confirmation." },
    retailer: { type: "string", description: "Shop or company name." },
    items: {
      type: "array",
      description:
        "Every product bought, in the order listed, with its own price. Leave out discounts, bags, delivery, service charges and tax lines.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name as a shopper would say it, e.g. \"Sony WH-1000XM5 headphones\"." },
          price_pence: { type: "integer", description: "Price paid for this line, in pence." },
        },
        required: ["name"],
      },
    },
    product: {
      type: "string",
      description: "The main item bought. If there are several items, the most expensive one.",
    },
    total_pence: { type: "integer", description: "Total paid, in pence. £79.99 is 7999." },
    purchase_date: { type: "string", description: "Date of purchase as YYYY-MM-DD." },
    channel: { type: "string", enum: ["in_store", "online"] },
    payment_method: { type: "string", enum: ["credit_card", "debit_card", "cash", "other"] },
    return_window_days: { type: "integer", description: "Only if the receipt states a returns period." },
    warranty_months: { type: "integer", description: "Only if the receipt states a warranty or guarantee." },
  },
  required: ["is_receipt"],
};

const PROMPT = `You read photos, screenshots and PDFs of UK shop receipts and online order confirmations for Keepr, an app that tracks return and warranty deadlines.
Extract only what the image shows. Leave out any field that isn't visible or that you would have to guess.
Card payments marked "Visa Credit", "Mastercard Credit" or "Amex" are credit_card; "Debit", "Contactless debit" or "Visa Debit" are debit_card.
An emailed order confirmation or delivery note is "online"; a till receipt is "in_store".
Extract the details of this receipt.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** True if the request carries the sign-in token of a real Keepr user, checked with Supabase Auth. */
async function isSignedInUser(request: Request): Promise<boolean> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const projectKey = request.headers.get("apikey");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!token || !projectKey || !supabaseUrl) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: projectKey },
  });
  if (!response.ok) return false;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!(await isSignedInUser(request))) return json({ error: "Sign in to scan receipts" }, 401);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Receipt scanning isn't set up on the server" }, 500);

  let image: string;
  let mediaType: string;
  try {
    const body = await request.json();
    image = String(body.image ?? "");
    mediaType = String(body.mediaType ?? "");
  } catch {
    return json({ error: "Send JSON with image and mediaType" }, 400);
  }
  if (!image || image.length > MAX_IMAGE_BASE64_LENGTH) return json({ error: "The file is missing or larger than 5 MB" }, 400);
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) return json({ error: "Use a photo, screenshot or PDF" }, 400);

  // Image input in the Interactions API is only on v1beta; the default v1 rejects it with a 400.
  const client = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

  let outputText: string | undefined;
  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: [
        { type: "text", text: PROMPT },
        { type: mediaType === "application/pdf" ? "document" : "image", data: image, mime_type: mediaType },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: RECEIPT_SCHEMA },
    });
    outputText = interaction.output_text;
  } catch (error) {
    const status = (error as { status?: number }).status;
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Gemini request failed (${status ?? "no status"}): ${reason}`);
    if (status === 429) return json({ error: "Too many scans right now. Try again in a minute." }, 429);
    if (status === 400 || status === 401 || status === 403) {
      // Gemini's reason (bad key, API not enabled, region not supported) is what's needed to fix the setup.
      return json({ error: `Receipt scanning isn't set up correctly on the server. Gemini said: ${reason}` }, 500);
    }
    return json({ error: "The scanning service had a problem. Try again." }, 502);
  }

  if (!outputText) return json({ error: "Couldn't read this receipt" }, 422);
  try {
    return json(JSON.parse(outputText));
  } catch {
    return json({ error: "Couldn't read this receipt" }, 422);
  }
});
