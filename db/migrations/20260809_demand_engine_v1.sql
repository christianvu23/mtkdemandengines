-- ============================================================================
-- DEMAND ENGINE v1 — Schema hợp nhất (idempotent)
--
-- ĐÃ ÁP LÊN project emkwknwcyyewevmmoxzj ngày 09/08/2026 dưới 3 migration:
--   20260809… demand_engine_ham_ho_tro_va_bang
--   20260809… demand_engine_audit_trigger_va_merge
--   20260809… demand_engine_rls
-- File này là bản hợp nhất để dựng lại từ đầu (cần cho giai đoạn SaaS đa tenant).
--
-- NGUYÊN TẮC: chỉ TẠO MỚI. Không ALTER/DROP bảng candidates hay bất kỳ bảng cũ nào.
-- Tái dùng khuôn bảo mật sẵn có: vai_tro() / co_quyen_doc() / co_quyen_ghi() / la_admin()
-- ============================================================================

create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- 1. HÀM ----
create or replace function public.dm_chuan_hoa_text(p_text text)
returns text language sql immutable set search_path to '' as $$
  select btrim(regexp_replace(
    lower(public.unaccent('public.unaccent'::regdictionary, coalesce(p_text, ''))),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.dm_hash_noi_dung(p_text text)
returns text language sql immutable set search_path to '' as $$
  select case
    when public.dm_chuan_hoa_text(p_text) = '' then null
    else encode(extensions.digest(public.dm_chuan_hoa_text(p_text), 'sha256'), 'hex')
  end
$$;

create or replace function public.dm_chuan_hoa_key(p_url text)
returns text language sql immutable set search_path to '' as $$
  select nullif(btrim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(p_url, ''))), '^https?://(www\.|m\.|vn\.)?', ''),
      '[?&](utm_[^&]*|fbclid|gclid|ref|source)=[^&]*', '', 'g'),
    '/+$', '')), '')
$$;

-- --------------------------------------------------------------- 2. BẢNG ----
create table if not exists public.demand_sources (
  ma text primary key,
  ten text not null,
  loai text not null check (loai in ('san_freelance','facebook','job_board','proxy','khac')),
  base_url text,
  chu_ky_phut int not null default 360,
  ttl_gio int not null default 72,
  dang_bat boolean not null default true,
  rui_ro_tos text, ghi_chu text,
  created_at timestamptz not null default now()
);

