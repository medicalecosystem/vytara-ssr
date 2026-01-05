// "use client";

// import { 
//   FileText, Receipt, Activity, Shield, 
//   Upload, X, ChevronDown, Home, User, Folder,
// } from 'lucide-react';
// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/createClient';
// import { listMedicalFiles, uploadMedicalFile, getSignedUrl } from '@/lib/medicalStorage';
// import { MedicalFolder } from '@/constants/medicalFolders';
// import MedicalFolderModal from '@/components/vault/MedicalFolderModal';
// import Modal from "@/components/Modal";

// export default function StaticVaultPage() {
//   // Static placeholders since we are removing all logic/props
//   const [userId, setUserId] = useState<string | null>(null);
//   const [activeFolder, setActiveFolder] = useState<MedicalFolder>('reports');
//   const [files, setFiles] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [openReports, setOpenReports] = useState(false);

//   useEffect(() => {
//     supabase.auth.getUser().then(async ({ data }) => {
//       if (!data.user) return;

//       setUserId(data.user.id);

//       const { data: files } = await listMedicalFiles(
//         data.user.id,
//         activeFolder
//       );

//       setFiles(files ?? []);
//     });
//   }, [activeFolder]);
  
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       {/* <header className="bg-white shadow-sm">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
//               <div className="text-white text-xl">★</div>
//             </div>
//             <h1 className="text-xl font-semibold text-gray-800">Vytara - Vault</h1>
//           </div>
//           <div className="flex items-center gap-3">
//             <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-100 text-teal-700 rounded-full font-medium">
//               <Home className="w-4 h-4" />
//               Home
//             </button>
//             <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-full font-medium">
//               <User className="w-4 h-4" />
//               Profile
//             </button>
//           </div>
//         </div>
//       </header> */}

//       <main className="max-w-7xl mx-auto px-6 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
//           {/* Left Section - Documents */}
//           <div className="lg:col-span-2 space-y-6">
//             <div>
//               <label className="block text-gray-700 font-medium mb-3">Family Member</label>
//               <div className="relative">
//                 <select className="w-full px-4 py-3 rounded-xl border border-gray-200 appearance-none bg-white shadow-sm text-black outline-none">
//                   <option>👤 John Doe (Self)</option>
//                   <option>👤 Jane Doe</option>
//                 </select>
//                 <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
//               </div>
//             </div>

