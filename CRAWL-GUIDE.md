# Hướng dẫn Quét & Nạp Lead

## Tổng quan

Hệ thống quét lead marketing từ các nguồn:
- **vieclam24h** — Job board (✅ hoạt động)
- **vlance** — Freelance marketplace (browser_run)
- **freelancerviet** — Freelancer VN (browser_run, JS-rendered)
- **topcv** — Job board (❌ Cloudflare chặn)
- **vietnamworks** — Job board (❌ Next.js JSON)
- **fb_group** — Facebook Groups (mặc định tắt, nap_tay)

## Luồng dữ liệu

```
Sources (demand_sources) → POST /api/demand/quet
    ↓
Cloudflare Queue → browser_run → boc-link.js (tách links)
    ↓
Queue: mỗi link = 1 job → fetch detail → nap-lead.js (chấm điểm 0-100)
    ↓
demand_inbox (Supabase staging)
    ↓
Christian bấm "Nạp" → merge_demand_inbox() → demand_leads
```

## API Endpoints

### Public (không cần auth)

```bash
# Xem leads trong inbox
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/inbox

# Xem sources đã config
curl https://mtkdemandengines.christianvu23.workers.dev/api/demand/trang-thai
```

### Protected (cần X-Demand-Token)

```bash
# Quét 1 nguồn
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet?nguon=vieclam24h

# Quét tất cả nguồn đang bật
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/quet

# Nạp lead thủ công (từ Facebook, copy-paste)
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "fb_manual",
    "noiDung": "Cần thiết kế logo, banner cho shop mỹ phẩm. Ngân sách 5-10tr. Zalo 0901234567",
    "tieuDe": "Tuyển designer freelance"
  }' \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/nap

# Nạp nhiều leads cùng lúc
curl -X POST \
  -H "X-Demand-Token: mkt-demangen-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {"source": "fb_manual", "noiDung": "Lead 1..."},
      {"source": "fb_manual", "noiDung": "Lead 2..."}
    ]
  }' \
  https://mtkdemandengines.christianvu23.workers.dev/api/demand/nap
```

## Rubric chấm điểm (100 điểm)

| Trục | Điểm | Mô tả |
|------|------|-------|
| Độ tươi | 25 | <2h=25, <6h=21, <12h=18, <24h=14, <48h=8, <72h=4, >72h=1 |
| Liên hệ | 20 | Trực tiếp (SĐT/Zalo)=20, gián tiếp (email)=11, không=0 |
| Cụ thể | 20 | deliverable +6, deadline +4, industry +4, length 200+ +3, 400+ +3 |
| Khớp dịch vụ | 15 | 2+ nhu cầu=15, 1 nhu cầu=12, ngoài phạm vi=0 |
| Ngân sách | 12 | Cụ thể=12, thương lượng=7, khác=4 |
| Hình thức | 8 | freelance/retainer=8, project=6, unknown=4, full-time=1 |
| Phạt cạnh tranh | -10 | 1-3 bids=-2, 4-10=-5, 11-25=-8, 25+=-10 |

**Tiers:** A ≥75, B 60-74, C 45-59, D <45

## Cấu hình nguồn mới

1. Thêm row vào `demand_sources` table (Supabase)
2. Điền: `ma`, `name`, `transport`, `cau_hinh` (JSONB với `url_danh_sach`, `regex_link_bai`)
3. Set `dang_bat = true`

### Transport options
| Transport | Khi nào dùng |
|-----------|-------------|
| `truc_tiep` | Site trả HTML trực tiếp, không JS |
| `browser_run` | Site JS-rendered hoặc có anti-bot (Cloudflare) |
| `unlocker` | Site có anti-bot nặng (Bright Data) |
| `nap_tay` | Không tự động crawl (Facebook groups) |

## Cron tự động

Cron handler fetch sources từ DB và gửi vào queue. Uncomment trong `wrangler.toml` để bật:

```toml
[[triggers.crons]]
schedule = "*/30 * * * *"
```

## Giao diện

| Trang | URL | Mô tả |
|-------|-----|-------|
| Landing | `/` | Marketing page |
| Dashboard | `/app` | Duyệt lead, merge vào DB (GitHub OAuth) |
| Leads viewer | `/leads.html` | Xem nhanh leads từ inbox |

---

**Last updated:** 2026-08-13
