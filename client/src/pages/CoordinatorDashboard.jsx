import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { reportApi } from "../utils/supabaseApi";
import ReportCard from "../components/ReportCard";
import {
  FiPlus,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUpload,
} from "react-icons/fi";
import "./Dashboard.css";

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    eventDate: "",
    document: null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!uploadForm.document) return alert("Please select a file");
    setUploading(true);
    try {
      await reportApi.uploadReportDocument(
        {
          title: uploadForm.title,
          eventDate: uploadForm.eventDate,
          document: uploadForm.document,
        },
        user,
      );
      fetchReports();
      setShowUploadModal(false);
      setUploadForm({ title: "", eventDate: "", document: null });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to upload report");
    } finally {
      setUploading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await reportApi.listReports(user);
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const stats = {
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft").length,
    pending: reports.filter((r) => r.status === "pending").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Reports</h1>
          <p className="page-subtitle">Welcome back, {user?.fullName}</p>
        </div>
        <div
          style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setShowUploadModal(true)}
          >
            <FiUpload /> Upload Report
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/report/new")}
            id="create-report-btn"
          >
            <FiPlus /> New Report
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-card" onClick={() => setFilter("all")}>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card" onClick={() => setFilter("draft")}>
          <div className="stat-value" style={{ color: "var(--status-draft)" }}>
            {stats.draft}
          </div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card" onClick={() => setFilter("pending")}>
          <div
            className="stat-value"
            style={{ color: "var(--status-pending)" }}
          >
            {stats.pending}
          </div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card" onClick={() => setFilter("approved")}>
          <div
            className="stat-value"
            style={{ color: "var(--status-approved)" }}
          >
            {stats.approved}
          </div>
          <div className="stat-label">Approved</div>
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {[
          { key: "all", label: "All", icon: <FiFileText /> },
          { key: "draft", label: "Drafts", icon: <FiFileText /> },
          { key: "pending", label: "Pending", icon: <FiClock /> },
          { key: "approved", label: "Approved", icon: <FiCheckCircle /> },
          { key: "rejected", label: "Rejected", icon: <FiXCircle /> },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-title">No reports found</div>
          <div className="empty-state-text">
            {filter === "all"
              ? "Create your first event report by clicking the button above."
              : `No ${filter} reports yet.`}
          </div>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onRefresh={fetchReports}
              userRole="coordinator"
            />
          ))}
        </div>
      )}

      {/* Upload Report Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Upload Existing Report</h3>
            <form
              onSubmit={handleUploadReport}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input
                  className="form-input"
                  placeholder="e.g. Literary Essay Contest"
                  value={uploadForm.title}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Event Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={uploadForm.eventDate}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, eventDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Word Document (.doc, .docx)
                </label>
                <input
                  type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="form-input"
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      document: e.target.files[0],
                    })
                  }
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
