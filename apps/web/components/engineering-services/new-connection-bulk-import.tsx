"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { newConnectionApiBase } from "@/lib/engineering-services/new-connection-management";

const requiredHeaders = [
  "reference",
  "customerName",
  "region",
  "locality",
  "constituency",
  "keyStakeholder",
  "applicationDate",
  "status",
  "connectionClass",
  "config",
  "connectionType",
];

const optionalHeaders = [
  "priority",
  "quotationRef",
  "customerType",
  "phoneNumber",
  "emailAddress",
  "plotErf",
  "receivedDate",
  "investigationDate",
  "quoteIssuedDate",
  "fullPaymentDate",
  "assignedDate",
  "connectionDate",
  "assignedTo",
  "nextAction",
  "projectValue",
  "capitalContribution",
  "mvLength",
  "mvConductor",
  "lvLength",
  "transformerRating",
  "voltageRating",
  "serviceConnection",
  "jobCardNumber",
  "coordinates",
  "meterNumber",
  "sealNumber",
  "comment",
];

const templateHeaders = [...requiredHeaders, ...optionalHeaders];

interface ImportSummary {
  total: number;
  created: number;
  skipped: number;
  failed: number;
}

interface ImportRowError {
  index: number;
  reference?: string;
  message: string;
}

interface ImportResponse {
  message?: string;
  summary?: ImportSummary;
  errors?: ImportRowError[];
  error?: string;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      current.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  const nonEmpty = rows.filter((row) => row.some((value) => value.trim() !== ""));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((header) => header.trim());
  return nonEmpty.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

export function NewConnectionBulkImport() {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const sampleRow = templateHeaders.map((header) => {
      switch (header) {
        case "reference":
          return "NCM-2026-0190";
        case "customerName":
          return "Sample Customer";
        case "region":
          return "Oshana";
        case "locality":
          return "Oshakati West";
        case "constituency":
          return "Oshakati West";
        case "keyStakeholder":
          return "Oshana RC";
        case "applicationDate":
          return "2026-05-01";
        case "status":
          return "Received";
        case "connectionClass":
          return "LV";
        case "config":
          return "ABC";
        case "connectionType":
          return "Single Phase";
        case "priority":
          return "Normal";
        default:
          return "";
      }
    });

    const csv = `${templateHeaders.join(",")}\n${sampleRow.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "new-connection-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  }

  async function runImport() {
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      setError("No data rows found. Include a header row and at least one record.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${newConnectionApiBase}/connections/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        setError(payload.error || "Failed to import records.");
        return;
      }

      setResult(payload);
    } catch (importError) {
      console.error("[new-connection-import] failed:", importError);
      setError("Failed to import records.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="rounded-2xl border border-red-100 bg-white open:bg-red-50/20">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Bulk import connections</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload or paste a CSV to create multiple connection applications at once.
            </p>
          </div>
          <Upload className="h-4 w-4 text-red-600" />
        </div>
      </summary>

      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="border-red-200 bg-white hover:bg-red-50"
          >
            <Download className="h-4 w-4" />
            Download template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-red-200 bg-white hover:bg-red-50"
          >
            <Upload className="h-4 w-4" />
            Choose CSV file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Required columns: {requiredHeaders.join(", ")}.
        </p>

        <Textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          placeholder="Paste CSV content here, or choose a file above."
          className="min-h-40 border-red-100 bg-white font-mono text-xs"
        />

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void runImport()}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import records"}
          </Button>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {result?.summary ? (
          <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{result.message}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Total: {result.summary.total}</span>
              <span className="text-green-700">Created: {result.summary.created}</span>
              <span className="text-amber-700">Skipped: {result.summary.skipped}</span>
              <span className="text-red-700">Failed: {result.summary.failed}</span>
            </div>
            {result.errors && result.errors.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Row errors</p>
                <ul className="space-y-1 text-xs text-red-700">
                  {result.errors.slice(0, 20).map((rowError) => (
                    <li key={`${rowError.index}-${rowError.reference ?? ""}`}>
                      Row {rowError.index + 2}
                      {rowError.reference ? ` (${rowError.reference})` : ""}: {rowError.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
