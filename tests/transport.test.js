import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nenThuLai, thuLaiCoLui } from '../src/transport/index.js';

// ---------- Transport: nenThuLai ----------
test('nenThuLai chỉ đúng với l� l�� lỗi tạm thời', () => {
  assert.equal(nenThuLai(429), true);
  assert.equal(nenThuLai(503), true);
  assert.equal(nenThuLai(403), false, '403 của vLance là chặn bot — thử lại vô ích');
  assert.equal(nenThuLai(404), false);
});

test('nenThuLai additional edge cases', () => {
  assert.equal(nenThuLai(200), false); // success should not retry
  assert.equal(nenThuLai(400), false); // 4xx other than 429,408
  assert.equal(nenThuLai(408), true);  // request timeout
  assert.equal(nenThuLai(410), false); // gone
  assert.equal(nenThuLai(500), true);  // internal server error
  assert.equal(nenThuLai(502), true);  // bad gateway
  assert.equal(nenThuLai(504), true);  // gateway timeout
  assert.equal(nenThuLai(599), true);  // 5xx
  assert.equal(nenThuLai(600), false); // 6xx not standard
});

// ---------- Transport: thuLaiCoLui ----------
test('thuLaiCoLui trả về kết quả thành công ngay khi hàm thành công lần đầu', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    return { ok: true, noiDung: 'success', nguon: 'test' };
  };
  const result = await thuLaiCoLui(fn, 3);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.noiDung, 'success');
  assert.strictEqual(callCount, 1);
});

test('thuLaiCoLui retry khi l� lỗi tạm thời và thành công sau', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    if (callCount < 3) {
      // retryable error: status 500
      return { ok: false, noiDung: undefined, nguon: 'test', loi: 'Internal Server Error', thuLaiDuoc: true };
    }
    return { ok: true, noiDung: 'success', nguon: 'test' };
  };
  const result = await thuLaiCoLui(fn, 5);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.noiDung, 'success');
  assert.strictEqual(callCount, 3);
});

test('thuLaiCoLui trả về ngay khi l� lỗi không retry', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    // non-retryable error: status 404
    return { ok: false, noiDung: undefined, nguon: 'test', loi: 'Not Found', thuLaiDuoc: false };
  };
  const result = await thuLaiCoLui(fn, 3);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.loi, 'Not Found');
  assert.strictEqual(result.thuLaiDuoc, false);
  assert.strictEqual(callCount, 1);
});

test('thuLaiCoLui xử lý ngoại lệ như l� lỗi tạm thời', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    if (callCount < 2) {
      throw new Error('Network error');
    }
    return { ok: true, noiDung: 'success', nguon: 'test' };
  };
  const result = await thuLaiCoLui(fn, 3);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.noiDung, 'success');
  assert.strictEqual(callCount, 2);
});

test('thuLaiCoLui trả về l� lỗi cuối cùng khi tất cảAttempts đều là l� lỗi tạm thời', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    return { ok: false, noiDung: undefined, nguon: 'test', loi: 'Persistent error', thuLaiDuoc: true };
  };
  const result = await thuLaiCoLui(fn, 2);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.loi, 'Persistent error');
  assert.strictEqual(result.thuLaiDuoc, true);
  assert.strictEqual(callCount, 2);
});

test('thuLaiCoLui với soLan = 0 trả về undefined', async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    return { ok: true, noiDung: 'should not be called', nguon: 'test' };
  };
  const result = await thuLaiCoLui(fn, 0);
  assert.strictEqual(result, undefined);
  assert.strictEqual(callCount, 0);
});