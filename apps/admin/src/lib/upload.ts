import { apiClient } from "@/lib/api";

type SignResponse =
  | { provider: "supabase" }
  | {
      provider: "cloudinary";
      uploadUrl: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    };

export const MAX_UPLOAD_MB = 8;

/**
 * Serve an auto-format (WebP/AVIF), auto-quality, max-1600px version —
 * typically 70–90% smaller than the original upload.
 */
function optimisedCloudinaryUrl(url: string) {
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1600/");
}

/** Upload one image and return its public URL (Cloudinary if configured, else Supabase Storage). */
export async function uploadImage(file: File, folder: "catalogue" | "banners" = "catalogue"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

  const sign = await apiClient.post<SignResponse>("/admin/uploads/sign", { folder });

  if (sign.provider === "cloudinary") {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Image must be under ${MAX_UPLOAD_MB} MB.`);
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sign.apiKey);
    form.append("timestamp", String(sign.timestamp));
    form.append("folder", sign.folder);
    form.append("signature", sign.signature);
    const res = await fetch(sign.uploadUrl, { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "Upload failed.");
    return optimisedCloudinaryUrl(data.secure_url);
  }

  if (file.size > 4 * 1024 * 1024) throw new Error("Image must be under 4 MB.");
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await apiClient.upload<{ url: string }>("/admin/uploads", form);
  return res.url;
}
