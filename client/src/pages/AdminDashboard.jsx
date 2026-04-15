import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi, reportApi } from "../utils/supabaseApi";
import ReportCard from "../components/ReportCard";
import {
  FiPlus,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUserPlus,
  FiUsers,
  FiShield,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import "./Dashboard.css";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "coordinator",
  });
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    eventDate: "",
    document: null,
  });
  const [uploading, setUploading] = useState(false);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await authApi.deleteUser(userId, user?.id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete user");
    }
  };

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

  useEffect(() => {
    fetchReports();
    fetchUsers();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const data = await authApi.listUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");
    try {
      await authApi.register(registerForm);
      setRegisterSuccess(
        `${registerForm.role === "admin" ? "Admin" : "Coordinator"} "${registerForm.fullName}" created!`,
      );
      setRegisterForm({
        username: "",
        password: "",
        fullName: "",
        role: "coordinator",
      });
      fetchUsers();
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess("");
      }, 1500);
    } catch (err) {
      setRegisterError(err.response?.data?.error || "Failed to create user");
    }
  };

  const filteredReports =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };

  const admins = users.filter((u) => u.role === "admin");
  const coordinators = users.filter((u) => u.role === "coordinator");

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage all club reports</p>
        </div>
        <div
          style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setShowUsersPanel(!showUsersPanel)}
            id="toggle-users-btn"
          >
            <FiUsers /> Users ({users.length})
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowRegisterModal(true)}
            id="add-user-btn"
          >
            <FiUserPlus /> Add User
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowUploadModal(true)}
          >
            <FiUpload /> Upload Report
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/report/new")}
            id="admin-create-report-btn"
          >
            <FiPlus /> New Report
          </button>
        </div>
      </div>

      {/* Users Panel */}
      {showUsersPanel && (
        <div
          className="users-panel card animate-fade-in"
          style={{ marginBottom: "var(--space-lg)" }}
        >
          <div className="users-panel-grid">
            <div>
              <h4
                style={{
                  color: "var(--primary-dark)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FiShield /> Admins ({admins.length})
              </h4>
              {admins.length === 0 ? (
                <p className="empty-hint">No admins</p>
              ) : (
                <ul className="user-list">
                  {admins.map((u) => (
                    <li
                      key={u.id}
                      className="user-list-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span className="user-list-name">{u.fullName}</span>
                        <span className="user-list-username">
                          @{u.username}
                        </span>
                      </div>
                      {u.id !== user.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{
                            color: "var(--status-rejected)",
                            padding: 4,
                          }}
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete Admin"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4
                style={{
                  color: "var(--primary-dark)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FiUsers /> Coordinators ({coordinators.length})
              </h4>
              {coordinators.length === 0 ? (
                <p className="empty-hint">No coordinators yet</p>
              ) : (
                <ul className="user-list">
                  {coordinators.map((u) => (
                    <li
                      key={u.id}
                      className="user-list-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span className="user-list-name">{u.fullName}</span>
                        <span className="user-list-username">
                          @{u.username}
                        </span>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--status-rejected)", padding: 4 }}
                        onClick={() => handleDeleteUser(u.id)}
                        title="Delete Coordinator"
                      >
                        <FiTrash2 />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="stats-bar">
        {[
          { key: "all", label: "Total Reports", value: stats.total },
          {
            key: "pending",
            label: "Pending Review",
            value: stats.pending,
            color: "var(--status-pending)",
          },
          {
            key: "approved",
            label: "Approved",
            value: stats.approved,
            color: "var(--status-approved)",
          },
          {
            key: "rejected",
            label: "Rejected",
            value: stats.rejected,
            color: "var(--status-rejected)",
          },
        ].map((s) => (
          <div
            className="stat-card"
            key={s.key}
            onClick={() => setFilter(s.key)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="stat-value"
              style={s.color ? { color: s.color } : {}}
            >
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {["all", "pending", "approved", "rejected", "draft"].map((key) => (
          <button
            key={key}
            className={`filter-tab ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {key === "all"
              ? "All Reports"
              : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No reports found</div>
          <div className="empty-state-text">
            {filter === "all"
              ? "No reports created yet."
              : `No ${filter} reports.`}
          </div>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onRefresh={fetchReports}
              userRole="admin"
            />
          ))}
        </div>
      )}

      {/* Register User Modal */}
      {showRegisterModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Add New User</h3>
            <form
              onSubmit={handleRegister}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {registerError && (
                <div className="login-error">{registerError}</div>
              )}
              {registerSuccess && (
                <div
                  style={{
                    background: "#F0FFF4",
                    border: "1px solid #C6F6D5",
                    color: "#276749",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    textAlign: "center",
                  }}
                >
                  {registerSuccess}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={registerForm.fullName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      fullName: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  placeholder="e.g. priya.sharma"
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      username: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Set a strong password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="login-role-tabs" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`login-role-tab ${registerForm.role === "coordinator" ? "active" : ""}`}
                    onClick={() =>
                      setRegisterForm({ ...registerForm, role: "coordinator" })
                    }
                  >
                    <FiUsers /> Coordinator
                  </button>
                  <button
                    type="button"
                    className={`login-role-tab ${registerForm.role === "admin" ? "active" : ""}`}
                    onClick={() =>
                      setRegisterForm({ ...registerForm, role: "admin" })
                    }
                  >
                    <FiShield /> Admin
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create{" "}
                  {registerForm.role === "admin" ? "Admin" : "Coordinator"}
                </button>
              </div>
            </form>
          </div>
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
