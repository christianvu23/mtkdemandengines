# Page Override — index.html (landing marketing)

Override MASTER.md cho landing page. Kế thừa token Electric Blue của `pages/app.md`.

## Cấu trúc — Minimal Single Column
1. Hero: headline lợi ích lớn + 1 câu mô tả + CTA duy nhất "Vào dashboard" → `/app.html`
2. 3 benefit bullets (tốc độ chạm / chấm điểm minh bạch / máy đề xuất–người bấm) — icon SVG
3. Status strip trung thực (nguồn đã nối, rubric 100, trạng thái thật của hệ thống)
4. CTA lặp lại + footer nhỏ

## Quy tắc cứng
- **KHÔNG bịa số liệu**: không "hàng nghìn lead", không testimonial giả, không logo khách hàng. Chỉ nói sự thật kiểm chứng được (39 test, rubric 100 điểm, TTL 24–72h, máy đề xuất–người bấm).
- Một CTA duy nhất; không nav clutter; whitespace rộng.
- SEO/LLM cơ bản: `lang="vi"`, title + meta description thật, OpenGraph, semantic h1/section/footer, JSON-LD SoftwareApplication nhẹ nếu không phình file.
- Self-contained 1 file, dark/light toggle, responsive, reduced-motion.
