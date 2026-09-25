import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseServer } from "@/integrations/supabase/client.server";

export type BillItem = {
  id: string;
  bill_id: string;
  name_en: string;
  name_fa: string | null;
  name_nl: string | null;
  qty: number;
  paid_qty: number;
  unit_price: number;
  paid_by: string | null;
  paid_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  sort_order: number;
};

export type BillSnapshot = {
  table: { id: string; table_number: string; restaurant_name: string };
  bill: { id: string; status: string };
  items: BillItem[];
};

type PaymentResult = {
  paymentId: string;
  subtotal: number;
  tip: number;
  total: number;
  method: string;
  payerLabel: string | null;
  createdAt: string;
};

function edgeErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const maybe = error as { message?: string; context?: Response };
  return maybe.message || fallback;
}

export const resetDemoBill = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ tableNumber: z.string().min(1).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.tableNumber !== "5") return { ok: false };

    const { data: table, error: tableError } = await supabaseServer
      .from("restaurant_tables")
      .select("id")
      .eq("table_number", data.tableNumber)
      .maybeSingle();
    if (tableError) throw new Error(tableError.message);
    if (!table) return { ok: false };

    const { data: openBill, error: openBillError } = await supabaseServer
      .from("bills")
      .select("id")
      .eq("table_id", table.id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    if (openBillError) throw new Error(openBillError.message);

    if (openBill) return { ok: true };

    const { data: result, error } = await supabaseServer.functions.invoke("bill-actions", {
      body: { action: "reset_demo", tableNumber: data.tableNumber },
    });

    if (error) throw new Error(edgeErrorMessage(error, "Failed to reset demo bill"));
    if (result?.error) throw new Error(String(result.error));
    return { ok: Boolean(result?.ok) };
  });

export const getActiveBill = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ tableNumber: z.string().min(1).max(20) }).parse(input),
  )
  .handler(async ({ data }): Promise<BillSnapshot | null> => {
    const { data: table, error: tErr } = await supabaseServer
      .from("restaurant_tables")
      .select("id, table_number, restaurant_name")
      .eq("table_number", data.tableNumber)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!table) return null;

    let { data: bill, error: bErr } = await supabaseServer
      .from("bills")
      .select("id, status")
      .eq("table_id", table.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);

    if (!bill && data.tableNumber === "5") {
      const { data: latestBill, error: latestBillError } = await supabaseServer
        .from("bills")
        .select("id, status")
        .eq("table_id", table.id)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestBillError) throw new Error(latestBillError.message);
      bill = latestBill;
    }

    if (!bill) return null;

    const { data: items, error: iErr } = await supabaseServer
      .from("bill_items")
      .select("*")
      .eq("bill_id", bill.id)
      .order("sort_order", { ascending: true });
    if (iErr) throw new Error(iErr.message);

    return {
      table,
      bill,
      items: (items ?? []).map((it) => ({
        ...it,
        qty: Number(it.qty),
        paid_qty: Number(it.paid_qty ?? (it.paid_by ? it.qty : 0)),
        unit_price: Number(it.unit_price),
      })) as BillItem[],
    };
  });

export const payItems = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        billId: z.string().uuid(),
        itemIds: z.array(z.string().uuid()).min(1).max(100),
        tip: z.number().min(0).max(10000),
        method: z.enum(["apple_pay", "google_pay", "debit_card", "credit_card"]),
        payerLabel: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PaymentResult> => {
    const { data: result, error } = await supabaseServer.functions.invoke("bill-actions", {
      body: {
        action: "pay",
        billId: data.billId,
        itemIds: data.itemIds,
        tip: data.tip,
        method: data.method,
        payerLabel: data.payerLabel,
      },
    });

    if (error) throw new Error(edgeErrorMessage(error, "Payment failed"));
    if (result?.error) throw new Error(String(result.error));
    if (!result?.paymentId) throw new Error("Payment failed");

    return {
      paymentId: String(result.paymentId),
      subtotal: Number(result.subtotal),
      tip: Number(result.tip),
      total: Number(result.total),
      method: String(result.method),
      payerLabel: result.payerLabel ? String(result.payerLabel) : null,
      createdAt: String(result.createdAt),
    };
  });
