-- Thêm các nguồn mới vào demand_sources
-- Chạy: psql hoặc Supabase SQL Editor

-- Fastlance.vn - Sàn freelance Việt Nam
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('fastlance', 'Fastlance.vn', 'san_freelance', 'https://fastlance.vn', 'browser_run',
  '{"url_danh_sach": "https://fastlance.vn/dich-vu/marketing", "regex_link_bai": "fastlance\\.vn/dich-vu/"}',
  true, 168, 40, 180,
  'Thấp — nội dung công khai, nên tôn trọng robots.txt + rate limit',
  'Sàn freelance Việt, mảng marketing/design')
ON CONFLICT (ma) DO NOTHING;

-- VietGigs.vn - Sàn gig Việt Nam
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('vietgigs', 'VietGigs.vn', 'san_freelance', 'https://vietgigs.vn', 'browser_run',
  '{"url_danh_sach": "https://vietgigs.vn/gigs/social-media-ads", "regex_link_bai": "vietgigs\\.vn/gigs/"}',
  true, 168, 40, 180,
  'Thấp — nội dung công khai',
  'Gig platform cho social media, video, content')
ON CONFLICT (ma) DO NOTHING;

-- GigHit.vn - Sàn freelance Việt
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('gighit', 'GigHit.vn', 'san_freelance', 'https://gighit.vn', 'browser_run',
  '{"url_danh_sach": "https://gighit.vn/gigs/marketing", "regex_link_bai": "gighit\\.vn/gigs/"}',
  true, 168, 40, 180,
  'Thấp — nội dung công khai',
  'Gig platform marketing/design')
ON CONFLICT (ma) DO NOTHING;

-- JobsGo.vn - Trang việc làm
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('jobsgo', 'JobsGo.vn', 'job_board', 'https://jobsgo.vn', 'browser_run',
  '{"url_danh_sach": "https://jobsgo.vn/viec-lam/marketing", "regex_link_bai": "jobsgo\\.vn/viec-lam/"}',
  true, 336, 40, 360,
  'Trung bình — kiểm tra ToS trước khi scale',
  'Job board marketing/freelance')
ON CONFLICT (ma) DO NOTHING;

-- CareerViet.vn - Trang việc làm
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('careerviet', 'CareerViet.vn', 'job_board', 'https://careerviet.vn', 'browser_run',
  '{"url_danh_sach": "https://careerviet.vn/viec-lam/Digital-Marketing-k-vi.html", "regex_link_bai": "careerviet\\.vn/viec-lam/"}',
  true, 336, 40, 360,
  'Trung bình',
  'Job board digital marketing')
ON CONFLICT (ma) DO NOTHING;

-- 123Job.vn - Trang việc làm
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('job123', '123Job.vn', 'job_board', 'https://123job.vn', 'browser_run',
  '{"url_danh_sach": "https://123job.vn/viec-lam/freelancer-marketing", "regex_link_bai": "123job\\.vn/viec-lam/"}',
  true, 336, 40, 360,
  'Trung bình',
  'Job board freelance marketing')
ON CONFLICT (ma) DO NOTHING;

-- BlackHatWorld - Diễn đàn marketing (quốc tế)
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('blackhatworld', 'BlackHatWorld', 'forum', 'https://www.blackhatworld.com', 'browser_run',
  '{"url_danh_sach": "https://www.blackhatworld.com/seo/marketplace/", "regex_link_bai": "blackhatworld\\.com/threads/"}',
  true, 168, 40, 180,
  'Trung bình — diễn đàn công khai, tuân thủ nội quy',
  'Diễn đàn marketing quốc tế, marketplace')
ON CONFLICT (ma) DO NOTHING;

-- VOZ Marketing - Diễn đàn Việt Nam
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('voz_marketing', 'VOZ Marketing', 'forum', 'https://voz.vn', 'browser_run',
  '{"url_danh_sach": "https://voz.vn/f/marketing-PR.34/", "regex_link_bai": "voz\\.vn/t/"}',
  true, 168, 40, 180,
  'Trung bình — diễn đàn công khai',
  'Diễn đàn VOZ mảng Marketing/PR')
ON CONFLICT (ma) DO NOTHING;

-- PeoplePerHour - Sàn freelance quốc tế
INSERT INTO demand_sources (ma, ten, loai, base_url, transport, cau_hinh, dang_bat, ttl_gio, tran_lead_moi_dot, chu_ky_phut, rui_ro_tos, ghi_chu)
VALUES ('peopleperhour', 'PeoplePerHour', 'san_freelance', 'https://www.peopleperhour.com', 'browser_run',
  '{"url_danh_sach": "https://www.peopleperhour.com/freelance-marketing-jobs", "regex_link_bai": "peopleperhour\\.com/freelance-jobs/"}',
  true, 168, 40, 180,
  'Thấp — nội dung công khai',
  'Sàn freelance quốc tế, mảng marketing')
ON CONFLICT (ma) DO NOTHING;

-- VietnamWorks (đã có, cập nhật config)
UPDATE demand_sources
SET cau_hinh = cau_hinh || '{"regex_link_bai": "vietnamworks\\.com/.*-job"}'::jsonb
WHERE ma = 'vietnamworks' AND (cau_hinh->>'regex_link_bai' IS NULL);

-- vLance (cập nhật regex)
UPDATE demand_sources
SET cau_hinh = cau_hinh || '{"regex_link_bai": "vlance\\.vn/du-an/"}'::jsonb
WHERE ma = 'vlance' AND (cau_hinh->>'regex_link_bai' IS NULL);

-- Kiểm tra kết quả
SELECT ma, ten, dang_bat, transport, cau_hinh->>'url_danh_sach' AS url, cau_hinh->>'regex_link_bai' AS regex
FROM demand_sources
ORDER BY ma;