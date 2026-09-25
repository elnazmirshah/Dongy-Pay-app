alter table public.bill_items
  add column if not exists paid_qty integer not null default 0;

update public.bill_items
set paid_qty = case when paid_by is not null then qty else 0 end
where paid_qty = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bill_items_paid_qty_check'
  ) then
    alter table public.bill_items
      add constraint bill_items_paid_qty_check check (paid_qty >= 0 and paid_qty <= qty);
  end if;
end $$;

alter table public.bill_payments
  add column if not exists item_quantities jsonb not null default '[]'::jsonb;

create or replace function public.process_bill_payment_quantities(
  p_bill_id uuid,
  p_items jsonb,
  p_tip numeric,
  p_method text,
  p_payer_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_count integer;
  v_distinct_count integer;
  v_found_count integer := 0;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_payer text;
  v_payment_id uuid;
  v_created_at timestamptz;
  v_item_ids uuid[] := '{}';
  v_row record;
begin
  if p_bill_id is null then raise exception 'Invalid bill.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid payment selection.'; end if;

  v_requested_count := jsonb_array_length(p_items);
  if v_requested_count < 1 or v_requested_count > 100 then raise exception 'Select at least one item.'; end if;

  select count(distinct value->>'id')
  into v_distinct_count
  from jsonb_array_elements(p_items);
  if v_distinct_count <> v_requested_count then raise exception 'Duplicate item selection.'; end if;

  if p_tip is null or p_tip < 0 or p_tip > 10000 then raise exception 'Invalid tip.'; end if;
  if p_method not in ('apple_pay','google_pay','debit_card','credit_card') then raise exception 'Invalid payment method.'; end if;

  perform 1 from public.bills where id = p_bill_id and status = 'open' for update;
  if not found then raise exception 'This bill is no longer open.'; end if;

  for v_row in
    select
      bi.id,
      bi.qty,
      bi.paid_qty,
      bi.unit_price,
      (x.value->>'qty')::integer as requested_qty
    from jsonb_array_elements(p_items) as x(value)
    join public.bill_items bi
      on bi.id = (x.value->>'id')::uuid
     and bi.bill_id = p_bill_id
    order by bi.id
    for update of bi
  loop
    v_found_count := v_found_count + 1;
    if v_row.requested_qty is null or v_row.requested_qty < 1 then
      raise exception 'Invalid item quantity.';
    end if;
    if v_row.paid_qty + v_row.requested_qty > v_row.qty then
      raise exception 'Some selected quantities have already been paid.';
    end if;
    v_subtotal := v_subtotal + (v_row.unit_price * v_row.requested_qty);
    v_item_ids := array_append(v_item_ids, v_row.id);
  end loop;

  if v_found_count <> v_requested_count then raise exception 'Some items do not belong to this bill.'; end if;

  v_payer := left(coalesce(nullif(btrim(p_payer_label),''),'Guest'),60);
  v_total := (v_subtotal + p_tip)::numeric(10,2);

  insert into public.bill_payments(bill_id, subtotal, tip, total, method, payer_label, item_ids, item_quantities)
  values(p_bill_id, v_subtotal, p_tip, v_total, p_method, v_payer, v_item_ids, p_items)
  returning id, created_at into v_payment_id, v_created_at;

  update public.bill_items bi
  set
    paid_qty = bi.paid_qty + (x.value->>'qty')::integer,
    paid_by = case
      when bi.paid_qty + (x.value->>'qty')::integer >= bi.qty then v_payer
      else bi.paid_by
    end,
    paid_at = case
      when bi.paid_qty + (x.value->>'qty')::integer >= bi.qty then v_created_at
      else bi.paid_at
    end,
    locked_by = null,
    locked_at = null
  from jsonb_array_elements(p_items) as x(value)
  where bi.bill_id = p_bill_id
    and bi.id = (x.value->>'id')::uuid;

  if not exists (
    select 1 from public.bill_items
    where bill_id = p_bill_id and paid_qty < qty
  ) then
    update public.bills set status = 'closed', closed_at = v_created_at where id = p_bill_id;
  end if;

  return jsonb_build_object(
    'paymentId', v_payment_id,
    'subtotal', v_subtotal,
    'tip', p_tip,
    'total', v_total,
    'method', p_method,
    'payerLabel', v_payer,
    'createdAt', v_created_at
  );
end;
$$;

create or replace function public.reset_demo_bill(p_table_number text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table_id uuid;
  v_bill_id uuid;
  v_first_item_id uuid;
begin
  if p_table_number <> '5' then return false; end if;
  select id into v_table_id from public.restaurant_tables where table_number = p_table_number;
  if v_table_id is null then return false; end if;
  select id into v_bill_id from public.bills where table_id = v_table_id order by opened_at desc limit 1;
  if v_bill_id is null then return false; end if;

  delete from public.bill_payments where bill_id = v_bill_id;
  update public.bill_items
  set paid_qty = 0, paid_by = null, paid_at = null, locked_by = null, locked_at = null
  where bill_id = v_bill_id;
  update public.bills set status = 'open', closed_at = null where id = v_bill_id;

  select id into v_first_item_id
  from public.bill_items
  where bill_id = v_bill_id
  order by sort_order asc, created_at asc
  limit 1;

  if v_first_item_id is not null then
    update public.bill_items
    set paid_qty = qty, paid_by = 'Alex', paid_at = now()
    where id = v_first_item_id;
  end if;
  return true;
end;
$$;

revoke all on function public.process_bill_payment_quantities(uuid,jsonb,numeric,text,text) from public;
grant execute on function public.process_bill_payment_quantities(uuid,jsonb,numeric,text,text) to anon, authenticated;
