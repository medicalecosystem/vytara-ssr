// // "use client";

// // import { 
// //   FileText, Receipt, Activity, Shield, 
// //   Upload, X, ChevronDown, Home, User, Folder,
// // } from 'lucide-react';
// // import { useEffect, useState } from 'react';
// // import { supabase } from '@/lib/createClient';
// // import { listMedicalFiles, uploadMedicalFile, getSignedUrl } from '@/lib/medicalStorage';
// // import { MedicalFolder } from '@/constants/medicalFolders';
// // import MedicalFolderModal from '@/components/vault/MedicalFolderModal';
// // import Modal from "@/components/Modal";

// // export default function StaticVaultPage() {
// //   // Static placeholders since we are removing all logic/props
// //   const [userId, setUserId] = useState<string | null>(null);
// //   const [activeFolder, setActiveFolder] = useState<MedicalFolder>('reports');
// //   const [files, setFiles] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [openReports, setOpenReports] = useState(false);

// //   useEffect(() => {
// //     supabase.auth.getUser().then(async ({ data }) => {
// //       if (!data.user) return;

// //       setUserId(data.user.id);

// //       const { data: files } = await listMedicalFiles(
// //         data.user.id,
// //         activeFolder
// //       );

// //       setFiles(files ?? []);
// //     });
// //   }, [activeFolder]);
  
// //   return (
// //     <div className="min-h-screen bg-gray-50">
// //       {/* Header */}
// //       {/* <header className="bg-white shadow-sm">
// //         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
// //           <div className="flex items-center gap-3">
// //             <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
// //               <div className="text-white text-xl">★</div>
// //             </div>
// //             <h1 className="text-xl font-semibold text-gray-800">Vytara - Vault</h1>
// //           </div>
// //           <div className="flex items-center gap-3">
// //             <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-100 text-teal-700 rounded-full font-medium">
// //               <Home className="w-4 h-4" />
// //               Home
// //             </button>
// //             <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-full font-medium">
// //               <User className="w-4 h-4" />
// //               Profile
// //             </button>
// //           </div>
// //         </div>
// //       </header> */}

// //       <main className="max-w-7xl mx-auto px-6 py-8">
// //         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
// //           {/* Left Section - Documents */}
// //           <div className="lg:col-span-2 space-y-6">
// //             <div>
// //               <label className="block text-gray-700 font-medium mb-3">Family Member</label>
// //               <div className="relative">
// //                 <select className="w-full px-4 py-3 rounded-xl border border-gray-200 appearance-none bg-white shadow-sm text-black outline-none">
// //                   <option>👤 John Doe (Self)</option>
// //                   <option>👤 Jane Doe</option>
// //                 </select>
// //                 <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
// //               </div>
// //             </div>

// //             <div>
// //               <h2 className="text-2xl font-semibold text-gray-800 mb-6">My Documents</h2>
              
// //               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
// //                 {files.map((file) => (
// //                   <div
// //                     key={file.name}
// //                     className="bg-white p-4 rounded-xl border hover:shadow-md"
// //                   >
// //                     <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
// //                       <FileText className="w-10 h-10 text-teal-600" />
// //                     </div>

// //                     <h3 className="text-sm font-medium truncate">
// //                       {file.name}
// //                     </h3>

// //                     <p className="text-xs text-gray-500">
// //                       {new Date(file.created_at).toLocaleDateString()}
// //                     </p>

                    
// //                   </div>
// //                 ))}

// //                 {/* Static Example 1 */}
// //                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
// //                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
// //                     <X className="w-3 h-3" />
// //                   </button>
// //                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-teal-50">
                    
// //                   </div>
// //                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate"></h3>
// //                   <p className="text-xs text-gray-500"></p>
// //                 </div> */}

// //                 {/* Static Example 2 */}
// //                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
// //                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
// //                     <X className="w-3 h-3" />
// //                   </button>
// //                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-orange-50">
// //                     <FileText className="w-12 h-12 text-orange-600" />
// //                   </div>
// //                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Physio Prescription</h3>
// //                   <p className="text-xs text-gray-500">Dec 20, 2025</p>
// //                 </div> */}

