use std::sync::{Arc, Mutex};
use std::time::Duration;
use base64::Engine;
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

#[tauri::command]
async fn resume_import(
    state: tauri::State<'_, Arc<EngineState>>, action: String,
    id: Option<String>, data: Option<String>, format: Option<String>,
) -> Result<serde_json::Value, String> {
    let endpoint = state.endpoint.lock().map_err(|_| "Workspace unavailable")?
        .clone().ok_or("Workspace is starting")?;
    let path = if action == "start" {
        "/api/v1/imports".to_string()
    } else {
        let id = uuid::Uuid::parse_str(id.as_deref().ok_or("Import unavailable")?)
            .map_err(|_| "Import unavailable")?;
        format!("/api/v1/imports/{id}")
    };
    let request = match action.as_str() {
        "start" => state.client.post(format!("{endpoint}{path}")),
        "cancel" => state.client.delete(format!("{endpoint}{path}")),
        "extract" => {
            let (format, mime) = match format.as_deref() {
                Some("pdf") => ("pdf", "application/pdf"),
                Some("docx") => ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                _ => return Err("Unsupported document format".into()),
            };
            let encoded = data.ok_or("Document unavailable")?;
            if encoded.len() > 13_981_016 { return Err("Document too large".into()); }
            let bytes = base64::engine::general_purpose::STANDARD.decode(encoded)
                .map_err(|_| "Document unavailable")?;
            if bytes.len() > 10 * 1024 * 1024 { return Err("Document too large".into()); }
            state.client.put(format!("{endpoint}{path}/{format}"))
                .header("Content-Type", mime).body(bytes)
        }
        _ => return Err("Unknown import action".into()),
    };
    // Return the engine's fixed error codes, never the request or raw diagnostics.
    request.timeout(Duration::from_secs(50)).bearer_auth(&state.token)
        .send().await.map_err(|_| "Workspace connection unavailable")?
        .json().await.map_err(|_| "Workspace response could not be read".into())
}

#[tauri::command]
async fn profile_record(
    state: tauri::State<'_, Arc<EngineState>>, action: String, text: Option<String>, reviewed: Option<bool>,
) -> Result<serde_json::Value, String> {
    let endpoint = state.endpoint.lock().map_err(|_| "Workspace unavailable")?
        .clone().ok_or("Workspace is starting")?;
    let url = format!("{endpoint}/api/v1/profile");
    let request = match action.as_str() {
        "load" => state.client.get(url),
        "delete" => state.client.delete(url),
        "save" => {
            let text = text.ok_or("Reviewed text required")?;
            if reviewed != Some(true) || text.chars().count() > 200_000 || text.trim().is_empty() {
                return Err("Reviewed text required".into());
            }
            state.client.put(url).json(&serde_json::json!({"text": text, "reviewed": true}))
        },
        _ => return Err("Unknown profile action".into()),
    };
    request.timeout(Duration::from_secs(15)).bearer_auth(&state.token)
        .send().await.map_err(|_| "Local storage connection unavailable")?
        .json().await.map_err(|_| "Local storage response could not be read".into())
}

#[tauri::command]
async fn search_preview(
    state: tauri::State<'_, Arc<EngineState>>, criteria: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = state.endpoint.lock().map_err(|_| "Workspace unavailable")?
        .clone().ok_or("Workspace is starting")?;
    let body = serde_json::to_vec(&criteria).map_err(|_| "Invalid search criteria")?;
    if body.len() > 4096 { return Err("Invalid search criteria".into()); }
    state.client.post(format!("{endpoint}/api/v1/search/preview"))
        .header("Content-Type", "application/json").body(body)
        .timeout(Duration::from_secs(10)).bearer_auth(&state.token)
        .send().await.map_err(|_| "Workspace connection unavailable")?
        .error_for_status().map_err(|_| "Preview could not be prepared")?
        .json().await.map_err(|_| "Preview response could not be read".into())
}

pub fn run() {
    let state = Arc::new(EngineState {
        endpoint: Mutex::new(None), child: Mutex::new(None),
        token: format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple()),
        client: reqwest::Client::builder().timeout(Duration::from_secs(5))
            .no_proxy().redirect(reqwest::redirect::Policy::none())
            .build().expect("Could not create local client"),
    });
    let lifecycle = state.clone();
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![engine_health, resume_import, profile_record, search_preview])
        .setup(|app| {
            let state = app.state::<Arc<EngineState>>().inner().clone();
            let directory = app.path().app_data_dir()?;
            let command = app.shell().sidecar("jobscout-engine")?;
            #[cfg(windows)]
            let command = command.args(["--owner-pid", &std::process::id().to_string()]);
            let (mut events, child) = command
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
                if let Some(process) = child.take() {
                    // Windows server watches our process handle. Let its frozen
                    // launcher wait for shutdown and remove temporary files.
                    #[cfg(not(windows))]
                    let _ = process.kill();
                    #[cfg(windows)]
                    drop(process);
                }
            }
        }
    });
}
