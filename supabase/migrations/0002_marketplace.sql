-- Marketplace: cart, orders, order items. Contact-based ordering: no online payment is
-- processed or simulated. Payment status records what the artist confirms offline.

create table public.shopping_cart_items (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 20),
  added_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('AA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_id uuid not null references public.profiles(id),
  artist_id uuid not null references public.artist_profiles(id),
  status text not null default 'requested'
    check (status in ('requested','confirmed','in_progress','ready','shipped','completed','cancelled','refunded')),
  payment_method text not null default 'pay_artist_directly' check (payment_method in ('pay_artist_directly','cash_on_delivery','bank_transfer')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid_offline','refunded_offline')),
  fulfilment text not null check (fulfilment in ('pickup','local_delivery','shipping')),
  delivery_city text,
  customer_note text check (length(customer_note) <= 1000),
  artist_note text check (length(artist_note) <= 1000),
  subtotal numeric(10,2) not null default 0,
  currency text not null default 'TND',
  commission_rate numeric(5,4) not null default 0 check (commission_rate between 0 and 0.5),
  commission_amount numeric(10,2) not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_orders_customer_idx on public.marketplace_orders (customer_id, created_at desc);
create index marketplace_orders_artist_idx on public.marketplace_orders (artist_id, status);
create trigger marketplace_orders_touch before update on public.marketplace_orders for each row execute function touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title_snapshot text not null,
  unit_price numeric(10,2),
  quantity int not null check (quantity between 1 and 20)
);
create index order_items_order_idx on public.order_items (order_id);

-- Turns the caller's cart into one order per artist, atomically.
-- Products without a price can still be requested; the artist confirms the price.
create or replace function public.place_order(p_fulfilment text, p_city text, p_note text, p_payment text default 'pay_artist_directly')
returns setof public.marketplace_orders
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a record;
  it record;
  o public.marketplace_orders;
  rate numeric := coalesce((select (value->>'rate')::numeric from platform_settings where key = 'commission'), 0);
begin
  if uid is null then raise exception 'sign in required'; end if;
  if not exists (select 1 from shopping_cart_items where customer_id = uid) then raise exception 'cart is empty'; end if;
  if p_fulfilment not in ('pickup','local_delivery','shipping') then raise exception 'invalid fulfilment'; end if;
  if p_payment not in ('pay_artist_directly','cash_on_delivery','bank_transfer') then raise exception 'invalid payment method'; end if;

  -- lock the products in the cart to make stock checks safe under concurrency
  perform 1 from products p join shopping_cart_items c on c.product_id = p.id where c.customer_id = uid for update of p;

  for a in
    select distinct p.artist_id from shopping_cart_items c join products p on p.id = c.product_id where c.customer_id = uid
  loop
    insert into marketplace_orders (customer_id, artist_id, fulfilment, delivery_city, customer_note, payment_method, commission_rate)
    values (uid, a.artist_id, p_fulfilment, nullif(p_city,''), nullif(p_note,''), p_payment, rate)
    returning * into o;

    for it in
      select p.id, p.title, p.price_amount, p.stock, p.status, p.availability, p.delivery_options, c.quantity
      from shopping_cart_items c join products p on p.id = c.product_id
      where c.customer_id = uid and p.artist_id = a.artist_id
    loop
      if it.status <> 'published' or it.availability = 'unavailable' then
        raise exception 'product "%" is no longer available', it.title;
      end if;
      if not (p_fulfilment = any(it.delivery_options)) then
        raise exception 'product "%" does not offer %', it.title, p_fulfilment;
      end if;
      if it.stock is not null then
        if it.stock < it.quantity then raise exception 'only % left of "%"', it.stock, it.title; end if;
        update products set stock = stock - it.quantity where id = it.id;
      end if;
      insert into order_items (order_id, product_id, title_snapshot, unit_price, quantity)
      values (o.id, it.id, it.title, it.price_amount, it.quantity);
    end loop;

    update marketplace_orders m set
      subtotal = coalesce((select sum(unit_price * quantity) from order_items where order_id = o.id), 0),
      commission_amount = round(coalesce((select sum(unit_price * quantity) from order_items where order_id = o.id), 0) * rate, 2)
    where m.id = o.id returning * into o;
    return next o;
  end loop;

  delete from shopping_cart_items where customer_id = uid;
end $$;

-- Status changes with allowed transitions. Artists move their own orders forward;
-- customers can cancel while the order is still only requested.
create or replace function public.update_order_status(p_order uuid, p_status text, p_note text default null, p_payment_status text default null)
returns public.marketplace_orders
language plpgsql security definer set search_path = public as $$
declare
  o public.marketplace_orders;
  is_artist boolean;
  is_customer boolean;
  allowed text[];
begin
  select * into o from marketplace_orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  is_artist := o.artist_id = my_artist_id();
  is_customer := o.customer_id = auth.uid();
  if not (is_artist or is_customer or is_admin()) then raise exception 'not allowed'; end if;

  allowed := case o.status
    when 'requested' then array['confirmed','cancelled']
    when 'confirmed' then array['in_progress','ready','cancelled']
    when 'in_progress' then array['ready','cancelled']
    when 'ready' then array['shipped','completed','cancelled']
    when 'shipped' then array['completed']
    when 'completed' then array['refunded']
    else array[]::text[] end;

  if p_status is not null and p_status <> o.status then
    if not (p_status = any(allowed)) then raise exception 'cannot go from % to %', o.status, p_status; end if;
    if is_customer and not is_artist and not is_admin() and not (o.status = 'requested' and p_status = 'cancelled') then
      raise exception 'customers can only cancel a requested order';
    end if;
    -- give stock back on cancellation
    if p_status = 'cancelled' then
      update products p set stock = p.stock + i.quantity
      from order_items i where i.order_id = o.id and i.product_id = p.id and p.stock is not null;
    end if;
    o.status := p_status;
  end if;

  if p_payment_status is not null then
    if not (is_artist or is_admin()) then raise exception 'only the artist can record payment'; end if;
    if p_payment_status not in ('unpaid','paid_offline','refunded_offline') then raise exception 'invalid payment status'; end if;
    o.payment_status := p_payment_status;
  end if;

  update marketplace_orders set
    status = o.status,
    payment_status = o.payment_status,
    artist_note = case when is_artist and p_note is not null then p_note else artist_note end,
    customer_note = case when is_customer and not is_artist and p_note is not null then p_note else customer_note end
  where id = o.id returning * into o;
  return o;
end $$;

-- Platform-wide settings readable by everyone (no secrets here).
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values ('commission', '{"rate": 0, "note": "No commission during the MVP"}');
