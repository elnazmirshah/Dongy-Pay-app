create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique,
  restaurant_name text not null default 'Go Dutch Bistro',
  created_at timestamptz not null default now()
);
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index bills_table_id_status_idx on public.bills(table_id, status);
create unique index bills_one_open_per_table_idx on public.bills(table_id) where status = 'open';
create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  name_en text not null,
  name_fa text,
  name_nl text,
  qty integer not null default 1 check (qty > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  paid_by text,
  paid_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index bill_items_bill_id_idx on public.bill_items(bill_id);
create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  tip numeric(10,2) not null default 0 check (tip >= 0),
  total numeric(10,2) not null check (total >= 0),
  method text not null check (method in ('apple_pay','google_pay','debit_card','credit_card')),
  payer_label text,
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index bill_payments_bill_id_idx on public.bill_payments(bill_id);
alter table public.restaurant_tables enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.bill_payments enable row level security;
grant select on public.restaurant_tables to anon, authenticated;
grant select on public.bills to anon, authenticated;
grant select on public.bill_items to anon, authenticated;
grant select on public.bill_payments to anon, authenticated;
create policy "guest read restaurant tables" on public.restaurant_tables for select to anon, authenticated using (true);
create policy "guest read bills" on public.bills for select to anon, authenticated using (true);
create policy "guest read bill items" on public.bill_items for select to anon, authenticated using (true);
create policy "guest read bill payments" on public.bill_payments for select to anon, authenticated using (true);
alter table public.bill_items replica identity full;
alter table public.bill_payments replica identity full;
alter publication supabase_realtime add table public.bill_items;
alter publication supabase_realtime add table public.bill_payments;
create or replace function public.process_bill_payment(p_bill_id uuid, p_item_ids uuid[], p_tip numeric, p_method text, p_payer_label text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_requested_count integer; v_found_count integer; v_paid_count integer;
  v_subtotal numeric(10,2); v_total numeric(10,2); v_payer text;
  v_payment_id uuid; v_created_at timestamptz;
begin
  if p_bill_id is null then raise exception 'Invalid bill.'; end if;
  if p_item_ids is null or cardinality(p_item_ids)=0 or cardinality(p_item_ids)>100 then raise exception 'Select at least one item.'; end if;
  select count(distinct x) into v_requested_count from unnest(p_item_ids) as x;
  if v_requested_count <> cardinality(p_item_ids) then raise exception 'Duplicate item selection.'; end if;
  if p_tip is null or p_tip < 0 or p_tip > 10000 then raise exception 'Invalid tip.'; end if;
  if p_method not in ('apple_pay','google_pay','debit_card','credit_card') then raise exception 'Invalid payment method.'; end if;
  perform 1 from public.bills where id=p_bill_id and status='open' for update;
  if not found then raise exception 'This bill is no longer open.'; end if;
  perform 1 from public.bill_items where bill_id=p_bill_id and id=any(p_item_ids) for update;
  select count(*), count(*) filter (where paid_by is not null), coalesce(sum(unit_price*qty),0)::numeric(10,2)
  into v_found_count,v_paid_count,v_subtotal from public.bill_items where bill_id=p_bill_id and id=any(p_item_ids);
  if v_found_count <> v_requested_count then raise exception 'Some items do not belong to this bill.'; end if;
  if v_paid_count > 0 then raise exception 'Some items have already been paid by someone else.'; end if;
  v_payer := left(coalesce(nullif(btrim(p_payer_label),''),'Guest'),60);
  v_total := (v_subtotal+p_tip)::numeric(10,2);
  insert into public.bill_payments(bill_id,subtotal,tip,total,method,payer_label,item_ids)
  values(p_bill_id,v_subtotal,p_tip,v_total,p_method,v_payer,p_item_ids)
  returning id,created_at into v_payment_id,v_created_at;
  update public.bill_items set paid_by=v_payer,paid_at=v_created_at,locked_by=null,locked_at=null where bill_id=p_bill_id and id=any(p_item_ids);
  if not exists(select 1 from public.bill_items where bill_id=p_bill_id and paid_by is null) then
    update public.bills set status='closed',closed_at=v_created_at where id=p_bill_id;
  end if;
  return jsonb_build_object('paymentId',v_payment_id,'subtotal',v_subtotal,'tip',p_tip,'total',v_total,'method',p_method,'payerLabel',v_payer,'createdAt',v_created_at);
end; $$;
create or replace function public.reset_demo_bill(p_table_number text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_table_id uuid; v_bill_id uuid; v_first_item_id uuid;
begin
  if p_table_number <> '5' then return false; end if;
  select id into v_table_id from public.restaurant_tables where table_number=p_table_number;
  if v_table_id is null then return false; end if;
  select id into v_bill_id from public.bills where table_id=v_table_id order by opened_at desc limit 1;
  if v_bill_id is null then return false; end if;
  delete from public.bill_payments where bill_id=v_bill_id;
  update public.bill_items set paid_by=null,paid_at=null,locked_by=null,locked_at=null where bill_id=v_bill_id;
  update public.bills set status='open',closed_at=null where id=v_bill_id;
  select id into v_first_item_id from public.bill_items where bill_id=v_bill_id order by sort_order asc,created_at asc limit 1;
  if v_first_item_id is not null then update public.bill_items set paid_by='Alex',paid_at=now() where id=v_first_item_id; end if;
  return true;
end; $$;
revoke all on function public.process_bill_payment(uuid,uuid[],numeric,text,text) from public;
revoke all on function public.reset_demo_bill(text) from public;
grant execute on function public.process_bill_payment(uuid,uuid[],numeric,text,text) to anon, authenticated;
grant execute on function public.reset_demo_bill(text) to anon, authenticated;
with inserted_table as (
  insert into public.restaurant_tables(table_number,restaurant_name) values('5','Go Dutch Bistro') returning id
), inserted_bill as (
  insert into public.bills(table_id,status) select id,'open' from inserted_table returning id
)
insert into public.bill_items(bill_id,name_en,name_fa,name_nl,qty,unit_price,paid_by,paid_at,sort_order)
select id,'Truffle Burger','برگر ترافل','Truffelburger',1,18.50,'Alex',now(),10 from inserted_bill
union all select id,'Sweet Potato Fries','سیب‌زمینی شیرین','Zoete-aardappelfriet',2,6.50,null,null,20 from inserted_bill
union all select id,'Caesar Salad','سالاد سزار','Caesarsalade',1,14.00,null,null,30 from inserted_bill
union all select id,'Sparkling Water','آب گازدار','Bruiswater',2,3.50,null,null,40 from inserted_bill
union all select id,'Tiramisu','تیرامیسو','Tiramisu',1,8.50,null,null,50 from inserted_bill;
