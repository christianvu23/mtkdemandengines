-- ============================================================================
-- DEMAND ENGINE — Migration bổ sung 11/08/2026
-- Bổ sung các cột còn thiếu cho demand_sources mà worker/MCP cần.
--
-- LÝ DO: file 20260809_demand_engine_v1.sql (bản hợp nhất) thiếu các cột
--   transport · cau_hinh · tran_lead_moi_dot · lan_quet_cuoi · lan_loi_cuoi
--   · so_loi_lien_tiep  — trong khi worker.js và mcp/server.js đọc chúng.
--   Project cũ dlzhcfrojibpscozdmrx có đủ (thêm thủ công), project mới
--   emkwknwcyyewevmmoxzj dựng từ file hợp nhất nên thiếu.
--
-- CÁCH CHẠY: mở Supabase dashboard → SQL Editor → New query → dán toàn bộ
--   file này → Run. Idempotent, chạy lại không hỏng.
-- ============================================================================

alter table public.demand_sources
  add column if not exists transport text not null default 'truc_tiep'
    check (transport in ('truc_tiep','browser_run','unlocker','nap_tay'));

alter table public.demand_sources
  add column if not exists cau_hinh jsonb not null default '{}'::jsonb;

alter table public.demand_sources
  add column if not exists tran_lead_moi_dot int not null default 40;

alter table public.demand_sources
  add column if not exists lan_quet_cuoi timestamptz;

alter table public.demand_sources
  add column if not exists lan_loi_cuoi timestamptz;

alter table public.demand_sources
  add column if not exists so_loi_lien_tiep int not null default 0;

-- Seed transport + cấu hình cho từng nguồn (khớp kiến trúc src/transport + boc-link)
-- freelancerviet: JS-rendered site → cần browser_run (không dùng truc_tiep)
update public.demand_sources set
  transport = 'browser_run',
  cau_hinh = cau_hinh || jsonb_build_object(
    'url_danh_sach', 'https://freelancerviet.vn/viec-lam-freelance.html',
    'regex_link_bai', 'freelancerviet\\.vn/thong-tin-viec-freelance/')
where ma = 'freelancerviet';

update public.demand_sources set
  transport = 'browser_run',
  cau_hinh = cau_hinh || jsonb_build_object(
    'url_danh_sach', 'https://www.vlance.vn/viec-lam-freelance')
where ma = 'vlance';

update public.demand_sources set
  transport = 'nap_tay'
where ma = 'fb_group';
