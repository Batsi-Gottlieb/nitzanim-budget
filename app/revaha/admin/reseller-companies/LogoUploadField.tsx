"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoUploadField({ companyId, currentLogoUrl }: { companyId: string; currentLogoUrl: string | null }) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${companyId}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("reseller-logos").upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("reseller-logos").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">לוגו החברה</label>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-300" />
          )}
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "מעלה..." : "העלאת לוגו"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <input type="hidden" name="logo_url" value={logoUrl ?? ""} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