//             <div>
//               <h2 className="text-2xl font-semibold text-gray-800 mb-6">My Documents</h2>
              
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                 {files.map((file) => (
//                   <div
//                     key={file.name}
//                     className="bg-white p-4 rounded-xl border hover:shadow-md"
//                   >
//                     <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
//                       <FileText className="w-10 h-10 text-teal-600" />
//                     </div>

//                     <h3 className="text-sm font-medium truncate">
//                       {file.name}
//                     </h3>

//                     <p className="text-xs text-gray-500">
//                       {new Date(file.created_at).toLocaleDateString()}
//                     </p>

                    
//                   </div>
//                 ))}

//                 {/* Static Example 1 */}
//                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
//                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
//                     <X className="w-3 h-3" />
//                   </button>
//                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
                    
//                   </div>
//                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate"></h3>
//                   <p className="text-xs text-gray-500"></p>
//                 </div> */}

//                 {/* Static Example 2 */}
//                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
//                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
//                     <X className="w-3 h-3" />
//                   </button>
//                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-orange-50">
//                     <FileText className="w-12 h-12 text-orange-600" />
//                   </div>
//                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Physio Prescription</h3>
//                   <p className="text-xs text-gray-500">Dec 20, 2025</p>
//                 </div> */}

//                 {/* Static Example 3 */}
//                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
//                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
//                     <X className="w-3 h-3" />
//                   </button>
//                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-blue-50">
//                     <Shield className="w-12 h-12 text-blue-600" />
//                   </div>
//                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Insurance Policy.pdf</h3>
//                   <p className="text-xs text-gray-500">Nov 15, 2025</p>
//                 </div> */}
//               </div>
//             </div>
//           </div>

//           {/* Right Section - Sidebar Filters */}
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">
//               Filter by Type
//             </h2>

//             {[
//               { key: 'reports', label: 'Lab Reports', icon: Activity },
//               { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
//               { key: 'bills', label: 'Bills', icon: Folder },
//               { key: 'insurance', label: 'Insurance', icon: Shield },
//             ].map(({ key, label, icon: Icon }) => (
//               <button
//                 key={key}
//                 className="w-full p-5 rounded-2xl border-2 border-teal-200 bg-white hover:border-teal-400 text-left"
//                 onClick={() => {
//                   setActiveFolder(key as MedicalFolder);
//                   setOpenReports(true);
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   <Icon className="w-6 h-6 text-teal-600" />
//                   <span className="font-medium text-teal-700">{label}</span>
//                 </div>
//               </button>
//             ))}
//           </div>

//         </div>

//         <div className="mt-12 text-center">
//           <p className="text-gray-400 text-sm">© 2025 Vytara. All rights reserved</p>
//         </div>
//         {openReports && (
//           <Modal onClose={() => setOpenReports(false)}>
//             <MedicalFolderModal folder={activeFolder} />
//           </Modal>
//         )}
//       </main>
//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Receipt,
  Activity,
  Shield,
  Upload,
  X,
  ChevronDown,
  Home,
  User,
  Folder,
} from 'lucide-react';

import { supabase } from '@/lib/createClient';
import { listMedicalFiles, uploadMedicalFile } from '@/lib/medicalStorage';
import { MedicalFolder } from '@/constants/medicalFolders';

type Category = 'lab-reports' | 'prescriptions' | 'insurance' | 'bills' | 'all';

type MedicalFile = {
  name: string;
  created_at: string;
  folder: MedicalFolder;
};

export default function VaultPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [uploadData, setUploadData] = useState<{
    category: Category;
    file: File | null;
  }>({
    category: 'lab-reports',
    file: null,
  });

  /* ---------------- AUTH + FETCH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      fetchFiles(data.user.id, selectedCategory);
    });
  }, []);

  useEffect(() => {
    if (userId) fetchFiles(userId, selectedCategory);
  }, [selectedCategory]);

  const fetchFiles = async (uid: string, category: Category) => {
    setLoading(true);

    const folderMap: Record<Category, MedicalFolder[]> = {
      all: ['reports', 'prescriptions', 'insurance', 'bills'],
      'lab-reports': ['reports'],
      prescriptions: ['prescriptions'],
      insurance: ['insurance'],
      bills: ['bills'],
    };

    const results: MedicalFile[] = [];

    for (const folder of folderMap[category]) {
      const { data } = await listMedicalFiles(uid, folder);
      if (data) {
        results.push(
          ...data.map((f: any) => ({
            name: f.name,
            created_at: f.created_at,
            folder,
          }))
        );
      }
    }

    setFiles(
      results.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
    );

    setLoading(false);
  };

  /* ---------------- UPLOAD ---------------- */

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !uploadData.file) return;

    const folderMap: Record<Category, MedicalFolder> = {
      'lab-reports': 'reports',
      prescriptions: 'prescriptions',
      insurance: 'insurance',
      bills: 'bills',
      all: 'reports',
    };

    await uploadMedicalFile(
      userId,
      folderMap[uploadData.category],
      uploadData.file
    );

    setShowUploadModal(false);
    setUploadData({ category: 'lab-reports', file: null });
    fetchFiles(userId, selectedCategory);
  };

  /* ---------------- UI ---------------- */

  const categories = [
    { id: 'lab-reports', label: 'Lab Reports', icon: Activity },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'insurance', label: 'Insurance', icon: Shield },
    { id: 'bills', label: 'Bills & Receipts', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      {/* HEADER */}
      {/* <header className="bg-gradient-to-r from-teal-700 to-teal-500 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">
            Vytara – Vault
          </h1>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2 bg-white/20 text-white rounded-full backdrop-blur">
              <Home className="w-4 h-4" /> Home
            </button>
            <button className="flex items-center gap-2 px-5 py-2 bg-white text-teal-700 rounded-full font-medium">
              <User className="w-4 h-4" /> Profile
            </button>
          </div>
        </div>
      </header> */}

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl shadow hover:bg-teal-700"
          >
            + Upload New Document
          </button>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              My Documents
            </h2>

            {files.length === 0 && !loading ? (
              <div className="bg-white border-2 border-dashed border-teal-300 rounded-2xl p-16 text-center">
                <Upload className="w-16 h-16 mx-auto text-teal-600" />
                <p className="mt-4 text-gray-600">
                  Upload your first document
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map(file => (
                  <div
                    key={file.name}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-32 flex items-center justify-center bg-teal-100 rounded-lg mb-3">
                      <FileText className="w-10 h-10 text-teal-700" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Filter by Type
          </h2>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full p-5 rounded-2xl border-2 text-left ${
              selectedCategory === 'all'
                ? 'border-teal-600 bg-teal-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Folder className="inline mr-2 text-teal-600" />
            All Documents
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(cat.id as Category)
              }
              className={`w-full p-5 rounded-2xl border-2 text-left ${
                selectedCategory === cat.id
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <cat.icon className="inline mr-2 text-teal-600" />
              {cat.label}
            </button>
          ))}
        </div>
      </main>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleUpload}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4">
              Upload Document
            </h3>

            <input
              type="file"
              required
              onChange={e =>
                setUploadData({
                  ...uploadData,
                  file: e.target.files?.[0] || null,
                })
              }
              className="mb-4"
            />

            <button className="w-full py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700">
              Upload
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
