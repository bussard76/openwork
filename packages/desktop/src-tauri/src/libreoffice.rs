use std::path::PathBuf;

pub fn find_libreoffice() -> Option<PathBuf> {
    let candidates = if cfg!(target_os = "windows") {
        vec![
            PathBuf::from(r"C:\Program Files\LibreOffice\program\soffice.exe"),
            PathBuf::from(r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            PathBuf::from("/Applications/LibreOffice.app/Contents/MacOS/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
            PathBuf::from("/opt/homebrew/bin/soffice"),
        ]
    } else {
        vec![
            PathBuf::from("/usr/bin/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
        ]
    };

    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }

    which::which("soffice").ok()
}
