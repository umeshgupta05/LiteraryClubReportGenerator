import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exportReportAsDocx,
  exportReportAsPdf,
  reportApi,
  resolveAssetUrl,
} from "../utils/supabaseApi";
import {
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiSend,
  FiDownload,
  FiEye,
  FiCalendar,
} from "react-icons/fi";
import "./ReportCard.css";

export default function ReportCard({ report, onRefresh, userRole }) {
  const navigate = useNavigate();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const statusConfig = {
    draft: { label: "Draft", class: "badge-draft" },
    pending: { label: "Pending Review", class: "badge-pending" },
    approved: { label: "Approved", class: "badge-approved" },
    rejected: { label: "Rejected", class: "badge-rejected" },
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      switch (action) {
        case "submit":
          await reportApi.submitReport(report.id);
          break;
        case "approve":
          await reportApi.approveReport(report.id);
          break;
        case "reject":
          await reportApi.rejectReport(report.id, rejectionNote);
          setShowRejectModal(false);
          setRejectionNote("");
          break;
        case "delete":
          if (window.confirm("Are you sure you want to delete this report?")) {
            await reportApi.deleteReport(report.id);
          }
          break;
      }
      onRefresh();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(err.response?.data?.error || `Failed to ${action} report`);
    } finally {
      setActionLoading("");
    }
  };

  const handleExport = async (format) => {
    try {
      const baseName = `${report.title.replace(/[^a-zA-Z0-9]/g, "_")}_Report`;
      if (format === "docx") {
        await exportReportAsDocx(report, baseName);
      } else {
        await exportReportAsPdf(report, baseName);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const canEdit =
    (userRole === "admin" || ["draft", "rejected"].includes(report.status)) &&
    !report.uploadedWordFile;
  const canSubmit =
    userRole !== "admin" && ["draft", "rejected"].includes(report.status);

  return (
    <>
      <div className="report-card card animate-scale-in">
        <div className="report-card-header">
          {report.posterImage && (
            <img
              src={resolveAssetUrl(report.posterImage)}
              alt=""
              className="report-card-poster"
            />
          )}
          <div className="report-card-overlay">
            <span className={`badge ${statusConfig[report.status]?.class}`}>
              {statusConfig[report.status]?.label}
            </span>
          </div>
        </div>

        <div className="report-card-body">
          <h3 className="report-card-title">{report.title}</h3>
          <div className="report-card-meta">
            <span className="report-card-date">
              <FiCalendar />
              {new Date(report.eventDate).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {userRole === "admin" && report.creatorName && (
              <span className="report-card-creator">
                by {report.creatorName}
              </span>
            )}
          </div>
          {report.description && (
            <p className="report-card-desc">
              {report.description.substring(0, 100)}
              {report.description.length > 100 ? "..." : ""}
            </p>
          )}
          {report.status === "rejected" && report.rejectionNote && (
            <div className="report-card-rejection">
              <strong>Rejection note:</strong> {report.rejectionNote}
            </div>
          )}
        </div>

        <div className="report-card-actions">
          {canEdit && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate(`/report/${report.id}/edit`)}
            >
              <FiEdit2 /> Edit
            </button>
          )}
          {canSubmit && (
            <button
              className="btn btn-accent btn-sm"
              onClick={() => handleAction("submit")}
              disabled={actionLoading === "submit"}
            >
              <FiSend /> Submit
            </button>
          )}
          {userRole === "admin" && report.status === "pending" && (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAction("approve")}
                disabled={actionLoading === "approve"}
              >
                <FiCheck /> Approve
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setShowRejectModal(true)}
              >
                <FiX /> Reject
              </button>
            </>
          )}
          {report.status === "approved" && !report.uploadedWordFile && (
            <div className="export-buttons">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport("pdf")}
              >
                <FiDownload /> PDF
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport("docx")}
              >
                <FiDownload /> DOCX
              </button>
            </div>
          )}
          {report.uploadedWordFile && (
            <a
              className="btn btn-outline btn-sm"
              href={resolveAssetUrl(report.uploadedWordFile)}
              download
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <FiDownload /> Word File
            </a>
          )}
          {userRole === "admin" && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleAction("delete")}
              disabled={actionLoading === "delete"}
              style={{ color: "var(--status-rejected)" }}
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Reject Report</h3>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "16px",
                fontSize: "0.9rem",
              }}
            >
              Please provide a reason for rejecting{" "}
              <strong>"{report.title}"</strong>
            </p>
            <div className="form-group">
              <textarea
                className="form-textarea"
                placeholder="Enter rejection reason..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction("reject")}
                disabled={!rejectionNote.trim()}
              >
                Reject Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
