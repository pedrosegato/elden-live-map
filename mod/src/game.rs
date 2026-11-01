use std::{
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use fromsoftware_shared_1_17_2::GameVersion;
use pelite::pe64::PeView;

use crate::state::SharedState;

const PUBLISH_INTERVAL: Duration = Duration::from_millis(33);

enum Patch {
    V1_17_1,
    V1_17_2,
}

impl GameVersion for Patch {
    const NAME: &'static str = "elden ring";

    fn from_lang_version(_lang_id: u16, version: &str) -> Option<Self> {
        match version {
            "2.7.1.0" | "2.7.1.1" => Some(Self::V1_17_1),
            "2.7.2.0" | "2.7.2.1" => Some(Self::V1_17_2),
            _ => None,
        }
    }
}

pub fn start_reader(shared: Arc<SharedState>) {
    let image = unsafe { PeView::module(crate::exe_image()) };
    match Patch::detect(&image) {
        Ok(Patch::V1_17_1) => v1_17_1::start(shared),
        Ok(Patch::V1_17_2) => v1_17_2::start(shared),
        Err(error) => shared.set_reader(error.to_string()),
    }
}

macro_rules! patch_reader {
    ($game:ident, $shared:ident, $patch:literal) => {
        use std::{sync::Arc, thread, time::Instant};

        use $game::{
            cs::{CSTaskGroupIndex, CSTaskImp, GameDataMan, GameMan, PlayerIns, WorldChrMan},
            fd4::FD4TaskData,
            rotation::Quaternion,
        };
        use $shared::{FromStatic, SharedTaskImpExt};
        use serde_json::json;

        use super::{PUBLISH_INTERVAL, facing_yaw, fnv1a, unix_millis};
        use crate::state::{PositionSample, Profile, Session, SharedState, Snapshot};

        pub fn start(shared: Arc<SharedState>) {
            thread::spawn(move || {
                shared.set_reader(concat!("waiting for the game's task system (", $patch, ")"));
                let tasks = match CSTaskImp::wait_for_instance(std::time::Duration::MAX) {
                    Ok(tasks) => tasks,
                    Err(error) => {
                        shared.set_reader(format!("task system unavailable: {error:?}"));
                        return;
                    }
                };
                let reader = Arc::clone(&shared);
                let mut last_publish = Instant::now();
                let handle = tasks.run_recurring(
                    move |_: &FD4TaskData| {
                        if last_publish.elapsed() < PUBLISH_INTERVAL {
                            return;
                        }
                        last_publish = Instant::now();
                        reader.publish(unsafe { read_snapshot() });
                    },
                    CSTaskGroupIndex::ChrIns_PostPhysics,
                );
                shared.set_reader(concat!("reading ", $patch));

                std::mem::forget(handle);
            });
        }

        unsafe fn read_snapshot() -> Snapshot {
            let game_man = unsafe { GameMan::instance() }.ok();
            let character_name = read_character_name();
            let save_loaded =
                game_man.is_some_and(|game| game.save_slot >= 0) && !character_name.is_empty();
            let player = unsafe { WorldChrMan::instance() }
                .ok()
                .and_then(|world| world.main_player.as_deref());

            let session = match (save_loaded, game_man) {
                (true, Some(game)) => Session::InGame {
                    profile: profile(game.save_slot, character_name.clone()),
                },
                _ => Session::Menu,
            };
            let position = player.filter(|_| save_loaded).map(read_position);

            Snapshot {
                session,
                position,
                debug: json!({
                    "characterName": character_name,
                    "characterNameIsEmpty": game_man.map(|game| game.character_name_is_empty),
                    "saveSlot": game_man.map(|game| game.save_slot),
                    "saveState": game_man.map(|game| game.save_state),
                    "isInactive": game_man.map(|game| game.is_inactive),
                    "requestedSaveSlotLoadIndex": game_man.map(|game| game.requested_save_slot_load_index),
                    "mainPlayer": player.is_some(),
                    "blockId": player.map(|player| player.chr_ins.block_id.to_string()),
                    "currentBlockId": player.map(|player| player.current_block_id.to_string()),
                    "blockPosition": player.map(|player| {
                        let local = player.block_position;
                        [local.x, local.y, local.z]
                    }),
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

        fn read_character_name() -> String {
            unsafe { GameDataMan::instance() }
                .ok()
                .map(|data| {
                    let raw = &data.main_player_game_data.character_name;
                    let length = raw.iter().position(|&unit| unit == 0).unwrap_or(raw.len());
                    String::from_utf16_lossy(&raw[..length])
                })
                .unwrap_or_default()
        }

        fn profile(slot: i32, name: String) -> Profile {
            Profile {
                id: format!("slot{slot}-{:016x}", fnv1a(name.as_bytes())),
                character_name: name,
                slot,
            }
        }

        fn read_position(player: &PlayerIns) -> PositionSample {
            let local = player.block_position;
            let Quaternion(x, y, z, w) = player.chr_ins.modules.physics.orientation;
            PositionSample {
                t: unix_millis(),
                map_id: player.current_block_id.to_string(),
                position: [local.x, local.y, local.z],
                yaw: facing_yaw(x, y, z, w),
            }
        }
    };
}

mod v1_17_1 {
    patch_reader!(eldenring_1_17_1, fromsoftware_shared_1_17_1, "1.17.1");
}

mod v1_17_2 {
    patch_reader!(eldenring_1_17_2, fromsoftware_shared_1_17_2, "1.17.2");
}

fn facing_yaw(x: f32, y: f32, z: f32, w: f32) -> f32 {
    let forward_x = -2.0 * (x * z + w * y);
    let forward_z = -(1.0 - 2.0 * (x * x + y * y));
    forward_x.atan2(forward_z)
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