// //                 {/* Static Example 3 */}
// //                 {/* <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition group relative">
// //                   <button className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
// //                     <X className="w-3 h-3" />
// //                   </button>
// //                   <div className="w-full h-32 rounded-lg flex items-center justify-center mb-3 bg-blue-50">
// //                     <Shield className="w-12 h-12 text-blue-600" />
// //                   </div>
// //                   <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">Insurance Policy.pdf</h3>
// //                   <p className="text-xs text-gray-500">Nov 15, 2025</p>
// //                 </div> */}
// //               </div>
// //             </div>
// //           </div>

// //           {/* Right Section - Sidebar Filters */}
// //           <div className="space-y-4">
// //             <h2 className="text-xl font-semibold text-gray-800 mb-4">
// //               Filter by Type
// //             </h2>

// //             {[
// //               { key: 'reports', label: 'Lab Reports', icon: Activity },
// //               { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
// //               { key: 'bills', label: 'Bills', icon: Folder },
// //               { key: 'insurance', label: 'Insurance', icon: Shield },
// //             ].map(({ key, label, icon: Icon }) => (
// //               <button
// //                 key={key}
// //                 className="w-full p-5 rounded-2xl border-2 border-teal-200 bg-white hover:border-teal-400 text-left"
// //                 onClick={() => {
// //                   setActiveFolder(key as MedicalFolder);
// //                   setOpenReports(true);
// //                 }}
// //               >
// //                 <div className="flex items-center gap-3">
// //                   <Icon className="w-6 h-6 text-teal-600" />
// //                   <span className="font-medium text-teal-700">{label}</span>
// //                 </div>
// //               </button>
// //             ))}
// //           </div>

// //         </div>

// //         <div className="mt-12 text-center">
// //           <p className="text-gray-400 text-sm">© 2025 Vytara. All rights reserved</p>
// //         </div>
// //         {openReports && (
// //           <Modal onClose={() => setOpenReports(false)}>
// //             <MedicalFolderModal folder={activeFolder} />
// //           </Modal>
// //         )}
// //       </main>
// //     </div>
// //   );
// // }

// 'use client';

// import { useEffect, useState } from 'react';
// import {
//   FileText,
//   Receipt,
//   Activity,
//   Shield,
//   Upload,
//   X,
//   ChevronDown,
//   Home,
//   User,
//   Folder,
// } from 'lucide-react';

// import { supabase } from '@/lib/createClient';
// import { listMedicalFiles, uploadMedicalFile } from '@/lib/medicalStorage';
// import { MedicalFolder } from '@/constants/medicalFolders';

// type Category = 'lab-reports' | 'prescriptions' | 'insurance' | 'bills' | 'all';

// type MedicalFile = {
//   name: string;
//   created_at: string;
//   folder: MedicalFolder;
// };

// export default function VaultPage() {
//   const [userId, setUserId] = useState<string | null>(null);
//   const [files, setFiles] = useState<MedicalFile[]>([]);
//   const [loading, setLoading] = useState(false);

//   const [selectedCategory, setSelectedCategory] = useState<Category>('all');
//   const [showUploadModal, setShowUploadModal] = useState(false);

//   const [uploadData, setUploadData] = useState<{
//     category: Category;
//     file: File | null;
//   }>({
//     category: 'lab-reports',
//     file: null,
//   });

//   /* ---------------- AUTH + FETCH ---------------- */

//   useEffect(() => {
//     supabase.auth.getUser().then(async ({ data }) => {
//       if (!data.user) return;
//       setUserId(data.user.id);
//       fetchFiles(data.user.id, selectedCategory);
//     });
//   }, []);

//   useEffect(() => {
//     if (userId) fetchFiles(userId, selectedCategory);
//   }, [selectedCategory]);

//   const fetchFiles = async (uid: string, category: Category) => {
//     setLoading(true);

//     const folderMap: Record<Category, MedicalFolder[]> = {
//       all: ['reports', 'prescriptions', 'insurance', 'bills'],
//       'lab-reports': ['reports'],
//       prescriptions: ['prescriptions'],
//       insurance: ['insurance'],
//       bills: ['bills'],
//     };

