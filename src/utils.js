/* utils.js
   Formatting & small helpers
*/

window.UtilsHelper = (function () {

  function formatNumber(num) {
    if (num === null || num === undefined || num === "") return "-";
    const n = Number(num);
    if (isNaN(n)) return num;
    return n.toLocaleString("en-US");
  }

  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return {
    formatNumber,
    capitalize
  };

})();
