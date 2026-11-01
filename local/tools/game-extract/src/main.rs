use std::{env, fs, path::Path};

use oozextract::Extractor;

fn u32_le(data: &[u8], at: usize) -> u32 {
    u32::from_le_bytes(data[at..at + 4].try_into().unwrap())
}

fn u32_be(data: &[u8], at: usize) -> u32 {
    u32::from_be_bytes(data[at..at + 4].try_into().unwrap())
}

fn u64_le(data: &[u8], at: usize) -> u64 {
    u64::from_le_bytes(data[at..at + 8].try_into().unwrap())
}

fn utf16_at(data: &[u8], at: usize) -> String {
    let units: Vec<u16> = data[at..]
        .chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .take_while(|&unit| unit != 0)
        .collect();
    String::from_utf16_lossy(&units)
}

fn decompress_dcx(data: &[u8]) -> Vec<u8> {
    assert_eq!(&data[0..4], b"DCX\0", "not a DCX file");
    let uncompressed = u32_be(data, 0x1C) as usize;
    let compressed = u32_be(data, 0x20) as usize;
    let format = &data[0x28..0x2C];
    let body = &data[0x4C..0x4C + compressed];
    match format {
        b"KRAK" => {
            let mut output = vec![0; uncompressed];
            Extractor::new()
                .read_from_slice(body, &mut output)
                .expect("kraken");
            output
        }
        other => panic!("unsupported DCX format {}", String::from_utf8_lossy(other)),
    }
}

fn tpf_textures(tpf: &[u8]) -> Vec<(String, Vec<u8>)> {
    assert_eq!(&tpf[0..4], b"TPF\0", "not a TPF");
    let count = u32_le(tpf, 0x8) as usize;
    let unicode = tpf[0xE] == 1;
    let mut textures = Vec::with_capacity(count);
    let mut header = 0x10;
    for _ in 0..count {
        let offset = u32_le(tpf, header) as usize;
        let size = u32_le(tpf, header + 4) as usize;
        let flags = tpf[header + 11];
        let name_offset = u32_le(tpf, header + 12) as usize;
        let has_float_struct = u32_le(tpf, header + 16) == 1;
        header += 20;
        if has_float_struct {
            let float_size = u32_le(tpf, header + 4) as usize;
            header += 8 + float_size;
        }
        let name = if unicode {
            utf16_at(tpf, name_offset)
        } else {
            let end = tpf[name_offset..].iter().position(|&b| b == 0).unwrap();
            String::from_utf8_lossy(&tpf[name_offset..name_offset + end]).into_owned()
        };
        let raw = &tpf[offset..offset + size];
        let dds = if flags == 2 || flags == 3 {
            decompress_dcx(raw)
        } else {
            raw.to_vec()
        };
        textures.push((name, dds));
    }
    textures
}

fn extract_bxf(bhd_path: &Path, bdt_path: &Path, out: &Path) {
    let bhd = fs::read(bhd_path).expect("read bhd");
    let bdt = fs::read(bdt_path).expect("read bdt");
    assert_eq!(&bhd[0..4], b"BHF4", "not a BHF4 header");
    let count = u32_le(&bhd, 0xC) as usize;
    let entry_size = u64_le(&bhd, 0x20) as usize;
    fs::create_dir_all(out).expect("create output");
    let mut written = 0;
    for index in 0..count {
        let entry = 0x40 + index * entry_size;
        let size = u64_le(&bhd, entry + 8) as usize;
        let offset = u32_le(&bhd, entry + 24) as usize;
        let name_offset = u32_le(&bhd, entry + 32) as usize;
        let name = utf16_at(&bhd, name_offset);
        let mut data = bdt[offset..offset + size].to_vec();
        if data.starts_with(b"DCX\0") {
            data = decompress_dcx(&data);
        }
        if !data.starts_with(b"TPF\0") {
            eprintln!("skipped {name}: not a TPF");
            continue;
        }
        for (texture, dds) in tpf_textures(&data) {
            fs::write(out.join(format!("{texture}.dds")), dds).expect("write dds");
            written += 1;
        }
    }
    println!("{written} textures from {count} entries");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("bxf") => extract_bxf(
            Path::new(&args[2]),
            Path::new(&args[3]),
            Path::new(&args[4]),
        ),
        Some("dcx") => {
            let data = fs::read(&args[2]).expect("read dcx");
            fs::write(&args[3], decompress_dcx(&data)).expect("write output");
        }
        Some("tpf") => {
            let mut data = fs::read(&args[2]).expect("read tpf");
            if data.starts_with(b"DCX\0") {
                data = decompress_dcx(&data);
            }
            let out = Path::new(&args[3]);
            fs::create_dir_all(out).expect("create output");
            for (texture, dds) in tpf_textures(&data) {
                fs::write(out.join(format!("{texture}.dds")), dds).expect("write dds");
            }
        }
        _ => {
            eprintln!("usage: game-extract bxf <bhd> <bdt> <out> | dcx <in> <out> | tpf <in> <out>")
        }
    }
}
