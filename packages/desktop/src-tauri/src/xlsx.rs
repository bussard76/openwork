use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, thiserror::Error)]
pub enum XlsxError {
    #[error("LibreOffice not found")]
    LibreOfficeNotFound,
    #[error("Conversion failed: {0}")]
    ConversionFailed(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Output file not found")]
    OutputNotFound,
}

/// Convert XLSX to HTML using LibreOffice headless
pub async fn convert_xlsx_to_html(
    _app: &AppHandle,
    input_path: &str,
) -> Result<String, XlsxError> {
    let soffice_path = crate::libreoffice::find_libreoffice().ok_or(XlsxError::LibreOfficeNotFound)?;

    let input = Path::new(input_path);
    if !input.exists() {
        return Err(XlsxError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Input file not found",
        )));
    }

    // Create temp directory for output
    let temp_dir = std::env::temp_dir().join(format!("opencode-xlsx-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir)?;

    tracing::info!(
        ?input_path,
        ?temp_dir,
        ?soffice_path,
        "Converting XLSX to HTML"
    );

    // Run LibreOffice conversion
    let _lock = crate::libreoffice::acquire().await;
    let output = Command::new(&soffice_path)
        .arg("--headless")
        .arg("--convert-to")
        .arg("html")
        .arg("--outdir")
        .arg(&temp_dir)
        .arg(input)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        tracing::error!(?stderr, "LibreOffice conversion failed");
        return Err(XlsxError::ConversionFailed(stderr.to_string()));
    }

    // Find the generated HTML file
    let input_stem = input
        .file_stem()
        .ok_or_else(|| XlsxError::ConversionFailed("Invalid input filename".to_string()))?;
    let html_path = temp_dir.join(format!("{}.html", input_stem.to_string_lossy()));

    if !html_path.exists() {
        tracing::error!(?html_path, "Output HTML file not found");
        return Err(XlsxError::OutputNotFound);
    }

    // Read the HTML content
    let html_content = std::fs::read_to_string(&html_path)?;

    // Cleanup temp directory
    let _ = std::fs::remove_dir_all(&temp_dir);

    tracing::info!(html_len = html_content.len(), "XLSX converted successfully");

    Ok(html_content)
}

#[tauri::command]
#[specta::specta]
pub async fn convert_xlsx_to_html_command(
    app: AppHandle,
    path: String,
) -> Result<String, String> {
    convert_xlsx_to_html(&app, &path)
        .await
        .map_err(|e| e.to_string())
}
