/* parser.js
   Basic NLP extraction: top-N, measure, dimension
*/

window.ParserHelper = (function () {

  const measureKeywords = ["sales", "revenue", "profit", "trips", "rides", "amount", "fare", "count", "quantity"];
  const dimensionKeywords = ["category", "region", "segment", "product", "country", "city", "state", "market", "driver", "date"];

  function extractTopValue(query) {
    const match = query.match(/top\s+(\d+)/i);
    return match ? parseInt(match[1]) : 5;
  }

  function detectMeasure(query) {
    const lower = query.toLowerCase();
    return measureKeywords.find(m => lower.includes(m)) || null;
  }

  function detectDimension(query) {
    const lower = query.toLowerCase();
    return dimensionKeywords.find(d => lower.includes(d)) || null;
  }

  function analyzeQuery(query) {
    return {
      topN: extractTopValue(query),
      measure: detectMeasure(query) || "sales",
      dimension: detectDimension(query)
    };
  }

  return {
    analyzeQuery
  };

})();
