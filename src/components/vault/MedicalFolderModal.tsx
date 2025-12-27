"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import {
  uploadMedicalFile,
  listMedicalFiles,
  getSignedUrl,
} from "@/lib/medicalStorage";
import { MedicalFolder } from "@/constants/medicalFolders";
import UploadDropzone from "@/components/UploadDropzone";
import { FileText } from "lucide-react";

export default function MedicalFolderModal({
  folder,
}: {
  folder: MedicalFolder;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // 1️⃣ Get user + files
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      setUserId(data.user.id);

      const { data: files } = await listMedicalFiles(
        data.user.id,
        folder
      );

      setFiles(files ?? []);
    });
  }, [folder]);

  // 2️⃣ Upload handler
  async function handleUpload(file: File) {
    if (!userId) return;

    setUploading(true);

    await uploadMedicalFile(userId, folder, file);

    const { data } = await listMedicalFiles(userId, folder);
    setFiles(data ?? []);

    setUploading(false);
  }

  // 3️⃣ View file
  async function handleView(fileName: string) {
    if (!userId) return;

    const path = `${userId}/${folder}/${fileName}`;
    const { data } = await getSignedUrl(path);

    if (data?.signedUrl) {
      window.open(data.signedUrl);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold capitalize">
        {folder} Uploads
      </h2>

      {/* Upload UI */}
      <UploadDropzone onFileSelect={handleUpload} />

      {uploading && (
        <p className="text-sm text-gray-500">Uploading...</p>
      )}

      {/* Files list */}
      <div className="grid grid-cols-2 gap-4">
        {files.map((file) => (
          <div
            key={file.name}
            className="border rounded-xl p-4 hover:shadow-md"
          >
            <div className="h-24 flex items-center justify-center bg-teal-50 rounded-lg mb-2">
              <FileText className="w-8 h-8 text-teal-600" />
            </div>

            <p className="text-sm truncate">{file.name}</p>

            <button
              onClick={() => handleView(file.name)}
              className="text-sm text-teal-600 mt-2"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
