import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chuanBiMessageQuetNguon, xuLyMotMessage } from '../worker.js';

const RUN = 'agent-2026-08-11';

test('chuanBiMessageQuetNguon bỏ nguồn chưa có url_danh_sach', () => {
  const ds = [
    { ma: 'vlance', transport: 'truc_tiep', cau_hinh: { url_danh_sach: 'https://vlance.vn/viec-lam' } },
    { ma: 'fb_group', transport: 'nap_tay' },
  ];
  const msg = chuanBiMessageQuetNguon(ds, RUN);
  assert.equal(msg.length, 1);
  assert.equal(msg[0].ma_nguon, 'vlance');
  assert.equal(msg[0].url_danh_sach, 'https://vlance.vn/viec-lam');
  assert.equal(msg[0].loai, 'quet_nguon');
});

test('chuanBiMessageQuetNguon điền mặc định tran=40, regex null', () => {
  const msg = chuanBiMessageQuetNguon(
    [{ ma: 'x', transport: 'browser_run', cau_hinh: { url_danh_sach: 'u' } }],
    RUN,
  );
  assert.equal(msg[0].tran, 40);
  assert.equal(msg[0].regex_link_bai, null);
  assert.equal(msg[0].so_loi_lien_tiep, 0);
});

test('chuanBiMessageQuetNguon giữ tran, regex và so_loi đã cấu hình', () => {
  const msg = chuanBiMessageQuetNguon(
    [{
      ma: 'x', transport: 'truc_tiep', tran_lead_moi_dot: 10, so_loi_lien_tiep: 3,
      cau_hinh: { url_danh_sach: 'u', regex_link_bai: 're' },
    }],
    RUN,
  );
  assert.equal(msg[0].tran, 10);
  assert.equal(msg[0].regex_link_bai, 're');
  assert.equal(msg[0].so_loi_lien_tiep, 3);
});

test('xuLyMotMessage không biết loại message → báo lỗi, không sập', async () => {
  const kq = await xuLyMotMessage({ loai: 'loai_la' }, {});
  assert.match(kq.loi, /loai_la/);
});

test('xuLyMotMessage quet_nguon thiếu url_danh_sach → bo_qua, không gọi mạng', async () => {
  const kq = await xuLyMotMessage({ loai: 'quet_nguon', ma_nguon: 'x' }, {});
  assert.equal(kq.bo_qua, 'chưa cấu hình url_danh_sach');
});

test('xuLyMotMessage message rỗng → báo lỗi', async () => {
  const kq = await xuLyMotMessage(null, {});
  assert.ok(kq.loi);
  const kq2 = await xuLyMotMessage(undefined, {});
  assert.ok(kq2.loi);
});
