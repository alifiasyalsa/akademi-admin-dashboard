import { useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { roleService, ROLES } from "../../services/roleService.js";
import { formatDateTimeDisplay } from "../../services/formatters.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RoleManagerModal({ isOpen, currentUser, onClose, onShowToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyEmail, setBusyEmail] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [errorMessage, setErrorMessage] = useState("");

  const myEmail = currentUser?.email?.toLowerCase() || "";

  async function loadRows() {
    setLoading(true);
    setErrorMessage("");
    try {
      setRows(await roleService.listRoles());
    } catch (err) {
      setErrorMessage(err?.message || "Gagal memuat daftar peran.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setNewEmail("");
      setNewRole("admin");
      loadRows();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function runAction(email, action, successToast) {
    setBusyEmail(email);
    setErrorMessage("");
    try {
      await action();
      await loadRows();
      onShowToast?.(successToast);
      return true;
    } catch (err) {
      setErrorMessage(err?.message || "Aksi gagal.");
      return false;
    } finally {
      setBusyEmail(null);
    }
  }

  function handleAdd(event) {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setErrorMessage("Format email tidak valid.");
      return;
    }
    runAction(email, () => roleService.setRole(email, newRole), {
      icon: "admin_panel_settings",
      title: "Peran Disimpan",
      subtitle: `${email} → ${ROLES[newRole].label}`,
    }).then((ok) => ok && setNewEmail(""));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center">
              <MaterialIcon name="admin_panel_settings" className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-slate-900">Kelola Peran Akun</h3>
              <p className="font-body-sm text-body-sm text-slate-500">Email tanpa peran khusus otomatis menjadi Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="pt-4 flex items-end gap-2">
          <label className="block flex-1">
            <span className="font-label-sm text-label-sm font-semibold text-slate-600">Email akun</span>
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="nama@gmail.com"
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </label>
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
            className="text-sm px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer"
          >
            {Object.entries(ROLES).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={Boolean(busyEmail)}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            Simpan
          </button>
        </form>

        {errorMessage && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
            <MaterialIcon name="error" className="text-[16px]" />
            {errorMessage}
          </p>
        )}

        <div className="flex-1 overflow-y-auto mt-4 border border-slate-200 rounded-xl">
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">Memuat daftar peran...</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400 italic">Belum ada peran khusus.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isMe = row.email === myEmail;
                const isBusy = busyEmail === row.email;
                return (
                  <li key={row.email} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {row.email}
                        {isMe && <span className="ml-1.5 text-[11px] font-medium text-slate-400">(Anda)</span>}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Diubah {formatDateTimeDisplay(row.updated_at)}
                        {row.updated_by ? ` oleh ${row.updated_by}` : ""}
                      </p>
                    </div>
                    <select
                      value={row.role}
                      disabled={isMe || isBusy}
                      title={isMe ? "Peran akun sendiri tidak bisa diubah" : undefined}
                      onChange={(event) => {
                        const role = event.target.value;
                        runAction(row.email, () => roleService.setRole(row.email, role), {
                          icon: "admin_panel_settings",
                          title: "Peran Diperbarui",
                          subtitle: `${row.email} → ${ROLES[role].label}`,
                        });
                      }}
                      className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {Object.entries(ROLES).map(([id, meta]) => (
                        <option key={id} value={id}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isMe || isBusy}
                      title={isMe ? "Peran akun sendiri tidak bisa dihapus" : "Hapus peran (kembali menjadi Admin)"}
                      onClick={() => {
                        if (!window.confirm(`Hapus peran khusus ${row.email}? Akun ini akan menjadi Admin biasa.`)) return;
                        runAction(row.email, () => roleService.removeRole(row.email), {
                          icon: "person_remove",
                          title: "Peran Dihapus",
                          subtitle: `${row.email} kini Admin biasa`,
                        });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MaterialIcon name={isBusy ? "hourglass_top" : "delete"} className="text-[18px]" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Peran hanya mengatur hak akses. Akun login tetap dibuat di Supabase Dashboard → Authentication → Users.
        </p>
      </div>
    </div>
  );
}
