-- ============================================================================
-- Migration 00 — Nền tảng: extension + phân quyền
--
-- PHẢI CHẠY TRƯỚC `20260809_demand_engine_v1.sql`.
-- Schema demand_* phụ thuộc trực tiếp vào:
--   public.unaccent (dictionary) · co_quyen_doc() · co_quyen_ghi() · la_admin() · touch_updated_at()
--
-- Đã áp lên project dlzhcfrojibpscozdmrx ngày 09/08/2026.
-- Port từ CMCTS (emkwknwcyyewevmmoxzj), có MỘT thay đổi có chủ ý — xem phần bootstrap admin.
-- ============================================================================

-- unaccent PHẢI ở schema public: dm_chuan_hoa_text gọi 'public.unaccent'::regdictionary
create extension if not exists unaccent with schema public;
create extension if not exists pg_trgm  with schema extensions;

create table if not exists public.app_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'viewer' check (role in ('viewer','editor','admin')),
  approved    boolean not null default false,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text not null default ''
);
comment on table public.app_users is 'Vai trò + trạng thái phê duyệt. Chưa approved thì không thấy gì.';

create or replace function public.vai_tro()
returns text language sql stable security definer set search_path to '' as $$
  select coalesce((select u.role from public.app_users u
                   where u.user_id = auth.uid() and u.approved), '')
$$;

create or replace function public.co_quyen_doc()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.vai_tro() in ('admin','editor','viewer')
$$;

create or replace function public.co_quyen_ghi()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.vai_tro() in ('admin','editor')
$$;

create or replace function public.la_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.vai_tro() = 'admin'
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Bootstrap admin — điểm KHÁC bản gốc, có chủ ý.
--
-- Project này hoàn toàn mới, chưa có admin nào. Nếu ai đăng ký cũng là 'viewer'
-- chưa duyệt thì KHÔNG AI duyệt được ai — bế tắc vòng tròn.
--
-- Đã CÂN NHẮC và LOẠI luật "người đăng ký đầu tiên thành admin": đăng nhập GitHub
-- là mở, người lạ đăng ký trước sẽ chiếm quyền admin.
-- Cách dùng ở đây: chỉ đúng email chủ sở hữu được tự động thành admin đã duyệt.
-- ---------------------------------------------------------------------------
create or replace function public.tao_app_user_khi_dang_ky()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_email_chu_so_huu constant text := 'christianvu23@gmail.com';  -- đổi ở đây nếu cần
  v_la_chu boolean := lower(coalesce(new.email,'')) = lower(v_email_chu_so_huu);
begin
  insert into public.app_users (user_id, email, full_name, role, approved, approved_at, approved_by)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name',''),
          case when v_la_chu then 'admin' else 'viewer' end,
          v_la_chu,
          case when v_la_chu then now() else null end,
          case when v_la_chu then 'tu_dong_chu_so_huu' else '' end)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_tao_app_user on auth.users;
create trigger trg_tao_app_user after insert on auth.users
  for each row execute function public.tao_app_user_khi_dang_ky();

alter table public.app_users enable row level security;
revoke all on public.app_users from anon;

drop policy if exists app_users_tu_xem on public.app_users;
drop policy if exists app_users_admin_xem on public.app_users;
drop policy if exists app_users_admin_sua on public.app_users;

create policy app_users_tu_xem on public.app_users
  for select to authenticated using (user_id = auth.uid());
create policy app_users_admin_xem on public.app_users
  for select to authenticated using (public.la_admin());
create policy app_users_admin_sua on public.app_users
  for all to authenticated using (public.la_admin()) with check (public.la_admin());

revoke all on function public.tao_app_user_khi_dang_ky() from public, anon, authenticated;
