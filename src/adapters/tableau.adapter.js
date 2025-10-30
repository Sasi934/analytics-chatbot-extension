/* adapters/tableau.adapter.js
   Tableau adapter exposing init() and runQuery(query)
   Returns objects: { reply, labels, values, measure }
*/

window.Adapters = window.Adapters || {};
window.Adapters.TableauAdapter = (function () {
  let dashboard = null;

  async function init() {
    try {
      if (!window.tableau?.extensions) return false;
      await tableau.extensions.initializeAsync();
      dashboard = tableau.extensions.dashboardContent.dashboard;
      return true;
    } catch (err) {
      console.error("Tableau Adapter init error:", err);
      return false;
    }
  }

  function getWorksheets() {
    return dashboard?.worksheets || [];
  }

  function autoSelectWorksheet(userQuery) {
    if (!dashboard) return Promise.resolve(null);
    const query = userQuery.toLowerCase();
    const worksheets = getWorksheets();
    const score = new Map();

    worksheets.forEach(ws => {
      ws.getSummaryDataAsync({ maxRows: 1 }).then(data => {
        const columns = data.columns.map(c => c.fieldName.toLowerCase());
        const matches = columns.filter(col => query.includes(col)).length;
        if (matches > 0) score.set(ws, matches);
      });
    });

    return new Promise(resolve => {
      setTimeout(() => {
        if (score.size === 0) resolve(null);
        else {
          const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0][0];
          resolve(best);
        }
      }, 400);
    });
  }

  async function fetchTopByMeasure(query, measureName = "sales", topN = 5) {
    const ws = await autoSelectWorksheet(query);
    if (!ws) return { reply: "⚠️ No matching worksheet found." };

    const dataTable = await ws.getSummaryDataAsync({ maxRows: 5000 });

    const measureIndex = dataTable.columns.findIndex(
      c => c.fieldName.toLowerCase().includes(measureName.toLowerCase())
    );
    if (measureIndex === -1) return { reply: `⚠️ Measure '${measureName}' not found.` };

    const dimensionIndex = dataTable.columns.findIndex(
      c => !c.fieldName.toLowerCase().includes(measureName.toLowerCase())
    );
    if (dimensionIndex === -1) return { reply: "⚠️ No usable dimension found." };

    const rows = dataTable.data.map(r => ({
      label: r[dimensionIndex].formattedValue,
      value: Number(r[measureIndex].value) || 0
    }));

    const topRows = rows.sort((a, b) => b.value - a.value).slice(0, topN);
    if (topRows.length === 0) return { reply: "⚠️ No data available!" };

    let reply = `📊 Top ${topN} by ${measureName}:\n`;
    topRows.forEach((r, i) => (reply += `${i + 1}. ${r.label}: ${r.value}\n`));

    return {
      reply,
      labels: topRows.map(r => r.label),
      values: topRows.map(r => r.value),
      measure: measureName
    };
  }

  // common runQuery: detect "top" and call fetchTopByMeasure
  async function runQuery(queryText) {
    const q = queryText.toLowerCase();
    if (q.includes("top")) {
      // use parser to decide measure & topN
      const { topN, measure } = window.ParserHelper.analyzeQuery(q);
      return await fetchTopByMeasure(q, measure, topN);
    }
    return { reply: "This adapter currently supports 'Top N' queries. Try: Top 5 sales" };
  }

  return {
    init,
    runQuery
  };
})();