//     const results: MedicalFile[] = [];

//     for (const folder of folderMap[category]) {
//       const { data } = await listMedicalFiles(uid, folder);
//       if (data) {
//         results.push(
//           ...data.map((f: any) => ({
//             name: f.name,
//             created_at: f.created_at,
//             folder,
//           }))
//         );
//       }
//     }

//     setFiles(
//       results.sort(
//         (a, b) =>
//           new Date(b.created_at).getTime() -
//           new Date(a.created_at).getTime()
//       )
//     );

//     setLoading(false);
//   };

//   /* ---------------- UPLOAD ---------------- */

//   const handleUpload = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!userId || !uploadData.file) return;

//     const folderMap: Record<Category, MedicalFolder> = {
//       'lab-reports': 'reports',
//       prescriptions: 'prescriptions',
//       insurance: 'insurance',
//       bills: 'bills',
//       all: 'reports',
//     };

//     await uploadMedicalFile(
//       userId,
//       folderMap[uploadData.category],
//       uploadData.file
//     );

//     setShowUploadModal(false);
//     setUploadData({ category: 'lab-reports', file: null });
//     fetchFiles(userId, selectedCategory);
//   };

//   /* ---------------- UI ---------------- */

//   const categories = [
//     { id: 'lab-reports', label: 'Lab Reports', icon: Activity },
//     { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
//     { id: 'insurance', label: 'Insurance', icon: Shield },
//     { id: 'bills', label: 'Bills & Receipts', icon: Receipt },
//   ];

//   return (
//     <div className="min-h-screen bg-[#f4f7f8]">
//       {/* HEADER */}
//       {/* <header className="bg-gradient-to-r from-teal-700 to-teal-500 shadow-md">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
//           <h1 className="text-xl font-semibold text-white">
//             Vytara – Vault
//           </h1>
//           <div className="flex gap-3">
//             <button className="flex items-center gap-2 px-5 py-2 bg-white/20 text-white rounded-full backdrop-blur">
//               <Home className="w-4 h-4" /> Home
//             </button>
//             <button className="flex items-center gap-2 px-5 py-2 bg-white text-teal-700 rounded-full font-medium">
//               <User className="w-4 h-4" /> Profile
//             </button>
//           </div>
//         </div>
//       </header> */}

//       <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
//         {/* LEFT */}
//         <div className="lg:col-span-2 space-y-6">
//           <button
//             onClick={() => setShowUploadModal(true)}
//             className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl shadow hover:bg-teal-700"
//           >
//             + Upload New Document
//           </button>

//           <div>
//             <h2 className="text-2xl font-semibold text-gray-800 mb-6">
//               My Documents
//             </h2>

//             {files.length === 0 && !loading ? (
//               <div className="bg-white border-2 border-dashed border-teal-300 rounded-2xl p-16 text-center">
//                 <Upload className="w-16 h-16 mx-auto text-teal-600" />
//                 <p className="mt-4 text-gray-600">
//                   Upload your first document
//                 </p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                 {files.map(file => (
//                   <div
//                     key={file.name}
//                     className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
//                   >
//                     <div className="h-32 flex items-center justify-center bg-teal-100 rounded-lg mb-3">
//                       <FileText className="w-10 h-10 text-teal-700" />
//                     </div>
//                     <p className="text-sm font-medium text-gray-800 truncate">
//                       {file.name}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       {new Date(file.created_at).toLocaleDateString()}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="space-y-4">
//           <h2 className="text-xl font-semibold text-gray-800">
//             Filter by Type
//           </h2>

//           <button
//             onClick={() => setSelectedCategory('all')}
//             className={`w-full p-5 rounded-2xl border-2 text-gray-800 text-left ${
//               selectedCategory === 'all'
//                 ? 'border-teal-600 bg-teal-50'
//                 : 'border-gray-200 bg-white'
//             }`}
//           >
//             <Folder className="inline mr-2 text-teal-600" />
//             All Documents
//           </button>

