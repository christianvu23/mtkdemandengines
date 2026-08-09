# demand-engine-mcp-server

MCP server cho Demand Engine — truy vấn, chấm điểm và nạp lead từ bất kỳ MCP client nào.

## Sáu công cụ

| Công cụ | Ghi? | Việc |
|---|---|---|
| `demand_search_leads` | không | Tìm lead theo hạng/nguồn/nhu cầu/độ tươi, có phân trang |
| `demand_get_lead` | không | Chi tiết một lead + phân rã điểm + nội dung gốc |
| `demand_score_text` | không | Chấm một mẩu tin **không lưu** — chạy được cả khi chưa có CSDL |
| `demand_ingest_lead` | **có** | Chấm rồi đẩy vào `demand_inbox` (tối đa 50/lần) |
| `demand_list_sources` | không | Nguồn + transport + trạng thái + rủi ro ToS |
| `demand_stats` | không | Đếm theo hạng/nguồn, sắp hết hạn trong 6h |

Mọi công cụ đọc đều nhận `response_format`: `markdown` (mặc định) hoặc `json`,
và trả `structuredContent` để client xử lý bằng máy.

## Cố ý KHÔNG có công cụ đổi trạng thái lead

Nguyên tắc xuyên suốt dự án là **máy đề xuất, người bấm**. Nếu để agent tự đặt
`status` thì nguyên tắc đó mất. Đường ghi duy nhất là `demand_ingest_lead` → hàng đợi,
và vẫn cần người bấm "Nạp lead mới" mới vào bảng chính.

Có test chặn: `tests/mcp.test.js` sẽ đỏ nếu ai đó thêm công cụ ghi thứ hai.

## Cài vào Claude Desktop / Cowork

```json
{
  "mcpServers": {
    "demand-engine": {
      "command": "node",
      "args": ["/duong/dan/toi/mtkdemandengines/mcp/server.js"],
      "env": {
        "SUPABASE_URL": "https://dlzhcfrojibpscozdmrx.supabase.co",
        "SUPABASE_SERVICE_KEY": "<service_role key>"
      }
    }
  }
}
```

Thiếu credential thì `demand_score_text` **vẫn chạy** (hàm thuần); các công cụ khác
báo lỗi kèm hướng dẫn thay vì sập.

> ⚠️ `SUPABASE_SERVICE_KEY` bỏ qua toàn bộ RLS. Chỉ để trong cấu hình cục bộ trên máy
> bạn, không bao giờ đưa vào code hay client.

## Ví dụ

**Chấm thử một bài vừa thấy trong nhóm Facebook**
> "Chấm giúp tin này: Shop mỹ phẩm cần quay dựng video TikTok, 10 video/tháng, ngân sách 5-10tr/tháng, Zalo 0901234567"

**Xem việc cần làm hôm nay**
> "Lead hạng A nào còn hạn mà chưa liên hệ?"

**Nạp một loạt bài đã copy**
> "Nạp 3 tin này vào hàng đợi giúp tôi: …"

## Test

`npm test` chạy 9 test tích hợp gọi server thật qua stdio, không mock.
`mcp/evaluations.xml` có 10 câu hỏi kèm đáp án đã chạy thật.
