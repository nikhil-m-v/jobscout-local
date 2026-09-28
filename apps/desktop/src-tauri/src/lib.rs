use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

struct EngineState {
    endpoint: Mutex<Option<String>>,
    child: Mutex<Option<CommandChild>>,
    token: String,
    client: reqwest::Client,
}

#[tauri::command]
async fn engine_health(state: tauri::State<'_, Arc<EngineState>>) -> Result<serde_json::Value, String> {
    let endpoint = state.endpoint.lock().map_err(|_| "Workspace unavailable")?
        .clone().ok_or("Workspace is starting")?;
    state.client.get(format!("{endpoint}/api/v1/health"))
        .bearer_auth(&state.token).send().await
        .map_err(|_| "Workspace connection unavailable")?
        .error_for_status().map_err(|_| "Workspace did not accept the request")?
        .json().await.map_err(|_| "Workspace response could not be read".into())
}

pub fn run() {
    let state = Arc::new(EngineState {
        endpoint: Mutex::new(None), child: Mutex::new(None),
        token: format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple()),
        client: reqwest::Client::builder().timeout(Duration::from_secs(5))
            .no_proxy().build().expect("Could not create local client"),
    });
    let lifecycle = state.clone();
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![engine_health])
        .setup(|app| {
            let state = app.state::<Arc<EngineState>>().inner().clone();
            let directory = app.path().app_data_dir()?;
            let (mut events, child) = app.shell().sidecar("jobscout-engine")?
                .env("JOBSCOUT_SESSION_TOKEN", &state.token)
                .env("PYTHONUNBUFFERED", "1")
                .args(["--data-dir", &directory.to_string_lossy(), "--port", "0"])
                .spawn()?;
            *state.child.lock().map_err(|_| "Could not store engine process")? = Some(child);
            tauri::async_runtime::spawn(async move {
                while let Some(event) = events.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            // The engine emits a single non-secret JSON port announcement.
                            if let Ok(message) = serde_json::from_slice::<serde_json::Value>(&bytes) {
                                if message["event"] == "bound" {
                                    if let Some(port) = message["port"].as_u64().filter(|p| *p > 0 && *p <= 65535) {
                                        if let Ok(mut endpoint) = state.endpoint.lock() {
                                            *endpoint = Some(format!("http://127.0.0.1:{port}"));
                                        }
                                    }
                                }
                            }
                        }
                        CommandEvent::Terminated(_) => {
                            if let Ok(mut endpoint) = state.endpoint.lock() { *endpoint = None; }
                            break;
                        }
                        _ => {}
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Could not start JobScout");
    application.run(move |_app, event| {
        if let tauri::RunEvent::Exit = event {
            if let Ok(mut child) = lifecycle.child.lock() {
                if let Some(process) = child.take() { let _ = process.kill(); }
            }
        }
    });
}
