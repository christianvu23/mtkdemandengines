-- 20260814 — Chặn lead trùng NGAY TẠI CỔNG NẠP INBOX
-- =====================================================
-- VẤN ĐỀ: cron 30 phút cào lại cùng URL → demand_inbox chứa đầy bản sao của
-- cùng một lead. merge_demand_inbox() đã chặn trùng khi merge vào demand_leads
-- (nhờ unique lead_key), nhưng inbox thì chưa → dashboard bắt người duyệt đi
-- duyệt lại cùng một lead, inbox phình vô hạn.
--
-- GIẢI PHÁP: RPC trả về tập lead_key ĐÃ TỒN TẠI (trong demand_leads HOẶC
-- trong demand_inbox chưa xử lý). Worker gọi RPC này TRƯỚC khi napVaoInbox
-- và chỉ insert phần khác biệt.
--
-- Áp dụng: chạy file này trong Supabase SQL Editor.

create or replace function public.dm_loc_keys_da_co(p_keys jsonb)
returns table(khoa text)
language sql stable
set search_path to ''
as $$
  select k.khoa
  from (
    select distinct public.dm_chuan_hoa_key(x) as khoa
    from jsonb_array_elements_text(coalesce(p_keys, '[]'::jsonb)) as x
  ) k
  where k.khoa is not null
    and (
      -- Đã vào bảng chính
      exists (select 1 from public.demand_leads l where l.lead_key = k.khoa)
      -- Hoặc đang nằm trong inbox chờ duyệt
      or exists (
        select 1
        from public.demand_inbox i
        cross join lateral jsonb_array_elements(i.payload) as p
        where i.processed = false
          and public.dm_chuan_hoa_key(p->>'lead_key') = k.khoa
      )
    );
$$;

grant execute on function public.dm_loc_keys_da_co(jsonb) to anon, authenticated, service_role;

comment on function public.dm_loc_keys_da_co(jsonb) is
  'Trả về các lead_key đã tồn tại trong demand_leads hoặc demand_inbox chưa xử lý — dùng để chặn trùng tại cổng nạp.';
