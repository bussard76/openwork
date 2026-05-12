use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, thiserror::Error)]
pub enum PptxError {
    #[error("LibreOffice not found")]
    LibreOfficeNotFound,
    #[error("Conversion failed: {0}")]
    ConversionFailed(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Output file not found")]
    OutputNotFound,
}

pub async fn convert_pptx_to_pdf(_app: &AppHandle, input_path: &str) -> Result<Vec<u8>, PptxError> {
    let soffice = crate::libreoffice::find_libreoffice().ok_or(PptxError::LibreOfficeNotFound)?;

    let input = Path::new(input_path);
    if !input.exists() {
        return Err(PptxError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Input file not found",
        )));
    }

    let tmp = std::env::temp_dir().join(format!("opencode-pptx-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&tmp)?;

    tracing::info!(?input_path, ?tmp, ?soffice, "Converting PPTX to PDF");

    let _lock = crate::libreoffice::acquire().await;
    let out = Command::new(&soffice)
        .arg("--headless")
        .arg("--convert-to")
        .arg("pdf")
        .arg("--outdir")
        .arg(&tmp)
        .arg(input)
        .output()?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        tracing::error!(?stderr, "LibreOffice PPTX conversion failed");
        return Err(PptxError::ConversionFailed(stderr.to_string()));
    }

    let stem = input
        .file_stem()
        .ok_or_else(|| PptxError::ConversionFailed("Invalid input filename".to_string()))?;
    let path = tmp.join(format!("{}.pdf", stem.to_string_lossy()));

    if !path.exists() {
        tracing::error!(?path, "Output PDF file not found");
        return Err(PptxError::OutputNotFound);
    }

    let bytes = std::fs::read(&path)?;
    let _ = std::fs::remove_dir_all(&tmp);

    tracing::info!(pdf_bytes = bytes.len(), "PPTX converted to PDF successfully");
    Ok(bytes)
}

#[tauri::command]
#[specta::specta]
pub async fn convert_pptx_to_pdf_command(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    convert_pptx_to_pdf(&app, &path)
        .await
        .map_err(|e| e.to_string())
}