//           {categories.map(cat => (
//             <button
//               key={cat.id}
//               onClick={() =>
//                 setSelectedCategory(cat.id as Category)
//               }
//               className={`w-full p-5 rounded-2xl border-2 text-gray-800 text-left ${
//                 selectedCategory === cat.id
//                   ? 'border-teal-600 bg-teal-50'
//                   : 'border-gray-200 bg-white'
//               }`}
//             >
//               <cat.icon className="inline mr-2 text-teal-600" />
//               {cat.label}
//             </button>
//           ))}
//         </div>
//       </main>

//       {/* UPLOAD MODAL */}
//       {showUploadModal && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//           <form
//             onSubmit={handleUpload}
//             className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
//           >
//             {/* CLOSE BUTTON */}
//             <button
//               type="button"
//               onClick={() => setShowUploadModal(false)}
//               className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
//               aria-label="Close modal"
//             >
//               ✕
//             </button>

//             <h3 className="text-lg font-semibold mb-4 text-gray-800">
//               Upload Document
//             </h3>

//             <input
//               type="file"
//               required
//               onChange={e =>
//                 setUploadData({
//                   ...uploadData,
//                   file: e.target.files?.[0] || null,
//                 })
//               }
//               className="mb-4 text-gray-800"
//             />

//             <button
//               type="submit"
//               className="w-full py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
//             >
//               Upload
//             </button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Receipt,
  Activity,
  Shield,
  Upload,
  X,
  Folder,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Check,
  Download,
  Trash2,
  Eye,
  Edit2,
  Plus,
} from 'lucide-react';

import { supabase } from '@/lib/createClient';
import { deleteMedicalFile, getSignedUrl, listMedicalFiles, uploadMedicalFile } from '@/lib/medicalStorage';
import { MedicalFolder } from '@/constants/medicalFolders';

type Category = 'lab-reports' | 'prescriptions' | 'insurance' | 'bills' | 'all';

type MedicalFile = {
  name: string;
  created_at: string;
  folder: MedicalFolder;
};

type CacheEntry<T> = { ts: number; value: T };
const VAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const vaultCacheKey = (userId: string, key: string) => `vytara:vault:${userId}:${key}`;
const readVaultCache = <T,>(userId: string, key: string): T | null => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(vaultCacheKey(userId, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > VAULT_CACHE_TTL_MS) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
};
const writeVaultCache = <T,>(userId: string, key: string, value: T) => {
  if (!userId || typeof window === 'undefined') return;
  const entry: CacheEntry<T> = { ts: Date.now(), value };
  window.localStorage.setItem(vaultCacheKey(userId, key), JSON.stringify(entry));
};

