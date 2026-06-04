import type { ReportColumn, ReportTableSection } from "@/lib/engineering-services/new-connection-reporting";

function getAlignmentClassName(alignment: ReportColumn["align"]) {
  switch (alignment) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

function getToneClassName(tone: ReportColumn["tone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-50";
    case "warning":
      return "bg-amber-50";
    case "danger":
      return "bg-red-50";
    case "info":
      return "bg-sky-50";
    default:
      return "";
  }
}

export function EngineeringReportTable({
  section,
  compact = false,
}: {
  section: ReportTableSection;
  compact?: boolean;
}) {
  const cellPaddingClassName = compact ? "py-2.5" : "py-3";

  return (
    <div className="space-y-3">
      {section.tableLabel ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-700">{section.tableLabel}</p>
          {section.summary ? (
            <p className="text-sm text-muted-foreground">{section.summary}</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-red-50/70 text-left text-xs uppercase tracking-wide text-red-700">
              {section.columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-red-100 px-4 py-3 font-semibold ${getAlignmentClassName(column.align)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={section.columns.length}
                  className="px-4 py-5 text-sm text-muted-foreground"
                >
                  No live records are currently available for this section.
                </td>
              </tr>
            ) : null}

            {section.rows.map((row, rowIndex) => {
              const isLastRow = rowIndex === section.rows.length - 1;
              const highlightRow = section.highlightLastRow && isLastRow;

              return (
                <tr
                  key={`${section.key}-${rowIndex}`}
                  className={highlightRow ? "bg-red-50/50 font-semibold" : "odd:bg-white even:bg-slate-50/40"}
                >
                  {section.columns.map((column) => (
                    <td
                      key={`${section.key}-${rowIndex}-${column.key}`}
                      className={`border-b border-red-50 px-4 ${cellPaddingClassName} align-top text-slate-700 ${getAlignmentClassName(
                        column.align,
                      )} ${highlightRow ? "" : getToneClassName(column.tone)}`}
                    >
                      {String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {section.note ? <p className="text-sm text-muted-foreground">{section.note}</p> : null}
    </div>
  );
}
