-- =====================================================================
-- ShopSphere - Phase 5 database additions (cart, checkout, orders)
-- Paste into Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1. Remember how the buyer paid
alter table public.orders
  add column if not exists payment_method text not null default 'cod'
  check (payment_method in ('card', 'upi', 'cod'));

-- 2. Protect order data: sellers/buyers may only change an item's STATUS,
--    never its price or quantity.
revoke update on public.order_items from anon, authenticated;
grant  update (status) on public.order_items to authenticated;

-- 3. Status rules + automatic restock + automatic refund flag.
--    processing -> shipped | cancelled      shipped -> delivered
create or replace function public.order_item_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'processing' and new.status in ('shipped', 'cancelled'))
    or (old.status = 'shipped' and new.status = 'delivered')
  ) then
    raise exception 'Cannot change an item from % to %', old.status, new.status;
  end if;

  if new.status = 'cancelled' then
    -- put the stock back
    if new.product_id is not null then
      update public.products set stock = stock + new.quantity where id = new.product_id;
    end if;
    -- if every item in the order is now cancelled, mark paid orders as refunded
    if not exists (
      select 1 from public.order_items
      where order_id = new.order_id and id <> new.id and status <> 'cancelled'
    ) then
      update public.orders set payment_status = 'refunded'
      where id = new.order_id and payment_status = 'paid';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_status_guard on public.order_items;
create trigger order_items_status_guard
  before update on public.order_items
  for each row execute function public.order_item_status_guard();

-- 4. PLACE ORDER: runs as one all-or-nothing transaction.
--    Checks stock, creates the order and its items, reduces stock, empties the cart.
create or replace function public.place_order(p_address jsonb, p_payment_method text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_order_id uuid;
  v_total    numeric(10,2) := 0;
  r          record;
begin
  if v_uid is null or public.get_my_role() is distinct from 'buyer' then
    raise exception 'Only logged-in buyers can place orders';
  end if;

  if p_payment_method not in ('card', 'upi', 'cod') then
    raise exception 'Invalid payment method';
  end if;

  if coalesce(p_address->>'full_name', '') = ''
     or coalesce(p_address->>'phone', '') = ''
     or coalesce(p_address->>'line1', '') = ''
     or coalesce(p_address->>'city', '') = ''
     or coalesce(p_address->>'state', '') = ''
     or coalesce(p_address->>'pincode', '') = '' then
    raise exception 'Please provide a complete delivery address';
  end if;

  if not exists (select 1 from public.cart_items where user_id = v_uid) then
    raise exception 'Your cart is empty';
  end if;

  -- Validate every cart line and lock the product rows so nobody else can buy the last unit
  for r in
    select c.quantity, p.id as product_id, p.name, p.price, p.stock, p.is_active
    from public.cart_items c
    join public.products p on p.id = c.product_id
    where c.user_id = v_uid
    order by p.id
    for update of p
  loop
    if not r.is_active then
      raise exception '"%" is no longer available. Please remove it from your cart.', r.name;
    end if;
    if r.stock < r.quantity then
      raise exception 'Only % left of "%". Please reduce the quantity in your cart.', r.stock, r.name;
    end if;
    v_total := v_total + r.price * r.quantity;
  end loop;

  insert into public.orders (buyer_id, total_amount, shipping_address, payment_status, payment_method, payment_ref)
  values (
    v_uid,
    v_total,
    p_address,
    case when p_payment_method = 'cod' then 'pending' else 'paid' end,
    p_payment_method,
    case when p_payment_method = 'cod' then null
         else 'TEST-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)) end
  )
  returning id into v_order_id;

  for r in
    select c.quantity, p.id as product_id, p.name, p.price, p.seller_id
    from public.cart_items c
    join public.products p on p.id = c.product_id
    where c.user_id = v_uid
  loop
    insert into public.order_items (order_id, buyer_id, seller_id, product_id, name, unit_price, quantity)
    values (v_order_id, v_uid, r.seller_id, r.product_id, r.name, r.price, r.quantity);

    update public.products set stock = stock - r.quantity where id = r.product_id;
  end loop;

  delete from public.cart_items where user_id = v_uid;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, text) from public, anon;
grant execute on function public.place_order(jsonb, text) to authenticated;

-- 5. Buyer cancels an item that has not shipped yet
create or replace function public.cancel_order_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.order_items
  where id = p_item_id and buyer_id = auth.uid();

  if v_status is null then
    raise exception 'Order item not found';
  end if;
  if v_status <> 'processing' then
    raise exception 'This item can no longer be cancelled';
  end if;

  update public.order_items set status = 'cancelled' where id = p_item_id;
end;
$$;

revoke all on function public.cancel_order_item(uuid) from public, anon;
grant execute on function public.cancel_order_item(uuid) to authenticated;