export default function VaultPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [openMenuName, setOpenMenuName] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<MedicalFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'last-7' | 'last-30' | 'last-90' | 'custom'>('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [counts, setCounts] = useState<Record<MedicalFolder, number>>({
    reports: 0,
    prescriptions: 0,
    insurance: 0,
    bills: 0,
  });

  const [uploadData, setUploadData] = useState<{
    category: Category;
    file: File | null;
    fileName: string;
  }>({
    category: 'lab-reports',
    file: null,
    fileName: '',
  });

  /* ---------------- AUTH + FETCH ---------------- */

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nextUserId = session?.user?.id ?? null;
      if (!nextUserId) return;
      setUserId((prev) => (prev === nextUserId ? prev : nextUserId));
      fetchFiles(nextUserId, selectedCategory);
      fetchCounts(nextUserId);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (!nextUserId) return;
      setUserId((prev) => (prev === nextUserId ? prev : nextUserId));
      fetchFiles(nextUserId, selectedCategory);
      fetchCounts(nextUserId);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) fetchFiles(userId, selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (!openMenuName) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuName(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuName]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortMenuOpen]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterMenuOpen]);

  const fetchFiles = async (uid: string, category: Category) => {
    const cacheKey = `files:${category}`;
    const cachedFiles = readVaultCache<MedicalFile[]>(uid, cacheKey);
    const hadCache = Boolean(cachedFiles);
    if (cachedFiles) {
      setFiles(cachedFiles);
    }
    setLoading(!hadCache);

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

    const sortedResults = results.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
    setFiles(sortedResults);
    writeVaultCache(uid, cacheKey, sortedResults);

    setLoading(false);
  };

  const fetchCounts = async (uid: string) => {
    const cachedCounts = readVaultCache<Record<MedicalFolder, number>>(uid, 'counts');
    if (cachedCounts) {
      setCounts(cachedCounts);
    }
    const folders: MedicalFolder[] = [
      'reports',
      'prescriptions',
      'insurance',
      'bills',
    ];
    const nextCounts: Record<MedicalFolder, number> = {
      reports: 0,
      prescriptions: 0,
      insurance: 0,
      bills: 0,
    };

    for (const folder of folders) {
      const { data } = await listMedicalFiles(uid, folder);
      nextCounts[folder] = data?.length ?? 0;
    }

    setCounts(nextCounts);
    writeVaultCache(uid, 'counts', nextCounts);
  };

  /* ---------------- UPLOAD ---------------- */

  const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '');
  const getExtension = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop() ?? '' : '';
  };
  const sanitizeName = (name: string) => name.replace(/[\\/]/g, '-').trim();
  const isAllowedUploadType = (file: File) => {
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      return true;
    }
    const ext = getExtension(file.name).toLowerCase();
    const allowedImageExtensions = new Set([
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'bmp',
      'svg',
      'tif',
      'tiff',
      'heic',
      'heif',
      'avif',
      'ico',
    ]);
    return ext === 'pdf' || allowedImageExtensions.has(ext);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !uploadData.file) return;
    if (!isAllowedUploadType(uploadData.file)) {
      window.alert('Only PDF and image files are allowed.');
      return;
    }

    const folderMap: Record<Category, MedicalFolder> = {
      'lab-reports': 'reports',
      prescriptions: 'prescriptions',
      insurance: 'insurance',
      bills: 'bills',
      all: 'reports',
    };

    const originalExt = getExtension(uploadData.file.name);
    const baseFromInput = sanitizeName(stripExtension(uploadData.fileName));
    const fallbackBase = stripExtension(uploadData.file.name) || 'untitled';
    const finalBase = baseFromInput || fallbackBase;
    const finalName = originalExt ? `${finalBase}.${originalExt}` : finalBase;

    await uploadMedicalFile(
      userId,
      folderMap[uploadData.category],
      uploadData.file,
      finalName
    );

    setShowUploadModal(false);
    setUploadData({ category: 'lab-reports', file: null, fileName: '' });
    fetchFiles(userId, selectedCategory);
    fetchCounts(userId);
  };

  const handleDelete = async (file: MedicalFile) => {
    if (!userId) return;
    const confirmed = window.confirm(`Delete "${file.name}"?`);
    if (!confirmed) return;

    setOpenMenuName(null);
    setDeletingName(file.name);
    const { error } = await deleteMedicalFile(
      `${userId}/${file.folder}/${file.name}`
    );
    setDeletingName(null);

    if (error) {
      alert(error.message || "Failed to delete file.");
      return;
    }

    setFiles((prev) => prev.filter((f) => f.name !== file.name));
    fetchCounts(userId);
  };

  const handleRename = async (file: MedicalFile) => {
    if (!userId) return;
    const nextName = window
      .prompt('Rename file', file.name)
      ?.trim();
    if (!nextName || nextName === file.name) return;
    if (nextName.includes('/')) {
      alert("File name can't include slashes.");
      return;
    }

    setOpenMenuName(null);
    setRenamingName(file.name);
    const { error } = await supabase.storage
      .from('medical-vault')
      .move(
        `${userId}/${file.folder}/${file.name}`,
        `${userId}/${file.folder}/${nextName}`
      );
    setRenamingName(null);

    if (error) {
      alert(error.message || 'Failed to rename file.');
      return;
    }

    setFiles((prev) =>
      prev.map((f) => (f.name === file.name ? { ...f, name: nextName } : f))
    );
    fetchCounts(userId);
  };

  const handleDownload = async (file: MedicalFile) => {
    if (!userId) return;
    const { data, error } = await getSignedUrl(
      `${userId}/${file.folder}/${file.name}`
    );
    if (error || !data?.signedUrl) {
      alert(error?.message || "Failed to download file.");
      return;
    }

    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch file.");
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download file.");
    }
  };

  const handlePreview = async (file: MedicalFile) => {
    if (!userId) return;
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const { data, error } = await getSignedUrl(
      `${userId}/${file.folder}/${file.name}`
    );
    setPreviewLoading(false);
    if (error || !data?.signedUrl) {
      alert(error?.message || "Failed to load preview.");
      return;
    }
    setPreviewUrl(data.signedUrl);
  };

  const fileExtension = (name: string) => name.split(".").pop()?.toLowerCase();
  const isImageFile = (name: string) => {
    const ext = fileExtension(name);
    return (
      ext === "png" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "gif" ||
      ext === "webp" ||
      ext === "bmp" ||
      ext === "svg" ||
      ext === "tif" ||
      ext === "tiff" ||
      ext === "heic" ||
      ext === "heif"
    );
  };
  const isPdfFile = (name: string) => fileExtension(name) === "pdf";

  /* ---------------- HELPERS ---------------- */
  
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const dateFilteredFiles = filteredFiles.filter((file) => {
    if (dateFilter === 'all') return true;
    const createdAt = new Date(file.created_at);
    if (dateFilter === 'last-7') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return createdAt >= start;
    }
    if (dateFilter === 'last-30') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return createdAt >= start;
    }
    if (dateFilter === 'last-90') {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return createdAt >= start;
    }
    if (dateFilter === 'custom') {
      if (!customRange.start && !customRange.end) return true;
      const start = customRange.start ? new Date(`${customRange.start}T00:00:00`) : null;
      const end = customRange.end ? new Date(`${customRange.end}T23:59:59.999`) : null;
      if (start && createdAt < start) return false;
      if (end && createdAt > end) return false;
      return true;
    }
    return true;
  });
  const sortedFiles = [...dateFilteredFiles].sort((a, b) => {
    if (sortOption === 'date-asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortOption === 'name-asc') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    if (sortOption === 'name-desc') {
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getCategoryIcon = (folder: MedicalFolder) => {
    const icons: Record<MedicalFolder, any> = {
      reports: Activity,
      prescriptions: FileText,
      insurance: Shield,
      bills: Receipt,
    };
    return icons[folder] || FileText;
  };

  const getCategoryColor = (folder: MedicalFolder) => {
    const colors: Record<MedicalFolder, string> = {
      reports: 'from-blue-500 to-blue-600',
      prescriptions: 'from-emerald-500 to-emerald-600',
      insurance: 'from-violet-500 to-violet-600',
      bills: 'from-amber-500 to-amber-600',
    };
    return colors[folder] || 'from-teal-500 to-teal-600';
  };

  const getCategoryBg = (folder: MedicalFolder) => {
    const colors: Record<MedicalFolder, string> = {
      reports: 'bg-blue-50',
      prescriptions: 'bg-emerald-50',
      insurance: 'bg-violet-50',
      bills: 'bg-amber-50',
    };
    return colors[folder] || 'bg-teal-50';
  };

  const categories = [
    {
      id: 'all',
      label: 'All Documents',
      icon: Folder,
      count:
        counts.reports +
        counts.prescriptions +
        counts.insurance +
        counts.bills,
    },
    { id: 'lab-reports', label: 'Lab Reports', icon: Activity, count: counts.reports },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, count: counts.prescriptions },
    { id: 'insurance', label: 'Insurance', icon: Shield, count: counts.insurance },
    { id: 'bills', label: 'Bills & Receipts', icon: Receipt, count: counts.bills },
  ];

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* MAIN CONTENT */}
      <div className="flex-1">
        
        {/* TOP HEADER BAR */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Medical Vault</h1>
              <p className="text-sm text-slate-500 mt-0.5">Securely store and manage your medical documents</p>
            </div>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-medium shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] transition-all duration-200"
              data-testid="upload-document-btn"
            >
              <Plus size={18} />
              Upload Document
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
          {/* MAIN DOCUMENTS SECTION */}
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">All Documents</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-auto">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-full sm:w-64"
                    data-testid="search-documents"
                  />
                </div>

                {/* Sort */}
                <div className="relative" ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    <ArrowUpDown size={16} className="text-slate-500" />
                    Sort
                  </button>
                  {sortMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg z-20">
                      {[
                        { id: 'date-desc', label: 'Date created (newest)' },
                        { id: 'date-asc', label: 'Date created (oldest)' },
                        { id: 'name-asc', label: 'Alphabetical (A–Z)' },
                        { id: 'name-desc', label: 'Alphabetical (Z–A)' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSortOption(option.id as typeof sortOption);
                            setSortMenuOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition ${
                            sortOption === option.id
                              ? 'bg-teal-50 text-teal-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter */}
                <div className="relative" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setFilterMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    <Filter size={16} className="text-slate-500" />
                    Filter
                    {dateFilter !== 'all' && (
                      <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {dateFilter === 'custom'
                          ? 'Custom'
                          : dateFilter === 'last-7'
                          ? '7d'
                          : dateFilter === 'last-30'
                          ? '30d'
                          : '90d'}
                      </span>
                    )}
                  </button>
                  {filterMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg z-20 p-3">
                      <div className="space-y-1">
                        {[
                          { id: 'all', label: 'All time' },
                          { id: 'last-7', label: 'Last 7 days' },
                          { id: 'last-30', label: 'Last 30 days' },
                          { id: 'last-90', label: 'Last 90 days' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setDateFilter(option.id as typeof dateFilter);
                              setFilterMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg transition ${
                              dateFilter === option.id
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {option.label}
                            {dateFilter === option.id && <Check size={16} className="text-teal-600" />}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setDateFilter('custom')}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg transition ${
                            dateFilter === 'custom'
                              ? 'bg-teal-50 text-teal-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Custom range
                          {dateFilter === 'custom' && <Check size={16} className="text-teal-600" />}
                        </button>
                        {dateFilter === 'custom' && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Start date</label>
                              <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) =>
                                  setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">End date</label>
                              <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) =>
                                  setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                              />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomRange({ start: '', end: '' });
                                  setDateFilter('all');
                                  setFilterMenuOpen(false);
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!customRange.start || !customRange.end) {
                                    alert('Please select a start and end date.');
                                    return;
                                  }
                                  setDateFilter('custom');
                                  setFilterMenuOpen(false);
                                }}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* View Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                    data-testid="view-grid"
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                    data-testid="view-list"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* CATEGORY SIDEBAR */}
              <div className="w-full md:w-56 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as Category)}
                    className={`w-48 md:w-full flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      selectedCategory === cat.id
                        ? 'bg-teal-50 text-teal-700 border-2 border-teal-200 shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`category-${cat.id}`}
                  >
                    <cat.icon size={18} className={selectedCategory === cat.id ? 'text-teal-600' : 'text-slate-400'} />
                    <span className="flex-1 font-medium text-sm">{cat.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-teal-200 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* FILES GRID/LIST */}
              <div className="flex-1">
                {sortedFiles.length === 0 && !loading ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                      <Upload size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-700 mb-2">No documents yet</h3>
                    <p className="text-slate-500 text-sm mb-6">Upload your first medical document to get started</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
                    >
                      <Plus size={18} />
                      Upload Document
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedFiles.map((file, i) => {
                      const Icon = getCategoryIcon(file.folder);
                      return (
                        <div
                          key={i}
                          className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all duration-200"
                          data-testid={`file-card-${i}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(file.folder)} flex items-center justify-center shadow-md`}>
                              <Icon size={18} className="text-white" />
                            </div>
                            <div
                              className="relative"
                              ref={openMenuName === file.name ? menuRef : null}
                              data-menu={openMenuName === file.name ? file.name : undefined}
                            >
                              <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition"
                                onClick={() =>
                                  setOpenMenuName((prev) =>
                                    prev === file.name ? null : file.name
                                  )
                                }
                                aria-label={`Open actions for ${file.name}`}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openMenuName === file.name && (
                                <div className="absolute right-0 mt-2 w-32 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
                                  <button
                                    onClick={() => handleRename(file)}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    disabled={renamingName === file.name}
                                  >
                                    Rename
                                  </button>
                                  <button
                                    onClick={() => handleDelete(file)}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    disabled={deletingName === file.name}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="font-medium text-slate-800 text-sm truncate mb-1">{file.name}</p>
                          <p className="text-xs text-slate-400 mb-4">{new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-medium transition"
                              onClick={() => handlePreview(file)}
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-700 text-xs font-medium transition"
                              onClick={() => handleDownload(file)}
                            >
                              <Download size={14} /> Download
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedFiles.map((file, i) => {
                          const Icon = getCategoryIcon(file.folder);
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition" data-testid={`file-row-${i}`}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getCategoryColor(file.folder)} flex items-center justify-center`}>
                                    <Icon size={16} className="text-white" />
                                  </div>
                                  <span className="font-medium text-slate-800 text-sm">{file.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBg(file.folder)} text-slate-700`}>
                                  {file.folder.charAt(0).toUpperCase() + file.folder.slice(1)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500">
                                {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                                    onClick={() => handleRename(file)}
                                    disabled={renamingName === file.name}
                                    aria-label={`Rename ${file.name}`}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                                    onClick={() => handlePreview(file)}
                                    aria-label={`Preview ${file.name}`}
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                                    onClick={() => handleDownload(file)}
                                    aria-label={`Download ${file.name}`}
                                  >
                                    <Download size={16} />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                    onClick={() => handleDelete(file)}
                                    disabled={deletingName === file.name}
                                    aria-label={`Delete ${file.name}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </section>
        </main>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 mb-4">
                <Upload size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Upload Document</h3>
              <p className="text-sm text-slate-500 mt-1">Add a new medical document to your vault</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-5">
              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value as Category })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="lab-reports">Lab Reports</option>
                  <option value="prescriptions">Prescriptions</option>
                  <option value="insurance">Insurance</option>
                  <option value="bills">Bills & Receipts</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-400 hover:bg-teal-50/30 transition cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    required
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null;
                      if (nextFile && !isAllowedUploadType(nextFile)) {
                        window.alert('Only PDF and image files are allowed.');
                        e.target.value = '';
                        return;
                      }
                      setUploadData((prev) => ({
                        ...prev,
                        file: nextFile,
                        fileName: nextFile
                          ? stripExtension(nextFile.name)
                          : prev.fileName,
                      }));
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadData.file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-teal-600" />
                        <span className="font-medium text-slate-700">{uploadData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Click to select a file</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* File Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">File name</label>
                <input
                  type="text"
                  value={uploadData.fileName}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, fileName: e.target.value })
                  }
                  placeholder="e.g. 2024 Blood Test"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                {uploadData.file && (
                  <p className="mt-1 text-xs text-slate-400">
                    Extension will be kept as .{getExtension(uploadData.file.name) || 'file'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.01] transition-all duration-200"
              >
                Upload Document
              </button>
            </form>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm">
          <div className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {previewFile.name}
                </p>
                <p className="text-xs text-slate-500">{previewFile.folder}</p>
              </div>
              <button
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewUrl(null);
                }}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {previewLoading && (
                <div className="text-sm text-slate-500">Loading preview…</div>
              )}
              {!previewLoading && previewUrl && isImageFile(previewFile.name) && (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    className="max-h-full max-w-full rounded-xl border border-slate-100"
                  />
                </div>
              )}
              {!previewLoading && previewUrl && isPdfFile(previewFile.name) && (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  className="w-full h-full rounded-xl border border-slate-100"
                />
              )}
              {!previewLoading && previewUrl && !isImageFile(previewFile.name) && !isPdfFile(previewFile.name) && (
                <div className="text-sm text-slate-500">
                  Preview not available for this file type.
                </div>
              )}
              {!previewLoading && !previewUrl && (
                <div className="text-sm text-slate-500">Preview unavailable.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
