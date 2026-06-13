export const IMPORT_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const IMPORT_UPLOAD_LIMIT_LABEL = "10 MB";

export function formatImportFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildImportLimitMessage(bytes: number) {
  return `Arquivo acima do limite de ${IMPORT_UPLOAD_LIMIT_LABEL}. O arquivo enviado tem ${formatImportFileSize(bytes)}. Reduza a planilha ou divida a carteira em mais de uma importacao.`;
}
