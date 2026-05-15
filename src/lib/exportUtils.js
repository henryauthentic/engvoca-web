/**
 * ═══════════════════════════════════════════════════════════
 * EXPORT UTILITIES — CSV export with UTF-8 BOM for Vietnamese
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Escape a value for CSV (RFC 4180)
 */
function formatCSVValue(value) {
  if (value == null) return "";
  const str = String(value);
  // If contains comma, quote, or newline → wrap in quotes and escape inner quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to a CSV string
 * @param {Array} data - Array of row objects
 * @param {Array} columns - [{ key, label }] — key = object property, label = CSV header
 * @returns {string} CSV content
 */
function arrayToCSV(data, columns) {
  const header = columns.map((col) => formatCSVValue(col.label)).join(",");
  const rows = data.map((row) =>
    columns.map((col) => formatCSVValue(row[col.key])).join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Download data as a CSV file with UTF-8 BOM
 * @param {Array} data - Array of row objects
 * @param {Array} columns - [{ key, label }]
 * @param {string} filename - Output filename (without extension)
 */
export function exportToCSV(data, columns, filename = "export") {
  const csv = arrayToCSV(data, columns);

  // Add UTF-8 BOM so Excel opens Vietnamese correctly
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data as a JSON file
 * @param {Array} data - Array of objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportToJSON(data, filename = "export") {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
