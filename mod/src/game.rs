use std::{
    sync::Arc,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use eldenring::{
    cs::{BlockId, CSTaskGroupIndex, CSTaskImp, GameDataMan, GameMan, PlayerIns, WorldChrMan},
    fd4::FD4TaskData,
    rotation::Quaternion,
};
use fromsoftware_shared::{FromStatic, SharedTaskImpExt};
use serde_json::json;

use crate::state::{PositionSample, Profile, Session, SharedState, Snapshot};

const PUBLISH_INTERVAL: Duration = Duration::from_millis(33);
const NO_BLOCK: i32 = -1;

pub fn start_reader(shared: Arc<SharedState>) {
    thread::spawn(move || {
        let Ok(tasks) = CSTaskImp::wait_for_instance(Duration::MAX) else {
            return;
        };
        let mut last_publish = Instant::now();
        let handle = tasks.run_recurring(
            move |_: &FD4TaskData| {
                if last_publish.elapsed() < PUBLISH_INTERVAL {
                    return;
                }
                last_publish = Instant::now();
                shared.publish(unsafe { read_snapshot() });
            },
            CSTaskGroupIndex::ChrIns_PostPhysics,
        );

        std::mem::forget(handle);
    });
}

unsafe fn read_snapshot() -> Snapshot {
    let game_man = unsafe { GameMan::instance() }.ok();
    let save_loaded = game_man.is_some_and(|game| !game.character_name_is_empty);
    let player = unsafe { WorldChrMan::instance() }
        .ok()
        .and_then(|world| world.main_player.as_deref());

    let session = match (save_loaded, game_man) {
        (true, Some(game)) => Session::InGame {
            profile: read_profile(game.save_slot),
        },
        _ => Session::Menu,
    };
    let position = player.filter(|_| save_loaded).map(read_position);

    Snapshot {
        session,
        position,
        debug: json!({
            "characterNameIsEmpty": game_man.map(|game| game.character_name_is_empty),
            "saveSlot": game_man.map(|game| game.save_slot),
            "mainPlayer": player.is_some(),
            "blockId": player.map(|player| player.chr_ins.block_id.to_string()),
            "blockOrigin": player.map(|player| origin_block(player).to_string()),
            "chunkPosition": player.map(|player| {
                let chunk = player.chr_ins.chunk_position;
                [chunk.0, chunk.1, chunk.2, chunk.3]
            }),
            "havokPosition": player.map(|player| {
                let havok = player.chr_ins.modules.physics.position;
                [havok.0, havok.1, havok.2]
            }),
        }),
    }
}

fn read_profile(slot: i32) -> Profile {
    let name = unsafe { GameDataMan::instance() }
        .ok()
        .map(|data| {
            let raw = &data.main_player_game_data.character_name;
            let length = raw.iter().position(|&unit| unit == 0).unwrap_or(raw.len());
            String::from_utf16_lossy(&raw[..length])
        })
        .unwrap_or_default();
    Profile {
        id: format!("slot{slot}-{:016x}", fnv1a(name.as_bytes())),
        character_name: name,
        slot,
    }
}

fn read_position(player: &PlayerIns) -> PositionSample {
    let chunk = player.chr_ins.chunk_position;
    PositionSample {
        t: unix_millis(),
        map_id: origin_block(player).to_string(),
        position: [chunk.0, chunk.1, chunk.2],
        yaw: facing_yaw(player.chr_ins.modules.physics.orientation),
    }
}

fn facing_yaw(Quaternion(x, y, z, w): Quaternion) -> f32 {
    let forward_x = -2.0 * (x * z + w * y);
    let forward_z = -(1.0 - 2.0 * (x * x + y * y));
    forward_x.atan2(forward_z)
}

fn origin_block(player: &PlayerIns) -> BlockId {
    let chr = &player.chr_ins;
    if i32::from(chr.block_origin_override) == NO_BLOCK {
        chr.block_origin
    } else {
        chr.block_origin_override
    }
}

fn unix_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX)
        })
}

fn fnv1a(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf2_9ce4_8422_2325, |hash, &byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x0100_0000_01b3)
    })
}
