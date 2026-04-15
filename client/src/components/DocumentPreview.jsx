import "./DocumentPreview.css";
import { resolveAssetUrl } from "../utils/supabaseApi";

export default function DocumentPreview({ data }) {
  const {
    title,
    eventDate,
    description,
    headerImage,
    circularImageUrl,
    posterImageUrl,
    registrationImageUrls,
    eventImageUrls,
    winnerGroups,
    customSections,
    sectionOrder,
  } = data;

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const headerSrc = headerImage
    ? headerImage.startsWith("/")
      ? headerImage
      : headerImage.startsWith("header-")
        ? `/${headerImage}`
        : resolveAssetUrl(headerImage)
    : "/header-1.png";

  return (
    <div className="a4-wrapper">
      <div
        className="a4-page"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {/* Header */}
        <img src={headerSrc} alt="Header" className="header-img" />
        <hr className="separator" />

        {/* Title */}
        {title ? (
          <h1
            className="doc-title"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {title}
          </h1>
        ) : (
          <h1
            className="doc-title placeholder-text"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Event Title
          </h1>
        )}

        {/* Date */}
        {formattedDate ? (
          <p className="doc-date">{formattedDate}</p>
        ) : (
          <p className="doc-date placeholder-text">Event Date</p>
        )}

        {sectionOrder &&
          sectionOrder.map((key) => {
            if (key === "description") {
              return (
                (description || circularImageUrl) && (
                  <div key={key}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      Circular / Description
                    </h3>
                    {description && (
                      <p className="section-text">{description}</p>
                    )}
                    {circularImageUrl && (
                      <img
                        src={circularImageUrl}
                        alt="Circular"
                        className="section-image"
                      />
                    )}
                  </div>
                )
              );
            } else if (key === "poster") {
              return (
                posterImageUrl && (
                  <div key={key}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      Event Poster
                    </h3>
                    <img
                      src={posterImageUrl}
                      alt="Poster"
                      className="section-image"
                    />
                  </div>
                )
              );
            } else if (key === "registration") {
              return (
                registrationImageUrls &&
                registrationImageUrls.length > 0 && (
                  <div key={key}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      Registration Sheets
                    </h3>
                    {registrationImageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Registration ${idx + 1}`}
                        className="section-image"
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </div>
                )
              );
            } else if (key === "winnerGroups") {
              return (
                winnerGroups &&
                winnerGroups.map((group, gIdx) => (
                  <div key={`wg-${gIdx}`}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      {group.title || "Winners"}
                    </h3>
                    {group.description && (
                      <p
                        className="section-text"
                        style={{ fontStyle: "italic", marginBottom: 8 }}
                      >
                        {group.description}
                      </p>
                    )}
                    {group.entries && group.entries.length > 0 && (
                      <table className="winners-table">
                        <thead>
                          <tr>
                            <th>Place</th>
                            <th>Name</th>
                            <th>Roll No.</th>
                            <th>Class/Sec</th>
                            <th>Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.entries.map((w, idx) => (
                            <tr key={idx}>
                              <td>{w.place || "-"}</td>
                              <td>{w.name || "-"}</td>
                              <td>{w.rollNumber || "-"}</td>
                              <td>{w.classSec || "-"}</td>
                              <td>{w.phone || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              );
            } else if (key === "customSections") {
              return (
                customSections &&
                customSections.map((section, sIdx) => (
                  <div key={`cs-${sIdx}`}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      {section.title || "Section"}
                    </h3>
                    {section.content && (
                      <p className="section-text">{section.content}</p>
                    )}
                    {section.images && section.images.length > 0 && (
                      <div className="event-images-grid">
                        {section.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={
                              img.startsWith("blob:")
                                ? img
                                : resolveAssetUrl(img)
                            }
                            alt={`Custom ${sIdx + 1} - ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              );
            } else if (key === "eventImages") {
              return (
                eventImageUrls &&
                eventImageUrls.length > 0 && (
                  <div key={key}>
                    <h3
                      className="section-title"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      Event Images
                    </h3>
                    <div className="event-images-grid">
                      {eventImageUrls.map((url, idx) => (
                        <img key={idx} src={url} alt={`Event ${idx + 1}`} />
                      ))}
                    </div>
                  </div>
                )
              );
            }
            return null;
          })}

        {/* Empty state */}
        {!title && !description && !circularImageUrl && !posterImageUrl && (
          <div className="preview-empty">
            <div className="preview-empty-icon">📝</div>
            <p>Start filling in the form to see your report preview here</p>
          </div>
        )}
      </div>
    </div>
  );
}
