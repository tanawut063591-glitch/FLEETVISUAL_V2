import {
  oa
} from "./chunk-YA62JV3C.js";
import {
  __spreadValues
} from "./chunk-PCCZHGCK.js";

// node_modules/highcharts/esm/modules/exporting.js
var t;
var n;
var i = {};
i.n = (e) => {
  var t2 = e && e.__esModule ? () => e.default : () => e;
  return i.d(t2, { a: t2 }), t2;
}, i.d = (e, t2) => {
  for (var n2 in t2) i.o(t2, n2) && !i.o(e, n2) && Object.defineProperty(e, n2, { enumerable: true, get: t2[n2] });
}, i.o = (e, t2) => Object.prototype.hasOwnProperty.call(e, t2);
var o = oa;
var r = i.n(o);
var a = oa.AST;
var l = i.n(a);
var s = oa.Chart;
var c = i.n(s);
var h = t || (t = {});
h.compose = function(e) {
  return e.navigation || (e.navigation = new p(e)), e;
};
var p = class {
  constructor(e) {
    this.updates = [], this.chart = e;
  }
  addUpdate(e) {
    this.chart.navigation.updates.push(e);
  }
  update(e, t2) {
    this.updates.forEach((n2) => {
      n2.call(this.chart, e, t2);
    });
  }
};
h.Additions = p;
var d = t;
var { isSafari: u, win: f, win: { document: g } } = r();
var m = f.URL || f.webkitURL || f;
function y(e, t2) {
  let n2 = f.navigator, i2 = g.createElement("a");
  if ("string" != typeof e && !(e instanceof String) && n2.msSaveOrOpenBlob) return void n2.msSaveOrOpenBlob(e, t2);
  if (e = "" + e, n2.userAgent.length > 1e3) throw Error("Input too long");
  let o2 = /Edge\/\d+/.test(n2.userAgent);
  if ((u && "string" == typeof e && 0 === e.indexOf("data:application/pdf") || o2 || e.length > 2e6) && !(e = (function(e2) {
    let t3 = e2.replace(/filename=.*;/, "").match(/data:([^;]*)(;base64)?,([A-Z+\d\/]+)/i);
    if (t3 && t3.length > 3 && f.atob && f.ArrayBuffer && f.Uint8Array && f.Blob && m.createObjectURL) {
      let e3 = f.atob(t3[3]), n3 = new f.ArrayBuffer(e3.length), i3 = new f.Uint8Array(n3);
      for (let t4 = 0; t4 < i3.length; ++t4) i3[t4] = e3.charCodeAt(t4);
      return m.createObjectURL(new f.Blob([i3], { type: t3[1] }));
    }
  })(e) || "")) throw Error("Failed to convert to blob");
  if (void 0 !== i2.download) i2.href = e, i2.download = t2, g.body.appendChild(i2), i2.click(), g.body.removeChild(i2);
  else try {
    if (!f.open(e, "chart")) throw Error("Failed to open window");
  } catch {
    f.location.href = e;
  }
}
var { isTouchDevice: x } = r();
var v = { exporting: { allowTableSorting: true, libURL: "https://code.highcharts.com/12.6.0/lib/", local: true, type: "image/png", url: `https://export-svg.highcharts.com?v=${r().version}`, pdfFont: { normal: void 0, bold: void 0, bolditalic: void 0, italic: void 0 }, printMaxWidth: 780, scale: 2, buttons: { contextButton: { className: "highcharts-contextbutton", menuClassName: "highcharts-contextmenu", symbol: "menu", titleKey: "contextButtonTitle", menuItems: ["viewFullscreen", "printChart", "separator", "downloadPNG", "downloadJPEG", "downloadSVG"] } }, menuItemDefinitions: { viewFullscreen: { textKey: "viewFullscreen", onclick: function() {
  this.fullscreen?.toggle();
} }, printChart: { textKey: "printChart", onclick: function() {
  this.exporting?.print();
} }, separator: { separator: true }, downloadPNG: { textKey: "downloadPNG", onclick: async function() {
  await this.exporting?.exportChart();
} }, downloadJPEG: { textKey: "downloadJPEG", onclick: async function() {
  await this.exporting?.exportChart({ type: "image/jpeg" });
} }, downloadPDF: { textKey: "downloadPDF", onclick: async function() {
  await this.exporting?.exportChart({ type: "application/pdf" });
} }, downloadSVG: { textKey: "downloadSVG", onclick: async function() {
  await this.exporting?.exportChart({ type: "image/svg+xml" });
} } } }, lang: { viewFullscreen: "View in full screen", exitFullscreen: "Exit from full screen", printChart: "Print chart", downloadPNG: "Download PNG image", downloadJPEG: "Download JPEG image", downloadPDF: "Download PDF document", downloadSVG: "Download SVG vector image", contextButtonTitle: "Chart context menu" }, navigation: { buttonOptions: { symbolSize: 14, symbolX: 14.5, symbolY: 13.5, align: "right", buttonSpacing: 5, height: 28, y: -5, verticalAlign: "top", width: 28, symbolFill: "#666666", symbolStroke: "#666666", symbolStrokeWidth: 3, theme: { fill: "#ffffff", padding: 5, stroke: "none", "stroke-linecap": "round" } }, menuStyle: { border: "none", borderRadius: "3px", background: "#ffffff", padding: "0.5em" }, menuItemStyle: { background: "none", borderRadius: "3px", color: "#333333", padding: "0.5em", fontSize: x ? "0.9em" : "0.8em", transition: "background 250ms, color 250ms" }, menuItemHoverStyle: { background: "#f2f2f2" } } };
!(function(e) {
  let t2 = [];
  function n2(e2, t3, n3, i3) {
    return [["M", e2, t3 + 2.5], ["L", e2 + n3, t3 + 2.5], ["M", e2, t3 + i3 / 2 + 0.5], ["L", e2 + n3, t3 + i3 / 2 + 0.5], ["M", e2, t3 + i3 - 1.5], ["L", e2 + n3, t3 + i3 - 1.5]];
  }
  function i2(e2, t3, n3, i3) {
    let o2 = i3 / 3 - 2, r2 = [];
    return r2.concat(this.circle(n3 - o2, t3, o2, o2), this.circle(n3 - o2, t3 + o2 + 4, o2, o2), this.circle(n3 - o2, t3 + 2 * (o2 + 4), o2, o2));
  }
  e.compose = function(e2) {
    if (-1 === t2.indexOf(e2)) {
      t2.push(e2);
      let o2 = e2.prototype.symbols;
      o2.menu = n2, o2.menuball = i2.bind(o2);
    }
  };
})(n || (n = {}));
var w = n;
var { doc: b, win: S } = r();
function E(e, t2, n2, i2 = {}) {
  let o2 = "function" == typeof e && e.prototype || e;
  Object.hasOwnProperty.call(o2, "hcEvents") || (o2.hcEvents = {});
  let a2 = o2.hcEvents;
  r().Point && e instanceof r().Point && e.series && e.series.chart && (e.series.chart.runTrackerClick = true);
  let l2 = e.addEventListener;
  l2 && l2.call(e, t2, n2, !!r().supportsPassiveEvents && { passive: void 0 === i2.passive ? -1 !== t2.indexOf("touch") : i2.passive, capture: false }), a2[t2] || (a2[t2] = []);
  let s2 = { fn: n2, order: "number" == typeof i2.order ? i2.order : 1 / 0 };
  return a2[t2].push(s2), a2[t2].sort((e2, t3) => e2.order - t3.order), function() {
    I(e, t2, n2);
  };
}
function O(e, t2, n2, i2, o2) {
  let r2 = b.createElement(e);
  return t2 && k(r2, t2), o2 && C(r2, { padding: "0", border: "none", margin: "0" }), n2 && C(r2, n2), i2 && i2.appendChild(r2), r2;
}
function C(e, t2) {
  k(e.style, t2);
}
function T(e) {
  e?.parentElement?.removeChild(e);
}
function k(e, t2) {
  let n2;
  for (n2 in e || (e = {}), t2) e[n2] = t2[n2];
  return e;
}
function F(e, t2, n2, i2) {
  if (n2 = n2 || {}, b?.createEvent && (e.dispatchEvent || e.fireEvent && e !== r())) {
    let i3 = b.createEvent("Events");
    i3.initEvent(t2, true, true), n2 = k(i3, n2), e.dispatchEvent ? e.dispatchEvent(n2) : e.fireEvent(t2, n2);
  } else if (e.hcEvents) {
    n2.target || k(n2, { preventDefault: function() {
      n2.defaultPrevented = true;
    }, target: e, type: t2 });
    let i3 = [], o2 = e, r2 = false;
    for (; o2.hcEvents; ) Object.hasOwnProperty.call(o2, "hcEvents") && o2.hcEvents[t2] && (i3.length && (r2 = true), i3.unshift.apply(i3, o2.hcEvents[t2])), o2 = Object.getPrototypeOf(o2);
    r2 && i3.sort((e2, t3) => e2.order - t3.order), i3.forEach((t3) => {
      false === t3.fn.call(e, n2, e) && n2.preventDefault();
    });
  }
  i2 && !n2.defaultPrevented && i2.call(e, n2);
}
var P = Array.prototype.find ? function(e, t2) {
  return e.find(t2);
} : function(e, t2) {
  let n2, i2 = e.length;
  for (n2 = 0; n2 < i2; n2++) if (t2(e[n2], n2)) return e[n2];
};
function R(e) {
  null != e && clearTimeout(e);
}
function N(e) {
  return A(e) && "number" == typeof e.nodeType;
}
function L(e) {
  let t2 = Object.prototype.toString.call(e);
  return "[object Array]" === t2 || "[object Array Iterator]" === t2;
}
function A(e, t2) {
  return !!e && "object" == typeof e && (!t2 || !L(e));
}
function D(e, ...t2) {
  let n2, i2 = [e, ...t2], o2 = {}, r2 = function(e2, t3) {
    return "object" != typeof e2 && (e2 = {}), M(t3, function(n3, i3) {
      if ("__proto__" !== i3 && "constructor" !== i3) {
        let o3;
        !A(n3, true) || (o3 = n3?.constructor, A(n3, true) && !N(n3) && o3?.name && "Object" !== o3.name) || N(n3) ? e2[i3] = t3[i3] : e2[i3] = r2(e2[i3] || {}, n3);
      }
    }), e2;
  };
  true === e && (o2 = i2[1], i2 = Array.prototype.slice.call(i2, 2));
  let a2 = i2.length;
  for (n2 = 0; n2 < a2; n2++) o2 = r2(o2, i2[n2]);
  return o2;
}
function M(e, t2, n2) {
  for (let i2 in e) Object.hasOwnProperty.call(e, i2) && t2.call(n2 || e[i2], e[i2], i2, e);
}
function j() {
  let e = arguments, t2 = e.length;
  for (let n2 = 0; n2 < t2; n2++) {
    let t3 = e[n2];
    if (null != t3) return t3;
  }
}
function H(e, t2) {
  return 0 > e.indexOf(t2) && !!e.push(t2);
}
function I(e, t2, n2) {
  function i2(t3, n3) {
    let i3 = e.removeEventListener;
    i3 && i3.call(e, t3, n3, false);
  }
  function o2(n3) {
    let o3, r3;
    e.nodeName && (t2 ? (o3 = {})[t2] = true : o3 = n3, M(o3, function(e2, t3) {
      if (n3[t3]) for (r3 = n3[t3].length; r3--; ) i2(t3, n3[t3][r3].fn);
    }));
  }
  let r2 = "function" == typeof e && e.prototype || e;
  if (Object.hasOwnProperty.call(r2, "hcEvents")) {
    let e2 = r2.hcEvents;
    if (t2) {
      let r3 = e2[t2] || [];
      n2 ? (e2[t2] = r3.filter(function(e3) {
        return n2 !== e3.fn;
      }), i2(t2, n2)) : (o2(e2), e2[t2] = []);
    } else o2(e2), delete r2.hcEvents;
  }
}
var { composed: U } = r();
function B() {
  this.fullscreen = new $(this);
}
var $ = class {
  static compose(e) {
    H(U, "Fullscreen") && E(e, "beforeRender", B);
  }
  constructor(e) {
    this.chart = e, this.isOpen = false;
    let t2 = e.renderTo;
    !this.browserProps && ("function" == typeof t2.requestFullscreen ? this.browserProps = { fullscreenChange: "fullscreenchange", requestFullscreen: "requestFullscreen", exitFullscreen: "exitFullscreen" } : t2.mozRequestFullScreen ? this.browserProps = { fullscreenChange: "mozfullscreenchange", requestFullscreen: "mozRequestFullScreen", exitFullscreen: "mozCancelFullScreen" } : t2.webkitRequestFullScreen ? this.browserProps = { fullscreenChange: "webkitfullscreenchange", requestFullscreen: "webkitRequestFullScreen", exitFullscreen: "webkitExitFullscreen" } : t2.msRequestFullscreen && (this.browserProps = { fullscreenChange: "MSFullscreenChange", requestFullscreen: "msRequestFullscreen", exitFullscreen: "msExitFullscreen" }));
  }
  close() {
    let e = this, t2 = e.chart, n2 = t2.options.chart;
    F(t2, "fullscreenClose", void 0, function() {
      e.isOpen && e.browserProps && t2.container.ownerDocument instanceof Document && t2.container.ownerDocument[e.browserProps.exitFullscreen](), e.unbindFullscreenEvent && (e.unbindFullscreenEvent = e.unbindFullscreenEvent()), t2.setSize(e.origWidth, e.origHeight, false), e.origWidth = void 0, e.origHeight = void 0, n2.width = e.origWidthOption, n2.height = e.origHeightOption, e.origWidthOption = void 0, e.origHeightOption = void 0, e.isOpen = false, e.setButtonText();
    });
  }
  open() {
    let e = this, t2 = e.chart, n2 = t2.options.chart;
    F(t2, "fullscreenOpen", void 0, function() {
      if (n2 && (e.origWidthOption = n2.width, e.origHeightOption = n2.height), e.origWidth = t2.chartWidth, e.origHeight = t2.chartHeight, e.browserProps) {
        let n3 = E(t2.container.ownerDocument, e.browserProps.fullscreenChange, function() {
          e.isOpen ? (e.isOpen = false, e.close()) : (t2.setSize(null, null, false), e.isOpen = true, e.setButtonText());
        }), i2 = E(t2, "destroy", n3);
        e.unbindFullscreenEvent = () => {
          n3(), i2();
        };
        let o2 = t2.renderTo[e.browserProps.requestFullscreen]();
        o2 && o2.catch(function() {
          alert("Full screen is not supported inside a frame.");
        });
      }
    });
  }
  setButtonText() {
    let e = this.chart, t2 = e.exporting?.divElements, n2 = e.options.exporting, i2 = n2 && n2.buttons && n2.buttons.contextButton.menuItems, o2 = e.options.lang;
    if (n2?.menuItemDefinitions && o2?.exitFullscreen && o2.viewFullscreen && i2 && t2) {
      let e2 = t2[i2.indexOf("viewFullscreen")];
      e2 && l().setElementHTML(e2, this.isOpen ? o2.exitFullscreen : n2.menuItemDefinitions.viewFullscreen?.textKey || o2.viewFullscreen);
    }
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
};
var { win: G } = r();
var V = { ajax: function(e) {
  let t2 = { json: "application/json", xml: "application/xml", text: "text/plain", octet: "application/octet-stream" }, n2 = new XMLHttpRequest();
  function i2(t3, n3) {
    e.error && e.error(t3, n3);
  }
  if (!e.url) return false;
  n2.open((e.type || "get").toUpperCase(), e.url, true), e.headers?.["Content-Type"] || n2.setRequestHeader("Content-Type", t2[e.dataType || "json"] || t2.text), M(e.headers, function(e2, t3) {
    n2.setRequestHeader(t3, e2);
  }), e.responseType && (n2.responseType = e.responseType), n2.onreadystatechange = function() {
    let t3;
    if (4 === n2.readyState) {
      if (200 === n2.status) {
        if ("blob" !== e.responseType && (t3 = n2.responseText, "json" === e.dataType)) try {
          t3 = JSON.parse(t3);
        } catch (e2) {
          if (e2 instanceof Error) return i2(n2, e2);
        }
        return e.success?.(t3, n2);
      }
      i2(n2, n2.responseText);
    }
  }, e.data && "string" != typeof e.data && (e.data = JSON.stringify(e.data)), n2.send(e.data);
}, getJSON: function(e, t2) {
  V.ajax({ url: e, success: t2, dataType: "json", headers: { "Content-Type": "text/plain" } });
} };
V.post = async function(e, t2, n2) {
  let i2 = new G.FormData();
  M(t2, function(e2, t3) {
    i2.append(t3, e2);
  }), i2.append("b64", "true");
  let o2 = await G.fetch(e, __spreadValues({ method: "POST", body: i2 }, n2));
  if (o2.ok) {
    let e2 = await o2.text(), n3 = document.createElement("a");
    n3.href = `data:${t2.type};base64,${e2}`, n3.download = t2.filename, n3.click(), T(n3);
  }
};
var { defaultOptions: W, setOptions: q } = r();
var { composed: z, doc: K, isFirefox: J, isMS: _, isSafari: X, SVG_NS: Y, win: Z } = r();
l().allowedAttributes.push("data-z-index", "fill-opacity", "filter", "preserveAspectRatio", "rx", "ry", "stroke-dasharray", "stroke-linejoin", "stroke-opacity", "text-anchor", "transform", "transform-origin", "version", "viewBox", "visibility", "xmlns", "xmlns:xlink"), l().allowedTags.push("desc", "clippath", "fedropshadow", "femorphology", "g", "image");
var Q = Z.URL || Z.webkitURL || Z;
var ee = class _ee {
  constructor(e, t2) {
    this.options = {}, this.chart = e, this.options = t2, this.btnCount = 0, this.buttonOffset = 0, this.divElements = [], this.svgElements = [];
  }
  static hyphenate(e) {
    return e.replace(/[A-Z]/g, function(e2) {
      return "-" + e2.toLowerCase();
    });
  }
  static async imageToDataURL(e, t2, n2) {
    let i2 = await _ee.loadImage(e), o2 = K.createElement("canvas"), r2 = o2?.getContext("2d");
    if (r2) return o2.height = i2.height * t2, o2.width = i2.width * t2, r2.drawImage(i2, 0, 0, o2.width, o2.height), o2.toDataURL(n2);
    throw Error("No canvas found!");
  }
  static async fetchCSS(e) {
    try {
      let t2 = await fetch(e), n2 = await t2.text(), i2 = new CSSStyleSheet();
      return i2.replaceSync(n2), i2;
    } catch {
      (0, o.error)(`Warning: Failed to fetch CSS from ${e}`, false);
    }
  }
  static async handleStyleSheet(e, t2) {
    try {
      for (let n2 of Array.from(e.cssRules)) {
        if (n2 instanceof CSSImportRule) {
          let e2 = await _ee.fetchCSS(n2.href);
          e2 && await _ee.handleStyleSheet(e2, t2);
        }
        if (n2 instanceof CSSFontFaceRule) {
          let i2 = n2.cssText;
          if (e.href) {
            let t3 = e.href, n3 = /url\(\s*(['"]?)(?![a-z]+:|\/\/)([^'")]+?)\1\s*\)/gi;
            i2 = i2.replace(n3, (e2, n4, i3) => {
              let o2 = new URL(i3, t3).href;
              return `url(${n4}${o2}${n4})`;
            });
          }
          t2.push(i2);
        }
      }
    } catch {
      if (e.href) {
        let n2 = await _ee.fetchCSS(e.href);
        n2 && await _ee.handleStyleSheet(n2, t2);
      }
    }
  }
  static async fetchStyleSheets() {
    let e = [];
    for (let t2 of Array.from(K.styleSheets)) await _ee.handleStyleSheet(t2, e);
    return e;
  }
  static async inlineFonts(e) {
    let t2 = await _ee.fetchStyleSheets(), n2 = /url\(([^)]+)\)/g, i2 = [], o2 = t2.join("\n"), r2;
    for (; r2 = n2.exec(o2); ) {
      let e2 = r2[1].replace(/['"]/g, "");
      i2.includes(e2) || i2.push(e2);
    }
    let a2 = (e2) => {
      let t3 = "", n3 = new Uint8Array(e2);
      for (let e3 = 0; e3 < n3.byteLength; e3++) t3 += String.fromCharCode(n3[e3]);
      return btoa(t3);
    }, l2 = {};
    for (let e2 of i2) try {
      let t3 = await fetch(e2), n3 = t3.headers.get("Content-Type") || "", i3 = a2(await t3.arrayBuffer());
      l2[e2] = `data:${n3};base64,${i3}`;
    } catch {
    }
    o2 = o2.replace(n2, (e2, t3) => {
      let n3 = t3.replace(/['"]/g, "");
      return `url(${l2[n3] || n3})`;
    });
    let s2 = document.createElementNS("http://www.w3.org/2000/svg", "style");
    return s2.textContent = o2, e.append(s2), e;
  }
  static loadImage(e) {
    return new Promise((t2, n2) => {
      let i2 = new Z.Image();
      i2.crossOrigin = "Anonymous", i2.onload = () => {
        setTimeout(() => {
          t2(i2);
        }, _ee.loadEventDeferDelay);
      }, i2.onerror = (e2) => {
        n2(e2);
      }, i2.src = e;
    });
  }
  static prepareImageOptions(e) {
    let t2 = e?.type || "image/png", n2 = e?.libURL || W.exporting?.libURL;
    return { type: t2, filename: (e?.filename || "chart") + "." + ("image/svg+xml" === t2 ? "svg" : t2.split("/")[1]), scale: e?.scale || 1, libURL: n2?.slice(-1) !== "/" ? n2 + "/" : n2 };
  }
  static sanitizeSVG(e, t2) {
    let n2 = e.indexOf("</svg>") + 6, i2 = e.indexOf("<foreignObject") > -1, o2 = e.substr(n2);
    return e = e.substr(0, n2), i2 ? e = e.replace(/(<(?:img|br).*?(?=\>))>/g, "$1 />").replace(/(<svg(?![^>]*xmlns=)[^>]*)>/g, '$1 xmlns="http://www.w3.org/2000/svg">') : o2 && t2?.exporting?.allowHTML && (o2 = '<foreignObject x="0" y="0" width="' + t2.chart.width + '" height="' + t2.chart.height + '"><body xmlns="http://www.w3.org/1999/xhtml">' + o2.replace(/(<(?:img|br).*?(?=\>))>/g, "$1 />").replace(/(<svg(?![^>]*xmlns=)[^>]*)>/g, '$1 xmlns="http://www.w3.org/2000/svg">') + "</body></foreignObject>", e = e.replace("</svg>", o2 + "</svg>")), e = e.replace(/zIndex="[^"]+"/g, "").replace(/symbolName="[^"]+"/g, "").replace(/jQuery\d+="[^"]+"/g, "").replace(/url\(("|&quot;)(.*?)("|&quot;)\;?\)/g, "url($2)").replace(/url\([^#]+#/g, "url(#").replace(/<svg /, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ').replace(/ (NS\d+\:)?href=/g, " xlink:href=").replace(/(<image[^>]*) xlink:href=/g, "$1 href=").replace(/\n+/g, " ").replace(/&nbsp;/g, " ").replace(/&shy;/g, "­");
  }
  static svgToDataURL(e) {
    let t2 = Z.navigator.userAgent, n2 = t2.indexOf("WebKit") > -1 && 0 > t2.indexOf("Chrome");
    try {
      if (!n2 && -1 === e.indexOf("<foreignObject")) return Q.createObjectURL(new Z.Blob([e], { type: "image/svg+xml;charset-utf-16" }));
    } catch {
    }
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(e);
  }
  addButton(e) {
    let t2, n2 = this, i2 = n2.chart, o2 = i2.renderer, r2 = D(i2.options.navigation?.buttonOptions, e), a2 = r2.onclick, l2 = r2.menuItems, s2 = r2.symbolSize || 12;
    if (false === r2.enabled || !r2.theme) return;
    let c2 = i2.styledMode ? {} : r2.theme, h2 = () => {
    };
    a2 ? h2 = function(e2) {
      e2 && e2.stopPropagation(), a2.call(i2, e2, i2);
    } : l2 && (h2 = function(e2) {
      e2 && e2.stopPropagation(), n2.contextMenu(p2.menuClassName, l2, p2.translateX || 0, p2.translateY || 0, p2.width || 0, p2.height || 0, p2), p2.setState(2);
    }), r2.text && r2.symbol ? c2.paddingLeft = j(c2.paddingLeft, 30) : r2.text || k(c2, { width: r2.width, height: r2.height, padding: 0 });
    let p2 = o2.button(r2.text || "", 0, 0, h2, c2, void 0, void 0, void 0, void 0, r2.useHTML).addClass(e.className || "").attr({ title: j(i2.options.lang[r2._titleKey || r2.titleKey], "") });
    p2.menuClassName = e.menuClassName || "highcharts-menu-" + n2.btnCount++, r2.symbol && (t2 = o2.symbol(r2.symbol, Math.round((r2.symbolX || 0) - s2 / 2), Math.round((r2.symbolY || 0) - s2 / 2), s2, s2, { width: s2, height: s2 }).addClass("highcharts-button-symbol").attr({ zIndex: 1 }).add(p2), i2.styledMode || t2.attr({ stroke: r2.symbolStroke, fill: r2.symbolFill, "stroke-width": r2.symbolStrokeWidth || 1 })), p2.add(n2.group).align(k(r2, { width: p2.width, x: j(r2.x, n2.buttonOffset) }), true, "spacingBox"), n2.buttonOffset += ((p2.width || 0) + (r2.buttonSpacing || 0)) * ("right" === r2.align ? -1 : 1), n2.svgElements.push(p2, t2);
  }
  afterPrint() {
    let e = this.chart;
    if (!this.printReverseInfo) return;
    let { childNodes: t2, origDisplay: n2, resetParams: i2 } = this.printReverseInfo;
    this.moveContainers(e.renderTo), [].forEach.call(t2, function(e2, t3) {
      1 === e2.nodeType && (e2.style.display = n2[t3] || "");
    }), this.isPrinting = false, i2 && e.setSize.apply(e, i2), delete this.printReverseInfo, _ee.printingChart = void 0, F(e, "afterPrint");
  }
  beforePrint() {
    let e = this.chart, t2 = K.body, n2 = this.options.printMaxWidth, i2 = { childNodes: t2.childNodes, origDisplay: [], resetParams: void 0 };
    this.isPrinting = true, e.pointer?.reset(void 0, 0), F(e, "beforePrint"), n2 && e.chartWidth > n2 && (i2.resetParams = [e.options.chart.width, void 0, false], e.setSize(n2, void 0, false)), [].forEach.call(i2.childNodes, function(e2, t3) {
      1 === e2.nodeType && (i2.origDisplay[t3] = e2.style.display, e2.style.display = "none");
    }), this.moveContainers(t2), this.printReverseInfo = i2;
  }
  contextMenu(e, t2, n2, i2, o2, r2, a2) {
    let s2 = this, c2 = s2.chart, h2 = c2.options.navigation, p2 = c2.chartWidth, d2 = c2.chartHeight, u2 = "cache-" + e, f2 = Math.max(o2, r2), g2, m2 = c2[u2];
    m2 || (s2.contextMenuEl = c2[u2] = m2 = O("div", { className: e }, __spreadValues({ position: "absolute", zIndex: 1e3, padding: f2 + "px", pointerEvents: "auto" }, c2.renderer.style), c2.scrollablePlotArea?.fixedDiv || c2.container), g2 = O("ul", { className: "highcharts-menu" }, c2.styledMode ? {} : { listStyle: "none", margin: 0, padding: 0 }, m2), c2.styledMode || C(g2, k({ MozBoxShadow: "3px 3px 10px #0008", WebkitBoxShadow: "3px 3px 10px #0008", boxShadow: "3px 3px 10px #0008" }, h2?.menuStyle || {})), m2.hideMenu = function() {
      C(m2, { display: "none" }), a2 && a2.setState(0), c2.exporting && (c2.exporting.openMenu = false), C(c2.renderTo, { overflow: "hidden" }), C(c2.container, { overflow: "hidden" }), R(m2.hideTimer), F(c2, "exportMenuHidden");
    }, s2.events?.push(E(m2, "mouseleave", function() {
      m2.hideTimer = Z.setTimeout(m2.hideMenu, 500);
    }), E(m2, "mouseenter", function() {
      R(m2.hideTimer);
    }), E(K, "mouseup", function(t3) {
      c2.pointer?.inClass(t3.target, e) || m2.hideMenu();
    }), E(m2, "click", function() {
      c2.exporting?.openMenu && m2.hideMenu();
    })), t2.forEach(function(e2) {
      if ("string" == typeof e2 && s2.options.menuItemDefinitions?.[e2] && (e2 = s2.options.menuItemDefinitions[e2]), A(e2, true)) {
        let t3;
        e2.separator ? t3 = O("hr", void 0, void 0, g2) : ("viewData" === e2.textKey && s2.isDataTableVisible && (e2.textKey = "hideData"), t3 = O("li", { className: "highcharts-menu-item", onclick: function(t4) {
          t4 && t4.stopPropagation(), m2.hideMenu(), "string" != typeof e2 && e2.onclick && e2.onclick.apply(c2, arguments);
        } }, void 0, g2), l().setElementHTML(t3, e2.text || c2.options.lang[e2.textKey]), c2.styledMode || (t3.onmouseover = function() {
          C(this, h2?.menuItemHoverStyle || {});
        }, t3.onmouseout = function() {
          C(this, h2?.menuItemStyle || {});
        }, C(t3, k({ cursor: "pointer" }, h2?.menuItemStyle || {})))), s2.divElements.push(t3);
      }
    }), s2.divElements.push(g2, m2), s2.menuHeight = m2.offsetHeight, s2.menuWidth = m2.offsetWidth);
    let y2 = { display: "block" };
    n2 + (s2.menuWidth || 0) > p2 ? y2.right = p2 - n2 - o2 - f2 + "px" : y2.left = n2 - f2 + "px", i2 + r2 + (s2.menuHeight || 0) > d2 && a2.alignOptions?.verticalAlign !== "top" ? y2.bottom = d2 - i2 - f2 + "px" : y2.top = i2 + r2 - f2 + "px", C(m2, y2), C(c2.renderTo, { overflow: "" }), C(c2.container, { overflow: "" }), c2.exporting && (c2.exporting.openMenu = true), F(c2, "exportMenuShown");
  }
  destroy(e) {
    let t2, n2 = e ? e.target : this.chart, { divElements: i2, events: o2, svgElements: r2 } = this;
    r2.forEach((e2, i3) => {
      e2 && (e2.onclick = e2.ontouchstart = null, n2[t2 = "cache-" + e2.menuClassName] && delete n2[t2], r2[i3] = e2.destroy());
    }), r2.length = 0, this.group && (this.group.destroy(), delete this.group), i2.forEach(function(e2, t3) {
      e2 && (R(e2.hideTimer), I(e2, "mouseleave"), i2[t3] = e2.onmouseout = e2.onmouseover = e2.ontouchstart = e2.onclick = null, T(e2));
    }), i2.length = 0, o2 && (o2.forEach(function(e2) {
      e2();
    }), o2.length = 0);
  }
  async downloadSVG(e, t2) {
    let n2, i2 = { svg: e, exportingOptions: t2, exporting: this };
    if (F(_ee.prototype, "downloadSVG", i2), i2.defaultPrevented) return;
    let { type: r2, filename: a2, scale: l2, libURL: s2 } = _ee.prepareImageOptions(t2);
    if ("application/pdf" === r2) throw Error("Offline exporting logic for PDF type is not found.");
    if ("image/svg+xml" === r2) {
      if (void 0 !== Z.MSBlobBuilder) {
        let t3 = new Z.MSBlobBuilder();
        t3.append(e), n2 = t3.getBlob("image/svg+xml");
      } else n2 = _ee.svgToDataURL(e);
      y(n2, a2);
    } else {
      n2 = _ee.svgToDataURL(e);
      try {
        _ee.objectURLRevoke = true;
        let e2 = await _ee.imageToDataURL(n2, l2, r2);
        y(e2, a2);
      } catch (p2) {
        if ("No canvas found!" === p2.message) throw p2;
        if (e.length > 1e8) throw Error("Input too long");
        let t3 = K.createElement("canvas"), n3 = t3.getContext("2d"), i3 = e.match(/^<svg[^>]*\s{,1000}width\s{,1000}=\s{,1000}\"?(\d+)\"?[^>]*>/), h2 = e.match(/^<svg[^>]*\s{0,1000}height\s{,1000}=\s{,1000}\"?(\d+)\"?[^>]*>/);
        if (n3 && i3 && h2) {
          let p3 = i3[1] * l2, d2 = h2[1] * l2;
          if (t3.width = p3, t3.height = d2, !Z.canvg) {
            var c2;
            _ee.objectURLRevoke = true, await (c2 = s2 + "canvg.js", new Promise((e2, t4) => {
              let n4 = g.getElementsByTagName("head")[0], i4 = g.createElement("script");
              i4.type = "text/javascript", i4.src = c2, i4.onload = () => {
                e2();
              }, i4.onerror = () => {
                let e3 = `Error loading script ${c2}`;
                (0, o.error)(e3), t4(Error(e3));
              }, n4.appendChild(i4);
            }));
          }
          Z.canvg.Canvg.fromString(n3, e).start(), y(Z.navigator.msSaveOrOpenBlob ? t3.msToBlob() : t3.toDataURL(r2), a2);
        }
      } finally {
        if (_ee.objectURLRevoke) try {
          Q.revokeObjectURL(n2);
        } catch {
        }
      }
    }
  }
  async exportChart(e, t2) {
    if ((e = D(this.options, e)).local) await this.localExport(e, t2 || {});
    else {
      let n2 = await this.getSVGForExport(e, t2);
      e.url && await V.post(e.url, { filename: e.filename ? e.filename.replace(/\//g, "-") : this.getFilename(), type: e.type, width: e.width, scale: e.scale, svg: n2 }, e.fetchOptions);
    }
  }
  async fallbackToServer(e, t2) {
    false === e.fallbackToExportServer ? e.error ? e.error(e, t2) : (0, o.error)(28, true) : "application/pdf" === e.type && (e.local = false, await this.exportChart(e));
  }
  getChartHTML(e) {
    let t2 = this.chart;
    return e && this.inlineStyles(), this.resolveCSSVariables(), t2.container.querySelectorAll("canvas").forEach(function(e2) {
      let n2 = e2.toDataURL("image/png"), i2 = e2.parentNode, o2 = t2.renderer.image(n2, 0, 0, e2.width, e2.height);
      C(o2.element, { width: e2.style.width, height: e2.style.height }), i2.parentNode.insertBefore(o2.element, i2), i2.remove();
    }), t2.container.innerHTML;
  }
  getFilename() {
    let e = this.chart.userOptions.title?.text, t2 = this.options.filename;
    return t2 ? t2.replace(/\//g, "-") : ("string" == typeof e && (t2 = e.toLowerCase().replace(/<\/?[^>]+(>|$)/g, "").replace(/[\s_]+/g, "-").replace(/[^a-z\d\-]/g, "").replace(/^[\-]+/g, "").replace(/[\-]+/g, "-").substr(0, 24).replace(/[\-]+$/g, "")), (!t2 || t2.length < 5) && (t2 = "chart"), t2);
  }
  getSVG(e, t2) {
    let n2 = this.chart, i2, r2, a2 = D(n2.options, e);
    a2.plotOptions = D(n2.userOptions.plotOptions, e?.plotOptions), a2.time = D(n2.userOptions.time, e?.time);
    let l2 = O("div", void 0, { position: "absolute", top: "-9999em", width: n2.chartWidth + "px", height: n2.chartHeight + "px" }, K.body), s2 = n2.renderTo.style.width, c2 = n2.renderTo.style.height, h2 = a2.exporting?.sourceWidth || a2.chart.width || /px$/.test(s2) && parseInt(s2, 10) || (a2.isGantt ? 800 : 600), p2 = a2.exporting?.sourceHeight || a2.chart.height || /px$/.test(c2) && parseInt(c2, 10) || 400;
    k(a2.chart, { animation: false, renderTo: l2, forExport: true, renderer: "SVGRenderer", width: h2, height: p2 }), a2.exporting && (a2.exporting.enabled = false), delete a2.data, a2.series = [], n2.series.forEach(function(e2) {
      (r2 = D(e2.userOptions, { animation: false, enableMouseTracking: false, showCheckbox: false, visible: e2.visible })).isInternal || a2?.series?.push(r2);
    });
    let d2 = {};
    n2.axes.forEach(function(e2) {
      e2.userOptions.internalKey || (e2.userOptions.internalKey = (0, o.uniqueKey)()), a2 && !e2.options.isInternal && (d2[e2.coll] || (d2[e2.coll] = true, a2[e2.coll] = []), a2[e2.coll].push(D(e2.userOptions, { visible: e2.visible, type: e2.type, uniqueNames: e2.uniqueNames })));
    }), a2.colorAxis = n2.userOptions.colorAxis;
    let u2 = (t3) => {
      e && ["xAxis", "yAxis", "series"].forEach(function(n3) {
        e[n3] && t3.update({ [n3]: e[n3] });
      }), n2.axes.forEach(function(n3) {
        let i3 = P(t3.axes, (e2) => e2.options.internalKey === n3.userOptions.internalKey);
        if (i3) {
          var o3;
          let t4 = n3.getExtremes(), r3 = (L(o3 = e?.[n3.coll] || {}) ? o3 : [o3])[0], a3 = "min" in r3 ? r3.min : t4.userMin, l3 = "max" in r3 ? r3.max : t4.userMax;
          (void 0 !== a3 && a3 !== i3.min || void 0 !== l3 && l3 !== i3.max) && i3.setExtremes(a3 ?? void 0, l3 ?? void 0, true, false);
        }
      });
      let o2 = t3.exporting;
      return o2?.options.applyStyleSheets && this.applyShadowDOMStyles(t3), i2 = o2?.getChartHTML(n2.styledMode || a2?.exporting?.applyStyleSheets) || "", F(n2, "getSVG", { chartCopy: t3 }), i2 = _ee.sanitizeSVG(i2, a2), a2 = void 0, t3.destroy(), T(l2), i2;
    };
    return t2 ? new Promise((e2) => new n2.constructor(a2 || {}, function(t3) {
      n2.callback?.call(this, t3), e2(u2(this));
    })) : u2(new n2.constructor(a2, n2.callback));
  }
  applyShadowDOMStyles(e) {
    let t2 = this.chart, n2 = [], i2 = t2.container, o2;
    for (; i2 && (!(o2 = i2.getRootNode()) || "object" != typeof o2.host); ) i2 = i2.parentNode, o2 = null;
    o2?.querySelectorAll("style").forEach((t3) => {
      let i3 = t3.cloneNode(true);
      e.container.appendChild(i3), n2.push(i3);
    }), E(t2, "getSVG", () => {
      n2.forEach((e2) => {
        e2.remove();
      });
    });
  }
  async getSVGForExport(e, t2) {
    let n2 = this.options;
    return await this.getSVG(D({ chart: { borderRadius: 0 } }, n2.chartOptions, t2, { exporting: { sourceWidth: e?.sourceWidth || n2.sourceWidth, sourceHeight: e?.sourceHeight || n2.sourceHeight } }), true);
  }
  inlineStyles() {
    let e, t2 = _ee.inlineDenylist, n2 = _ee.inlineAllowlist, i2 = {}, o2 = O("iframe", void 0, { width: "1px", height: "1px", visibility: "hidden" }, K.body), r2 = o2.contentWindow?.document;
    r2 && r2.body.appendChild(r2.createElementNS(Y, "svg")), !(function o3(a2) {
      let l2, s2, c2, h2, p2, d2, u2 = {};
      if (r2 && 1 === a2.nodeType && -1 === _ee.unstyledElements.indexOf(a2.nodeName)) {
        if (l2 = Z.getComputedStyle(a2, null), s2 = "svg" === a2.nodeName ? {} : Z.getComputedStyle(a2.parentNode, null), !i2[a2.nodeName]) {
          e = r2.getElementsByTagName("svg")[0], c2 = r2.createElementNS(a2.namespaceURI, a2.nodeName), e.appendChild(c2);
          let t3 = Z.getComputedStyle(c2, null), n3 = {};
          for (let e2 in t3) e2.length < 1e3 && "string" == typeof t3[e2] && !/^\d+$/.test(e2) && (n3[e2] = t3[e2]);
          i2[a2.nodeName] = n3, "text" === a2.nodeName && delete i2.text.fill, e.removeChild(c2);
        }
        for (let e2 in l2) (J || _ || X || Object.hasOwnProperty.call(l2, e2)) && (function(e3, o4) {
          if (h2 = p2 = false, n2.length) {
            for (d2 = n2.length; d2-- && !p2; ) p2 = n2[d2].test(o4);
            h2 = !p2;
          }
          for ("transform" === o4 && "none" === e3 && (h2 = true), d2 = t2.length; d2-- && !h2; ) {
            if (o4.length > 1e3) throw Error("Input too long");
            h2 = t2[d2].test(o4) || "function" == typeof e3;
          }
          !h2 && (s2[o4] !== e3 || "svg" === a2.nodeName) && i2[a2.nodeName][o4] !== e3 && (_ee.inlineToAttributes && -1 === _ee.inlineToAttributes.indexOf(o4) ? u2[o4] = e3 : e3 && a2.setAttribute(_ee.hyphenate(o4), e3));
        })(l2[e2], e2);
        if (C(a2, u2), "svg" === a2.nodeName && a2.setAttribute("stroke-width", "1px"), "text" === a2.nodeName) return;
        [].forEach.call(a2.children || a2.childNodes, o3);
      }
    })(this.chart.container.querySelector("svg")), e.parentNode.removeChild(e), o2.parentNode.removeChild(o2);
  }
  async localExport(e, t2) {
    let n2 = this.chart, i2, o2, r2 = null, a2;
    if (_ && n2.styledMode && !_ee.inlineAllowlist.length && _ee.inlineAllowlist.push(/^blockSize/, /^border/, /^caretColor/, /^color/, /^columnRule/, /^columnRuleColor/, /^cssFloat/, /^cursor/, /^fill$/, /^fillOpacity/, /^font/, /^inlineSize/, /^length/, /^lineHeight/, /^opacity/, /^outline/, /^parentRule/, /^rx$/, /^ry$/, /^stroke/, /^textAlign/, /^textAnchor/, /^textDecoration/, /^transform/, /^vectorEffect/, /^visibility/, /^x$/, /^y$/), _ && ("application/pdf" === e.type || n2.container.getElementsByTagName("image").length && "image/svg+xml" !== e.type) || "application/pdf" === e.type && [].some.call(n2.container.getElementsByTagName("image"), function(e2) {
      let t3 = e2.getAttribute("href");
      return "" !== t3 && "string" == typeof t3 && 0 !== t3.indexOf("data:");
    })) return void await this.fallbackToServer(e, Error("Image type not supported for this chart/browser."));
    let l2 = E(n2, "getSVG", (e2) => {
      o2 = e2.chartCopy.options, a2 = (i2 = e2.chartCopy.container.cloneNode(true)) && i2.getElementsByTagName("image") || [];
    });
    try {
      let n3;
      for (let n4 of (await this.getSVGForExport(e, t2), a2 ? Array.from(a2) : [])) if (r2 = n4.getAttributeNS("http://www.w3.org/1999/xlink", "href")) {
        _ee.objectURLRevoke = false;
        let t3 = await _ee.imageToDataURL(r2, e?.scale || 1, e?.type || "image/png");
        n4.setAttributeNS("http://www.w3.org/1999/xlink", "href", t3);
      } else n4.parentNode.removeChild(n4);
      let l3 = i2?.querySelector("svg");
      l3 && !e.chartOptions?.chart?.style?.fontFamily && await _ee.inlineFonts(l3);
      let s2 = (n3 = i2?.innerHTML, _ee.sanitizeSVG(n3 || "", o2));
      if (s2.indexOf("<foreignObject") > -1 && "image/svg+xml" !== e.type && (_ || "application/pdf" === e.type)) throw Error("Image type not supported for charts with embedded HTML");
      return await this.downloadSVG(s2, k({ filename: this.getFilename() }, e)), s2;
    } catch (t3) {
      await this.fallbackToServer(e, t3);
    } finally {
      l2();
    }
  }
  moveContainers(e) {
    let t2 = this.chart, { scrollablePlotArea: n2 } = t2;
    (n2 ? [n2.fixedDiv, n2.scrollingContainer] : [t2.container]).forEach(function(t3) {
      e.appendChild(t3);
    });
  }
  print() {
    let e = this.chart;
    this.isPrinting || (_ee.printingChart = e, X || this.beforePrint(), setTimeout(() => {
      Z.focus(), Z.print(), X || setTimeout(() => {
        e.exporting?.afterPrint();
      }, 1e3);
    }, 1));
  }
  render() {
    let e = this, { chart: t2, options: n2 } = e, i2 = e?.isDirty || !e?.svgElements.length;
    e.buttonOffset = 0, e.isDirty && e.destroy(), i2 && false !== n2.enabled && (e.events = [], e.group || (e.group = t2.renderer.g("exporting-group").attr({ zIndex: 3 }).add()), M(n2?.buttons, function(t3) {
      e.addButton(t3);
    }), e.isDirty = false);
  }
  resolveCSSVariables() {
    Array.from(this.chart.container.querySelectorAll("*")).forEach((e) => {
      ["color", "fill", "stop-color", "stroke"].forEach((t2) => {
        let n2 = e.getAttribute(t2);
        n2?.includes("var(") && e.setAttribute(t2, getComputedStyle(e).getPropertyValue(t2));
        let i2 = e.style?.[t2];
        i2?.includes("var(") && (e.style[t2] = getComputedStyle(e).getPropertyValue(t2));
      });
    });
  }
  update(e, t2) {
    this.isDirty = true, D(true, this.options, e), j(t2, true) && this.chart.redraw();
  }
};
ee.inlineAllowlist = [], ee.inlineDenylist = [/-/, /^(clipPath|cssText|d|height|width)$/, /^font$/, /[lL]ogical(Width|Height)$/, /^parentRule$/, /^(cssRules|ownerRules)$/, /perspective/, /TapHighlightColor/, /^transition/, /^length$/, /^\d+$/], ee.inlineToAttributes = ["fill", "stroke", "strokeLinecap", "strokeLinejoin", "strokeWidth", "textAnchor", "x", "y"], ee.loadEventDeferDelay = 150 * !!_, ee.unstyledElements = ["clipPath", "defs", "desc"], (function(e) {
  function t2(e2) {
    let t3 = e2.exporting;
    t3 && (t3.render(), E(e2, "redraw", function() {
      this.exporting?.render();
    }), E(e2, "destroy", function() {
      this.exporting?.destroy();
    }));
  }
  function n2() {
    let t3 = this;
    t3.options.exporting && (t3.exporting = new e(t3, t3.options.exporting), d.compose(t3).navigation.addUpdate((e2, n3) => {
      t3.exporting && (t3.exporting.isDirty = true, D(true, t3.options.navigation, e2), j(n3, true) && t3.redraw());
    }));
  }
  function i2({ alignTo: e2, key: t3, textPxLength: n3 }) {
    let i3 = this.options.exporting, { align: o2, buttonSpacing: r2 = 0, verticalAlign: a2, width: l2 = 0 } = D(this.options.navigation?.buttonOptions, i3?.buttons?.contextButton), s2 = e2.width - n3, c2 = l2 + r2;
    (i3?.enabled ?? true) && "title" === t3 && "right" === o2 && "top" === a2 && s2 < 2 * c2 && (s2 < c2 ? e2.width -= c2 : this.title?.alignValue !== "left" && (e2.x -= c2 - s2 / 2));
  }
  e.compose = function(o2, r2) {
    w.compose(r2), $.compose(o2), H(z, "Exporting") && (k(c().prototype, { exportChart: async function(e2, t3) {
      await this.exporting?.exportChart(e2, t3);
    }, getChartHTML: function(e2) {
      return this.exporting?.getChartHTML(e2);
    }, getFilename: function() {
      return this.exporting?.getFilename();
    }, getSVG: function(e2) {
      return this.exporting?.getSVG(e2, false);
    }, print: function() {
      return this.exporting?.print();
    } }), o2.prototype.callbacks.push(t2), E(o2, "afterInit", n2), E(o2, "layOutTitle", i2), X && Z.matchMedia("print").addListener(function(t3) {
      e.printingChart && (t3.matches ? e.printingChart.exporting?.beforePrint() : e.printingChart.exporting?.afterPrint());
    }), q(v));
  };
})(ee || (ee = {}));
var et = r();
et.Exporting = ee, et.HttpUtilities = et.HttpUtilities || V, et.ajax = et.HttpUtilities.ajax, et.getJSON = et.HttpUtilities.getJSON, et.post = et.HttpUtilities.post, ee.compose(et.Chart, et.Renderer);
var en = r();
export {
  en as default
};
//# sourceMappingURL=highcharts_esm_modules_exporting.js.map
