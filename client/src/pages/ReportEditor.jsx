import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  exportReportAsDocx,
  exportReportAsPdf,
  headerApi,
  reportApi,
  resolveAssetUrl,
} from "../utils/supabaseApi";
import WinnersTable from "../components/WinnersTable";
import ImageUploader from "../components/ImageUploader";
import DocumentPreview from "../components/DocumentPreview";
import {
  FiSave,
  FiSend,
  FiDownload,
  FiArrowLeft,
  FiEye,
  FiEdit3,
  FiShare2,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiCopy,
  FiX,
} from "react-icons/fi";
import "./ReportEditor.css";

const emptyWinnerGroup = () => ({
  id: Date.now(),
  title: "Winners",
  description: "",
  entries: [],
});
const emptySection = () => ({
  id: Date.now(),
  type: "text",
  title: "New Section",
  content: "",
  images: [],
});

export default function ReportEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const isEdit = !!id;
  const shareCode = searchParams.get("share");
  const isSharedMode = !!shareCode && !id;

  const [form, setForm] = useState({
    title: "",
    eventDate: "",
    description: "",
    headerImage: "header-1.png",
    winnerGroups: [],
    customSections: [],
    sectionOrder: [
      "description",
      "poster",
      "registration",
      "winnerGroups",
      "customSections",
      "eventImages",
    ],
  });

  const [circularImage, setCircularImage] = useState(null);
  const [posterImage, setPosterImage] = useState(null);
  const [registrationImages, setRegistrationImages] = useState([]);
  const [eventImages, setEventImages] = useState([]);
  const [existingImages, setExistingImages] = useState({
    circularImage: null,
    posterImage: null,
    registrationImages: [],
    eventImages: [],
  });

  const [headers, setHeaders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit || isSharedMode);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentShareCode, setCurrentShareCode] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reportId, setReportId] = useState(id || null);

  useEffect(() => {
    fetchHeaders();
  }, []);
  useEffect(() => {
    if (isEdit) fetchReport();
    else if (isSharedMode) fetchSharedReport();
  }, [id, shareCode]);

  const fetchHeaders = async () => {
    try {
      const data = await headerApi.listHeaders();
      setHeaders(data);
    } catch (err) {
      console.error("Failed to fetch headers:", err);
    }
  };

  const fetchReport = async () => {
    try {
      const r = await reportApi.getReport(id, auth.user);
      setForm({
        title: r.title,
        eventDate: r.eventDate,
        description: r.description || "",
        headerImage: r.headerImage || "header-1.png",
        winnerGroups: r.winnerGroups || [],
        customSections: r.customSections || [],
        sectionOrder: r.sectionOrder || [
          "description",
          "poster",
          "registration",
          "winnerGroups",
          "customSections",
          "eventImages",
        ],
      });
      setExistingImages({
        circularImage: r.circularImage,
        posterImage: r.posterImage,
        registrationImages: r.registrationImages || [],
        eventImages: r.eventImages || [],
      });
      setCurrentShareCode(r.shareCode || null);
    } catch (err) {
      showToast("Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedReport = async () => {
    try {
      const r = await reportApi.getReportByShareCode(shareCode);
      setForm({
        title: r.title,
        eventDate: r.eventDate,
        description: r.description || "",
        headerImage: r.headerImage || "header-1.png",
        winnerGroups: r.winnerGroups || [],
        customSections: r.customSections || [],
        sectionOrder: r.sectionOrder || [
          "description",
          "poster",
          "registration",
          "winnerGroups",
          "customSections",
          "eventImages",
        ],
      });
      setExistingImages({
        circularImage: r.circularImage,
        posterImage: r.posterImage,
        registrationImages: r.registrationImages || [],
        eventImages: r.eventImages || [],
      });
      setReportId(r.id);
    } catch (err) {
      showToast("Invalid share code", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const uploadPayload = {
    circularImage,
    posterImage,
    registrationImages,
    eventImages,
    existing: {
      circularImage: existingImages.circularImage,
      posterImage: existingImages.posterImage,
      registrationImages: existingImages.registrationImages,
      eventImages: existingImages.eventImages,
    },
  };

  const handleSave = async () => {
    if (!form.title || !form.eventDate) {
      showToast("Title and event date are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (isSharedMode) {
        await reportApi.updateReport(reportId, form, uploadPayload, auth.user, {
          shareCode,
        });
        showToast("Report saved successfully!");
      } else if (isEdit) {
        await reportApi.updateReport(id, form, uploadPayload, auth.user);
        showToast("Report saved successfully!");
      } else {
        const created = await reportApi.createReport(
          form,
          uploadPayload,
          auth.user,
        );
        showToast("Report created successfully!");
        setReportId(created.id);
        navigate(`/report/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save report", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.eventDate) {
      showToast("Title and event date are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      let rid = reportId;
      if (isEdit) {
        await reportApi.updateReport(id, form, uploadPayload, auth.user);
        rid = id;
      } else {
        const created = await reportApi.createReport(
          form,
          uploadPayload,
          auth.user,
        );
        rid = created.id;
      }
      await reportApi.submitReport(rid);
      showToast("Report submitted for review!");
      setTimeout(
        () => navigate(auth.user?.role === "admin" ? "/admin" : "/coordinator"),
        1000,
      );
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (format) => {
    const rid = reportId || id;
    if (!rid) return;
    try {
      const report = isSharedMode
        ? await reportApi.getReportByShareCode(shareCode)
        : await reportApi.getReport(rid, auth.user);
      const fileName = `${form.title.replace(/[^a-zA-Z0-9]/g, "_")}_Report`;
      if (format === "docx") {
        await exportReportAsDocx(report, fileName);
      } else {
        await exportReportAsPdf(report, fileName);
      }
      showToast(`${format.toUpperCase()} downloaded!`);
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  const handleGenerateShareCode = async () => {
    const rid = reportId || id;
    if (!rid) {
      showToast("Save the report first", "error");
      return;
    }
    try {
      const generated = await reportApi.generateShareCode(rid);
      setCurrentShareCode(generated);
      setShowShareModal(true);
    } catch (err) {
      showToast("Failed to generate share code", "error");
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/shared?code=${currentShareCode}`;
    navigator.clipboard
      .writeText(link)
      .then(() => showToast("Share link copied!"));
  };

  const copyShareCode = () => {
    navigator.clipboard
      .writeText(currentShareCode)
      .then(() => showToast("Share code copied!"));
  };

  const handleHeaderUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await headerApi.uploadHeader(file);
      showToast("Header uploaded! It is now available for everyone.");
      fetchHeaders();
      setForm({ ...form, headerImage: uploaded.filename });
    } catch (err) {
      showToast("Failed to upload header", "error");
    }
    e.target.value = "";
  };

  // Winner groups management
  const addWinnerGroup = () =>
    setForm({
      ...form,
      winnerGroups: [...form.winnerGroups, emptyWinnerGroup()],
    });
  const removeWinnerGroup = (idx) =>
    setForm({
      ...form,
      winnerGroups: form.winnerGroups.filter((_, i) => i !== idx),
    });
  const updateWinnerGroup = (idx, field, value) => {
    const g = [...form.winnerGroups];
    g[idx] = { ...g[idx], [field]: value };
    setForm({ ...form, winnerGroups: g });
  };
  const moveWinnerGroup = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= form.winnerGroups.length) return;
    const g = [...form.winnerGroups];
    [g[idx], g[idx + dir]] = [g[idx + dir], g[idx]];
    setForm({ ...form, winnerGroups: g });
  };

  // Custom sections management
  const addCustomSection = (type = "text") =>
    setForm({
      ...form,
      customSections: [...form.customSections, { ...emptySection(), type }],
    });
  const removeCustomSection = (idx) =>
    setForm({
      ...form,
      customSections: form.customSections.filter((_, i) => i !== idx),
    });
  const updateCustomSection = (idx, field, value) => {
    const s = [...form.customSections];
    s[idx] = { ...s[idx], [field]: value };
    setForm({ ...form, customSections: s });
  };
  const moveCustomSection = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= form.customSections.length) return;
    const s = [...form.customSections];
    [s[idx], s[idx + dir]] = [s[idx + dir], s[idx]];
    setForm({ ...form, customSections: s });
  };

  // Main block moves
  const moveSectionBlock = (key, dir) => {
    const idx = form.sectionOrder.indexOf(key);
    if (idx + dir < 0 || idx + dir >= form.sectionOrder.length) return;
    const order = [...form.sectionOrder];
    [order[idx], order[idx + dir]] = [order[idx + dir], order[idx]];
    setForm({ ...form, sectionOrder: order });
  };

  const previewData = {
    ...form,
    circularImageUrl: circularImage
      ? URL.createObjectURL(circularImage)
      : existingImages.circularImage
        ? resolveAssetUrl(existingImages.circularImage)
        : null,
    posterImageUrl: posterImage
      ? URL.createObjectURL(posterImage)
      : existingImages.posterImage
        ? resolveAssetUrl(existingImages.posterImage)
        : null,
    registrationImageUrls: [
      ...existingImages.registrationImages.map((i) => resolveAssetUrl(i)),
      ...registrationImages.map((i) => URL.createObjectURL(i)),
    ],
    eventImageUrls: [
      ...existingImages.eventImages.map((i) => resolveAssetUrl(i)),
      ...eventImages.map((i) => URL.createObjectURL(i)),
    ],
  };

  if (loading)
    return (
      <div className="loading-overlay" style={{ minHeight: "60vh" }}>
        <div className="spinner"></div>
        <p style={{ color: "var(--text-secondary)" }}>Loading report...</p>
      </div>
    );

  return (
    <div className="editor-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type} animate-fade-in`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>
          <h2 className="editor-topbar-title">
            {isSharedMode
              ? "Shared Report"
              : isEdit
                ? "Edit Report"
                : "New Report"}
          </h2>
        </div>
        <div className="editor-topbar-actions">
          <button
            className="btn btn-outline btn-sm desktop-only"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <FiEdit3 /> Editor
              </>
            ) : (
              <>
                <FiEye /> Preview
              </>
            )}
          </button>
          {!isSharedMode && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport("docx")}
              >
                <FiDownload /> DOCX
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport("pdf")}
              >
                <FiDownload /> PDF
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleGenerateShareCode}
              >
                <FiShare2 /> Share Report Code
              </button>
            </>
          )}
          <button
            className="btn btn-outline"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? "Saving..." : "Save Draft"}
          </button>
          {!isSharedMode && (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <FiSend /> {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>

      <div className="editor-layout">
        <div
          className={`editor-form-panel ${showPreview ? "hidden-mobile" : ""}`}
        >
          {/* Header Image Section */}
          <div className="editor-section">
            <h3 className="editor-section-title">Header Image</h3>
            <div className="header-picker">
              {headers.map((h) => (
                <label
                  key={h.filename}
                  className={`header-option ${form.headerImage === h.filename ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="headerImage"
                    value={h.filename}
                    checked={form.headerImage === h.filename}
                    onChange={(e) =>
                      setForm({ ...form, headerImage: e.target.value })
                    }
                  />
                  <img src={h.url} alt={h.label} />
                  <span>{h.label}</span>
                </label>
              ))}
              <label className="header-option upload-header-option">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleHeaderUpload}
                />
                <div className="upload-header-placeholder">
                  <FiUpload />
                  <span>Upload New Header</span>
                </div>
              </label>
            </div>
          </div>

          {/* Event Details */}
          <div className="editor-section">
            <h3 className="editor-section-title">Event Details</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="report-title">
                Event Title *
              </label>
              <input
                id="report-title"
                className="form-input"
                placeholder="e.g. Poetry Slam Competition 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="report-date">
                Event Date *
              </label>
              <input
                id="report-date"
                type="date"
                className="form-input"
                value={form.eventDate}
                onChange={(e) =>
                  setForm({ ...form, eventDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          {form.sectionOrder.map((key, index) => {
            const isFirst = index === 0;
            const isLast = index === form.sectionOrder.length - 1;
            const blockControls = (
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isFirst}
                  onClick={() => moveSectionBlock(key, -1)}
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isLast}
                  onClick={() => moveSectionBlock(key, 1)}
                  title="Move Down"
                >
                  ↓
                </button>
              </div>
            );

            if (key === "description") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Circular / Description</span> {blockControls}
                  </h3>
                  <div className="form-group">
                    <label className="form-label" htmlFor="report-desc">
                      Description
                    </label>
                    <textarea
                      id="report-desc"
                      className="form-textarea"
                      placeholder="Describe the event, its objectives, and any important details..."
                      rows={5}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Circular Image</label>
                    <ImageUploader
                      accept="image/*"
                      id="circular-upload"
                      currentImage={
                        circularImage
                          ? URL.createObjectURL(circularImage)
                          : existingImages.circularImage
                            ? resolveAssetUrl(existingImages.circularImage)
                            : null
                      }
                      onFileSelect={(f) => setCircularImage(f)}
                      onClear={() => {
                        setCircularImage(null);
                        setExistingImages((p) => ({
                          ...p,
                          circularImage: null,
                        }));
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (key === "poster") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Event Poster</span> {blockControls}
                  </h3>
                  <ImageUploader
                    accept="image/*"
                    id="poster-upload"
                    currentImage={
                      posterImage
                        ? URL.createObjectURL(posterImage)
                        : existingImages.posterImage
                          ? resolveAssetUrl(existingImages.posterImage)
                          : null
                    }
                    onFileSelect={(f) => setPosterImage(f)}
                    onClear={() => {
                      setPosterImage(null);
                      setExistingImages((p) => ({ ...p, posterImage: null }));
                    }}
                  />
                </div>
              );
            }

            if (key === "registration") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Registration Sheets</span> {blockControls}
                  </h3>
                  <p className="form-sublabel" style={{ marginBottom: 12 }}>
                    Upload registration sheet images (multiple)
                  </p>
                  {existingImages.registrationImages.length > 0 && (
                    <div className="event-images-existing">
                      {existingImages.registrationImages.map((img, idx) => (
                        <div key={`exreg-${idx}`} className="event-img-thumb">
                          <img
                            src={resolveAssetUrl(img)}
                            alt={`Reg ${idx + 1}`}
                          />
                          <button
                            className="event-img-remove"
                            onClick={() =>
                              setExistingImages((p) => ({
                                ...p,
                                registrationImages: p.registrationImages.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {registrationImages.length > 0 && (
                    <div
                      className="event-images-existing"
                      style={{ marginTop: 8 }}
                    >
                      {registrationImages.map((img, idx) => (
                        <div key={`nreg-${idx}`} className="event-img-thumb">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`New reg ${idx + 1}`}
                          />
                          <button
                            className="event-img-remove"
                            onClick={() =>
                              setRegistrationImages((p) =>
                                p.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="reg-upload"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        setRegistrationImages((p) => [
                          ...p,
                          ...Array.from(e.target.files),
                        ]);
                        e.target.value = "";
                      }}
                    />
                    <label
                      htmlFor="reg-upload"
                      className="upload-drop-zone"
                      style={{ cursor: "pointer" }}
                    >
                      <span className="upload-icon">📋</span>
                      <span className="upload-text">
                        Click to add registration sheets
                      </span>
                      <span className="upload-hint">
                        JPEG, PNG, WebP — up to 10MB each
                      </span>
                    </label>
                  </div>
                </div>
              );
            }

            if (key === "winnerGroups") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span>Winners</span>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={addWinnerGroup}
                      >
                        <FiPlus /> Add Table
                      </button>
                    </div>
                    {blockControls}
                  </h3>
                  {form.winnerGroups.length === 0 && (
                    <p
                      className="form-sublabel"
                      style={{ textAlign: "center", padding: 16 }}
                    >
                      No winner tables added. Click "Add Table" to create one.
                    </p>
                  )}
                  {form.winnerGroups.map((group, idx) => (
                    <div key={group.id || idx} className="winner-group-card">
                      <div className="winner-group-header">
                        <input
                          className="form-input"
                          placeholder="Section title, e.g. Poetry Competition"
                          value={group.title}
                          onChange={(e) =>
                            updateWinnerGroup(idx, "title", e.target.value)
                          }
                        />
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={idx === 0}
                            onClick={() => moveWinnerGroup(idx, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={idx === form.winnerGroups.length - 1}
                            onClick={() => moveWinnerGroup(idx, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--status-rejected)" }}
                            onClick={() => removeWinnerGroup(idx)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <textarea
                          className="form-textarea"
                          placeholder="Description for this winners section (optional)"
                          rows={2}
                          value={group.description || ""}
                          onChange={(e) =>
                            updateWinnerGroup(
                              idx,
                              "description",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <WinnersTable
                        winners={group.entries || []}
                        onChange={(entries) =>
                          updateWinnerGroup(idx, "entries", entries)
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            }

            if (key === "customSections") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <span>Custom Sections</span>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => addCustomSection("text")}
                        style={{ marginLeft: 8 }}
                      >
                        <FiPlus /> Text
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => addCustomSection("image")}
                      >
                        <FiPlus /> Image
                      </button>
                    </div>
                    {blockControls}
                  </h3>
                  {form.customSections.length === 0 && (
                    <p
                      className="form-sublabel"
                      style={{ textAlign: "center", padding: 16 }}
                    >
                      Add custom text or image sections as needed.
                    </p>
                  )}
                  {form.customSections.map((section, idx) => (
                    <div
                      key={section.id || idx}
                      className="custom-section-card"
                    >
                      <div className="winner-group-header">
                        <input
                          className="form-input"
                          placeholder="Section Title"
                          value={section.title}
                          onChange={(e) =>
                            updateCustomSection(idx, "title", e.target.value)
                          }
                        />
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={idx === 0}
                            onClick={() => moveCustomSection(idx, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={idx === form.customSections.length - 1}
                            onClick={() => moveCustomSection(idx, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--status-rejected)" }}
                            onClick={() => removeCustomSection(idx)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                      {(section.type === "text" || section.type === "both") && (
                        <div className="form-group" style={{ marginTop: 8 }}>
                          <textarea
                            className="form-textarea"
                            placeholder="Section content..."
                            rows={3}
                            value={section.content || ""}
                            onChange={(e) =>
                              updateCustomSection(
                                idx,
                                "content",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                      {(section.type === "image" ||
                        section.type === "both") && (
                        <div style={{ marginTop: 8 }}>
                          {section.images && section.images.length > 0 && (
                            <div className="event-images-existing">
                              {section.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="event-img-thumb">
                                  <img
                                    src={resolveAssetUrl(img)}
                                    alt={`Section ${idx} img ${imgIdx}`}
                                  />
                                  <button
                                    className="event-img-remove"
                                    onClick={() => {
                                      const imgs = [...section.images];
                                      imgs.splice(imgIdx, 1);
                                      updateCustomSection(idx, "images", imgs);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="form-sublabel" style={{ marginTop: 8 }}>
                            Images for custom sections are saved as part of
                            event uploads.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            if (key === "eventImages") {
              return (
                <div className="editor-section" key={key}>
                  <h3
                    className="editor-section-title"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Event Images</span> {blockControls}
                  </h3>
                  <p className="form-sublabel" style={{ marginBottom: 12 }}>
                    Upload photos from the event (up to 10)
                  </p>
                  {existingImages.eventImages.length > 0 && (
                    <div className="event-images-existing">
                      {existingImages.eventImages.map((img, idx) => (
                        <div key={`exev-${idx}`} className="event-img-thumb">
                          <img
                            src={resolveAssetUrl(img)}
                            alt={`Event ${idx + 1}`}
                          />
                          <button
                            className="event-img-remove"
                            onClick={() =>
                              setExistingImages((p) => ({
                                ...p,
                                eventImages: p.eventImages.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {eventImages.length > 0 && (
                    <div
                      className="event-images-existing"
                      style={{ marginTop: 8 }}
                    >
                      {eventImages.map((img, idx) => (
                        <div key={`nev-${idx}`} className="event-img-thumb">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`New ${idx + 1}`}
                          />
                          <button
                            className="event-img-remove"
                            onClick={() =>
                              setEventImages((p) =>
                                p.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="event-images-input"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        setEventImages((p) => [
                          ...p,
                          ...Array.from(e.target.files),
                        ]);
                        e.target.value = "";
                      }}
                    />
                    <label
                      htmlFor="event-images-input"
                      className="upload-drop-zone"
                      style={{ cursor: "pointer" }}
                    >
                      <span className="upload-icon">📸</span>
                      <span className="upload-text">
                        Click to add event photos
                      </span>
                      <span className="upload-hint">
                        JPEG, PNG, WebP — up to 10MB each
                      </span>
                    </label>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Preview Panel */}
        <div
          className={`editor-preview-panel ${!showPreview ? "hidden-mobile" : ""}`}
        >
          <div className="preview-sticky">
            <div className="preview-label">
              <FiEye /> Live Preview
            </div>
            <DocumentPreview data={previewData} />
          </div>
        </div>
      </div>

      {/* Share Code Modal */}
      {showShareModal && currentShareCode && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">
              <FiShare2 style={{ marginRight: 8 }} /> Share Report
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 16,
                fontSize: "0.9rem",
              }}
            >
              Share this code or link. Anyone with it can view and edit this
              report.
            </p>
            <div className="share-code-display">
              <span className="share-code-value">{currentShareCode}</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={copyShareCode}
              >
                <FiCopy /> Copy Code
              </button>
            </div>
            <div className="share-link-display">
              <input
                className="form-input"
                readOnly
                value={`${window.location.origin}/shared?code=${currentShareCode}`}
                style={{ fontSize: "0.82rem" }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={copyShareLink}
              >
                <FiCopy /> Copy Link
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowShareModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
