use std::{
    collections::BTreeSet,
    fs, io,
    path::{Path, PathBuf},
    sync::Mutex,
};

pub struct ProgressStore {
    directory: PathBuf,
    writes: Mutex<()>,
}

impl ProgressStore {
    pub fn new(directory: PathBuf) -> Self {
        Self {
            directory,
            writes: Mutex::new(()),
        }
    }

    pub fn found(&self, profile_id: &str) -> BTreeSet<u64> {
        fs::read_to_string(self.file(profile_id))
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default()
    }

    pub fn set_found(&self, profile_id: &str, location_id: u64, found: bool) -> io::Result<()> {
        let _guard = self
            .writes
            .lock()
            .map_err(|_| io::Error::other("progress lock poisoned"))?;
        let mut ids = self.found(profile_id);
        if found {
            ids.insert(location_id);
        } else {
            ids.remove(&location_id);
        }
        fs::create_dir_all(&self.directory)?;
        write_atomically(&self.file(profile_id), &serde_json::to_vec(&ids)?)
    }

    fn file(&self, profile_id: &str) -> PathBuf {
        self.directory.join(format!("{profile_id}.json"))
    }
}

fn write_atomically(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let partial = path.with_extension("json.part");
    fs::write(&partial, bytes)?;
    fs::rename(partial, path)
}
