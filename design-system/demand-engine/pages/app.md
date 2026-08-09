# Page Override — app.html (dashboard duyệt lead)

Override MASTER.md cho trang dashboard. Quyết định đã duyệt với Christian 09/08/2026.

## Màu — ELECTRIC BLUE (không dùng palette violet của MASTER)

| Role | Light | Dark |
|---|---|---|
| Page bg | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Ink 1 / 2 / muted | `#0F172A` / `#475569` / `#94A3B8` | `#F1F5F9` / `#94A3B8` / `#64748B` |
| Border | `#E2E8F0` | `rgba(148,163,184,.18)` |
| Accent | `#2563EB` | `#3B82F6` |
| Accent soft | `#EFF6FF` | `#172554` |
| Good / warning / serious / critical | `#16A34A` / `#D97706` / `#EA580C` / `#DC2626` | giữ nguyên |

Tier A–D là ramp xanh (A đậm → D nhạt). Light: A `#1E40AF`, B `#2563EB`, C `#60A5FA`, D `#DBEAFE` (C/D dùng chữ tối). Dark: đảo chiều để chữ luôn đủ tương phản trên nền ô tier.

## Typography
- Heading/brand/số KPI: **Outfit**; body: **Work Sans**; fallback `system-ui` (Google Fonts `display=swap`, hỗ trợ tiếng Việt).
- Số liệu (điểm, countdown, KPI): `tabular-nums`.

## Style
- Flat tuyệt đối: không shadow, không gradient; card = surface + border 1px, radius 12px.
- Hover: border đậm hơn + nền accent-soft rất nhẹ; transition 160ms ease-out; tôn trọng `prefers-reduced-motion`.
- Icon: SVG inline stroke 1.75px, không emoji.
- Nút: đúng 1 primary mỗi vùng (Nạp lead mới); còn lại ghost/border.

## UX bắt buộc
- Loading state trên nút "Kết nối dữ liệu thật" và "Nạp lead mới" (disable + chữ "Đang…").
- Empty state thật cho live mode khi `demand_leads` trống.
- Mobile ≤720px: card stack dọc, KPI 2 cột, drawer full-width, filter wrap.
- Giữ NGUYÊN toàn bộ logic JS: CAU_HINH (khoá anon), DEMO 8 lead, locLeads, ketNoi/taiLead/napLeadMoi (RPC merge_demand_inbox), datTrangThai, interval 60s.
- Không fabricate dữ liệu trong UI.
