import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type PayBody = {
  action: "pay";
  billId: string;
  itemIds: string[];
  tip: number;
  method: "apple_pay" | "google_pay" | "debit_card" | "credit_card";
  payerLabel?: string;
};

type ResetBody = {
  action: "reset_demo";
  tableNumber: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration error" }, 500);

  let body: PayBody | ResetBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "reset_demo") {
    if (body.tableNumber !== "5") return json({ ok: false }, 403);
    const { data, error } = await admin.rpc("reset_demo_bill", {
      p_table_number: body.tableNumber,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: Boolean(data) });
  }

  if (body.action === "pay") {
    if (!body.billId || !Array.isArray(body.itemIds) || body.itemIds.length < 1 || body.itemIds.length > 100) {
      return json({ error: "Invalid payment selection" }, 400);
    }
    if (!Number.isFinite(body.tip) || body.tip < 0 || body.tip > 10000) {
      return json({ error: "Invalid tip" }, 400);
    }
    const methods = new Set(["apple_pay", "google_pay", "debit_card", "credit_card"]);
    if (!methods.has(body.method)) return json({ error: "Invalid payment method" }, 400);

    const counts = new Map<string, number>();
    for (const id of body.itemIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const items = Array.from(counts, ([id, qty]) => ({ id, qty }));

    const { data, error } = await admin.rpc("process_bill_payment_quantities", {
      p_bill_id: body.billId,
      p_items: items,
      p_tip: body.tip,
      p_method: body.method,
      p_payer_label: body.payerLabel?.slice(0, 60) ?? null,
    });
    if (error) return json({ error: error.message }, 409);
    return json(data);
  }

  return json({ error: "Unknown action" }, 400);
});
