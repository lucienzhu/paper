"""不依赖第三方库的 PNG 读写：只支持 8 位、非隔行的灰度、RGB、RGBA，够环境核对和测试用。"""
import struct
import zlib


def decode(data):
    """返回 (宽, 高, 每像素通道数, 逐行展开的像素字节)。"""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("不是 PNG")
    pos, idat, head = 8, [], None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            head = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            idat.append(body)
        elif kind == b"IEND":
            break
    width, height, depth, color, _, _, interlace = head
    channels = {0: 1, 2: 3, 6: 4}.get(color)
    if depth != 8 or channels is None or interlace:
        raise ValueError(f"不支持的 PNG：位深 {depth}、颜色类型 {color}、隔行 {interlace}")
    raw = zlib.decompress(b"".join(idat))
    stride = width * channels
    out = bytearray(stride * height)
    prev = bytearray(stride)
    i = 0
    for y in range(height):
        f = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        if f == 1:
            for x in range(channels, stride):
                line[x] = (line[x] + line[x - channels]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                left = line[x - channels] if x >= channels else 0
                line[x] = (line[x] + ((left + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - channels] if x >= channels else 0
                b = prev[x]
                c = prev[x - channels] if x >= channels else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[x] = (line[x] + pred) & 255
        elif f != 0:
            raise ValueError(f"未知的行滤波 {f}")
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return width, height, channels, bytes(out)


def rgb(data):
    """解码后只留 RGB 三通道（灰度扩成三通道，RGBA 去掉透明度）。"""
    w, h, c, px = decode(data)
    if c == 3:
        return w, h, px
    if c == 4:
        return w, h, bytes(b for i, b in enumerate(px) if i % 4 != 3)
    return w, h, bytes(v for v in px for _ in range(3))


def encode_rgb(width, height, px, text=None):
    """写一张 RGB PNG（无滤波）；text 是要写进 tEXt 块的 {键: 值}。"""
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)
    stride = width * 3
    rows = b"".join(b"\x00" + px[y * stride:(y + 1) * stride] for y in range(height))
    parts = [b"\x89PNG\r\n\x1a\n", chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))]
    for k, v in (text or {}).items():
        parts.append(chunk(b"tEXt", k.encode("latin-1") + b"\x00" + v.encode("latin-1", "replace")))
    parts += [chunk(b"IDAT", zlib.compress(rows, 6)), chunk(b"IEND", b"")]
    return b"".join(parts)
