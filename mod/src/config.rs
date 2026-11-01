use std::{
    net::{IpAddr, Ipv4Addr},
    path::Path,
};

use serde::Deserialize;

#[derive(Deserialize)]
#[serde(default)]
pub struct Config {
    pub bind: IpAddr,
    pub port: u16,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind: IpAddr::V4(Ipv4Addr::UNSPECIFIED),
            port: 8686,
        }
    }
}

pub fn load(home: &Path) -> Config {
    std::fs::read_to_string(home.join("config.json"))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}
