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
    fn GetModuleHandleW(name: *const u16) -> isize;
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
    module_path(module)
        .parent()
        .map_or_else(|| PathBuf::from(MOD_FOLDER), |dir| dir.join(MOD_FOLDER))
}

pub(crate) fn exe_image() -> *const u8 {
    unsafe { GetModuleHandleW(std::ptr::null()) as *const u8 }
}

pub(crate) fn exe_path() -> String {
    module_path(0).display().to_string()
}

fn module_path(module: isize) -> PathBuf {
    let mut buffer = [0u16; MODULE_PATH_CAPACITY as usize];
    let length =
        unsafe { GetModuleFileNameW(module, buffer.as_mut_ptr(), MODULE_PATH_CAPACITY) } as usize;
    PathBuf::from(String::from_utf16_lossy(&buffer[..length]))
}

fn start(home: &Path) {
    let config = config::load(home);
    let shared = Arc::new(state::SharedState::new());
    let panic_home = home.to_path_buf();
    let panic_shared = Arc::clone(&shared);
    std::panic::set_hook(Box::new(move |info| {
        let message = format!("panic: {info}");
        log(&panic_home, &message);
        panic_shared.set_reader(message);
    }));
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
