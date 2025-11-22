/* adapters/csv.adapter.js
   CSV adapter: load CSV file and run queries against in-memory table
   Exposes: init(), loadFile(file), runQuery(query)
*/

window.Adapters = window.Adapters || {};
window.Adapters.CSVAdapter = (function () {

  let data = [];     // array of objects {col1: val1, col2: val2, ...}
  let columns = [];  // column names

  function init() {
    // no special init for CSV
    return Promise.resolve(true);
  }

  function parseCSV(text) {
    // Basic CSV parsing (handles quoted cells crudely)
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { columns: [], data: [] };

    const hdr = splitCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const parts = splitCSVLine(line);
      const obj = {};
      hdr.forEach((h, i) => {
        obj[h] = parts[i] !== undefined ? parts[i] : "";
      });
      return obj;
    });

    return { columns: hdr, data: rows };
  }

  function splitCSVLine(line) {
    // naive CSV split that handles quoted commas
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur);
        cur = "";
      } else cur += ch;
    }
    result.push(cur);
    return result.map(s => s.trim());
  }

  function loadTextCSV(text) {
    const parsed = parseCSV(text);
    columns = parsed.columns;
    data = parsed.data;
    return { columns, rowCount: data.length };
  }

  function loadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const info = loadTextCSV(e.target.result);
          resolve(info);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  function detectNumericColumns() {
    const numeric = [];
    if (!data || data.length === 0) return numeric;
    columns.forEach(col => {
      const values = data.map(r => r[col]);
      const numericCount = values.reduce((acc, v) => acc + (isFinite(Number(v.replace(/,/g,''))) ? 1 : 0), 0);
      if (numericCount > 0) numeric.push(col);
    });
    return numeric;
  }

  function runTopN(queryText) {
    const q = queryText.toLowerCase();
    const parsed = window.ParserHelper.analyzeQuery(q);
    const measureCandidate = parsed.measure; // e.g., 'sales'
    const topN = parsed.topN || 5;

    // Attempt to find measure column by matching keywords
    // Strategy: find numeric columns and choose one that matches keyword, else choose first numeric
    const numericCols = detectNumericColumns();
    let measureCol = numericCols.find(c => c.toLowerCase().includes(measureCandidate.toLowerCase()));
    if (!measureCol && numericCols.length > 0) measureCol = numericCols[0];

    // Find a dimension column (first non-numeric)
    const dimensionCol = columns.find(c => c !== measureCol) || columns[0];

    if (!measureCol) {
      return { reply: "⚠️ No numeric measure detected in CSV." };
    }

    // Build rows with label and numeric value
    const rows = data.map(r => {
      const raw = r[measureCol] || "";
      const val = Number(String(raw).replace(/,/g, '')) || 0;
      return { label: r[dimensionCol] || "(blank)", value: val };
    });

    const topRows = rows.sort((a,b)=> b.value - a.value).slice(0, topN);
    if (topRows.length === 0) return { reply: "⚠️ No data available." };

    let reply = `📊 Top ${topN} by ${measureCol}:\n`;
    topRows.forEach((r,i)=> reply += `${i+1}. ${r.label}: ${r.value}\n`);

    return {
      reply,
      labels: topRows.map(r=> r.label),
      values: topRows.map(r=> r.value),
      measure: measureCol
    };
  }

  async function runQuery(queryText) {
    const q = queryText.toLowerCase();
    if (!data || data.length === 0) return { reply: "⚠️ No CSV loaded. Use the CSV upload control." };
    if (q.includes("top")) {
      return runTopN(q);
    }
    // fallback
    return { reply: "CSV adapter supports Top-N queries. Try: 'Top 5 sales'." };
  }

  return {
    init,
    loadFile,
    runQuery,
    // small helpers for UI
    getColumns: () => columns.slice(),
    getRowCount: () => data.length
  };

})();
