"use client";

import { useState } from "react";
import Image from "next/image";
import { FiUploadCloud } from "react-icons/fi";
import { uploadToCloudinary } from "@/lib/cloudinary";

export default function CoverUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err) {
      alert("Upload gagal. Cek preset Cloudinary Anda.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="relative block w-full aspect-[16/6] bg-black/5 border border-black/10 cursor-pointer overflow-hidden">
      {value && (
        <Image src={value} alt="cover" fill sizes="100vw" className="object-cover opacity-70" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
        <FiUploadCloud size={24} />
        <span>{uploading ? "Uploading..." : "Upload to Cloudinary"}</span>
      </div>
      <input
        id="cover-image-upload"
        name="coverImage"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
}