import {
  oa
} from "./chunk-ZCIINWQ4.js";
import "./chunk-GDDGRWFQ.js";

// node_modules/highcharts/esm/modules/offline-exporting.js
var e;
var o = {};
o.n = (t) => {
  var e2 = t && t.__esModule ? () => t.default : () => t;
  return o.d(e2, { a: e2 }), e2;
}, o.d = (t, e2) => {
  for (var r2 in e2) o.o(e2, r2) && !o.o(t, r2) && Object.defineProperty(t, r2, { enumerable: true, get: e2[r2] });
}, o.o = (t, e2) => Object.prototype.hasOwnProperty.call(t, e2);
var r = oa;
var n = o.n(r);
var { isSafari: a, win: l, win: { document: i } } = n();
var s = l.URL || l.webkitURL || l;
function c(t) {
  let e2 = t.replace(/filename=.*;/, "").match(/data:([^;]*)(;base64)?,([A-Z+\d\/]+)/i);
  if (e2 && e2.length > 3 && l.atob && l.ArrayBuffer && l.Uint8Array && l.Blob && s.createObjectURL) {
    let t2 = l.atob(e2[3]), o2 = new l.ArrayBuffer(t2.length), r2 = new l.Uint8Array(o2);
    for (let e3 = 0; e3 < r2.length; ++e3) r2[e3] = t2.charCodeAt(e3);
    return s.createObjectURL(new l.Blob([r2], { type: e2[1] }));
  }
}
function d(t, e2) {
  let o2 = l.navigator, r2 = i.createElement("a");
  if ("string" != typeof t && !(t instanceof String) && o2.msSaveOrOpenBlob) return void o2.msSaveOrOpenBlob(t, e2);
  if (t = "" + t, o2.userAgent.length > 1e3) throw Error("Input too long");
  let n2 = /Edge\/\d+/.test(o2.userAgent);
  if ((a && "string" == typeof t && 0 === t.indexOf("data:application/pdf") || n2 || t.length > 2e6) && !(t = c(t) || "")) throw Error("Failed to convert to blob");
  if (void 0 !== r2.download) r2.href = t, r2.download = e2, i.body.appendChild(r2), r2.click(), i.body.removeChild(r2);
  else try {
    if (!l.open(t, "chart")) throw Error("Failed to open window");
  } catch {
    l.location.href = t;
  }
}
function f(t) {
  return new Promise((e2, o2) => {
    let n2 = i.getElementsByTagName("head")[0], a2 = i.createElement("script");
    a2.type = "text/javascript", a2.src = t, a2.onload = () => {
      e2();
    }, a2.onerror = () => {
      let e3 = `Error loading script ${t}`;
      (0, r.error)(e3), o2(Error(e3));
    }, n2.appendChild(a2);
  });
}
var p = oa.AST;
var h = o.n(p);
var u = oa.Chart;
var y = o.n(u);
var g = { exporting: {} };
var { doc: m, win: w } = n();
Array.prototype.find;
var { getOptions: v, setOptions: b } = n();
var { composed: E, doc: F, win: x } = n();
!(function(t) {
  async function e2(t2, e3, n2, a2) {
    var l2, i2;
    let s2, c2, f2, p2, u2, y2 = (l2 = t2, i2 = a2, f2 = F.createElement("div"), h().setElementHTML(f2, l2), p2 = f2.getElementsByTagName("text"), u2 = function(t3, e4) {
      let o3 = t3;
      for (; o3 && o3 !== f2; ) {
        if (o3.style[e4]) {
          let r3 = o3.style[e4];
          "fontSize" === e4 && /em$/.test(r3) && (r3 = Math.round(16 * parseFloat(r3)) + "px"), t3.style[e4] = r3;
          break;
        }
        o3 = o3.parentNode;
      }
    }, [].forEach.call(p2, function(t3) {
      for (["fontFamily", "fontSize"].forEach((e4) => {
        u2(t3, e4);
      }), t3.style.fontFamily = i2?.normal ? "HighchartsFont" : String(t3.style.fontFamily && t3.style.fontFamily.split(" ").splice(-1)), s2 = t3.getElementsByTagName("title"), [].forEach.call(s2, function(e4) {
        t3.removeChild(e4);
      }), c2 = t3.getElementsByClassName("highcharts-text-outline"); c2.length > 0; ) {
        let t4 = c2[0];
        t4.parentNode && t4.parentNode.removeChild(t4);
      }
    }), f2.querySelector("svg"));
    y2 && (await o2(y2, a2), d(await r2(y2, 0, e3), n2));
  }
  async function o2(t2, e3) {
    let o3, r3, n2 = (t3, e4) => {
      x.jspdf.jsPDF.API.events.push(["initialized", function() {
        this.addFileToVFS(t3, e4), this.addFont(t3, "HighchartsFont", t3), this.getFontList()?.HighchartsFont || this.setFont("HighchartsFont");
      }]);
    };
    for (let a2 of (e3 && (r3 = t2.textContent || "", !/[^\u0000-\u007F\u200B]+/.test(r3)) && (e3 = void 0), ["normal", "italic", "bold", "bolditalic"])) {
      let t3 = e3?.[a2];
      if (t3) try {
        let e4 = await x.fetch(t3);
        if (!e4.ok) throw Error(`Failed to fetch font: ${t3}`);
        let r4 = await e4.blob(), l2 = new FileReader(), i2 = await new Promise((t4, e5) => {
          l2.onloadend = () => {
            "string" == typeof l2.result ? t4(l2.result.split(",")[1]) : e5(Error("Failed to read font as base64"));
          }, l2.onerror = e5, l2.readAsDataURL(r4);
        });
        n2(a2, i2), "normal" === a2 && (o3 = i2);
      } catch {
      }
      else o3 && n2(a2, o3);
    }
  }
  async function r2(t2, e3, o3) {
    let r3 = (Number(t2.getAttribute("width")) + 2 * e3) * o3, n2 = (Number(t2.getAttribute("height")) + 2 * e3) * o3, a2 = new x.jspdf.jsPDF(n2 > r3 ? "p" : "l", "pt", [r3, n2]);
    [].forEach.call(t2.querySelectorAll('*[visibility="hidden"]'), function(t3) {
      t3.parentNode.removeChild(t3);
    });
    let l2 = t2.querySelectorAll("linearGradient");
    for (let t3 = 0; t3 < l2.length; t3++) {
      let e4 = l2[t3].querySelectorAll("stop"), o4 = 0;
      for (; o4 < e4.length && "0" === e4[o4].getAttribute("offset") && "0" === e4[o4 + 1].getAttribute("offset"); ) e4[o4].remove(), o4++;
    }
    return [].forEach.call(t2.querySelectorAll("tspan"), (t3) => {
      "​" === t3.textContent && (t3.textContent = " ", t3.setAttribute("dx", -5));
    }), await a2.svg(t2, { x: 0, y: 0, width: r3, height: n2, removeInvalid: true }), a2.output("datauristring");
  }
  t.compose = function(t2) {
    var o3;
    if (!(function(t3, e3, o4, r4 = {}) {
      let a2 = "function" == typeof t3 && t3.prototype || t3;
      Object.hasOwnProperty.call(a2, "hcEvents") || (a2.hcEvents = {});
      let l2 = a2.hcEvents;
      n().Point && t3 instanceof n().Point && t3.series && t3.series.chart && (t3.series.chart.runTrackerClick = true);
      let i2 = t3.addEventListener;
      i2 && i2.call(t3, e3, o4, !!n().supportsPassiveEvents && { passive: void 0 === r4.passive ? -1 !== e3.indexOf("touch") : r4.passive, capture: false }), l2[e3] || (l2[e3] = []);
      let s2 = { fn: o4, order: "number" == typeof r4.order ? r4.order : 1 / 0 };
      l2[e3].push(s2), l2[e3].sort((t4, e4) => t4.order - e4.order);
    })(t2, "downloadSVG", async function(t3) {
      let { svg: o4, exportingOptions: r4, exporting: a2, preventDefault: l2 } = t3;
      if (r4?.type === "application/pdf") {
        l2?.();
        try {
          let { type: t4, filename: a3, scale: l3, libURL: i2 } = n().Exporting.prepareImageOptions(r4);
          "application/pdf" === t4 && (x.jspdf?.jsPDF || (await f(`${i2}jspdf.js`), await f(`${i2}svg2pdf.js`)), await e2(o4, l3, a3, r4?.pdfFont));
        } catch (t4) {
          await a2?.fallbackToServer(r4, t4);
        }
      }
    }), o3 = "OfflineExporting", !(0 > E.indexOf(o3) && E.push(o3))) return;
    !(function(t3, e3) {
      let o4;
      for (o4 in t3 || (t3 = {}), e3) t3[o4] = e3[o4];
    })(y().prototype, { exportChartLocal: async function(t3, e3) {
      await this.exporting?.exportChart(t3, e3);
    } }), b(g);
    let r3 = v().exporting?.buttons?.contextButton?.menuItems;
    r3?.push("downloadPDF");
  }, t.downloadSVGLocal = async function(t2, e3) {
    await n().Exporting.prototype.downloadSVG.call(void 0, t2, e3);
  };
})(e || (e = {}));
var A = e;
var S = n();
S.dataURLtoBlob = S.dataURLtoBlob || c, S.downloadSVGLocal = A.downloadSVGLocal, S.downloadURL = S.downloadURL || d, A.compose(S.Exporting);
var j = n();
export {
  j as default
};
//# sourceMappingURL=highcharts_esm_modules_offline-exporting.js.map