create table if not exists public.demand_leads (
  id uuid primary key default extensions.uuid_generate_v4(),
  lead_key text not null unique,
  content_hash text,
  source text not null references public.demand_sources(ma),
  source_url text, source_query text,
  -- trục thời gian: khác biệt cốt lõi so với bài toán ứng viên
  posted_at timestamptz,
  captured_at timestamptz not null default now(),
  expires_at timestamptz,
  title text, raw_text text,
  nhu_cau text[] not null default '{}',
  nganh text, khu_vuc text,
  hinh_thuc text check (hinh_thuc in ('du_an','retainer','tuyen_dung','khong_ro')),
  contact_name text, contact_phone text, contact_zalo text, contact_email text, contact_url text,
  budget_text text, budget_min bigint, budget_max bigint, budget_currency text default 'VND',
  score int, score_breakdown jsonb,
  tier text check (tier in ('A','B','C','D')),
  do_canh_tranh int, evidence text, auto_notes text,
  -- CỘT NGƯỜI DÙNG (R1) — chỉ người sửa
  status text check (status in ('moi','quan_tam','da_lien_he','dang_trao_doi','chot','bo')),
  my_notes text, priority text,
  reviewed_at timestamptz, contacted_at timestamptz,
  response text, response_note text, response_at timestamptz,
  gia_chao bigint, ket_qua text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_demand_leads_hash     on public.demand_leads(content_hash) where content_hash is not null;
create index if not exists idx_demand_leads_expires  on public.demand_leads(expires_at)   where status is null;
create index if not exists idx_demand_leads_tier     on public.demand_leads(tier, score desc);
create index if not exists idx_demand_leads_source   on public.demand_leads(source, captured_at desc);
create index if not exists idx_demand_leads_title_tg on public.demand_leads using gin (public.dm_chuan_hoa_text(title) extensions.gin_trgm_ops);

create table if not exists public.demand_inbox (
  id bigserial primary key, payload jsonb not null, run_label text,
  processed boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.demand_blocklist (
  khoa text primary key, ly_do text,
  loai text not null default 'lead' check (loai in ('lead','nguon','tu_khoa','domain')),
  created_at timestamptz not null default now()
);

create table if not exists public.demand_query_log (
  id bigserial primary key, query text, method text, source text, run_label text,
  so_lead_moi int default 0, so_dat int default 0, so_trung int default 0, so_het_han int default 0,
  chi_phi_uoc numeric, job_id text, ghi_chu text, created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_demand_query_log_created on public.demand_query_log(created_at desc);

create table if not exists public.demand_audit (
  id bigserial primary key, lead_id uuid, lead_key text, hanh_dong text not null,
  truoc jsonb, sau jsonb, tac_gia text, created_at timestamptz not null default now()
);
create index if not exists idx_demand_audit_lead on public.demand_audit(lead_id, created_at desc);

-- ------------------------------------------------------------ 3. TRIGGER ----
create or replace function public.dm_chan_ghi_khong_hop_le()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if coalesce(current_setting('app.qua_merge_demand', true), '') = 'on' then return new; end if;
  if public.co_quyen_ghi() then return new; end if;
  raise exception 'Không có quyền ghi vào demand_leads. Cần vai trò editor hoặc admin đã được phê duyệt.';
end $$;

create or replace function public.dm_bao_ve_cot_nguoi_dung()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_tac_gia text := coalesce(auth.jwt() ->> 'email', 'he_thong');
  v_qua_merge boolean := coalesce(current_setting('app.qua_merge_demand', true), '') = 'on';
begin
  if v_qua_merge then
    new.status := old.status; new.my_notes := old.my_notes; new.priority := old.priority;
    new.reviewed_at := old.reviewed_at; new.contacted_at := old.contacted_at;
    new.response := old.response; new.response_note := old.response_note;
    new.response_at := old.response_at; new.gia_chao := old.gia_chao; new.ket_qua := old.ket_qua;
    return new;
  end if;
  if new.status is distinct from old.status or new.priority is distinct from old.priority
     or new.my_notes is distinct from old.my_notes or new.response is distinct from old.response
     or new.gia_chao is distinct from old.gia_chao or new.ket_qua is distinct from old.ket_qua then
    insert into public.demand_audit(lead_id, lead_key, hanh_dong, truoc, sau, tac_gia)
    values (old.id, old.lead_key, 'sua_cot_nguoi_dung',
      jsonb_build_object('status',old.status,'priority',old.priority,'my_notes',old.my_notes,
                         'response',old.response,'gia_chao',old.gia_chao,'ket_qua',old.ket_qua),
      jsonb_build_object('status',new.status,'priority',new.priority,'my_notes',new.my_notes,
                         'response',new.response,'gia_chao',new.gia_chao,'ket_qua',new.ket_qua),
      v_tac_gia);
  end if;
  return new;
end $$;

create or replace function public.dm_chan_xoa()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if not public.la_admin() then raise exception 'Chỉ admin mới được xoá demand_leads.'; end if;
  insert into public.demand_audit(lead_id, lead_key, hanh_dong, truoc, tac_gia)
  values (old.id, old.lead_key, 'xoa', to_jsonb(old), coalesce(auth.jwt() ->> 'email','khong_ro'));
  return old;
end $$;

drop trigger if exists trg_dm_chan_ghi on public.demand_leads;
drop trigger if exists trg_dm_bao_ve   on public.demand_leads;
drop trigger if exists trg_dm_chan_xoa on public.demand_leads;
drop trigger if exists trg_dm_touch    on public.demand_leads;
create trigger trg_dm_chan_ghi before insert on public.demand_leads for each row execute function public.dm_chan_ghi_khong_hop_le();
create trigger trg_dm_bao_ve   before update on public.demand_leads for each row execute function public.dm_bao_ve_cot_nguoi_dung();
create trigger trg_dm_chan_xoa before delete on public.demand_leads for each row execute function public.dm_chan_xoa();
create trigger trg_dm_touch    before update on public.demand_leads for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------- 4. MERGE ----
create or replace function public.merge_demand_inbox()
returns table(them_moi int, bi_chan int, da_co int, trung_noi_dung int, het_han int)
language plpgsql security definer set search_path to '' as $$
declare
  v_row record; v_item jsonb; v_key text; v_hash text; v_ttl int;
  v_posted timestamptz; v_expires timestamptz;
  c_them int := 0; c_chan int := 0; c_daco int := 0; c_trung int := 0; c_het int := 0;
begin
  if not public.co_quyen_ghi() then
    raise exception 'Không có quyền: cần vai trò editor hoặc admin đã phê duyệt.';
  end if;
  perform set_config('app.qua_merge_demand', 'on', true);

  for v_row in select * from public.demand_inbox where not processed order by id loop
    for v_item in select jsonb_array_elements(v_row.payload) loop
      v_key := public.dm_chuan_hoa_key(coalesce(v_item->>'lead_key', v_item->>'url', v_item->>'source_url'));
      if v_key is null then c_chan := c_chan + 1; continue; end if;
      if exists (select 1 from public.demand_blocklist b where b.khoa = v_key) then
        c_chan := c_chan + 1; continue; end if;
      if exists (select 1 from public.demand_leads l where l.lead_key = v_key) then
        c_daco := c_daco + 1; continue; end if;

      v_hash := public.dm_hash_noi_dung(coalesce(v_item->>'raw_text', v_item->>'title'));
      if v_hash is not null and exists (
        select 1 from public.demand_leads l
        where l.content_hash = v_hash and l.captured_at > now() - interval '30 days') then
        c_trung := c_trung + 1; continue; end if;

      select s.ttl_gio into v_ttl from public.demand_sources s where s.ma = v_item->>'source';
      v_ttl := coalesce(v_ttl, 72);
      begin v_posted := nullif(v_item->>'posted_at','')::timestamptz;
      exception when others then v_posted := null; end;
      v_expires := coalesce(v_posted, now()) + make_interval(hours => v_ttl);
      if v_expires <= now() then c_het := c_het + 1; continue; end if;

      insert into public.demand_leads(
        lead_key, content_hash, source, source_url, source_query,
        posted_at, expires_at, title, raw_text, nhu_cau, nganh, khu_vuc, hinh_thuc,
        contact_name, contact_phone, contact_zalo, contact_email, contact_url,
        budget_text, budget_min, budget_max,
        score, score_breakdown, tier, do_canh_tranh, evidence, auto_notes)
      values (
        v_key, v_hash, coalesce(v_item->>'source','khac'),
        v_item->>'source_url', v_item->>'source_query', v_posted, v_expires,
        v_item->>'title', v_item->>'raw_text',
        coalesce((select array(select jsonb_array_elements_text(v_item->'nhu_cau'))), '{}'),
        v_item->>'nganh', v_item->>'khu_vuc', coalesce(nullif(v_item->>'hinh_thuc',''), 'khong_ro'),
        v_item->>'contact_name', v_item->>'contact_phone', v_item->>'contact_zalo',
        v_item->>'contact_email', v_item->>'contact_url', v_item->>'budget_text',
        nullif(v_item->>'budget_min','')::bigint, nullif(v_item->>'budget_max','')::bigint,
        nullif(v_item->>'score','')::int, v_item->'score_breakdown',
        nullif(v_item->>'tier',''), nullif(v_item->>'do_canh_tranh','')::int,
        v_item->>'evidence', v_item->>'auto_notes');
      c_them := c_them + 1;
    end loop;
  end loop;

  update public.demand_inbox set processed = true where not processed;
  perform set_config('app.qua_merge_demand', 'off', true);
  them_moi := c_them; bi_chan := c_chan; da_co := c_daco;
  trung_noi_dung := c_trung; het_han := c_het;
  return next;
end $$;

-- ----------------------------------------------------------------- 5. RLS ---
alter table public.demand_leads     enable row level security;
alter table public.demand_inbox     enable row level security;
alter table public.demand_sources   enable row level security;
alter table public.demand_blocklist enable row level security;
alter table public.demand_query_log enable row level security;
alter table public.demand_audit     enable row level security;

revoke all on public.demand_leads, public.demand_inbox, public.demand_sources,
              public.demand_blocklist, public.demand_query_log, public.demand_audit from anon;

drop policy if exists dm_leads_doc on public.demand_leads;
drop policy if exists dm_leads_them on public.demand_leads;
drop policy if exists dm_leads_sua on public.demand_leads;
drop policy if exists dm_leads_xoa on public.demand_leads;
create policy dm_leads_doc  on public.demand_leads for select to authenticated using (public.co_quyen_doc());
create policy dm_leads_them on public.demand_leads for insert to authenticated with check (public.co_quyen_ghi());
create policy dm_leads_sua  on public.demand_leads for update to authenticated using (public.co_quyen_ghi()) with check (public.co_quyen_ghi());
create policy dm_leads_xoa  on public.demand_leads for delete to authenticated using (public.la_admin());

drop policy if exists dm_inbox_doc on public.demand_inbox;
drop policy if exists dm_inbox_them on public.demand_inbox;
drop policy if exists dm_inbox_sua on public.demand_inbox;
create policy dm_inbox_doc  on public.demand_inbox for select to authenticated using (public.co_quyen_ghi());
create policy dm_inbox_them on public.demand_inbox for insert to authenticated with check (public.co_quyen_ghi());
create policy dm_inbox_sua  on public.demand_inbox for update to authenticated using (public.co_quyen_ghi()) with check (public.co_quyen_ghi());

drop policy if exists dm_sources_doc on public.demand_sources;
drop policy if exists dm_sources_ghi on public.demand_sources;
create policy dm_sources_doc on public.demand_sources for select to authenticated using (public.co_quyen_doc());
create policy dm_sources_ghi on public.demand_sources for all    to authenticated using (public.la_admin()) with check (public.la_admin());

drop policy if exists dm_block_doc on public.demand_blocklist;
drop policy if exists dm_block_ghi on public.demand_blocklist;
create policy dm_block_doc on public.demand_blocklist for select to authenticated using (public.co_quyen_doc());
create policy dm_block_ghi on public.demand_blocklist for all    to authenticated using (public.co_quyen_ghi()) with check (public.co_quyen_ghi());

drop policy if exists dm_qlog_doc on public.demand_query_log;
drop policy if exists dm_qlog_them on public.demand_query_log;
create policy dm_qlog_doc  on public.demand_query_log for select to authenticated using (public.co_quyen_doc());
create policy dm_qlog_them on public.demand_query_log for insert to authenticated with check (public.co_quyen_ghi());

drop policy if exists dm_audit_doc on public.demand_audit;
create policy dm_audit_doc on public.demand_audit for select to authenticated using (public.co_quyen_doc());

-- R8: thu hồi quyền gọi trực tiếp hàm trigger
revoke all on function public.dm_chan_ghi_khong_hop_le() from public, anon, authenticated;
revoke all on function public.dm_bao_ve_cot_nguoi_dung() from public, anon, authenticated;
revoke all on function public.dm_chan_xoa() from public, anon, authenticated;
revoke all on function public.merge_demand_inbox() from public, anon;
grant execute on function public.merge_demand_inbox() to authenticated;

-- --------------------------------------------------------------- 6. SEED ----
insert into public.demand_sources (ma, ten, loai, base_url, chu_ky_phut, ttl_gio, dang_bat, rui_ro_tos, ghi_chu) values
 ('vlance','vLance.vn','san_freelance','https://vlance.vn',180,168,true,'Thấp — nội dung công khai, nên tôn trọng robots.txt + rate limit','Ưu tiên v1'),
 ('freelancerviet','FreelancerViet.vn','san_freelance','https://freelancerviet.vn',180,168,true,'Thấp — tương tự vLance','Ưu tiên v1'),
 ('fb_group','Facebook Groups','facebook',null,30,48,false,'CAO — vi phạm ToS Meta, cần cookie/tài khoản thật, rủi ro khoá tài khoản','MẶC ĐỊNH TẮT. Chỉ bật khi Christian xác nhận chấp nhận rủi ro'),
 ('topcv','TopCV','job_board','https://www.topcv.vn',360,336,true,'Trung bình — kiểm tra ToS trước khi scale','Lọc mảng freelance/part-time/thời vụ'),
 ('vietnamworks','VietnamWorks','job_board','https://www.vietnamworks.com',360,336,true,'Trung bình','Lọc mảng freelance/part-time'),
 ('vieclam24h','Vieclam24h','job_board','https://vieclam24h.vn',360,336,true,'Trung bình','Lọc mảng freelance/part-time')
on conflict (ma) do nothing;
