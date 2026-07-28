const XLSX = require("xlsx");

/**
 * Helper utility to export tabular data to Excel (.xlsx), CSV (.csv), or JSON
 */

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const stringified = String(field).replace(/"/g, '""');
  return `"${stringified}"`;
}

/**
 * Format and send CSV / Excel response
 * @param {Object} res Express response object
 * @param {String} filename Base filename without extension
 * @param {Array<String>} headers Array of column header titles
 * @param {Array<Array>} rows Array of row arrays matching headers
 * @param {String} format Export format ('excel' | 'xls' | 'xlsx' | 'csv' | 'json')
 */
function sendExportResponse(res, filename, headers, rows, format = "excel") {
  const reqFormat = String(format || "excel").toLowerCase().trim();

  // 1. Return JSON preview if explicitly requested
  if (reqFormat === "json") {
    return res.json({
      status: 200,
      message: `Export data ${filename} berhasil`,
      export_metadata: {
        filename: `${filename}.xlsx`,
        total_rows: rows.length,
        total_columns: headers.length,
      },
      columns: headers,
      rows: rows.map((row) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] !== undefined ? row[idx] : null;
        });
        return obj;
      }),
    });
  }

  // 2. Native OpenXML Spreadsheet (.xlsx) using SheetJS XLSX
  if (reqFormat === "excel" || reqFormat === "xls" || reqFormat === "xlsx") {
    const sheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column width automatically
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => (r[i] ? String(r[i]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Katalog Data");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}_${Date.now()}.xlsx"`
    );
    return res.send(excelBuffer);
  }

  // 3. Generate UTF-8 BOM CSV Format (.csv)
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
  const csvContent = "\uFEFF" + headerLine + "\n" + dataLines;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}_${Date.now()}.csv"`
  );
  return res.send(Buffer.from(csvContent, "utf-8"));
}

module.exports = {
  sendExportResponse,
};

module.exports = {
  sendExportResponse,
};
