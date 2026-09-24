import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getActiveBill, type BillSnapshot } from "@/lib/bill.functions";

export function useBill(tableNumber: string) {
  const fetchBill = useServerFn(getActiveBill);
  const [snapshot, setSnapshot] = useState<BillSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const data = await fetchBill({ data: { tableNumber } });
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBill({ data: { tableNumber } })
      .then((data) => {
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  // Realtime subscribe to bill_items for current bill
  useEffect(() => {
    if (!snapshot?.bill.id) return;
    const billId = snapshot.bill.id;
    const channel = supabase
      .channel(`bill-${billId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_items",
          filter: `bill_id=eq.${billId}`,
        },
        (payload) => {
          setSnapshot((prev) => {
            if (!prev) return prev;
            const next = { ...prev, items: [...prev.items] };
            const newRow = (payload.new ?? null) as Record<string, unknown> | null;
            const oldRow = (payload.old ?? null) as Record<string, unknown> | null;

            if (payload.eventType === "INSERT" && newRow) {
              next.items.push({
                ...newRow,
                unit_price: Number(newRow.unit_price),
              } as unknown as (typeof next.items)[number]);
            } else if (payload.eventType === "UPDATE" && newRow) {
              const idx = next.items.findIndex((i) => i.id === (newRow.id as string));
              if (idx >= 0) {
                next.items[idx] = {
                  ...newRow,
                  unit_price: Number(newRow.unit_price),
                } as unknown as (typeof next.items)[number];
              }
            } else if (payload.eventType === "DELETE" && oldRow) {
              next.items = next.items.filter((i) => i.id !== (oldRow.id as string));
            }

            next.items.sort((a, b) => a.sort_order - b.sort_order);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [snapshot?.bill.id]);

  return { snapshot, loading, error, reload };
}
