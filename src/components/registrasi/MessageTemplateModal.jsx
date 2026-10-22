import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { templateService } from "../../services/templateService.js";

/**
 * Contoh data santri riil untuk pratinjau live WhatsApp
 */
const SAMPLE_DATA = {
  registrasi: {
    nama: "Ahmad Fauzi",
    batch: "16",
    rekomendasi_kelas: "Tahsin Lanjutan A (Sabtu)",
    tipe: "Pendaftar Baru",
    status: "Belum Konfirmasi",
  },
  monitoring: {
    nama: "Ahmad Fauzi",
    batch: "16",
    pekan: "3",
    kehadiran_pekan_ini: "Tidak Hadir",
    skor_kehadiran: "75%",
    status_infaq: "Belum Komitmen",
    nominal_infaq: "Rp 50.000",
  },
};

/**
 * Parser format WhatsApp teks (*tebal*, _miring_, ~coret~, > kutipan, link url)
 */
function formatWhatsAppText(text) {
  if (!text) return "";

  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format quotes: lines starting with &gt;
  const lines = escaped.split("\n").map((line) => {
    if (line.startsWith("&gt; ")) {
      return `<span class="block border-l-[3px] border-[#00a884] pl-2 text-slate-700 my-0.5 italic bg-black/5 py-0.5 rounded-r">${line.slice(5)}</span>`;
    }
    return line;
  });
  escaped = lines.join("\n");

  // Bold: *text* -> <strong>text</strong>
  escaped = escaped.replace(/\*([^*\n]+)\*/g, '<strong class="font-bold text-slate-900">$1</strong>');

  // Italic: _text_ -> <em>text</em>
  escaped = escaped.replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>');

  // Strikethrough: ~text~ -> <del>text</del>
  escaped = escaped.replace(/~([^~\n]+)~/g, '<del class="line-through">$1</del>');

  // Links: https://... or wa.me/...
  escaped = escaped.replace(
    /(https?:\/\/[^\s]+|wa\.me\/[^\s]+)/g,
    '<span class="text-[#027eb5] underline break-all font-medium">$1</span>'
  );

  return escaped;
}

/**
 * MessageTemplateModal
 * Modal pengelola template pesan WhatsApp dengan:
 * 1. Form editor yang langsung terbuka (tanpa tombol edit teks terpisah)
 * 2. Pratinjau WA live persis tampilan WhatsApp asli (mockup chat lengkap dengan data riil)
 * 3. Tombol Simpan diletakkan tepat setelah pratinjau WA
 */
