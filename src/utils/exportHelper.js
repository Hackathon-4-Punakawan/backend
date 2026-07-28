/**
 * Helper utility to export tabular data to Excel (.xls / .xlsx), CSV (.csv), or JSON
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
 * @param {String} format Export format ('excel' | 'xls' | 'csv' | 'json')
 */
function sendExportResponse(res, filename, headers, rows, format = "csv") {
  const reqFormat = String(format || "excel").toLowerCase().trim();

  // 1. Return JSON preview if explicitly requested via query parameter
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

  // 2. Generate Excel HTML Spreadsheet format (.xls / .xlsx compatible)
  if (reqFormat === "excel" || reqFormat === "xls" || reqFormat === "xlsx") {
    const tableHeader = headers.map((h) => `<th style="background-color: #4F46E5; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 10px; text-align: left;">${h}</th>`).join("");
    const tableRows = rows
      .map((row) => {
        const cells = row.map((cell) => `<td style="border: 1px solid #CBD5E1; padding: 8px;">${cell !== null && cell !== undefined ? cell : "-"}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("\n");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${filename.substring(0, 31)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family: Arial, sans-serif;">
        <h2 style="color: #312E81;">${filename.replace(/_/g, " ")}</h2>
        <p style="color: #64748B;">Tanggal Pengarsipan Export: ${new Date().toLocaleString("id-ID")}</p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>${tableHeader}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}_${Date.now()}.xls"`);
    return res.send(Buffer.from(excelHtml, "utf-8"));
  }

  // 3. Fallback: Generate UTF-8 BOM CSV Format (.csv)
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
  const csvContent = "\uFEFF" + headerLine + "\n" + dataLines;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}_${Date.now()}.csv"`);
  return res.send(Buffer.from(csvContent, "utf-8"));
}

module.exports = {
  sendExportResponse,
};
