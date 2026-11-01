from __future__ import annotations

import struct
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GAME = ROOT / "assets" / "game"
REGULATION = GAME / "regulation.bin"
MESSAGES = GAME / "msg" / "engus"
EXTRACTOR = ROOT / "tools" / "game-extract" / "target" / "release" / "game-extract"

REGULATION_KEY = bytes.fromhex("99BFFC366A6BC8C6F5827D093602D676C42892A01C207FB024D3AF4E493FEF99")


POINT_ICON_OFFSET, POINT_TEXT_OFFSET = 0x0C, 0x30
GRACE_BLOCK_OFFSET, GRACE_POSITION_OFFSET, GRACE_TEXT_OFFSET = 0x20, 0x24, 0x30
BLOCK_SIZE_METERS = 256

FLAG_IDS, FLAG_NAMES1, FLAG_NAMES2, FLAG_LONG_OFFSETS, FLAG_COMPRESSION = 0x02, 0x04, 0x08, 0x10, 0x20


def decompress_dcx(data: bytes) -> bytes:
    if data[:4] != b"DCX\0":
        return data
    kind = data[0x28:0x2C]
    if kind == b"ZSTD":
        import zstandard

        size = struct.unpack(">I", data[0x1C:0x20])[0]
        return zstandard.ZstdDecompressor().decompress(data[0x4C:], max_output_size=size)
    with tempfile.TemporaryDirectory() as scratch:
        packed, unpacked = Path(scratch) / "in.dcx", Path(scratch) / "out.bin"
        packed.write_bytes(data)
        subprocess.run([EXTRACTOR, "dcx", packed, unpacked], check=True)
        return unpacked.read_bytes()


def read_regulation() -> bytes:
    from Crypto.Cipher import AES

    encrypted = REGULATION.read_bytes()
    plain = AES.new(REGULATION_KEY, AES.MODE_CBC, encrypted[:16]).decrypt(encrypted[16:])
    return decompress_dcx(plain)


def reverse_bits(value: int) -> int:
    return int(f"{value:08b}"[::-1], 2)


def read_bnd4(data: bytes) -> dict[str, bytes]:
    assert data[:4] == b"BND4", "not a BND4 binder"
    bit_big_endian = not data[0xA]
    count = struct.unpack_from("<i", data, 0xC)[0]
    entry_size = struct.unpack_from("<q", data, 0x20)[0]
    unicode = data[0x30] == 1
    raw = data[0x31]
    reverse = bit_big_endian or (raw & 1 and not raw & 0x80)
    flags = raw if reverse else reverse_bits(raw)
    files = {}
    for index in range(count):
        at = 0x40 + index * entry_size + 8
        size = struct.unpack_from("<q", data, at)[0]
        at += 8
        if flags & FLAG_COMPRESSION:
            at += 8
        if flags & FLAG_LONG_OFFSETS:
            offset = struct.unpack_from("<q", data, at)[0]
            at += 8
        else:
            offset = struct.unpack_from("<I", data, at)[0]
            at += 4
        if flags & FLAG_IDS:
            at += 4
        name_offset = struct.unpack_from("<I", data, at)[0]
        if unicode:
            end = name_offset
            while data[end : end + 2] != b"\0\0":
                end += 2
            name = data[name_offset:end].decode("utf-16-le")
        else:
            name = data[name_offset : data.index(b"\0", name_offset)].decode("shift_jis")
        files[name.split("\\")[-1]] = decompress_dcx(data[offset : offset + size])
    return files


def read_param(data: bytes) -> dict[int, bytes]:
    count = struct.unpack_from("<H", data, 0xA)[0]
    headers = [struct.unpack_from("<iiqq", data, 0x40 + index * 24) for index in range(count)]
    offsets = sorted({offset for _, _, offset, _ in headers})
    row_size = offsets[1] - offsets[0] if len(offsets) > 1 else 0
    return {row_id: data[offset : offset + row_size] for row_id, _, offset, _ in headers}


def read_fmg(data: bytes) -> dict[int, str]:
    group_count, _ = struct.unpack_from("<ii", data, 0xC)
    offsets_at = struct.unpack_from("<q", data, 0x18)[0]
    texts = {}
    for group in range(group_count):
        index, first, last, _ = struct.unpack_from("<iiii", data, 0x28 + group * 16)
        for step in range(last - first + 1):
            at = struct.unpack_from("<q", data, offsets_at + (index + step) * 8)[0]
            if at <= 0:
                continue
            end = at
            while data[end : end + 2] != b"\0\0":
                end += 2
            texts[first + step] = data[at:end].decode("utf-16-le")
    return texts


def read_messages(prefix: str) -> dict[str, dict[int, str]]:
    merged: dict[str, dict[int, str]] = {}
    for path in sorted(MESSAGES.glob(f"{prefix}*.msgbnd.dcx")):
        for name, fmg in read_bnd4(decompress_dcx(path.read_bytes())).items():
            base = name.removesuffix(".fmg").split("_dlc")[0]
            merged.setdefault(base, {}).update({key: text for key, text in read_fmg(fmg).items() if text})
    return merged


def map_point_icons() -> dict[str, int]:
    from collections import Counter

    rows = read_param(read_bnd4(read_regulation())["WorldMapPointParam.param"])
    places = read_messages("menu").get("PlaceName") or read_messages("item").get("PlaceName", {})
    votes: dict[str, Counter] = {}
    for row in rows.values():
        icon_id = struct.unpack_from("<H", row, POINT_ICON_OFFSET)[0]
        name = places.get(struct.unpack_from("<i", row, POINT_TEXT_OFFSET)[0])
        if name and icon_id:
            votes.setdefault(name, Counter())[icon_id] += 1
    return {name: counter.most_common(1)[0][0] for name, counter in votes.items()}


def grace_world_positions() -> dict[tuple[str, str], list[tuple[float, float]]]:
    rows = read_param(read_bnd4(read_regulation())["BonfireWarpParam.param"])
    names = read_messages("item")["PlaceName"]
    positions: dict[tuple[str, str], list[tuple[float, float]]] = {}
    for row in rows.values():
        area, grid_x, grid_z = row[GRACE_BLOCK_OFFSET : GRACE_BLOCK_OFFSET + 3]
        x, _, z = struct.unpack_from("<fff", row, GRACE_POSITION_OFFSET)
        name = names.get(struct.unpack_from("<i", row, GRACE_TEXT_OFFSET)[0])
        if name:
            world = (grid_x * BLOCK_SIZE_METERS + x, grid_z * BLOCK_SIZE_METERS + z)
            positions.setdefault((f"m{area:02d}", name), []).append(world)
    return positions
