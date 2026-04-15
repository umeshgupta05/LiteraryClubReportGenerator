import bcrypt from "bcryptjs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  BorderStyle,
} from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "./supabase";

const DEFAULT_SECTION_ORDER = [
  "description",
  "poster",
  "registration",
  "winnerGroups",
  "customSections",
  "eventImages",
];
const UPLOADS_BUCKET = "uploads";

function makeApiError(message) {
  const error = new Error(message);
  error.response = { data: { error: message } };
  return error;
}

function parseJsonMaybe(value, fallback) {
  if (value == null) return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapReport(report) {
  return {
    ...report,
    winnerGroups: parseJsonMaybe(report.winnerGroups, []),
    customSections: parseJsonMaybe(report.customSections, []),
    registrationImages: parseJsonMaybe(report.registrationImages, []),
    eventImages: parseJsonMaybe(report.eventImages, []),
    sectionOrder: parseJsonMaybe(report.sectionOrder, DEFAULT_SECTION_ORDER),
  };
}

function getFilePublicUrl(path) {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("/")
  ) {
    return path;
  }
  const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function randomId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  );
}

function randomShareCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uploadFile(file, folder = "reports") {
  if (!file) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${folder}/${Date.now()}-${randomId()}-${safeName}`;
  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(fullPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw makeApiError(error.message || "Failed to upload file");
  return fullPath;
}

async function fetchReportById(reportId, user) {
  let query = supabase.from("reports").select("*").eq("id", reportId);
  if (user?.role !== "admin") {
    query = query.eq("createdBy", user?.id);
  }
  const { data, error } = await query.single();
  if (error || !data) throw makeApiError("Report not found");
  return mapReport(data);
}

async function loadStoredUser() {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", parsed.id)
      .single();
    if (error || !data) return null;
    const normalized = normalizeUserRow(data);
    localStorage.setItem("auth_user", JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

async function comparePassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (storedPassword.startsWith("$2")) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  return inputPassword === storedPassword;
}

function normalizeUserRow(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName ?? user.fullname ?? "",
    createdAt: user.createdAt ?? user.createdat ?? null,
  };
}

export const authApi = {
  async login(username, password) {
    if (!username || !password)
      throw makeApiError("Username and password are required");

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) throw makeApiError("Invalid credentials");

    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw makeApiError("Invalid credentials");

    const cleanUser = normalizeUserRow(user);

    localStorage.setItem("auth_user", JSON.stringify(cleanUser));
    return cleanUser;
  },

  async register({ username, password, fullName, role = "coordinator" }) {
    if (!username || !password || !fullName) {
      throw makeApiError("Username, password, and full name are required");
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) throw makeApiError("Username already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const payload = {
      id: randomId(),
      username,
      password: hashedPassword,
      fullname: fullName,
      role: role === "admin" ? "admin" : "coordinator",
    };

    const { data, error } = await supabase
      .from("users")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw makeApiError(error.message || "Failed to create user");
    return normalizeUserRow(data);
  },

  async getCurrentUser() {
    return loadStoredUser();
  },

  logout() {
    localStorage.removeItem("auth_user");
  },

  async listUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("role", { ascending: true })
      .order("fullname", { ascending: true });

    if (error) throw makeApiError(error.message || "Failed to fetch users");
    return (data || []).map(normalizeUserRow);
  },

  async deleteUser(id, currentUserId) {
    if (id === currentUserId)
      throw makeApiError("Cannot delete your own account");
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw makeApiError(error.message || "Failed to delete user");
  },
};

function normalizeReportPayload(form) {
  return {
    title: form.title,
    eventDate: form.eventDate,
    description: form.description || "",
    headerImage: form.headerImage || "header-1.png",
    winnerGroups: JSON.stringify(form.winnerGroups || []),
    customSections: JSON.stringify(form.customSections || []),
    sectionOrder: JSON.stringify(form.sectionOrder || DEFAULT_SECTION_ORDER),
  };
}

async function prepareImages(existing, uploads) {
  const circularImage = uploads.circularImage
    ? await uploadFile(uploads.circularImage, "reports/images")
    : existing.circularImage || null;
  const posterImage = uploads.posterImage
    ? await uploadFile(uploads.posterImage, "reports/images")
    : existing.posterImage || null;

  const registrationImages = [...(existing.registrationImages || [])];
  if (uploads.registrationImages?.length) {
    const uploaded = await Promise.all(
      uploads.registrationImages.map((file) =>
        uploadFile(file, "reports/registration"),
      ),
    );
    registrationImages.push(...uploaded);
  }

  const eventImages = [...(existing.eventImages || [])];
  if (uploads.eventImages?.length) {
    const uploaded = await Promise.all(
      uploads.eventImages.map((file) => uploadFile(file, "reports/events")),
    );
    eventImages.push(...uploaded);
  }

  return {
    circularImage,
    posterImage,
    registrationImages,
    eventImages,
  };
}

export const reportApi = {
  async listReports(user) {
    let query = supabase
      .from("reports")
      .select("*")
      .order("updatedAt", { ascending: false });
    if (user?.role !== "admin") {
      query = query.eq("createdBy", user?.id);
    }

    const { data, error } = await query;
    if (error) throw makeApiError(error.message || "Failed to fetch reports");
    return (data || []).map(mapReport);
  },

  async getReport(id, user) {
    return fetchReportById(id, user);
  },

  async getReportByShareCode(shareCode) {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("shareCode", shareCode)
      .single();
    if (error || !data) throw makeApiError("Invalid share code");
    return mapReport(data);
  },

  async createReport(form, uploads, user) {
    const payload = normalizeReportPayload(form);
    const uploaded = await prepareImages(
      {
        circularImage: null,
        posterImage: null,
        registrationImages: [],
        eventImages: [],
      },
      uploads,
    );

    const insertData = {
      id: randomId(),
      ...payload,
      circularImage: uploaded.circularImage,
      posterImage: uploaded.posterImage,
      registrationImages: JSON.stringify(uploaded.registrationImages),
      eventImages: JSON.stringify(uploaded.eventImages),
      status: "draft",
      createdBy: user?.id || null,
      creatorName: user?.fullName || null,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("reports")
      .insert([insertData])
      .select("*")
      .single();
    if (error) throw makeApiError(error.message || "Failed to create report");
    return mapReport(data);
  },

  async updateReport(id, form, uploads, user, options = {}) {
    const current = options.shareCode
      ? await this.getReportByShareCode(options.shareCode)
      : await fetchReportById(id, user);

    if (!options.shareCode && user?.role !== "admin") {
      if (!["draft", "rejected"].includes(current.status)) {
        throw makeApiError("Can only edit draft or rejected reports");
      }
    }

    const uploaded = await prepareImages(
      {
        circularImage: uploads.existing.circularImage,
        posterImage: uploads.existing.posterImage,
        registrationImages: uploads.existing.registrationImages,
        eventImages: uploads.existing.eventImages,
      },
      uploads,
    );

    const payload = {
      ...normalizeReportPayload(form),
      circularImage: uploaded.circularImage,
      posterImage: uploaded.posterImage,
      registrationImages: JSON.stringify(uploaded.registrationImages),
      eventImages: JSON.stringify(uploaded.eventImages),
      updatedAt: new Date().toISOString(),
    };

    const query = options.shareCode
      ? supabase
          .from("reports")
          .update(payload)
          .eq("shareCode", options.shareCode)
      : supabase.from("reports").update(payload).eq("id", id);

    const { data, error } = await query.select("*").single();
    if (error) throw makeApiError(error.message || "Failed to update report");
    return mapReport(data);
  },

  async uploadReportDocument({ title, eventDate, document }, user) {
    if (!title || !eventDate || !document) {
      throw makeApiError("Title, event date, and document file are required");
    }

    const uploadedWordFile = await uploadFile(document, "reports/documents");
    const payload = {
      id: randomId(),
      title,
      eventDate,
      description: "Report created from uploaded document.",
      headerImage: "header-1.png",
      winnerGroups: "[]",
      customSections: "[]",
      registrationImages: "[]",
      eventImages: "[]",
      sectionOrder: JSON.stringify(DEFAULT_SECTION_ORDER),
      uploadedWordFile,
      status: "draft",
      createdBy: user?.id || null,
      creatorName: user?.fullName || null,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("reports")
      .insert([payload])
      .select("*")
      .single();
    if (error)
      throw makeApiError(error.message || "Failed to upload report document");
    return mapReport(data);
  },

  async submitReport(id) {
    const { data, error } = await supabase
      .from("reports")
      .update({
        status: "pending",
        rejectionNote: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw makeApiError(error.message || "Failed to submit report");
    return mapReport(data);
  },

  async approveReport(id) {
    const { data, error } = await supabase
      .from("reports")
      .update({
        status: "approved",
        rejectionNote: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw makeApiError(error.message || "Failed to approve report");
    return mapReport(data);
  },

  async rejectReport(id, rejectionNote) {
    const { data, error } = await supabase
      .from("reports")
      .update({
        status: "rejected",
        rejectionNote: rejectionNote || "No reason provided",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw makeApiError(error.message || "Failed to reject report");
    return mapReport(data);
  },

  async deleteReport(id) {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) throw makeApiError(error.message || "Failed to delete report");
  },

  async generateShareCode(id) {
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("shareCode")
      .eq("id", id)
      .single();
    if (fetchError)
      throw makeApiError(fetchError.message || "Report not found");
    if (report.shareCode) return report.shareCode;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomShareCode();
      const { error } = await supabase
        .from("reports")
        .update({ shareCode: code })
        .eq("id", id);
      if (!error) return code;
      if (
        !String(error.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        throw makeApiError(error.message || "Failed to generate share code");
      }
    }
    throw makeApiError("Failed to generate unique share code");
  },
};

export const headerApi = {
  async listHeaders() {
    const defaults = [
      { filename: "header-1.png", url: "/header-1.png", label: "Header 1" },
      { filename: "header-2.png", url: "/header-2.png", label: "Header 2" },
    ];

    const { data, error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .list("headers", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) return defaults;

    const uploaded = (data || [])
      .filter((f) => f.name)
      .map((f) => {
        const filename = `headers/${f.name}`;
        return {
          filename,
          url: getFilePublicUrl(filename),
          label: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        };
      });

    return [...defaults, ...uploaded];
  },

  async uploadHeader(file) {
    if (!file) throw makeApiError("No header image uploaded");
    const path = await uploadFile(file, "headers");
    return {
      filename: path,
      url: getFilePublicUrl(path),
      label: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    };
  },
};

export function resolveAssetUrl(path) {
  return getFilePublicUrl(path);
}

async function getArrayBufferFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.arrayBuffer();
}

async function addImageToPdf(doc, url, x, y, w, h) {
  if (!url) return;
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const imageLoaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = url;
    await imageLoaded;

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    doc.addImage(dataUrl, "JPEG", x, y, w, h);
  } catch {
    // Skip images that cannot be loaded.
  }
}

export async function exportReportAsDocx(report, fileName) {
  const mapped = mapReport(report);
  const children = [];

  const headerUrl = mapped.headerImage?.startsWith("/")
    ? mapped.headerImage
    : mapped.headerImage?.startsWith("header-")
      ? `/${mapped.headerImage}`
      : resolveAssetUrl(mapped.headerImage);

  if (headerUrl) {
    const headerBuffer = await getArrayBufferFromUrl(headerUrl);
    if (headerBuffer) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: headerBuffer,
              transformation: { width: 650, height: 100 },
              type: "png",
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 3, color: "1B3A5C" },
          },
          spacing: { after: 200 },
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: mapped.title,
          bold: true,
          size: 36,
          font: "Times New Roman",
          color: "1B3A5C",
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Date: ${new Date(mapped.eventDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`,
          size: 24,
          font: "Times New Roman",
          color: "555555",
        }),
      ],
    }),
  );

  const pushSectionTitle = (text) => {
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 28,
            font: "Times New Roman",
            color: "1B3A5C",
          }),
        ],
      }),
    );
  };

  const addImageFromPath = async (path, width = 500, height = 350) => {
    const src = resolveAssetUrl(path);
    if (!src) return;
    const buffer = await getArrayBufferFromUrl(src);
    if (!buffer) return;
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new ImageRun({ data: buffer, transformation: { width, height } }),
        ],
      }),
    );
  };

  for (const key of mapped.sectionOrder || DEFAULT_SECTION_ORDER) {
    if (key === "description") {
      if (mapped.description) {
        pushSectionTitle("Circular / Description");
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: mapped.description,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
        );
      }
      if (mapped.circularImage) await addImageFromPath(mapped.circularImage);
    }

    if (key === "poster" && mapped.posterImage) {
      pushSectionTitle("Event Poster");
      await addImageFromPath(mapped.posterImage, 450, 600);
    }

    if (key === "registration" && mapped.registrationImages.length) {
      pushSectionTitle("Registration Sheets");
      for (const img of mapped.registrationImages) {
        await addImageFromPath(img, 550, 400);
      }
    }

    if (key === "winnerGroups") {
      for (const group of mapped.winnerGroups) {
        pushSectionTitle(group.title || "Winners");
        if (group.description) {
          children.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: group.description,
                  size: 22,
                  font: "Times New Roman",
                  italics: true,
                }),
              ],
            }),
          );
        }
        if (group.entries?.length) {
          const table = new Table({
            rows: [
              new TableRow({
                children: [
                  "Place",
                  "Name",
                  "Roll Number",
                  "Class/Sec",
                  "Phone",
                ].map(
                  (h) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({
                              text: h,
                              bold: true,
                              size: 20,
                              font: "Times New Roman",
                              color: "FFFFFF",
                            }),
                          ],
                        }),
                      ],
                      shading: { fill: "1B3A5C" },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                ),
              }),
              ...group.entries.map(
                (entry) =>
                  new TableRow({
                    children: [
                      entry.place,
                      entry.name,
                      entry.rollNumber,
                      entry.classSec,
                      entry.phone,
                    ].map(
                      (value) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: value || "",
                                  size: 20,
                                  font: "Times New Roman",
                                }),
                              ],
                            }),
                          ],
                          width: { size: 20, type: WidthType.PERCENTAGE },
                        }),
                    ),
                  }),
              ),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          });
          children.push(table);
        }
      }
    }

    if (key === "customSections") {
      for (const section of mapped.customSections) {
        pushSectionTitle(section.title || "Additional Section");
        if (section.content) {
          children.push(
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: section.content,
                  size: 22,
                  font: "Times New Roman",
                }),
              ],
            }),
          );
        }
        for (const img of section.images || []) {
          await addImageFromPath(img);
        }
      }
    }

    if (key === "eventImages" && mapped.eventImages.length) {
      pushSectionTitle("Event Images");
      for (const img of mapped.eventImages) {
        await addImageFromPath(img);
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportReportAsPdf(report, fileName) {
  const mapped = mapReport(report);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 45;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginX * 2;
  let y = 45;

  const addTitle = (text, size = 20, color = [27, 58, 92]) => {
    doc.setFont("times", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    y += size + 8;
  };

  const ensureSpace = (needed = 40) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  };

  const headerUrl = mapped.headerImage?.startsWith("/")
    ? mapped.headerImage
    : mapped.headerImage?.startsWith("header-")
      ? `/${mapped.headerImage}`
      : resolveAssetUrl(mapped.headerImage);

  if (headerUrl) {
    await addImageToPdf(doc, headerUrl, marginX, y, usableWidth, 80);
    y += 90;
    doc.setDrawColor(27, 58, 92);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;
  }

  addTitle(mapped.title || "Report");
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(85, 85, 85);
  doc.text(
    `Date: ${new Date(mapped.eventDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 24;

  const addSectionHeading = (text) => {
    ensureSpace(30);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(27, 58, 92);
    doc.text(text, marginX, y);
    y += 14;
    doc.setDrawColor(210, 210, 210);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;
  };

  const addParagraph = (text) => {
    if (!text) return;
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(44, 44, 44);
    const lines = doc.splitTextToSize(text, usableWidth);
    ensureSpace(lines.length * 14 + 10);
    doc.text(lines, marginX, y);
    y += lines.length * 14 + 8;
  };

  const addImage = async (path, width = usableWidth * 0.9, height = 220) => {
    const src = resolveAssetUrl(path);
    if (!src) return;
    ensureSpace(height + 20);
    const x = (pageWidth - width) / 2;
    await addImageToPdf(doc, src, x, y, width, height);
    y += height + 12;
  };

  for (const key of mapped.sectionOrder || DEFAULT_SECTION_ORDER) {
    if (key === "description") {
      if (mapped.description || mapped.circularImage) {
        addSectionHeading("Circular / Description");
        addParagraph(mapped.description);
        if (mapped.circularImage) await addImage(mapped.circularImage);
      }
    }

    if (key === "poster" && mapped.posterImage) {
      addSectionHeading("Event Poster");
      await addImage(mapped.posterImage, usableWidth * 0.75, 300);
    }

    if (key === "registration" && mapped.registrationImages.length) {
      addSectionHeading("Registration Sheets");
      for (const img of mapped.registrationImages) {
        await addImage(img);
      }
    }

    if (key === "winnerGroups") {
      for (const group of mapped.winnerGroups) {
        addSectionHeading(group.title || "Winners");
        if (group.description) addParagraph(group.description);
        if (group.entries?.length) {
          ensureSpace(40);
          autoTable(doc, {
            startY: y,
            margin: { left: marginX, right: marginX },
            head: [["Place", "Name", "Roll Number", "Class/Sec", "Phone"]],
            body: group.entries.map((entry) => [
              entry.place || "",
              entry.name || "",
              entry.rollNumber || "",
              entry.classSec || "",
              entry.phone || "",
            ]),
            styles: { font: "times", fontSize: 10, halign: "center" },
            headStyles: { fillColor: [27, 58, 92], textColor: [255, 255, 255] },
          });
          y = doc.lastAutoTable.finalY + 12;
        }
      }
    }

    if (key === "customSections") {
      for (const section of mapped.customSections) {
        addSectionHeading(section.title || "Additional Section");
        addParagraph(section.content || "");
        for (const image of section.images || []) {
          await addImage(image);
        }
      }
    }

    if (key === "eventImages" && mapped.eventImages.length) {
      addSectionHeading("Event Images");
      for (const image of mapped.eventImages) {
        await addImage(image, usableWidth * 0.85, 190);
      }
    }
  }

  doc.save(`${fileName}.pdf`);
}
