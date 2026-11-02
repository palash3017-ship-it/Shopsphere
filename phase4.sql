-- =====================================================================
-- ShopSphere - Phase 4 database additions (storefront)
-- Paste into Supabase > SQL Editor > New query > Run
-- Creates safe public "views" so the storefront can show seller shop
-- names, reviewer first names and product ratings WITHOUT exposing
-- private profile data (emails, phone numbers, full names).
-- =====================================================================

create or replace view public.seller_shops as
  select id, shop_name
  from public.profiles
  where role = 'seller';

create or replace view public.reviewer_names as
  select id, split_part(coalesce(nullif(full_name, ''), 'Customer'), ' ', 1) as first_name
  from public.profiles
  where role = 'buyer';

create or replace view public.product_ratings as
  select product_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as review_count
  from public.reviews
  group by product_id;

grant select on public.seller_shops, public.reviewer_names, public.product_ratings
  to anon, authenticated;
