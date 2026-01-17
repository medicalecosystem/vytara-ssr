'use client';

import {
  FileText,
  Receipt,
  Activity,
  Shield,
  Upload,
  Folder,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/createClient';

export default function StaticVaultPage() {

    type VaultDocument = {
      id: string;
      name: string;
      type: string;
      filePath: string;
      uploadedAt: string;
    };


    useEffect(() => {
      fetchDocuments();
    }, []);

    //Modal Control
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    
    //Upload form state
    const [selectedType, setSelectedType] = useState("Lab Reports");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    //Documents storage
    const [documents, setDocuments] = useState<VaultDocument[]>([]);
    
    //Sidebar filter
    const [activeFilter, setActiveFilter] = useState("All");
    
    const filterToFolderName = (filter: string) => {
      if ( filter === "All") return null;
      return getFolderByType(filter);
    }
    
    const visibleDocuments = 
        activeFilter === "All"
            ? documents
            : documents.filter((doc) => doc.type === activeFilter);

    const getFolderByType = (folder: string) => {
      switch(folder) {
        case "Lab Reports":
          return "lab-reports";
        case "Prescriptions":
          return "prescriptions";
        case "Insurance":
          return "insurance";
        case "Bills & Receipts":
          return "bills";
        default: 
          return "others";
      }
    };
    
    const folderToLabel = (folder: string) => {
      switch (folder) {
        case "lab-reports":
          return "Lab Reports";
        case "prescriptions":
          return "Prescriptions";
        case "insurance":
          return "Insurance";
        case "bills":
          return "Bills & Receipts";
        default:
          return "Others";
      }
    };


    const fetchDocuments = async () => {
  // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const userId = user.id;
      const folders = ["lab-reports", "prescriptions", "insurance", "bills", "others"];
      
      let allDocs: VaultDocument[] = [];

      // Fetch documents from each folder
      for (const folder of folders) {
        const { data, error } = await supabase.storage
          .from("medical-vault")
          .list(`${userId}/${folder}`, {
            limit: 100,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) {
          console.error(`Error fetching ${folder}:`, error);
          continue;
        }

        if (data) {
          const formattedDocs = data
            .filter(item => item.name !== '.emptyFolderPlaceholder') // Filter out placeholder files
            .map((item) => ({
              id: item.id,
              name: item.name,
              type: folderToLabel(folder),
              filePath: `${userId}/${folder}/${item.name}`,
              uploadedAt: new Date(item.created_at).toLocaleString(),
            }));

          allDocs = [...allDocs, ...formattedDocs];
        }
      }

      setDocuments(allDocs);
    };

    return (
        <div className="min-h-screen bg-[#f4f7f8]">
        <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
            
            {/* LEFT SECTION */}
            <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Button*/}
            <div>
                <button 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl shadow"
                    onClick={() => setIsUploadOpen(true)}
                >
                + Upload New Document
                </button>
                <div className="grid sm:grid-cols-2 gap-4">
                {visibleDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-white rounded-xl border shadow-sm"
                  >
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.type}</p>
                    <p className="text-xs text-gray-400">
                      Uploaded on {doc.uploadedAt}
                    </p>
                    <a
                      className="text-teal-600 underline mt-2 block"
                      href={`https://mhlkzulgpeirtjiopzvu.supabase.co/storage/v1/object/public/medical-vault/${doc.filePath}`}
                      target="_blank"
                    >
                      View
                    </a>
                  </div>
                ))}
            </div>
            </div>
            </div>
            
            {/* RIGHT SIDEBAR */}
            <div className="space-y-4">
            <h2 className="text-xl font-se  mibold text-gray-800">
                Filter by Type
            </h2>

            <button 
                className={`w-full p-5 rounded-2xl bg-teal-50 text-left text-black
                    ${activeFilter === "All"
                        ? "border-2 border-teal-600 bg-teal-50"
                        : "border bg-white"
                    }`}
                onClick={() => setActiveFilter("All")}
            >
                <Folder className="inline mr-2 text-teal-600" />
                All Documents
            </button>

            <button 
                className={`w-full p-5 rounded-2xl border bg-teal-50 text-left text-black
                    ${activeFilter === "Lab Reports"
                        ? "border-2 border-teal-600 bg-teal-50"
                        : "border bg-white"
                    }`}
                onClick={() => setActiveFilter("Lab Reports")}
            >
                <Activity className="inline mr-2 text-teal-600" />
                Lab Reports
            </button>

            <button 
                className={`w-full p-5 rounded-2xl border bg-teal-50 text-left text-black
                    ${activeFilter === "Prescriptions"
                        ? "border-2 border-teal-600 bg-teal-50"
                        : "border bg-white"
                    }`}
                onClick={() => setActiveFilter("Prescriptions")}
            >
                <FileText className="inline mr-2 text-teal-600" />
                Prescriptions
            </button>

            <button 
                className={`w-full p-5 rounded-2xl border bg-teal-50 text-left text-black
                    ${activeFilter === "Insurance"
                        ? "border-2 border-teal-600 bg-teal-50"
                        : "border bg-white"
                    }`}
                onClick={() => setActiveFilter("Insurance")}
            >
                <Shield className="inline mr-2 text-teal-600" />
                Insurance
            </button>

            <button 
                className={`w-full p-5 rounded-2xl border bg-teal-50 text-left text-black
                    ${activeFilter === "Bills & Receipts"
                        ? "border-2 border-teal-600 bg-teal-50"
                        : "border bg-white"
                    }`}
                onClick={() => setActiveFilter("Bills & Receipts")}
            >
                <Receipt className="inline mr-2 text-teal-600" />
                Bills & Receipts
            </button>
            </div>
        </main>

        {/* STATIC UPLOAD MODAL (VISUAL ONLY) */}
        {isUploadOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center"  onClick={() => setIsUploadOpen(false)}>
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Upload Document
                </h3>

                <input
                    type='file'
                    hidden
                    id="fileInput"
                    onChange={(e) => {
                        if(!e.target.files) return;
                        setSelectedFile(e.target.files[0]);
                    }}
                />
                <div
                    onClick={() => document.getElementById('fileInput')?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        setSelectedFile(e.dataTransfer.files[0]);
                    }}
                    className='mb-4 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer'
                >
                    {selectedFile ? (
                        <p className='text-sm text-gray-700'>{selectedFile.name}</p>
                    ) : (
                        <>
                            <Upload className='w-10 h-10 mx-auto text-gray-400' />
                            <p className='text-sm text-gray-500 mt-2'>
                                Drag & Drop or Click to Upload
                            </p>
                        </>
                    )}
                </div>

                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className='w-full mb-4 p-3 border rounded-xl text-black'
                >
                    <option>Lab Reports</option>
                    <option>Prescriptions</option>
                    <option>Insurance</option>
                    <option>Bills & Receipts</option>
                </select>

                <button 
                    className="w-full py-3 bg-teal-600 text-white rounded-xl"
                    onClick={async () => {
                        if(!selectedFile) return;
                        
                        const folder = getFolderByType(selectedType);

                        const {
                          data: { user },
                        } = await supabase.auth.getUser();

                        if (!user) {
                          alert("Not authenticated");
                          return;
                        }

                        const userId = user.id;

                        const filePath = `${userId}/${folder}/${Date.now()}-${selectedFile.name}`;
                        
                        const { error } = await supabase.storage
                          .from("medical-vault")
                          .upload(filePath ,selectedFile, {
                            cacheControl: "3600",
                            upsert: false,
                          });

                          if( error ) {
                            console.error("Upload Failed", error.message);
                            return;
                          } 

                          setDocuments((prev) => [
                          ...prev,
                          {
                            id: String(Date.now()),
                            name: selectedFile.name,
                            type: selectedType,
                            filePath: filePath,
                            uploadedAt: new Date().toLocaleString(),
                          },
                        ]);

                        setSelectedFile(null);
                        setIsUploadOpen(false);
                    }}
                >
                    Upload
                </button>
                </div>
            </div>
        )}
        </div>
    );
}
