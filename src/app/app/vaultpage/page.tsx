"use client";

import { 
  FileText, Receipt, Activity, Shield, 
  Upload, X, ChevronDown, Home, User, Folder,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/createClient';
import { listMedicalFiles, uploadMedicalFile, getSignedUrl } from '@/lib/medicalStorage';
import { MedicalFolder } from '@/constants/medicalFolders';
import MedicalFolderModal from '@/components/vault/MedicalFolderModal';
import Modal from "@/components/Modal";

export default function StaticVaultPage() {
  // Static placeholders since we are removing all logic/props
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<MedicalFolder>('reports');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openReports, setOpenReports] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      setUserId(data.user.id);

      const { data: files } = await listMedicalFiles(
        data.user.id,
        activeFolder
      );

      setFiles(files ?? []);
    });
  }, [activeFolder]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
              <div className="text-white text-xl">★</div>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Vytara - Vault</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-100 text-teal-700 rounded-full font-medium">
              <Home className="w-4 h-4" />
              Home
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-full font-medium">
              <User className="w-4 h-4" />
              Profile
            </button>
          </div>
        </div>
      </header> */}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Section - Documents */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-3">Family Member</label>
              <div className="relative">
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 appearance-none bg-white shadow-sm text-black outline-none">
                  <option>👤 John Doe (Self)</option>
                  <option>👤 Jane Doe</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">My Documents</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="bg-white p-4 rounded-xl border hover:shadow-md"
                  >
                    <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
                      <FileText className="w-10 h-10 text-teal-600" />
                    </div>

                    <h3 className="text-sm font-medium truncate">
                      {file.name}
                    </h3>

                    <p className="text-xs text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>

                    
                  </div>
                ))}

                {/* Static Example 1 */}
                {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
                  <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
                    
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1 truncate"></h3>
                  <p className="text-xs text-gray-500"></p>
                </div> */}

                {/* Static Example 2 */}
                {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
                  <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-orange-50">
                    <FileText className="w-12 h-12 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Physio Prescription</h3>
                  <p className="text-xs text-gray-500">Dec 20, 2025</p>
                </div> */}

                {/* Static Example 3 */}
                {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
                  <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-blue-50">
                    <Shield className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Insurance Policy.pdf</h3>
                  <p className="text-xs text-gray-500">Nov 15, 2025</p>
                </div> */}
              </div>
            </div>
          </div>

          {/* Right Section - Sidebar Filters */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Filter by Type
            </h2>

            {[
              { key: 'reports', label: 'Lab Reports', icon: Activity },
              { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
              { key: 'bills', label: 'Bills', icon: Folder },
              { key: 'insurance', label: 'Insurance', icon: Shield },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className="w-full p-5 rounded-2xl border-2 border-teal-200 bg-white hover:border-teal-400 text-left"
                onClick={() => {
                  setActiveFolder(key as MedicalFolder);
                  setOpenReports(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-teal-600" />
                  <span className="font-medium text-teal-700">{label}</span>
                </div>
              </button>
            ))}
          </div>

        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">© 2025 Vytara. All rights reserved</p>
        </div>
        {openReports && (
          <Modal onClose={() => setOpenReports(false)}>
            <MedicalFolderModal folder={activeFolder} />
          </Modal>
        )}
      </main>
    </div>
  );
}
