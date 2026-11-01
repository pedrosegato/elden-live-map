mod config;
mod game;
mod progress;
mod server;
mod state;

use std::{
    ffi::c_void,
    fs::OpenOptions,
    io::Write,
    path::{Path, PathBuf},
    sync::Arc,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

const DLL_PROCESS_ATTACH: u32 = 1;
const MOD_FOLDER: &str = "elden-live-map";
const MODULE_PATH_CAPACITY: u32 = 1024;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetModuleFileNameW(module: isize, filename: *mut u16, size: u32) -> u32;
}

#[unsafe(no_mangle)]
#[allow(clippy::missing_safety_doc)]
pub unsafe extern "system" fn DllMain(module: isize, reason: u32, _reserved: *mut c_void) -> i32 {
    if reason == DLL_PROCESS_ATTACH {
        let home = mod_home(module);
        thread::spawn(move || start(&home));
    }
    1
}

fn mod_home(module: isize) -> PathBuf {
    let mut buffer = [0u16; MODULE_PATH_CAPACITY as usize];
    let length =
        unsafe { GetModuleFileNameW(module, buffer.as_mut_ptr(), MODULE_PATH_CAPACITY) } as usize;
    let dll_path = PathBuf::from(String::from_utf16_lossy(&buffer[..length]));
    dll_path
        .parent()
        .map_or_else(|| PathBuf::from(MOD_FOLDER), |dir| dir.join(MOD_FOLDER))
}

fn start(home: &Path) {
    let config = config::load(home);
    let shared = Arc::new(state::SharedState::new());
    game::start_reader(Arc::clone(&shared));
    log(
        home,
        &format!("serving on http://{}:{}/", config.bind, config.port),
    );
    if let Err(error) = server::run(&config, home, shared) {
        log(home, &format!("server stopped: {error}"));
    }
}

pub(crate) fn log(home: &Path, message: &str) {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_secs());
    let _ = std::fs::create_dir_all(home);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(home.join("elden-live-map.log"))
    {
        let _ = writeln!(file, "[{seconds}] {message}");
    }
}
