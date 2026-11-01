use std::{convert::Infallible, io, path::Path, sync::Arc, time::Duration};

use axum::{
    Json, Router,
    extract::{Path as UrlPath, State},
    http::{StatusCode, Uri, header},
    response::{
        IntoResponse, Response,
        sse::{Event, KeepAlive, Sse},
    },
    routing::{get, put},
};
use rust_embed::RustEmbed;
use serde_json::{Value, json};
use tokio_stream::{Stream, StreamExt, wrappers::WatchStream};
use tower_http::{compression::CompressionLayer, services::ServeDir};

use crate::{config::Config, progress::ProgressStore, state::SharedState};

const RECONNECT_DELAY: Duration = Duration::from_secs(1);
const KEEP_ALIVE_INTERVAL: Duration = Duration::from_secs(15);
const SERVER_THREADS: usize = 2;
const IMMUTABLE_ASSET: &str = "public, max-age=31536000, immutable";

#[derive(RustEmbed)]
#[folder = "../viewer/dist/"]
struct Viewer;

#[derive(Clone)]
struct App {
    shared: Arc<SharedState>,
    progress: Arc<ProgressStore>,
}

type ApiError = (StatusCode, Json<Value>);

pub fn run(config: &Config, home: &Path, shared: Arc<SharedState>) -> io::Result<()> {
    let app = App {
        shared,
        progress: Arc::new(ProgressStore::new(home.join("progress"))),
    };
    let router = Router::new()
        .route("/api/events", get(events))
        .route("/api/progress", get(progress))
        .route(
            "/api/progress/found/{location_id}",
            put(mark_found).delete(unmark_found),
        )
        .route("/api/debug", get(debug))
        .nest_service("/data", ServeDir::new(home.join("data")))
        .fallback(viewer_file)
        .layer(CompressionLayer::new())
        .with_state(app);

    let address = (config.bind, config.port);
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(SERVER_THREADS)
        .enable_all()
        .build()?
        .block_on(async move {
            let listener = tokio::net::TcpListener::bind(address).await?;
            axum::serve(listener, router).await
        })
}

async fn events(State(app): State<App>) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let current_session = app.shared.session.borrow().clone();
    let greeting = tokio_stream::iter([
        Event::default().retry(RECONNECT_DELAY).comment("connected"),
        named_event("session", &current_session),
    ]);
    let sessions = WatchStream::from_changes(app.shared.session.subscribe())
        .map(|session| named_event("session", &session));
    let positions = WatchStream::new(app.shared.position.subscribe())
        .filter_map(|position| position.map(|position| named_event("position", &position)));

    let stream = greeting.chain(sessions.merge(positions)).map(Ok);
    Sse::new(stream).keep_alive(KeepAlive::new().interval(KEEP_ALIVE_INTERVAL).text("ping"))
}

fn named_event<T: serde::Serialize>(name: &str, data: &T) -> Event {
    Event::default()
        .event(name)
        .data(serde_json::to_string(data).unwrap_or_default())
}

fn active_profile(app: &App) -> Result<String, ApiError> {
    app.shared
        .profile_id()
        .ok_or_else(|| (StatusCode::CONFLICT, Json(json!({ "error": "no-session" }))))
}

async fn progress(State(app): State<App>) -> Result<Json<Value>, ApiError> {
    let profile_id = active_profile(&app)?;
    let found = app.progress.found(&profile_id);
    Ok(Json(json!({ "profileId": profile_id, "found": found })))
}

async fn mark_found(
    State(app): State<App>,
    UrlPath(location_id): UrlPath<u64>,
) -> Result<StatusCode, ApiError> {
    set_found(&app, location_id, true)
}

async fn unmark_found(
    State(app): State<App>,
    UrlPath(location_id): UrlPath<u64>,
) -> Result<StatusCode, ApiError> {
    set_found(&app, location_id, false)
}

fn set_found(app: &App, location_id: u64, found: bool) -> Result<StatusCode, ApiError> {
    let profile_id = active_profile(app)?;
    app.progress
        .set_found(&profile_id, location_id, found)
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": error.to_string() })),
            )
        })
}

async fn debug(State(app): State<App>) -> Json<Value> {
    let reader = app
        .shared
        .reader
        .lock()
        .map_or_else(|_| String::new(), |reader| reader.clone());
    let game = app
        .shared
        .debug
        .lock()
        .map_or(Value::Null, |debug| debug.clone());
    Json(json!({ "exe": crate::exe_path(), "reader": reader, "game": game }))
}

async fn viewer_file(uri: Uri) -> Response {
    let path = match uri.path().trim_start_matches('/') {
        "" => "index.html",
        path => path,
    };
    let Some(file) = Viewer::get(path) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let cache = if path.starts_with("assets/") {
        IMMUTABLE_ASSET
    } else {
        "no-cache"
    };
    (
        [
            (header::CONTENT_TYPE, file.metadata.mimetype().to_owned()),
            (header::CACHE_CONTROL, cache.to_owned()),
        ],
        file.data,
    )
        .into_response()
}
