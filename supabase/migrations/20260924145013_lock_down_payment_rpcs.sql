revoke all on function public.process_bill_payment(uuid, uuid[], numeric, text, text) from anon, authenticated, public;
revoke all on function public.reset_demo_bill(text) from anon, authenticated, public;
grant execute on function public.process_bill_payment(uuid, uuid[], numeric, text, text) to service_role;
grant execute on function public.reset_demo_bill(text) to service_role;
