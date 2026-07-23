const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadToCloudinary(file: File): Promise<string> {
  // Client-side guardrails only — these make failures fast and give a
  // clear message during normal use, but a modified/malicious client can
  // skip this file entirely. The actual enforcement has to live in the
  // Cloudinary upload preset itself (folder, max file size, allowed
  // formats, resource type = image) — see Cloudinary dashboard.
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Format file "${file.type || "unknown"}" tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.`
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimum 10MB.`
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset || "");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Cloudinary upload failed: " + err);
  }

  const data = await res.json();
  return data.secure_url as string;
}