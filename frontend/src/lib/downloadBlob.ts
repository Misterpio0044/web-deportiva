/**
 * Dispara la descarga de un Blob en el navegador creando un enlace temporal.
 * Pensado para respuestas binarias del backend (GPX o ZIP).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Liberar la URL en el siguiente tick para no abortar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
