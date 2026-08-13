-- ============================================================================
-- DEMAND ENGINE — Setup sources mở rộng (chạy trên Supabase mới)
-- ============================================================================

-- 1. Thêm các nguồn mới
insert into public.demand_sources (ma, ten, transport, dang_bat, cau_hinh, ttl_gio, tran_lead_moi_dot)
values
  -- TopCV - tuyển dụng marketing
  ('topcv', 'TopCV', 'browser_run', true,
   jsonb_build_object(
     'url_danh_sach', 'https://www.topcv.vn/tim-viec-lam-marketing',
     'regex_link_bai', 'topcv\\.vn/viec-lam/.*marketing.*-\\d+\\.html'
   ), 24, 20),

  -- VietnamWorks
  ('vietnamworks', 'VietnamWorks', 'browser_run', true,
   jsonb_build_object(
     'url_danh_sach', 'https://www.vietnamworks.com/marketing-jobs',
     'regex_link_bai', 'vietnamworks\\.com/.*-jv-\\d+'
   ), 24, 20),

  -- Vieclam24h
  ('vieclam24h', 'Vieclam24h', 'browser_run', true,
   jsonb_build_object(
     'url_danh_sach', 'https://vieclam24h.vn/tim-kiem-viec-lam-nhanh?nganh=marketing',
     'regex_link_bai', 'vieclam24h\\.vn/viec-lam/.*-\\d+\\.html'
   ), 24, 20),

  -- ITviec
  ('itviec', 'ITviec', 'browser_run', true,
   jsonb_build_object(
     'url_danh_sach', 'https://itviec.com/viec-lam/marketing',
     'regex_link_bai', 'itviec\\.com/viec-lam/.*/marketing.*'
   ), 24, 15),

  -- Freelancer.vn (khác freelancerviet)
  ('freelancer_vn', 'Freelancer.vn', 'browser_run', true,
   jsonb_build_object(
     'url_danh_sach', 'https://freelancer.vn/projects/marketing',
     'regex_link_bai', 'freelancer\\.vn/projects/.*marketing.*'
   ), 24, 15),

  -- LinkedIn (chỉ nap_tay do anti-bot mạnh)
  ('linkedin', 'LinkedIn', 'nap_tay', false, '{}', 24, 10),

  -- Upwork (cần unlocker + proxy VN)
  ('upwork', 'Upwork', 'unlocker', false,
   jsonb_build_object('url_danh_sach', 'https://www.upwork.com/nx/search/jobs/?q=marketing'), 48, 10),

  -- Facebook Groups (nap_tay)
  ('fb_group_marketing', 'FB Group Marketing', 'nap_tay', true, '{}', 12, 5),

  -- Facebook Groups (nap_tay)
  ('fb_group_freelance', 'FB Group Freelance', 'nap_tay', true, '{}', 12, 5)
on conflict (ma) do update set
  ten = excluded.ten,
  transport = excluded.transport,
  dang_bat = excluded.dang_bat,
  cau_hinh = excluded.cau_hinh,
  ttl_gio = excluded.ttl_gio,
  tran_lead_moi_dot = excluded.tran_lead_moi_dot;

-- 2. Verify
select ma, ten, transport, dang_bat, cau_hinh, ttl_gio, tran_lead_moi_dot
from demand_sources order by ma;