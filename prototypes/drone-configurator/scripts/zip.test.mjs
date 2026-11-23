// 一场材料的 ZIP：用 Node 自带的 CRC32 独立核对，再按中央目录逐个读回文件。
import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32 as nodeCrc } from 'node:zlib';
import { crc32, zipBytes } from '../src/v4/zip.ts';

test('the session bundle is a valid zip whose entries read back byte for byte', () => {
  const enc = new TextEncoder();
  const files = [{ name: 'workspace.json', data: enc.encode('{"a":1}') }, { name: '轮次/第1轮.png', data: new Uint8Array([137, 80, 78, 71, 0, 255]) }];
  for (const f of files) assert.equal(crc32(f.data), nodeCrc(f.data));
  const zip = zipBytes(files);
  const view = new DataView(zip.buffer);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  let at = view.getUint32(end + 16, true);
  const dec = new TextDecoder();
  for (const f of files) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
    assert.equal(dec.decode(zip.slice(at + 46, at + 46 + nameLen)), f.name);
    const localNameLen = view.getUint16(local + 26, true);
    const data = zip.slice(local + 30 + localNameLen, local + 30 + localNameLen + size);
    assert.deepEqual(data, f.data);
    assert.equal(view.getUint32(at + 16, true), nodeCrc(data));
    at += 46 + nameLen;
  }
});
