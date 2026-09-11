import { fileTypeFromBuffer } from "file-type";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Validates that a buffer is a real PNG/JPEG/WebP image (magic-byte check,
 * never trusts the client-supplied content-type). Returns a canonical MIME
 * type or null when the file is not an allowed image.
 */
export async function sniffImageMime(buffer: Uint8Array): Promise<string | null> {
  try {
    const type = await fileTypeFromBuffer(buffer);
    if (type && ALLOWED_TYPES.has(type.mime)) return type.mime;
  } catch {
    /* fall through */
  }
  return null;
}