use std::sync::Mutex;

use serde::Serialize;
use serde_json::Value;
use tokio::sync::watch;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub character_name: String,
    pub slot: i32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "state", rename_all = "kebab-case")]
pub enum Session {
    Menu,
    InGame { profile: Profile },
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionSample {
    pub t: u64,
    pub map_id: String,
    pub position: [f32; 3],
    pub yaw: f32,
}

pub struct Snapshot {
    pub session: Session,
    pub position: Option<PositionSample>,
    pub debug: Value,
}

pub struct SharedState {
    pub session: watch::Sender<Session>,
    pub position: watch::Sender<Option<PositionSample>>,
    pub debug: Mutex<Value>,
}

impl SharedState {
    pub fn new() -> Self {
        Self {
            session: watch::Sender::new(Session::Menu),
            position: watch::Sender::new(None),
            debug: Mutex::new(Value::Null),
        }
    }

    pub fn publish(&self, snapshot: Snapshot) {
        replace_if_changed(&self.session, snapshot.session);
        replace_if_changed(&self.position, snapshot.position);
        if let Ok(mut debug) = self.debug.lock() {
            *debug = snapshot.debug;
        }
    }

    pub fn profile_id(&self) -> Option<String> {
        match &*self.session.borrow() {
            Session::InGame { profile } => Some(profile.id.clone()),
            Session::Menu => None,
        }
    }
}

fn replace_if_changed<T: PartialEq>(sender: &watch::Sender<T>, next: T) {
    sender.send_if_modified(|current| {
        if *current == next {
            return false;
        }
        *current = next;
        true
    });
}
