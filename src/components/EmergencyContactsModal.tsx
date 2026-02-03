//EmergencyContactsModal.tsx
import { useState } from "react";

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
};

type Props = {
  data: EmergencyContact[];
  onAdd: (contact: EmergencyContact) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function EmergencyContactsModal({ data, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setRelation("");
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !relation.trim()) {
      alert("Please enter a valid Name, Phone and Relation.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        id: "",
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim(),
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Emergency Contacts</h2>

        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? "Close" : "+ Add Contact"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded-2xl border bg-slate-50">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Mom / John Doe"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., 9876543210"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Relation
              </label>
              <input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Parent / Friend / Spouse"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!data.length ? (
        <p className="text-slate-600">No emergency contacts found.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-slate-500">
                  {c.relation} • {c.phone}
                </p>
              </div>

              <button
                onClick={() => onDelete(c.id)}
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                title="Delete contact"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
