// tests/loc-trung.test.js — Chặn lead trùng tại cổng nạp
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { locTrungTrongLo, locTrungDaCo } from '../src/core/loc-trung.js';

describe('locTrungTrongLo — dedup trong cùng một lô', () => {
  test('giữ bản đầu tiên khi trùng lead_key', () => {
    const payloads = [
      { lead_key: 'k1', title: 'bản gốc' },
      { lead_key: 'k2', title: 'khác' },
      { lead_key: 'k1', title: 'bản sao' },
    ];
    const { moi, trung } = locTrungTrongLo(payloads);
    assert.equal(moi.length, 2);
    assert.equal(trung, 1);
    assert.equal(moi[0].title, 'bản gốc');
  });

  test('payload không có lead_key vẫn được giữ lại (không nuốt dữ liệu)', () => {
    const payloads = [{ title: 'không key' }, { lead_key: 'k1' }, { title: 'không key 2' }];
    const { moi, trung } = locTrungTrongLo(payloads);
    assert.equal(moi.length, 3);
    assert.equal(trung, 0);
  });

  test('danh sách rỗng / null an toàn', () => {
    assert.deepEqual(locTrungTrongLo([]), { moi: [], trung: 0 });
    assert.deepEqual(locTrungTrongLo(null), { moi: [], trung: 0 });
  });

  test('không trùng thì giữ nguyên thứ tự', () => {
    const payloads = [{ lead_key: 'a' }, { lead_key: 'b' }, { lead_key: 'c' }];
    const { moi, trung } = locTrungTrongLo(payloads);
    assert.equal(moi.length, 3);
    assert.equal(trung, 0);
    assert.deepEqual(moi.map((p) => p.lead_key), ['a', 'b', 'c']);
  });
});

describe('locTrungDaCo — dedup với DB', () => {
  test('loại payload có key đã tồn tại trong DB', () => {
    const payloads = [{ lead_key: 'k1' }, { lead_key: 'k2' }, { lead_key: 'k3' }];
    const { moi, trung } = locTrungDaCo(payloads, ['k1', 'k3']);
    assert.deepEqual(moi.map((p) => p.lead_key), ['k2']);
    assert.equal(trung, 2);
  });

  test('keysDaCo rỗng / null thì giữ nguyên', () => {
    const payloads = [{ lead_key: 'k1' }];
    assert.deepEqual(locTrungDaCo(payloads, []), { moi: payloads, trung: 0 });
    assert.deepEqual(locTrungDaCo(payloads, null), { moi: payloads, trung: 0 });
  });

  test('kết hợp 2 tầng: trong lô trước, với DB sau', () => {
    const payloads = [
      { lead_key: 'k1' }, { lead_key: 'k1' }, // trùng trong lô
      { lead_key: 'k2' },                      // trùng với DB
      { lead_key: 'k3' },                      // mới
    ];
    const tang1 = locTrungTrongLo(payloads);
    const tang2 = locTrungDaCo(tang1.moi, ['k2']);
    // k1 sống sót qua tầng 2 vì không nằm trong DB — chỉ bị loại bản sao ở tầng 1
    assert.deepEqual(tang2.moi.map((p) => p.lead_key), ['k1', 'k3']);
    assert.equal(tang1.trung, 1);
    assert.equal(tang2.trung, 1);
  });
});
