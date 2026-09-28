"""Render the repository's simple geometric brand mark into Windows ICO frames."""
from pathlib import Path
import struct
import zlib


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))


def png(size):
    points = [(20, 8), (24, 16), (32, 20), (24, 24), (20, 32), (16, 24), (8, 20), (16, 16)]
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            px, py = (x + 0.5) * 40 / size, (y + 0.5) * 40 / size
            inside = False
            for index, (ax, ay) in enumerate(points):
                bx, by = points[index - 1]
                if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax:
                    inside = not inside
            cx, cy = min(max(px, 12), 28), min(max(py, 12), 28)
            alpha = 255 if (px - cx) ** 2 + (py - cy) ** 2 <= 144 else 0
            rows.extend((208, 238, 145, alpha) if inside else (37, 57, 48, alpha))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


frames = [(size, png(size)) for size in (16, 32, 48, 256)]
offset = 6 + 16 * len(frames)
header = struct.pack("<HHH", 0, 1, len(frames))
payload = bytearray()
for size, image in frames:
    header += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(image), offset)
    payload.extend(image)
    offset += len(image)
destination = Path(__file__).resolve().parents[1] / "apps/desktop/src-tauri/icons/icon.ico"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(header + payload)