export function MessageTemplateModal({
  isOpen,
  onClose,
  category = "registrasi", // 'registrasi' | 'monitoring'
  templates = [],
  onTemplatesChange,
  onShowToast,
}) {
  if (!isOpen) return null;

  // Tabs kategori status berdasarkan category
  const statusTabs =
    category === "registrasi"
      ? [
          { key: "wait", label: "Belum Konfirmasi" },
          { key: "pending", label: "Belum Bayar" },
          { key: "not_confirm", label: "Lewat Batas" },
          { key: "cancel", label: "Mundur / Batal" },
        ]
      : [
          { key: "presensi", label: "Presensi / Kehadiran" },
          { key: "infaq", label: "Komitmen Infaq" },
        ];

  const [activeStatusKey, setActiveStatusKey] = useState(statusTabs[0].key);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isDefaultChecked, setIsDefaultChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter template untuk status aktif
  const currentTemplates = useMemo(() => {
    return templates.filter(
      (t) => t.category === category && t.status_key === activeStatusKey
    );
  }, [templates, category, activeStatusKey]);

  // Template yang sedang dipilih
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId && selectedTemplateId !== "new") {
      const found = currentTemplates.find((t) => t.id === selectedTemplateId);
      if (found) return found;
    }
    // Default ke yang is_default atau yang pertama
    return currentTemplates.find((t) => t.is_default) || currentTemplates[0] || null;
  }, [currentTemplates, selectedTemplateId]);

  // Sinkronkan form editor langsung saat template aktif atau tab status berubah
  useEffect(() => {
    if (selectedTemplateId === "new") {
      setEditTitle("Template Baru");
      setEditContent("");
      setIsDefaultChecked(currentTemplates.length === 0);
    } else if (activeTemplate) {
      setSelectedTemplateId(activeTemplate.id);
      setEditTitle(activeTemplate.title || "");
      setEditContent(activeTemplate.content || "");
      setIsDefaultChecked(Boolean(activeTemplate.is_default));
    } else {
      setSelectedTemplateId("new");
      setEditTitle("Template Baru");
      setEditContent("");
      setIsDefaultChecked(true);
    }
  }, [activeTemplate?.id, activeStatusKey]);

  // Variabel sah yang benar-benar ada di sistem/API
  const availableVariables =
    category === "registrasi"
      ? [
          { key: "nama", label: "Nama Santri" },
          { key: "batch", label: "Batch Aktif" },
          { key: "rekomendasi_kelas", label: "Rekomendasi Kelas" },
          { key: "tipe", label: "Tipe Pendaftar" },
          { key: "status", label: "Status Pendaftaran" },
        ]
      : [
          { key: "nama", label: "Nama Santri" },
          { key: "batch", label: "Batch Aktif" },
          { key: "pekan", label: "Pekan Ke" },
          { key: "kehadiran_pekan_ini", label: "Presensi Pekan Ini" },
          { key: "skor_kehadiran", label: "Skor Kehadiran" },
          { key: "status_infaq", label: "Status Infaq" },
          { key: "nominal_infaq", label: "Nominal Infaq" },
        ];

  function handleAddNew() {
    setSelectedTemplateId("new");
    setEditTitle("Template Varian Baru");
    setEditContent("");
    setIsDefaultChecked(currentTemplates.length === 0);
  }

  function handleSelectTemplate(tmpl) {
    setSelectedTemplateId(tmpl.id);
    setEditTitle(tmpl.title || "");
    setEditContent(tmpl.content || "");
    setIsDefaultChecked(Boolean(tmpl.is_default));
  }

  function insertVariable(varKey) {
    setEditContent((prev) => prev + `{${varKey}}`);
  }

  // Pratinjau teks WhatsApp dengan substitusi data contoh riil secara live
  const livePreviewContent = useMemo(() => {
    const sample = SAMPLE_DATA[category] || {};
    return templateService.interpolate(editContent || "", sample);
  }, [editContent, category]);

  async function handleSetDefaultQuick(template, e) {
    e?.stopPropagation();
    try {
      await templateService.setDefaultTemplate(category, activeStatusKey, template.id);
      const updated = templates.map((t) => {
        if (t.category === category && t.status_key === activeStatusKey) {
          return { ...t, is_default: t.id === template.id };
        }
        return t;
      });
      onTemplatesChange?.(updated);
      if (selectedTemplateId === template.id) {
        setIsDefaultChecked(true);
      }
      onShowToast?.({
        icon: "check_circle",
        title: "Template Default Disetel",
        subtitle: `"${template.title}" aktif untuk pengiriman 1-klik`,
      });
    } catch {
      onShowToast?.({
        icon: "error",
        title: "Gagal Mengubah Default",
        subtitle: "Periksa koneksi ke Supabase",
      });
    }
  }

  async function handleSaveTemplate() {
    if (!editTitle.trim() || !editContent.trim()) {
      onShowToast?.({
        icon: "warning",
        title: "Judul dan Isi Tidak Boleh Kosong",
        subtitle: "Lengkapi form sebelum menyimpan",
      });
      return;
    }

    setSaving(true);
    try {
      let savedId = selectedTemplateId;
      let nextTemplates = [...templates];

      if (selectedTemplateId === "new") {
        const created = await templateService.createTemplate({
          category,
          status_key: activeStatusKey,
          title: editTitle.trim(),
          content: editContent.trim(),
          is_default: isDefaultChecked || currentTemplates.length === 0,
        });

        const newObj = created || {
          id: `local-${Date.now()}`,
          category,
          status_key: activeStatusKey,
          title: editTitle.trim(),
          content: editContent.trim(),
          is_default: isDefaultChecked || currentTemplates.length === 0,
        };

        savedId = newObj.id;
        nextTemplates.push(newObj);
      } else {
        await templateService.updateTemplate(selectedTemplateId, {
          title: editTitle.trim(),
          content: editContent.trim(),
          is_default: isDefaultChecked,
        });

        nextTemplates = nextTemplates.map((t) =>
          t.id === selectedTemplateId
            ? { ...t, title: editTitle.trim(), content: editContent.trim(), is_default: isDefaultChecked }
            : t
        );
      }

      // Jika ditandai default, perbarui varian lain di kategori & status_key ini
      if (isDefaultChecked) {
        await templateService.setDefaultTemplate(category, activeStatusKey, savedId);
        nextTemplates = nextTemplates.map((t) => {
          if (t.category === category && t.status_key === activeStatusKey) {
            return { ...t, is_default: t.id === savedId };
          }
          return t;
        });
      }

      onTemplatesChange?.(nextTemplates);
      setSelectedTemplateId(savedId);

      onShowToast?.({
        icon: "check_circle",
        title: "Template Pesan Disimpan",
        subtitle: `Tersimpan di Cloud Database Supabase`,
      });
    } catch (err) {
      onShowToast?.({
        icon: "error",
        title: "Gagal Menyimpan",
        subtitle: err?.message || "Periksa koneksi Supabase",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id, e) {
    e?.stopPropagation();
    if (!window.confirm("Hapus template pesan ini?")) return;

    try {
      await templateService.deleteTemplate(id);
      const filtered = templates.filter((t) => t.id !== id);
      onTemplatesChange?.(filtered);
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
      }
      onShowToast?.({
        icon: "delete",
        title: "Template Dihapus",
        subtitle: "Dihapus dari Supabase",
      });
    } catch {
      onShowToast?.({
        icon: "error",
        title: "Gagal Menghapus",
        subtitle: "Terjadi kendala jaringan",
      });
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Header Dialog */}
        <div className="px-6 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center border border-sky-100 shadow-xs">
              <MaterialIcon name="chat" className="text-[22px]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Pengaturan Template Pesan WhatsApp
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {category === "registrasi" ? "Kategori: Registrasi Santri" : "Kategori: Monitoring Santri"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* 2. Segmented Status Tabs */}
        <div className="px-6 pt-3.5 pb-2.5 bg-slate-50/60 border-b border-slate-100">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/60 border border-slate-200 gap-1 flex-wrap">
            {statusTabs.map((tab) => {
              const isActive = activeStatusKey === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveStatusKey(tab.key);
                    setSelectedTemplateId(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#0284c7] shadow-xs border border-slate-200/80 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Konten Utama: 3 Bagian (Varian List - Form Editor Terbuka - Pratinjau WA & Tombol Simpan) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Bagian 1: Daftar Varian Template (3 cols) */}
          <div className="lg:col-span-3 p-4 overflow-y-auto space-y-2.5 bg-slate-50/40">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Varian Template
              </span>
              <button
                type="button"
                onClick={handleAddNew}
                className="text-xs font-semibold text-[#0284c7] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MaterialIcon name="add" className="text-[16px]" />
                Tambah Baru
              </button>
            </div>

            {currentTemplates.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                Belum ada template untuk status ini.
              </div>
            ) : (
              currentTemplates.map((template) => {
                const isSelected = activeTemplate?.id === template.id && selectedTemplateId !== "new";
                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-white border-[#0284c7] shadow-sm ring-1.5 ring-[#0284c7]/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {template.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {template.content}
                        </p>
                      </div>

                      {template.is_default && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0284c7] border border-sky-200 shrink-0">
                          Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px]">
                      {!template.is_default ? (
                        <button
                          type="button"
                          onClick={(e) => handleSetDefaultQuick(template, e)}
                          className="text-[#0284c7] hover:underline font-semibold cursor-pointer"
                        >
                          Jadikan Default
                        </button>
                      ) : (
                        <span className="text-[#0284c7] font-semibold flex items-center gap-0.5">
                          <MaterialIcon name="check" className="text-[13px]" /> Dipakai 1-Klik
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Hapus"
                      >
                        <MaterialIcon name="delete_outline" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bagian 2: Form Editor Langsung Terbuka (5 cols) */}
          <div className="lg:col-span-5 p-5 overflow-y-auto space-y-3.5 bg-white flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MaterialIcon name="edit_note" className="text-[18px] text-[#0284c7]" />
                  {selectedTemplateId === "new" ? "Buat Template Baru" : "Edit Teks Pesan"}
                </span>
                {selectedTemplateId === "new" && (
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(activeTemplate?.id || null)}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>

              {/* Input Judul Template */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Template
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Pengingat Formal"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-white text-slate-900"
                />
              </div>

              {/* Sisipkan Variabel Sistem */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Sisipkan Variabel Sistem
                  </label>
                  <span className="text-[10px] text-slate-400">Klik untuk menyisipkan</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {availableVariables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 rounded-md text-[11px] font-mono bg-white hover:bg-sky-50 text-[#0284c7] border border-slate-200 hover:border-sky-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      title={v.label}
                    >
                      <span className="text-sky-500 font-bold">+</span>
                      <span>{`{${v.key}}`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Pesan WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Pesan WhatsApp
                </label>
                <textarea
                  rows={9}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Ketik format pesan WhatsApp di sini..."
                  className="w-full text-xs font-sans px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-white text-slate-900 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung format WhatsApp: <code>*tebal*</code>, <code>_miring_</code>, <code>~coret~</code>, dan <code>&gt; kutipan</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Bagian 3: Pratinjau WhatsApp + Tombol Simpan Setelahnya (4 cols) */}
          <div className="lg:col-span-4 p-4 overflow-y-auto bg-slate-100/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MaterialIcon name="smartphone" className="text-[18px] text-[#0284c7]" />
                  Pratinjau Pesan WA
                </span>
                <span className="text-[10px] font-semibold text-[#0284c7] bg-sky-100/80 px-2 py-0.5 rounded-full">
                  Live Preview
                </span>
              </div>

              {/* WhatsApp Phone Mockup Card */}
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-300/80 bg-white">
                {/* Header WA Biru Sistem */}
                <div className="bg-[#0284c7] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MaterialIcon name="arrow_back" className="text-[18px] text-white/90 shrink-0 cursor-pointer" />
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white border border-white/30 shrink-0">
                      AF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">
                        Ahmad Fauzi
                      </p>
                      <p className="text-[10px] text-sky-100 flex items-center gap-1 font-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-200"></span> online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/85 shrink-0 ml-1">
                    <MaterialIcon name="videocam" className="text-[18px]" />
                    <MaterialIcon name="call" className="text-[16px]" />
                    <MaterialIcon name="more_vert" className="text-[18px]" />
                  </div>
                </div>

                {/* Wallpaper Chat WhatsApp */}
                <div
                  className="p-3.5 overflow-y-auto space-y-2.5 min-h-[290px] max-h-[340px] flex flex-col justify-between"
                  style={{
                    backgroundColor: "#f0f4f8",
                    backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
                    backgroundSize: "16px 16px",
                  }}
                >
                  {/* Date Badge */}
                  <div className="text-center my-0.5">
                    <span className="bg-white/95 text-slate-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-2xs uppercase tracking-wider">
                      Hari Ini
                    </span>
                  </div>

                  {/* Speech Bubble WhatsApp */}
                  <div className="flex justify-end my-1">
                    <div className="relative bg-white text-slate-900 rounded-lg rounded-tr-none px-3.5 py-2.5 shadow-xs max-w-[94%] border border-sky-100">
                      {/* Ekor Bubble */}
                      <div
                        className="absolute -top-[1px] -right-[6px] w-0 h-0"
                        style={{
                          borderTop: "7px solid #ffffff",
                          borderRight: "7px solid transparent",
                        }}
                      />

                      {/* Teks Pesan Terinterpolasi & Terformat */}
                      <div
                        className="text-[11.5px] whitespace-pre-wrap leading-relaxed break-words font-sans"
                        dangerouslySetInnerHTML={{
                          __html: formatWhatsAppText(livePreviewContent || "Pesan belum diisi..."),
                        }}
                      />

                      {/* Waktu & Centang Biru Ganda */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1 select-none">
                        <span>10:45</span>
                        <span className="text-[#0284c7] font-bold text-[12px] leading-none tracking-tighter">
                          ✓✓
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bar Input WhatsApp Bawah (Mock) */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-2xs border border-slate-200/70 text-slate-400">
                      <MaterialIcon name="sentiment_satisfied" className="text-[16px] text-slate-400" />
                      <span className="text-[11px] text-slate-400 truncate">Ketik pesan</span>
                      <div className="ml-auto flex items-center gap-1 text-slate-400">
                        <MaterialIcon name="attach_file" className="text-[16px]" />
                        <MaterialIcon name="photo_camera" className="text-[16px]" />
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow-xs shrink-0">
                      <MaterialIcon name="mic" className="text-[16px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Simpan Diletakkan Setelah Pratinjau WA */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={isDefaultChecked}
                  onChange={(e) => setIsDefaultChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0284c7] focus:ring-[#0284c7] cursor-pointer accent-[#0284c7]"
                />
                <span className="font-semibold text-xs text-slate-800">
                  Jadikan Template Default (Dipakai 1-Klik Kirim WA)
                </span>
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTemplate}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-md shadow-sky-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <MaterialIcon name="save" className="text-[18px]" />
                <span>{saving ? "Menyimpan ke Supabase..." : "Simpan Template"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Footer Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Tersinkronisasi otomatis dengan Cloud Database Supabase</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
