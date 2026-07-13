import {
  __spreadProps,
  __spreadValues
} from "./chunk-PCCZHGCK.js";

// node_modules/highcharts/esm/highcharts.js
var t;
var e;
var i;
var s;
var o;
var r;
var a;
var n;
var h;
var l;
var d;
var c;
var p;
var g;
var u;
var f;
var m;
var x;
var y;
var b;
var v;
var k;
var w;
var M;
var S;
var T;
var C;
var A;
var P;
var L;
var O;
var E;
var I = {};
I.d = (t11, e10) => {
  for (var i10 in e10) I.o(e10, i10) && !I.o(t11, i10) && Object.defineProperty(t11, i10, { enumerable: true, get: e10[i10] });
}, I.o = (t11, e10) => Object.prototype.hasOwnProperty.call(t11, e10), (a = f || (f = {})).SVG_NS = "http://www.w3.org/2000/svg", a.product = "Highcharts", a.version = "12.6.0", a.win = "u" > typeof window ? window : {}, a.doc = a.win.document, a.svg = !!a.doc?.createElementNS?.(a.SVG_NS, "svg")?.createSVGRect, a.pageLang = a.doc?.documentElement?.closest("[lang]")?.lang, a.userAgent = a.win.navigator?.userAgent || "", a.isChrome = a.win.chrome, a.isFirefox = -1 !== a.userAgent.indexOf("Firefox"), a.isMS = /(edge|msie|trident)/i.test(a.userAgent) && !a.win.opera, a.isSafari = !a.isChrome && -1 !== a.userAgent.indexOf("Safari"), a.isTouchDevice = /(Mobile|Android|Windows Phone)/.test(a.userAgent), a.isWebKit = -1 !== a.userAgent.indexOf("AppleWebKit"), a.deg2rad = 2 * Math.PI / 360, a.marginNames = ["plotTop", "marginRight", "marginBottom", "plotLeft"], a.noop = function() {
}, a.supportsPassiveEvents = (function() {
  let t11 = false;
  if (!a.isMS) {
    let e10 = Object.defineProperty({}, "passive", { get: function() {
      t11 = true;
    } });
    a.win.addEventListener && a.win.removeEventListener && (a.win.addEventListener("testPassive", a.noop, e10), a.win.removeEventListener("testPassive", a.noop, e10));
  }
  return t11;
})(), a.charts = [], a.composed = [], a.dateFormats = {}, a.seriesTypes = {}, a.symbolSizes = {}, a.chartCount = 0;
var D = f;
var { doc: B, win: N } = D;
function z(t11, e10, i10, s10 = {}) {
  let o2 = "function" == typeof t11 && t11.prototype || t11;
  Object.hasOwnProperty.call(o2, "hcEvents") || (o2.hcEvents = {});
  let r2 = o2.hcEvents;
  D.Point && t11 instanceof D.Point && t11.series && t11.series.chart && (t11.series.chart.runTrackerClick = true);
  let a2 = t11.addEventListener;
  a2 && a2.call(t11, e10, i10, !!D.supportsPassiveEvents && { passive: void 0 === s10.passive ? -1 !== e10.indexOf("touch") : s10.passive, capture: false }), r2[e10] || (r2[e10] = []);
  let n2 = { fn: i10, order: "number" == typeof s10.order ? s10.order : 1 / 0 };
  return r2[e10].push(n2), r2[e10].sort((t12, e11) => t12.order - e11.order), function() {
    tM(t11, e10, i10);
  };
}
function R(t11) {
  let e10 = t11.length, i10 = t11[0];
  for (; e10--; ) t11[e10] < i10 && (i10 = t11[e10]);
  return i10;
}
function W(t11) {
  let e10 = t11.length, i10 = t11[0];
  for (; e10--; ) t11[e10] > i10 && (i10 = t11[e10]);
  return i10;
}
function X(t11, e10, i10) {
  let s10, o2 = tl(e10) && !$(i10), r2 = (e11, i11) => {
    $(e11) ? t11.setAttribute(i11, e11) : o2 ? (s10 = t11.getAttribute(i11)) || "class" !== i11 || (s10 = t11.getAttribute(i11 + "Name")) : t11.removeAttribute(i11);
  };
  return tl(e10) ? r2(i10, e10) : tf(e10, r2), s10;
}
function G(t11, e10, i10) {
  return t11 > e10 ? t11 < i10 ? t11 : i10 : e10;
}
function H(t11, e10) {
  return t11 > 1e14 ? t11 : parseFloat(t11.toPrecision(e10 || 14));
}
function F(t11, e10, i10, s10, o2) {
  let r2 = B.createElement(t11);
  return e10 && K(r2, e10), o2 && j(r2, { padding: "0", border: "none", margin: "0" }), i10 && j(r2, i10), s10 && s10.appendChild(r2), r2;
}
function Y(t11, e10 = 0, i10) {
  let s10 = e10 % 2 / 2, o2 = i10 ? -1 : 1;
  return (Math.round(t11 * o2 - s10) + s10) * o2;
}
function j(t11, e10) {
  K(t11.style, e10);
}
function $(t11) {
  return null != t11;
}
function V(t11, e10, i10) {
  tf(t11, function(s10, o2) {
    s10 !== e10 && s10?.destroy && s10.destroy(), (s10?.destroy || !i10) && delete t11[o2];
  });
}
function U(t11) {
  t11?.parentElement?.removeChild(t11);
}
function Z(t11, e10, i10, s10) {
  let o2 = {};
  return !(function t12(e11, o3, r2, a2) {
    let n2 = i10 ? o3 : e11;
    tf(e11, function(i11, h2) {
      if (!a2 && s10 && s10.indexOf(h2) > -1 && o3[h2]) {
        i11 = tS(i11), r2[h2] = [];
        for (let e12 = 0; e12 < Math.max(i11.length, o3[h2].length); e12++) o3[h2][e12] && (void 0 === i11[e12] ? r2[h2][e12] = o3[h2][e12] : (r2[h2][e12] = {}, t12(i11[e12], o3[h2][e12], r2[h2][e12], a2 + 1)));
      } else tp(i11, true) && !i11.nodeType ? (r2[h2] = td(i11) ? [] : {}, t12(i11, o3[h2] || {}, r2[h2], a2 + 1), 0 === Object.keys(r2[h2]).length && ("colorAxis" !== h2 || 0 !== a2) && delete r2[h2]) : (e11[h2] !== o3[h2] || h2 in e11 && !(h2 in o3)) && "__proto__" !== h2 && "constructor" !== h2 && (r2[h2] = n2[h2]);
    });
  })(t11, e10, o2, 0), o2;
}
function _(t11, e10) {
  let i10 = t11.length;
  for (; i10--; ) if (t11[i10] === e10) {
    t11.splice(i10, 1);
    break;
  }
}
function K(t11, e10) {
  let i10;
  for (i10 in t11 || (t11 = {}), e10) t11[i10] = e10[i10];
  return t11;
}
function q(t11, e10) {
  let i10 = function() {
  };
  return i10.prototype = new t11(), K(i10.prototype, e10), i10;
}
function J(t11, e10, i10, s10) {
  if (i10 = i10 || {}, B?.createEvent && (t11.dispatchEvent || t11.fireEvent && t11 !== D)) {
    let s11 = B.createEvent("Events");
    s11.initEvent(e10, true, true), i10 = K(s11, i10), t11.dispatchEvent ? t11.dispatchEvent(i10) : t11.fireEvent(e10, i10);
  } else if (t11.hcEvents) {
    i10.target || K(i10, { preventDefault: function() {
      i10.defaultPrevented = true;
    }, target: t11, type: e10 });
    let s11 = [], o2 = t11, r2 = false;
    for (; o2.hcEvents; ) Object.hasOwnProperty.call(o2, "hcEvents") && o2.hcEvents[e10] && (s11.length && (r2 = true), s11.unshift.apply(s11, o2.hcEvents[e10])), o2 = Object.getPrototypeOf(o2);
    r2 && s11.sort((t12, e11) => t12.order - e11.order), s11.forEach((e11) => {
      false === e11.fn.call(t11, i10, t11) && i10.preventDefault();
    });
  }
  s10 && !i10.defaultPrevented && s10.call(t11, i10);
}
var Q = (t11 = "") => ({ center: 0.5, right: 1, middle: 0.5, bottom: 1 })[t11] || 0;
function tt(t11, e10) {
  let i10, s10, o2, r2, a2 = !e10;
  return t11.forEach((t12) => {
    if (t12.length > 1) for (r2 = s10 = t12.length - 1; r2 > 0; r2--) (o2 = t12[r2] - t12[r2 - 1]) < 0 && !a2 ? (e10?.(), e10 = void 0) : o2 && (void 0 === i10 || o2 < i10) && (i10 = o2);
  }), i10;
}
function te(t11) {
  return Math.pow(10, Math.floor(Math.log(t11) / Math.LN10));
}
function ti(t11, e10) {
  let i10 = t11.split(".");
  for (; i10.length && $(e10); ) {
    let t12 = i10.shift();
    if (void 0 === t12 || "__proto__" === t12) return;
    if ("this" === t12) {
      let t13;
      return tp(e10) && (t13 = e10["@this"]), t13 ?? e10;
    }
    let s10 = e10[t12.replace(/[\\'"]/g, "")];
    if (!$(s10) || "function" == typeof s10 || "number" == typeof s10.nodeType || s10 === N) return;
    e10 = s10;
  }
  return e10;
}
function ts(t11, e10, i10) {
  let s10;
  if ("width" === e10) {
    let e11 = Math.min(t11.offsetWidth, t11.scrollWidth), i11 = t11.getBoundingClientRect?.().width;
    return i11 < e11 && i11 >= e11 - 1 && (e11 = Math.floor(i11)), Math.max(0, e11 - (ts(t11, "padding-left", true) || 0) - (ts(t11, "padding-right", true) || 0));
  }
  if ("height" === e10) return Math.max(0, Math.min(t11.offsetHeight, t11.scrollHeight) - (ts(t11, "padding-top", true) || 0) - (ts(t11, "padding-bottom", true) || 0));
  let o2 = N.getComputedStyle(t11, void 0);
  return o2 && (s10 = o2.getPropertyValue(e10), ty(i10, "opacity" !== e10) && (s10 = tb(s10))), s10;
}
var to = Array.prototype.find ? function(t11, e10) {
  return t11.find(e10);
} : function(t11, e10) {
  let i10, s10 = t11.length;
  for (i10 = 0; i10 < s10; i10++) if (e10(t11[i10], i10)) return t11[i10];
};
function tr(t11) {
  $(t11) && clearTimeout(t11);
}
function ta(t11) {
  return tp(t11) && "number" == typeof t11.nodeType;
}
function tn(t11) {
  let e10 = t11?.constructor;
  return !!(tp(t11, true) && !ta(t11) && e10?.name && "Object" !== e10.name);
}
function th(t11) {
  return "number" == typeof t11 && !isNaN(t11) && t11 < 1 / 0 && t11 > -1 / 0;
}
function tl(t11) {
  return "string" == typeof t11;
}
function td(t11) {
  let e10 = Object.prototype.toString.call(t11);
  return "[object Array]" === e10 || "[object Array Iterator]" === e10;
}
function tc(t11) {
  return "function" == typeof t11;
}
function tp(t11, e10) {
  return !!t11 && "object" == typeof t11 && (!e10 || !td(t11));
}
function tg(t11, ...e10) {
  let i10, s10 = [t11, ...e10], o2 = {}, r2 = function(t12, e11) {
    return "object" != typeof t12 && (t12 = {}), tf(e11, function(i11, s11) {
      "__proto__" !== s11 && "constructor" !== s11 && (!tp(i11, true) || tn(i11) || ta(i11) ? t12[s11] = e11[s11] : t12[s11] = r2(t12[s11] || {}, i11));
    }), t12;
  };
  true === t11 && (o2 = s10[1], s10 = Array.prototype.slice.call(s10, 2));
  let a2 = s10.length;
  for (i10 = 0; i10 < a2; i10++) o2 = r2(o2, s10[i10]);
  return o2;
}
function tu(t11, e10, i10, s10, o2) {
  let r2, a2 = t11;
  i10 = ty(i10, te(t11));
  let n2 = t11 / i10;
  for (!e10 && (e10 = o2 ? [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] : [1, 2, 2.5, 5, 10], false === s10 && (1 === i10 ? e10 = e10.filter(function(t12) {
    return t12 % 1 == 0;
  }) : i10 <= 0.1 && (e10 = [1 / i10]))), r2 = 0; r2 < e10.length && (a2 = e10[r2], (!o2 || !(a2 * i10 >= t11)) && (o2 || !(n2 <= (e10[r2] + (e10[r2 + 1] || e10[r2])) / 2))); r2++) ;
  return H(a2 * i10, -Math.round(Math.log(1e-3) / Math.LN10));
}
function tf(t11, e10, i10) {
  for (let s10 in t11) Object.hasOwnProperty.call(t11, s10) && e10.call(i10 || t11[s10], t11[s10], s10, t11);
}
function tm(t11) {
  let e10 = B.documentElement, i10 = t11.parentElement || t11.parentNode ? t11.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
  return { top: i10.top + (N.pageYOffset || e10.scrollTop) - (e10.clientTop || 0), left: i10.left + (N.pageXOffset || e10.scrollLeft) - (e10.clientLeft || 0), width: i10.width, height: i10.height };
}
function tx(t11, e10, i10) {
  return Array((e10 || 2) + 1 - String(t11).replace("-", "").length).join(i10 || "0") + t11;
}
function ty() {
  let t11 = arguments, e10 = t11.length;
  for (let i10 = 0; i10 < e10; i10++) {
    let e11 = t11[i10];
    if (null != e11) return e11;
  }
}
function tb(t11, e10) {
  return parseInt(t11, e10 || 10);
}
function tv(t11, e10) {
  return 0 > t11.indexOf(e10) && !!t11.push(e10);
}
function tk(t11, e10, i10) {
  return /%$/.test(t11) ? e10 * parseFloat(t11) / 100 + (i10 || 0) : parseFloat(t11);
}
function tw(t11, ...e10) {
  let i10, s10;
  do
    for (s10 of (i10 = t11, e10)) t11 = t11.replace(s10[0], s10[1]);
  while (t11 !== i10);
  return t11;
}
function tM(t11, e10, i10) {
  function s10(e11, i11) {
    let s11 = t11.removeEventListener;
    s11 && s11.call(t11, e11, i11, false);
  }
  function o2(i11) {
    let o3, r3;
    t11.nodeName && (e10 ? (o3 = {})[e10] = true : o3 = i11, tf(o3, function(t12, e11) {
      if (i11[e11]) for (r3 = i11[e11].length; r3--; ) s10(e11, i11[e11][r3].fn);
    }));
  }
  let r2 = "function" == typeof t11 && t11.prototype || t11;
  if (Object.hasOwnProperty.call(r2, "hcEvents")) {
    let t12 = r2.hcEvents;
    if (e10) {
      let r3 = t12[e10] || [];
      i10 ? (t12[e10] = r3.filter(function(t13) {
        return i10 !== t13.fn;
      }), s10(e10, i10)) : (o2(t12), t12[e10] = []);
    } else o2(t12), delete r2.hcEvents;
  }
}
function tS(t11) {
  return td(t11) ? t11 : [t11];
}
function tT(t11, e10) {
  let i10, s10, o2 = t11.length;
  for (s10 = 0; s10 < o2; s10++) t11[s10].safeI = s10;
  for (t11.sort(function(t12, s11) {
    return 0 === (i10 = e10(t12, s11)) ? t12.safeI - s11.safeI : i10;
  }), s10 = 0; s10 < o2; s10++) delete t11[s10].safeI;
}
function tC(t11, e10, i10) {
  return e10 > 0 ? setTimeout(t11, e10, i10) : (t11.call(0, i10), -1);
}
function tA(t11) {
  return tl(t11) ? t11.substring(0, 1).toUpperCase() + t11.substring(1) : String(t11);
}
var { charts: tP, win: tL } = D;
function tO(t11, e10, i10, s10) {
  let o2 = e10 ? "Highcharts error" : "Highcharts warning";
  32 === t11 && (t11 = `${o2}: Deprecated member`);
  let r2 = th(t11), a2 = r2 ? `${o2} #${t11}: www.highcharts.com/errors/${t11}/` : t11.toString();
  if (void 0 !== s10) {
    let t12 = "";
    r2 && (a2 += "?"), tf(s10, function(e11, i11) {
      t12 += `
 - ${i11}: ${e11}`, r2 && (a2 += encodeURI(i11) + "=" + encodeURI(e11));
    }), a2 += t12;
  }
  J(D, "displayError", { chart: i10, code: t11, message: a2, params: s10 }, function() {
    if (e10) throw Error(a2);
    tL.console && -1 === tO.messages.indexOf(a2) && console.warn(a2);
  }), tO.messages.push(a2);
}
function tE(t11, e10) {
  let i10, s10 = t11.options.index, o2 = e10.length;
  for (i10 = t11.options.isInternal ? o2 : 0; i10 < o2 + 1; i10++) if (!e10[i10] || th(s10) && s10 < ty(e10[i10].options.index, e10[i10]._i) || e10[i10].options.isInternal) {
    e10.splice(i10, 0, t11);
    break;
  }
  return i10;
}
(tO || (tO = {})).messages = [];
var tI = { millisecond: 1, second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 24192e5, year: 314496e5 };
Math.easeInOutSine = function(t11) {
  return -0.5 * (Math.cos(Math.PI * t11) - 1);
};
var tD = (i = Math.random().toString(36).substring(2, 9) + "-", s = 0, function() {
  return "highcharts-" + (t ? "" : i) + s++;
});
tL.jQuery && (tL.jQuery.fn.highcharts = function() {
  let t11 = [].slice.call(arguments);
  if (this[0]) return t11[0] ? (new D[tl(t11[0]) ? t11.shift() : "Chart"](this[0], t11[0], t11[1]), this) : tP[X(this[0], "data-highcharts-chart")];
});
var { pageLang: tB, win: tN } = D;
var tz = D.isSafari && tN.Intl && !tN.Intl.DateTimeFormat.prototype.formatRange;
var tR = class {
  constructor(t11, e10) {
    this.options = { timezone: "UTC" }, this.variableTimezone = false, this.Date = tN.Date, this.update(t11), this.lang = e10;
  }
  update(t11 = {}) {
    this.dTLCache = {}, this.options = t11 = tg(true, this.options, t11);
    let { timezoneOffset: e10, useUTC: i10, locale: s10 } = t11;
    this.Date = t11.Date || tN.Date || Date;
    let o2 = t11.timezone;
    $(i10) && (o2 = i10 ? "UTC" : void 0), e10 && e10 % 60 == 0 && (o2 = "Etc/GMT" + (e10 > 0 ? "+" : "") + e10 / 60), this.variableTimezone = "UTC" !== o2 && o2?.indexOf("Etc/GMT") !== 0, this.timezone = o2, this.lang && s10 && (this.lang.locale = s10), ["months", "shortMonths", "weekdays", "shortWeekdays"].forEach((t12) => {
      let e11 = /months/i.test(t12), i11 = /short/.test(t12), s11 = { timeZone: "UTC" };
      s11[e11 ? "month" : "weekday"] = i11 ? "short" : "long", this[t12] = (e11 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [3, 4, 5, 6, 7, 8, 9]).map((t13) => this.dateFormat(s11, (e11 ? 31 : 1) * 24 * 36e5 * t13));
    });
  }
  toParts(t11) {
    let [e10, i10, s10, o2, r2, a2, n2] = this.dateTimeFormat({ weekday: "narrow", day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }, t11, "es").split(/(?:, | |\/|:)/g);
    return [o2, s10 - 1, i10, r2, a2, n2, Math.floor(Number(t11) || 0) % 1e3, "DLMXJVS".indexOf(e10)].map(Number);
  }
  dateTimeFormat(t11, e10, i10 = this.options.locale || tB) {
    let s10 = JSON.stringify(t11) + i10;
    tl(t11) && (t11 = this.str2dtf(t11));
    let o2 = this.dTLCache[s10];
    if (!o2) {
      t11.timeZone ?? (t11.timeZone = this.timezone);
      try {
        o2 = new Intl.DateTimeFormat(i10, t11);
      } catch (e11) {
        /Invalid time zone/i.test(e11.message) ? (tO(34), t11.timeZone = "UTC", o2 = new Intl.DateTimeFormat(i10, t11)) : tO(e11.message, false);
      }
    }
    return this.dTLCache[s10] = o2, o2?.format(e10) || "";
  }
  str2dtf(t11, e10 = {}) {
    let i10 = { L: { fractionalSecondDigits: 3 }, S: { second: "2-digit" }, M: { minute: "numeric" }, H: { hour: "2-digit" }, k: { hour: "numeric" }, E: { weekday: "narrow" }, a: { weekday: "short" }, A: { weekday: "long" }, d: { day: "2-digit" }, e: { day: "numeric" }, b: { month: "short" }, B: { month: "long" }, m: { month: "2-digit" }, o: { month: "numeric" }, y: { year: "2-digit" }, Y: { year: "numeric" } };
    return Object.keys(i10).forEach((s10) => {
      -1 !== t11.indexOf(s10) && K(e10, i10[s10]);
    }), e10;
  }
  makeTime(t11, e10, i10 = 1, s10 = 0, o2, r2, a2) {
    let n2 = this.Date.UTC(t11, e10, i10, s10, o2 || 0, r2 || 0, a2 || 0);
    if ("UTC" !== this.timezone) {
      let t12 = this.getTimezoneOffset(n2);
      if (n2 += t12, -1 !== [2, 3, 8, 9, 10, 11].indexOf(e10) && (s10 < 5 || s10 > 20)) {
        let e11 = this.getTimezoneOffset(n2);
        t12 !== e11 ? n2 += e11 - t12 : t12 - 36e5 !== this.getTimezoneOffset(n2 - 36e5) || tz || (n2 -= 36e5);
      }
    }
    return n2;
  }
  parse(t11) {
    if (!tl(t11)) return t11 ?? void 0;
    let e10 = (t11 = t11.replace(/\//g, "-").replace(/(GMT|UTC)/, "")).indexOf("Z") > -1 || /([+-][0-9]{2}):?[0-9]{2}$/.test(t11), i10 = /^[0-9]{4}-[0-9]{2}(-[0-9]{2}|)$/.test(t11);
    e10 || i10 || (t11 += "Z");
    let s10 = Date.parse(t11);
    if (th(s10)) return s10 + (!e10 || i10 ? this.getTimezoneOffset(s10) : 0);
  }
  getTimezoneOffset(t11) {
    if ("UTC" !== this.timezone) {
      let [e10, i10, s10, o2, r2 = 0] = this.dateTimeFormat({ timeZoneName: "shortOffset" }, t11, "en").split(/(GMT|:)/).map(Number), a2 = -(60 * (s10 + r2 / 60) * 6e4);
      if (th(a2)) return a2;
    }
    return 0;
  }
  dateFormat(t11, e10, i10) {
    let s10 = this.lang;
    if (!$(e10) || isNaN(e10)) return s10?.invalidDate || "";
    if (tl(t11 = t11 ?? "%Y-%m-%d %H:%M:%S")) {
      let i11, o2 = /%\[([a-zA-Z]+)\]/g;
      for (; i11 = o2.exec(t11); ) t11 = t11.replace(i11[0], this.dateTimeFormat(i11[1], e10, s10?.locale));
    }
    if (tl(t11) && -1 !== t11.indexOf("%")) {
      let i11 = this, [o2, r2, a2, n2, h2, l2, d2, c2] = this.toParts(e10), p2 = s10?.weekdays || this.weekdays, g2 = s10?.shortWeekdays || this.shortWeekdays, u2 = s10?.months || this.months, f2 = s10?.shortMonths || this.shortMonths;
      tf(K({ a: g2 ? g2[c2] : p2[c2].substr(0, 3), A: p2[c2], d: tx(a2), e: tx(a2, 2, " "), w: c2, v: s10?.weekFrom ?? "", b: f2[r2], B: u2[r2], m: tx(r2 + 1), o: r2 + 1, y: o2.toString().substr(2, 2), Y: o2, H: tx(n2), k: n2, I: tx(n2 % 12 || 12), l: n2 % 12 || 12, M: tx(h2), p: n2 < 12 ? "AM" : "PM", P: n2 < 12 ? "am" : "pm", S: tx(l2), L: tx(d2, 3) }, D.dateFormats), function(s11, o3) {
        if (tl(t11)) for (; -1 !== t11.indexOf("%" + o3); ) t11 = t11.replace("%" + o3, "function" == typeof s11 ? s11.call(i11, e10, i11) : s11);
      });
    } else if (tp(t11)) {
      let i11 = (this.getTimezoneOffset(e10) || 0) / 36e5, s11 = this.timezone || "Etc/GMT" + (i11 >= 0 ? "+" : "") + i11, { prefix: o2 = "", suffix: r2 = "" } = t11;
      t11 = o2 + this.dateTimeFormat(K({ timeZone: s11 }, t11), e10) + r2;
    }
    return i10 ? tA(t11) : t11;
  }
  resolveDTLFormat(t11) {
    return tp(t11, true) ? tp(t11, true) && void 0 === t11.main ? { main: t11 } : t11 : { main: (t11 = tS(t11))[0], from: t11[1], to: t11[2] };
  }
  getDateFormat(t11, e10, i10, s10) {
    let o2 = this.dateFormat("%m-%d %H:%M:%S.%L", e10), r2 = "01-01 00:00:00.000", a2 = { millisecond: 15, second: 12, minute: 9, hour: 6, day: 3 }, n2 = "millisecond", h2 = n2;
    for (n2 in tI) {
      if (t11 && t11 === tI.week && +this.dateFormat("%w", e10) === i10 && o2.substr(6) === r2.substr(6)) {
        n2 = "week";
        break;
      }
      if (t11 && tI[n2] > t11) {
        n2 = h2;
        break;
      }
      if (a2[n2] && o2.substr(a2[n2]) !== r2.substr(a2[n2])) break;
      "week" !== n2 && (h2 = n2);
    }
    return this.resolveDTLFormat(s10[n2]).main;
  }
};
var tW = class extends tR {
  getTimeTicks(t11, e10, i10, s10) {
    let o2 = this, r2 = [], a2 = {}, { count: n2 = 1, unitRange: h2 } = t11, [l2, d2, c2, p2, g2, u2] = o2.toParts(e10), f2 = (e10 || 0) % 1e3, m2;
    if (s10 ?? (s10 = 1), $(e10)) {
      if (f2 = h2 >= tI.second ? 0 : n2 * Math.floor(f2 / n2), h2 >= tI.second && (u2 = h2 >= tI.minute ? 0 : n2 * Math.floor(u2 / n2)), h2 >= tI.minute && (g2 = h2 >= tI.hour ? 0 : n2 * Math.floor(g2 / n2)), h2 >= tI.hour && (p2 = h2 >= tI.day ? 0 : n2 * Math.floor(p2 / n2)), h2 >= tI.day && (c2 = h2 >= tI.month ? 1 : Math.max(1, n2 * Math.floor(c2 / n2))), h2 >= tI.month && (d2 = h2 >= tI.year ? 0 : n2 * Math.floor(d2 / n2)), h2 >= tI.year && (l2 -= l2 % n2), h2 === tI.week) {
        n2 && (e10 = o2.makeTime(l2, d2, c2, p2, g2, u2, f2));
        let t13 = this.dateTimeFormat({ timeZone: this.timezone, weekday: "narrow" }, e10, "es"), i11 = "DLMXJVS".indexOf(t13);
        c2 += -i11 + s10 + (i11 < s10 ? -7 : 0);
      }
      e10 = o2.makeTime(l2, d2, c2, p2, g2, u2, f2), o2.variableTimezone && $(i10) && (m2 = i10 - e10 > 4 * tI.month || o2.getTimezoneOffset(e10) !== o2.getTimezoneOffset(i10));
      let t12 = e10, x2 = 1;
      for (; t12 < i10; ) r2.push(t12), h2 === tI.year ? t12 = o2.makeTime(l2 + x2 * n2, 0) : h2 === tI.month ? t12 = o2.makeTime(l2, d2 + x2 * n2) : m2 && (h2 === tI.day || h2 === tI.week) ? t12 = o2.makeTime(l2, d2, c2 + x2 * n2 * (h2 === tI.day ? 1 : 7)) : m2 && h2 === tI.hour && n2 > 1 ? t12 = o2.makeTime(l2, d2, c2, p2 + x2 * n2) : t12 += h2 * n2, x2++;
      r2.push(t12), h2 <= tI.hour && r2.length < 1e4 && r2.forEach((t13) => {
        t13 % 18e5 == 0 && "000000000" === o2.dateFormat("%H%M%S%L", t13) && (a2[t13] = "day");
      });
    }
    return r2.info = K(t11, { higherRanks: a2, totalRange: h2 * n2 }), r2;
  }
};
var { isTouchDevice: tX } = D;
var tG = { colors: ["#2caffe", "#544fc5", "#00e272", "#fe6a35", "#6b8abc", "#d568fb", "#2ee0ca", "#fa4b42", "#feb56a", "#91e8e1"], symbols: ["circle", "diamond", "square", "triangle", "triangle-down"], lang: { weekFrom: "week from", chartTitle: "Chart title", locale: void 0, loading: "Loading...", months: void 0, seriesName: "Series {add index 1}", shortMonths: void 0, weekdays: void 0, numericSymbols: ["k", "M", "G", "T", "P", "E"], pieSliceName: "Slice", resetZoom: "Reset zoom", yAxisTitle: "Values", resetZoomTitle: "Reset zoom level 1:1" }, global: { buttonTheme: { fill: "#f7f7f7", padding: 8, r: 2, stroke: "#cccccc", "stroke-width": 1, style: { color: "#333333", cursor: "pointer", fontSize: "0.8em", fontWeight: "normal" }, states: { hover: { fill: "#e6e6e6" }, select: { fill: "#e6e9ff", style: { color: "#000000", fontWeight: "bold" } }, disabled: { style: { color: "#cccccc" } } } } }, time: { Date: void 0, timezone: "UTC", timezoneOffset: 0, useUTC: void 0 }, chart: { alignThresholds: false, panning: { enabled: false, type: "x" }, styledMode: false, borderRadius: 0, colorCount: 10, allowMutatingData: true, ignoreHiddenSeries: true, spacing: [10, 10, 15, 10], resetZoomButton: { theme: {}, position: {} }, reflow: true, type: "line", zooming: { singleTouch: false, resetButton: { theme: { zIndex: 6 }, position: { align: "right", x: -10, y: 10 } } }, width: null, height: null, borderColor: "#334eff", backgroundColor: "#ffffff", plotBorderColor: "#cccccc" }, title: { style: { color: "#333333", fontWeight: "bold" }, text: "Chart title", margin: 15, minScale: 0.67 }, subtitle: { style: { color: "#666666", fontSize: "0.8em" }, text: "" }, caption: { margin: 15, style: { color: "#666666", fontSize: "0.8em" }, text: "", align: "left", verticalAlign: "bottom" }, plotOptions: {}, legend: { enabled: true, align: "center", alignColumns: true, className: "highcharts-no-tooltip", events: {}, layout: "horizontal", itemMarginBottom: 2, itemMarginTop: 2, labelFormatter: function() {
  return this.name;
}, borderColor: "#999999", borderRadius: 0, navigation: { style: { fontSize: "0.8em" }, activeColor: "#0022ff", inactiveColor: "#cccccc" }, itemStyle: { color: "#333333", cursor: "pointer", fontSize: "0.8em", textDecoration: "none", textOverflow: "ellipsis" }, itemHoverStyle: { color: "#000000" }, itemHiddenStyle: { color: "#666666", textDecoration: "line-through" }, shadow: false, itemCheckboxStyle: { position: "absolute", width: "13px", height: "13px" }, squareSymbol: true, symbolPadding: 5, verticalAlign: "bottom", x: 0, y: 0, title: { style: { color: "#333333", fontSize: "0.8em", fontWeight: "bold" } } }, loading: { labelStyle: { fontWeight: "bold", position: "relative", top: "45%" }, style: { position: "absolute", backgroundColor: "#ffffff", opacity: 0.5, textAlign: "center" } }, tooltip: { enabled: true, animation: { duration: 300, easing: (t11) => Math.sqrt(1 - Math.pow(t11 - 1, 2)) }, borderRadius: 3, dateTimeLabelFormats: { millisecond: "%[AebHMSL]", second: "%[AebHMS]", minute: "%[AebHM]", hour: "%[AebHM]", day: "%[AebY]", week: "%v %[AebY]", month: "%[BY]", year: "%Y" }, footerFormat: "", headerShape: "callout", hideDelay: 500, showDelay: 0, padding: 8, position: { x: 0, y: 3 }, shared: false, snap: tX ? 25 : 10, headerFormat: '<span style="font-size: 0.8em">{ucfirst point.key}</span><br/>', pointFormat: '<span style="color:{point.color}">●</span> {series.name}: <b>{point.y}</b><br/>', backgroundColor: "#ffffff", borderWidth: void 0, stickOnContact: false, style: { color: "#333333", cursor: "default", fontSize: "0.8em" }, useHTML: false }, credits: { enabled: true, href: "https://www.highcharts.com?credits", position: { align: "right", x: -10, verticalAlign: "bottom", y: -5 }, style: { cursor: "pointer", color: "#999999", fontSize: "0.6em" }, text: "Highcharts.com" } };
var tH = new tW(tG.time, tG.lang);
var tF = { defaultOptions: tG, defaultTime: tH, getOptions: function() {
  return tG;
}, setOptions: function(t11) {
  return J(D, "setOptions", { options: t11 }), tg(true, tG, t11), t11.time && tH.update(tG.time), t11.lang && "locale" in t11.lang && tH.update({ locale: t11.lang.locale }), t11.lang?.chartTitle && (tG.title = __spreadProps(__spreadValues({}, tG.title), { text: t11.lang.chartTitle })), tG;
} };
var { win: tY } = D;
var tj = (t11, e10, i10) => `color-mix(in srgb,${t11},${e10} ${100 * i10}%)`;
var t$ = (t11) => tl(t11) && !!t11 && "none" !== t11;
var tV = class _tV {
  static parse(t11) {
    return t11 ? new _tV(t11) : _tV.None;
  }
  constructor(t11) {
    let e10, i10, s10, o2;
    this.rgba = [NaN, NaN, NaN, NaN], this.input = t11;
    let r2 = D.Color;
    if (r2 && r2 !== _tV) return new r2(t11);
    if ("object" == typeof t11 && void 0 !== t11.stops) this.stops = t11.stops.map((t12) => new _tV(t12[1]));
    else if ("string" == typeof t11) for (this.input = t11 = _tV.names[t11.toLowerCase()] || t11, s10 = _tV.parsers.length; s10-- && !i10; ) (e10 = (o2 = _tV.parsers[s10]).regex.exec(t11)) && (i10 = o2.parse(e10));
    i10 && (this.rgba = i10);
  }
  get(t11) {
    let e10 = this.input, i10 = this.rgba;
    if (this.output) return this.output;
    if ("object" == typeof e10 && void 0 !== this.stops) {
      let i11 = tg(e10);
      return i11.stops = [].slice.call(i11.stops), this.stops.forEach((e11, s10) => {
        i11.stops[s10] = [i11.stops[s10][0], e11.get(t11)];
      }), i11;
    }
    return i10 && th(i10[0]) ? "rgb" !== t11 && (t11 || 1 !== i10[3]) ? "a" === t11 ? `${i10[3]}` : "rgba(" + i10.join(",") + ")" : "rgb(" + i10[0] + "," + i10[1] + "," + i10[2] + ")" : e10;
  }
  brighten(t11) {
    let e10 = this.rgba;
    if (this.stops) this.stops.forEach(function(e11) {
      e11.brighten(t11);
    });
    else if (th(t11) && 0 !== t11) if (th(e10[0])) for (let i10 = 0; i10 < 3; i10++) e10[i10] += tb(255 * t11), e10[i10] < 0 && (e10[i10] = 0), e10[i10] > 255 && (e10[i10] = 255);
    else _tV.useColorMix && t$(this.input) && (this.output = tj(this.input, t11 > 0 ? "white" : "black", Math.abs(t11)));
    return this;
  }
  setOpacity(t11) {
    return this.rgba[3] = t11, this;
  }
  tweenTo(t11, e10) {
    let i10 = this.rgba, s10 = t11.rgba;
    if (!th(i10[0]) || !th(s10[0])) return _tV.useColorMix && t$(this.input) && t$(t11.input) && e10 < 0.99 ? tj(this.input, t11.input, e10) : t11.input || "none";
    let o2 = 1 !== s10[3] || 1 !== i10[3], r2 = (t12, s11) => t12 + (i10[s11] - t12) * (1 - e10), a2 = s10.slice(0, 3).map(r2).map(Math.round);
    return o2 && a2.push(r2(s10[3], 3)), (o2 ? "rgba(" : "rgb(") + a2.join(",") + ")";
  }
};
tV.names = { white: "#ffffff", black: "#000000" }, tV.parsers = [{ regex: /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d?(?:\.\d+)?)\s*\)/, parse: function(t11) {
  return [tb(t11[1]), tb(t11[2]), tb(t11[3]), parseFloat(t11[4], 10)];
} }, { regex: /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/, parse: function(t11) {
  return [tb(t11[1]), tb(t11[2]), tb(t11[3]), 1];
} }, { regex: /^#([a-f0-9])([a-f0-9])([a-f0-9])([a-f0-9])?$/i, parse: function(t11) {
  return [tb(t11[1] + t11[1], 16), tb(t11[2] + t11[2], 16), tb(t11[3] + t11[3], 16), $(t11[4]) ? tb(t11[4] + t11[4], 16) / 255 : 1];
} }, { regex: /^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})?$/i, parse: function(t11) {
  return [tb(t11[1], 16), tb(t11[2], 16), tb(t11[3], 16), $(t11[4]) ? tb(t11[4], 16) / 255 : 1];
} }], tV.useColorMix = tY.CSS?.supports("color", "color-mix(in srgb,red,blue 9%)"), tV.None = new tV("");
var { parse: tU } = tV;
var { win: tZ } = D;
var t_ = class _t_ {
  constructor(t11, e10, i10) {
    this.pos = NaN, this.options = e10, this.elem = t11, this.prop = i10;
  }
  dSetter() {
    let t11 = this.paths, e10 = t11?.[0], i10 = t11?.[1], s10 = this.now || 0, o2 = [];
    if (1 !== s10 && e10 && i10) if (e10.length === i10.length && s10 < 1) for (let t12 = 0; t12 < i10.length; t12++) {
      let r2 = e10[t12], a2 = i10[t12], n2 = [];
      for (let t13 = 0; t13 < a2.length; t13++) {
        let e11 = r2[t13], i11 = a2[t13];
        th(e11) && th(i11) && ("A" !== a2[0] || 4 !== t13 && 5 !== t13) ? n2[t13] = e11 + s10 * (i11 - e11) : n2[t13] = i11;
      }
      o2.push(n2);
    }
    else o2 = i10;
    else o2 = this.toD || [];
    this.elem.attr("d", o2, void 0, true);
  }
  update() {
    let t11 = this.elem, e10 = this.prop, i10 = this.now, s10 = this.options.step;
    this[e10 + "Setter"] ? this[e10 + "Setter"]() : t11.attr ? t11.element && t11.attr(e10, i10, null, true) : t11.style[e10] = i10 + this.unit, s10 && s10.call(t11, i10, this);
  }
  run(t11, e10, i10) {
    let s10 = this, o2 = s10.options, r2 = function(t12) {
      return !r2.stopped && s10.step(t12);
    }, a2 = tZ.requestAnimationFrame || function(t12) {
      setTimeout(t12, 13);
    }, n2 = function() {
      for (let t12 = 0; t12 < _t_.timers.length; t12++) _t_.timers[t12]() || _t_.timers.splice(t12--, 1);
      _t_.timers.length && a2(n2);
    };
    t11 !== e10 || this.elem["forceAnimate:" + this.prop] ? (this.startTime = +/* @__PURE__ */ new Date(), this.start = t11, this.end = e10, this.unit = i10, this.now = this.start, this.pos = 0, r2.elem = this.elem, r2.prop = this.prop, r2() && 1 === _t_.timers.push(r2) && a2(n2)) : (delete o2.curAnim[this.prop], o2.complete && 0 === Object.keys(o2.curAnim).length && o2.complete.call(this.elem));
  }
  step(t11) {
    let e10, i10, s10 = +/* @__PURE__ */ new Date(), o2 = this.options, r2 = this.elem, a2 = o2.complete, n2 = o2.duration, h2 = o2.curAnim;
    return r2.attr && !r2.element ? e10 = false : t11 || s10 >= n2 + this.startTime ? (this.now = this.end, this.pos = 1, this.update(), h2[this.prop] = true, i10 = true, tf(h2, function(t12) {
      true !== t12 && (i10 = false);
    }), i10 && a2 && a2.call(r2), e10 = false) : (this.pos = o2.easing((s10 - this.startTime) / n2), this.now = this.start + (this.end - this.start) * this.pos, this.update(), e10 = true), e10;
  }
  initPath(t11, e10, i10) {
    let s10 = t11.startX, o2 = t11.endX, r2 = i10.slice(), a2 = t11.isArea, n2 = a2 ? 2 : 1, h2 = e10 && i10.length > e10.length && i10.hasStackedCliffs, l2, d2, c2, p2, g2 = e10?.slice();
    if (!g2 || h2) return [r2, r2];
    function u2(t12, e11) {
      for (; t12.length < d2; ) {
        let i11 = t12[0], s11 = e11[d2 - t12.length];
        if (s11 && "M" === i11[0] && ("C" === s11[0] ? t12[0] = ["C", i11[1], i11[2], i11[1], i11[2], i11[1], i11[2]] : t12[0] = ["L", i11[1], i11[2]]), t12.unshift(i11), a2) {
          let e12 = t12.pop();
          t12.push(t12[t12.length - 1], e12);
        }
      }
    }
    function f2(t12) {
      for (; t12.length < d2; ) {
        let e11 = t12[Math.floor(t12.length / n2) - 1].slice();
        if ("C" === e11[0] && (e11[1] = e11[5], e11[2] = e11[6]), a2) {
          let i11 = t12[Math.floor(t12.length / n2)].slice();
          t12.splice(t12.length / 2, 0, e11, i11);
        } else t12.push(e11);
      }
    }
    if (s10 && o2 && o2.length) {
      for (c2 = 0; c2 < s10.length; c2++) if (s10[c2] === o2[0]) {
        l2 = c2;
        break;
      } else if (s10[0] === o2[o2.length - s10.length + c2]) {
        l2 = c2, p2 = true;
        break;
      } else if (s10[s10.length - 1] === o2[o2.length - s10.length + c2]) {
        l2 = s10.length - c2;
        break;
      }
      void 0 === l2 && (g2 = []);
    }
    return g2.length && th(l2) && (d2 = r2.length + l2 * n2, p2 ? (u2(g2, r2), f2(r2)) : (u2(r2, g2), f2(g2))), [g2, r2];
  }
  fillSetter() {
    _t_.prototype.strokeSetter.apply(this, arguments);
  }
  strokeSetter() {
    this.elem.attr(this.prop, tU(this.start).tweenTo(tU(this.end), this.pos), void 0, true);
  }
};
function tK(t11) {
  return tp(t11) ? tg({ duration: 500, defer: 0 }, t11) : { duration: 500 * !!t11, defer: 0 };
}
function tq(t11, e10) {
  let i10 = t_.timers.length;
  for (; i10--; ) t_.timers[i10].elem !== t11 || e10 && e10 !== t_.timers[i10].prop || (t_.timers[i10].stopped = true);
}
t_.timers = [];
var tJ = { animate: function(t11, e10, i10) {
  let s10, o2 = "", r2, a2, n2;
  tp(i10) || (n2 = arguments, i10 = { duration: n2[2], easing: n2[3], complete: n2[4] }), th(i10.duration) || (i10.duration = 400), i10.easing = "function" == typeof i10.easing ? i10.easing : Math[i10.easing] || Math.easeInOutSine, i10.curAnim = tg(e10), tf(e10, function(n3, h2) {
    tq(t11, h2), a2 = new t_(t11, i10, h2), r2 = void 0, "d" === h2 && td(e10.d) ? (a2.paths = a2.initPath(t11, t11.pathArray, e10.d), a2.toD = e10.d, s10 = 0, r2 = 1) : t11.attr ? s10 = t11.attr(h2) : (s10 = parseFloat(ts(t11, h2)) || 0, "opacity" !== h2 && (o2 = "px")), r2 || (r2 = n3), "string" == typeof r2 && r2.match("px") && (r2 = r2.replace(/px/g, "")), a2.run(s10, r2, o2);
  });
}, animObject: tK, getDeferredAnimation: function(t11, e10, i10) {
  let s10 = tK(e10), o2 = i10 ? [i10] : t11.series, r2 = 0, a2 = 0;
  return o2.forEach((t12) => {
    let i11 = tK(t12.options.animation);
    r2 = tp(e10) && $(e10.defer) ? s10.defer : Math.max(r2, i11.duration + i11.defer), a2 = Math.min(s10.duration, i11.duration);
  }), t11.renderer.forExport && (r2 = 0), { defer: Math.max(0, r2 - a2), duration: Math.min(r2, a2) };
}, setAnimation: function(t11, e10) {
  e10.renderer.globalAnimation = ty(t11, e10.options.chart.animation, true);
}, stop: tq };
var { SVG_NS: tQ, win: t0 } = D;
var { trustedTypes: t1 } = t0;
var t2 = t1 && tc(t1.createPolicy) && t1.createPolicy("highcharts", { createHTML: (t11) => t11 });
var t3 = t2 ? t2.createHTML("") : "";
var t5 = class _t5 {
  static filterUserAttributes(t11) {
    return tf(t11, (e10, i10) => {
      let s10 = true;
      -1 === _t5.allowedAttributes.indexOf(i10) && (s10 = false), -1 !== ["background", "dynsrc", "href", "lowsrc", "src"].indexOf(i10) && (s10 = tl(e10) && _t5.allowedReferences.some((t12) => 0 === e10.indexOf(t12))), s10 || (tO(33, false, void 0, { "Invalid attribute in config": `${i10}` }), delete t11[i10]), tl(e10) && t11[i10] && (t11[i10] = e10.replace(/</g, "&lt;"));
    }), t11;
  }
  static parseStyle(t11) {
    return t11.split(";").reduce((t12, e10) => {
      let i10 = e10.split(":").map((t13) => t13.trim()), s10 = i10.shift();
      return s10 && i10.length && (t12[s10.replace(/-([a-z])/g, (t13) => t13[1].toUpperCase())] = i10.join(":")), t12;
    }, {});
  }
  static setElementHTML(t11, e10) {
    t11.innerHTML = _t5.emptyHTML, e10 && new _t5(e10).addToDOM(t11);
  }
  constructor(t11) {
    this.nodes = "string" == typeof t11 ? this.parseMarkup(t11) : t11;
  }
  addToDOM(t11) {
    return (function t12(e10, i10) {
      let s10;
      return tS(e10).forEach(function(e11) {
        let o2, r2 = e11.tagName, a2 = e11.textContent ? D.doc.createTextNode(e11.textContent) : void 0, n2 = _t5.bypassHTMLFiltering;
        if (r2) if ("#text" === r2) o2 = a2;
        else if (-1 !== _t5.allowedTags.indexOf(r2) || n2) {
          let s11 = "svg" === r2 ? tQ : i10.namespaceURI || tQ, h2 = D.doc.createElementNS(s11, r2), l2 = e11.attributes || {};
          tf(e11, function(t13, e12) {
            "tagName" !== e12 && "attributes" !== e12 && "children" !== e12 && "style" !== e12 && "textContent" !== e12 && (l2[e12] = t13);
          }), X(h2, n2 ? l2 : _t5.filterUserAttributes(l2)), e11.style && j(h2, e11.style), a2 && h2.appendChild(a2), t12(e11.children || [], h2), o2 = h2;
        } else tO(33, false, void 0, { "Invalid tagName in config": r2 });
        o2 && i10.appendChild(o2), s10 = o2;
      }), s10;
    })(this.nodes, t11);
  }
  parseMarkup(t11) {
    let e10, i10 = [];
    t11 = t11.trim().replace(/ style=(["'])/g, " data-style=$1");
    try {
      e10 = new DOMParser().parseFromString(t2 ? t2.createHTML(t11) : t11, "text/html");
    } catch {
    }
    if (!e10) {
      let i11 = F("div");
      i11.innerHTML = t11, e10 = { body: i11 };
    }
    let s10 = (t12, e11) => {
      let i11 = t12.nodeName.toLowerCase(), o2 = { tagName: i11 };
      "#text" === i11 && (o2.textContent = t12.textContent || "");
      let r2 = t12.attributes;
      if (r2) {
        let t13 = {};
        [].forEach.call(r2, (e12) => {
          "data-style" === e12.name ? o2.style = _t5.parseStyle(e12.value) : t13[e12.name] = e12.value;
        }), o2.attributes = t13;
      }
      if (t12.childNodes.length) {
        let e12 = [];
        [].forEach.call(t12.childNodes, (t13) => {
          s10(t13, e12);
        }), e12.length && (o2.children = e12);
      }
      e11.push(o2);
    };
    return [].forEach.call(e10.body.childNodes, (t12) => s10(t12, i10)), i10;
  }
};
t5.allowedAttributes = ["alt", "aria-controls", "aria-describedby", "aria-expanded", "aria-haspopup", "aria-hidden", "aria-label", "aria-labelledby", "aria-live", "aria-pressed", "aria-readonly", "aria-roledescription", "aria-selected", "class", "clip-path", "color", "colspan", "cx", "cy", "d", "disabled", "dx", "dy", "fill", "filterUnits", "flood-color", "flood-opacity", "height", "href", "id", "in", "in2", "markerHeight", "markerWidth", "offset", "opacity", "operator", "orient", "padding", "paddingLeft", "paddingRight", "patternUnits", "r", "radius", "refX", "refY", "result", "role", "rowspan", "scope", "slope", "src", "startOffset", "stdDeviation", "stroke-linecap", "stroke-width", "stroke", "style", "summary", "tabindex", "tableValues", "target", "text-align", "text-anchor", "textAnchor", "textLength", "title", "type", "valign", "width", "x", "x1", "x2", "xlink:href", "y", "y1", "y2", "zIndex"], t5.allowedReferences = ["https://", "http://", "mailto:", "/", "../", "./", "#"], t5.allowedTags = ["#text", "a", "abbr", "b", "br", "button", "caption", "circle", "clipPath", "code", "dd", "defs", "div", "dl", "dt", "em", "feComponentTransfer", "feComposite", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feMerge", "feMergeNode", "feMorphology", "feOffset", "filter", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "linearGradient", "marker", "ol", "p", "path", "pattern", "pre", "rect", "small", "span", "stop", "strong", "style", "sub", "sup", "svg", "table", "tbody", "td", "text", "textPath", "th", "thead", "title", "tr", "tspan", "u", "ul"], t5.emptyHTML = t3, t5.bypassHTMLFiltering = false;
var { defaultOptions: t6, defaultTime: t9 } = tF;
var { pageLang: t4 } = D;
var t8 = { add: (t11, e10) => t11 + e10, divide: (t11, e10) => 0 !== e10 ? t11 / e10 : "", eq: (t11, e10) => t11 == e10, each: function(t11) {
  let e10 = arguments[arguments.length - 1];
  return !!td(t11) && t11.map((i10, s10) => et(e10.body, K(tp(i10) ? i10 : { "@this": i10 }, { "@index": s10, "@first": 0 === s10, "@last": s10 === t11.length - 1 }))).join("");
}, ge: (t11, e10) => t11 >= e10, gt: (t11, e10) => t11 > e10, if: (t11) => !!t11, le: (t11, e10) => t11 <= e10, lt: (t11, e10) => t11 < e10, multiply: (t11, e10) => t11 * e10, ne: (t11, e10) => t11 != e10, subtract: (t11, e10) => t11 - e10, ucfirst: tA, unless: (t11) => !t11 };
var t7 = {};
function et(t11 = "", e10, i10) {
  let s10 = RegExp(`\\{([\\p{L}\\p{M}\\d:\\.,;\\-\\/<>\\[\\]%_@+"'’= #\\(\\)]+)\\}`, "gu"), o2 = RegExp(`\\(([\\p{L}\\p{M}\\d:\\.,;\\-\\/<>\\[\\]%_@+"'= ]+)\\)`, "gu"), r2 = [], a2 = /f$/, n2 = /\.(\d)/, h2 = i10?.options?.lang || t6.lang, l2 = i10?.time || t9, d2 = i10?.numberFormatter || ee.bind(i10), c2 = (t12 = "") => {
    let i11;
    return "true" === t12 || "false" !== t12 && ((i11 = Number(t12)).toString() === t12 ? i11 : /^["'].+["']$/.test(t12) ? t12.slice(1, -1) : ti(t12, e10));
  }, p2, g2, u2 = 0, f2;
  for (; null !== (p2 = s10.exec(t11)); ) {
    let i11 = p2, s11 = o2.exec(p2[1]);
    s11 && (p2 = s11, f2 = true), g2?.isBlock || (g2 = { ctx: e10, expression: p2[1], find: p2[0], isBlock: "#" === p2[1].charAt(0), start: p2.index, startInner: p2.index + p2[0].length, length: p2[0].length });
    let a3 = (g2.isBlock ? i11 : p2)[1].split(" ")[0].replace("#", "");
    t8[a3] && (g2.isBlock && a3 === g2.fn && u2++, g2.fn || (g2.fn = a3));
    let n3 = "else" === p2[1];
    if (g2.isBlock && g2.fn && (p2[1] === `/${g2.fn}` || n3)) if (u2) !n3 && u2--;
    else {
      let e11 = g2.startInner, i12 = t11.substr(e11, p2.index - e11);
      void 0 === g2.body ? (g2.body = i12, g2.startInner = p2.index + p2[0].length) : g2.elseBody = i12, g2.find += i12 + p2[0], n3 || (r2.push(g2), g2 = void 0);
    }
    else g2.isBlock || r2.push(g2);
    if (s11 && !g2?.isBlock) break;
  }
  return r2.forEach((s11) => {
    let r3, p3, { body: g3, elseBody: u3, expression: f3, fn: m2 } = s11;
    if (m2) {
      let t12 = [s11], o3 = [], a3 = f3.length, n3 = 0, h3;
      for (p3 = 0; p3 <= a3; p3++) {
        let t13 = f3.charAt(p3);
        h3 || '"' !== t13 && "'" !== t13 ? h3 === t13 && (h3 = "") : h3 = t13, h3 || " " !== t13 && p3 !== a3 || (o3.push(f3.substr(n3, p3 - n3)), n3 = p3 + 1);
      }
      for (p3 = t8[m2].length; p3--; ) t12.unshift(c2(o3[p3 + 1]));
      r3 = t8[m2].apply(e10, t12), s11.isBlock && "boolean" == typeof r3 && (r3 = et(r3 ? g3 : u3, e10, i10));
    } else {
      let t12 = /^["'].+["']$/.test(f3) ? [f3] : f3.split(":");
      if (r3 = c2(t12.shift() || ""), t12.length && "number" == typeof r3) {
        let e11 = t12.join(":");
        if (a2.test(e11)) {
          let t13 = parseInt((e11.match(n2) || ["", "-1"])[1], 10);
          null !== r3 && (r3 = d2(r3, t13, h2.decimalPoint, e11.indexOf(",") > -1 ? h2.thousandsSep : ""));
        } else r3 = l2.dateFormat(e11, r3);
      }
      o2.lastIndex = 0, o2.test(s11.find) && tl(r3) && (r3 = `"${r3}"`);
    }
    t11 = t11.replace(s11.find, ty(r3, ""));
  }), f2 ? et(t11, e10, i10) : t11;
}
function ee(t11, e10, i10, s10) {
  e10 *= 1;
  let o2, r2, [a2, n2] = (t11 = +t11 || 0).toString().split("e").map(Number), h2 = this?.options?.lang || t6.lang, l2 = (t11.toString().split(".")[1] || "").split("e")[0].length, d2 = e10, c2 = {};
  i10 ?? (i10 = h2.decimalPoint), s10 ?? (s10 = h2.thousandsSep), -1 === e10 ? e10 = Math.min(l2, 20) : th(e10) ? e10 && n2 < 0 && ((r2 = e10 + n2) >= 0 ? (a2 = +a2.toExponential(r2).split("e")[0], e10 = r2) : (a2 = Math.floor(a2), t11 = e10 < 20 ? +(a2 * Math.pow(10, n2)).toFixed(e10) : 0, n2 = 0)) : e10 = 2, n2 && (e10 ?? (e10 = 2), t11 = a2), th(e10) && e10 >= 0 && (c2.minimumFractionDigits = e10, c2.maximumFractionDigits = e10), "" === s10 && (c2.useGrouping = false);
  let p2 = s10 || i10, g2 = p2 ? "en" : this?.locale || h2.locale || t4, u2 = JSON.stringify(c2) + g2;
  return o2 = (t7[u2] ?? (t7[u2] = new Intl.NumberFormat(g2, c2))).format(t11), p2 && (o2 = o2.replace(/([,\.])/g, "_$1").replace(/_\,/g, s10 ?? ",").replace("_.", i10 ?? ".")), (e10 || 0 != +o2) && (!(n2 < 0) || d2) || (o2 = "0"), n2 && 0 != +o2 && (o2 += "e" + (n2 < 0 ? "" : "+") + n2), o2;
}
var ei = { dateFormat: function(t11, e10, i10) {
  return t9.dateFormat(t11, e10, i10);
}, format: et, helpers: t8, numberFormat: ee };
(n = m || (m = {})).rendererTypes = {}, n.getRendererType = function(t11 = o) {
  return n.rendererTypes[t11] || n.rendererTypes[o];
}, n.registerRendererType = function(t11, e10, i10) {
  n.rendererTypes[t11] = e10, (!o || i10) && (o = t11, D.Renderer = e10);
};
var es = m;
(x || (x = {})).distribute = function t10(e10, i10, s10) {
  let o2 = e10, r2 = o2.reducedLen || i10, a2 = (t11, e11) => t11.target - e11.target, n2 = [], h2 = e10.length, l2 = [], d2 = n2.push, c2, p2 = true, g2, u2, f2 = 0;
  for (c2 = h2; c2--; ) f2 += e10[c2].size;
  if (f2 > r2) {
    if (tT(e10, (t11, e11) => (e11.rank || 0) - (t11.rank || 0)), e10[0].rank === e10[e10.length - 1].rank) {
      let t11 = [[0, h2 - 1]];
      for (; t11.length && f2 > r2; ) {
        let i11 = t11.shift();
        if (!i11) break;
        g2 = e10[c2 = Math.floor((i11[0] + i11[1]) / 2)], tv(l2, c2) && (f2 -= g2.size), i11[0] < c2 && t11.push([i11[0], c2 - 1]), c2 < i11[1] && t11.push([c2 + 1, i11[1]]);
      }
    } else for (c2 = h2 - 1; f2 > r2 && c2 >= 0; ) g2 = e10[c2], tv(l2, c2) && (f2 -= g2.size), c2--;
    l2.sort((t11, e11) => e11 - t11).forEach((t11) => d2.apply(n2, e10.splice(t11, 1)));
  }
  for (tT(e10, a2), e10 = e10.map((t11) => ({ size: t11.size, targets: [t11.target], align: ty(t11.align, 0.5) })); p2; ) {
    for (c2 = e10.length; c2--; ) g2 = e10[c2], u2 = (Math.min.apply(0, g2.targets) + Math.max.apply(0, g2.targets)) / 2, g2.pos = G(u2 - g2.size * g2.align, 0, i10 - g2.size);
    for (c2 = e10.length, p2 = false; c2--; ) c2 > 0 && e10[c2 - 1].pos + e10[c2 - 1].size > e10[c2].pos && (e10[c2 - 1].size += e10[c2].size, e10[c2 - 1].targets = e10[c2 - 1].targets.concat(e10[c2].targets), e10[c2 - 1].align = 0.5, e10[c2 - 1].pos + e10[c2 - 1].size > i10 && (e10[c2 - 1].pos = i10 - e10[c2 - 1].size), e10.splice(c2, 1), p2 = true);
  }
  return d2.apply(o2, n2), c2 = 0, e10.some((e11) => {
    let r3 = 0;
    return (e11.targets || []).some(() => (o2[c2].pos = e11.pos + r3, void 0 !== s10 && Math.abs(o2[c2].pos - o2[c2].target) > s10) ? (o2.slice(0, c2 + 1).forEach((t11) => delete t11.pos), o2.reducedLen = (o2.reducedLen || i10) - 0.1 * i10, o2.reducedLen > 0.1 * i10 && t10(o2, i10, s10), true) : (r3 += o2[c2].size, c2++, false));
  }), tT(o2, a2), o2;
};
var eo = x;
var { animate: er, animObject: ea, stop: en } = tJ;
var { deg2rad: eh, doc: el, svg: ed, SVG_NS: ec, win: ep, isFirefox: eg } = D;
var eu = class _eu {
  _defaultGetter(t11) {
    let e10 = ty(this[t11 + "Value"], this[t11], this.element ? this.element.getAttribute(t11) : null, 0);
    return /^-?[\d\.]+$/.test(e10) && (e10 = parseFloat(e10)), e10;
  }
  _defaultSetter(t11, e10, i10) {
    i10.setAttribute(e10, t11);
  }
  add(t11) {
    let e10, i10 = this.renderer, s10 = this.element;
    return t11 && (this.parentGroup = t11), void 0 !== this.textStr && "text" === this.element.nodeName && i10.buildText(this), this.added = true, (!t11 || t11.handleZ || this.zIndex) && (e10 = this.zIndexSetter()), e10 || (t11 ? t11.element : i10.box).appendChild(s10), this.onAdd && this.onAdd(), this;
  }
  addClass(t11, e10) {
    let i10 = e10 ? "" : this.attr("class") || "";
    return (t11 = (t11 || "").split(/ /g).reduce(function(t12, e11) {
      return -1 === i10.indexOf(e11) && t12.push(e11), t12;
    }, i10 ? [i10] : []).join(" ")) !== i10 && this.attr("class", t11), this;
  }
  afterSetters() {
    this.doTransform && (this.updateTransform(), this.doTransform = false);
  }
  align(t11, e10, i10, s10 = true) {
    let o2 = this.renderer, r2 = o2.alignedObjects, a2 = !!t11;
    t11 ? (this.alignOptions = t11, this.alignByTranslate = e10, this.alignTo = i10) : (t11 = this.alignOptions || {}, e10 = this.alignByTranslate, i10 = this.alignTo);
    let n2 = !i10 || tl(i10) ? i10 || "renderer" : void 0;
    n2 && (a2 && tv(r2, this), i10 = void 0);
    let h2 = ty(i10, o2[n2], o2), l2 = (h2.x || 0) + (t11.x || 0) + ((h2.width || 0) - (t11.width || 0)) * Q(t11.align), d2 = (h2.y || 0) + (t11.y || 0) + ((h2.height || 0) - (t11.height || 0)) * Q(t11.verticalAlign), c2 = {};
    return t11.align && (c2["text-align"] = t11.align), c2[e10 ? "translateX" : "x"] = Math.round(l2), c2[e10 ? "translateY" : "y"] = Math.round(d2), s10 && (this[this.placed ? "animate" : "attr"](c2), this.placed = true), this.alignAttr = c2, this;
  }
  alignSetter(t11) {
    let e10 = { left: "start", center: "middle", right: "end" };
    e10[t11] && (this.alignValue = t11, this.element.setAttribute("text-anchor", e10[t11]));
  }
  animate(t11, e10, i10) {
    let s10 = ea(ty(e10, this.renderer.globalAnimation, true)), o2 = s10.defer;
    return el.hidden && (s10.duration = 0), 0 !== s10.duration ? (i10 && (s10.complete = i10), tC(() => {
      this.element && er(this, t11, s10);
    }, o2)) : (this.attr(t11, void 0, i10 || s10.complete), tf(t11, function(t12, e11) {
      s10.step && s10.step.call(this, t12, { prop: e11, pos: 1, elem: this });
    }, this)), this;
  }
  applyTextOutline(t11) {
    let e10 = this.element;
    -1 !== t11.indexOf("contrast") && (t11 = t11.replace(/contrast/g, this.renderer.getContrast(e10.style.fill)));
    let i10 = t11.indexOf(" "), s10 = t11.substring(i10 + 1), o2 = t11.substring(0, i10);
    if (o2 && "none" !== o2 && D.svg) {
      this.fakeTS = true, o2 = o2.replace(/(^[\d\.]+)(.*?)$/g, function(t13, e11, i12) {
        return 2 * Number(e11) + i12;
      }), this.removeTextOutline();
      let t12 = el.createElementNS(ec, "tspan");
      X(t12, { class: "highcharts-text-outline", fill: s10, stroke: s10, "stroke-width": o2, "stroke-linejoin": "round" });
      let i11 = e10.querySelector("textPath") || e10;
      [].forEach.call(i11.childNodes, (e11) => {
        let i12 = e11.cloneNode(true);
        i12.removeAttribute && ["fill", "stroke", "stroke-width", "stroke"].forEach((t13) => i12.removeAttribute(t13)), t12.appendChild(i12);
      });
      let r2 = 0;
      [].forEach.call(i11.querySelectorAll("text tspan"), (t13) => {
        r2 += Number(t13.getAttribute("dy"));
      });
      let a2 = el.createElementNS(ec, "tspan");
      a2.textContent = "​", X(a2, { x: Number(e10.getAttribute("x")), dy: -r2 }), t12.appendChild(a2), i11.insertBefore(t12, i11.firstChild);
    }
  }
  attr(t11, e10, i10, s10) {
    let { element: o2 } = this, r2 = _eu.symbolCustomAttribs, a2, n2, h2 = this, l2;
    return "string" == typeof t11 && void 0 !== e10 && (a2 = t11, (t11 = {})[a2] = e10), "string" == typeof t11 ? h2 = (this[t11 + "Getter"] || this._defaultGetter).call(this, t11, o2) : (tf(t11, function(e11, i11) {
      l2 = false, s10 || en(this, i11), this.symbolName && -1 !== r2.indexOf(i11) && (n2 || (this.symbolAttr(t11), n2 = true), l2 = true), this.rotation && ("x" === i11 || "y" === i11) && (this.doTransform = true), l2 || (this[i11 + "Setter"] || this._defaultSetter).call(this, e11, i11, o2);
    }, this), this.afterSetters()), i10 && i10.call(this), h2;
  }
  clip(t11) {
    if (t11 && !t11.clipPath) {
      let e10 = tD() + "-", i10 = this.renderer.createElement("clipPath").attr({ id: e10 }).add(this.renderer.defs);
      K(t11, { clipPath: i10, id: e10, count: 0 }), t11.add(i10);
    }
    return this.attr("clip-path", t11 ? `url(${this.renderer.url}#${t11.id})` : "none");
  }
  crisp(t11, e10) {
    e10 = Math.round(e10 || t11.strokeWidth || 0);
    let i10 = t11.x || this.x || 0, s10 = t11.y || this.y || 0, o2 = (t11.width || this.width || 0) + i10, r2 = (t11.height || this.height || 0) + s10, a2 = Y(i10, e10), n2 = Y(s10, e10);
    return K(t11, { x: a2, y: n2, width: Y(o2, e10) - a2, height: Y(r2, e10) - n2 }), $(t11.strokeWidth) && (t11.strokeWidth = e10), t11;
  }
  complexColor(t11, e10, i10) {
    let s10 = this.renderer, o2, r2, a2, n2, h2, l2, d2, c2, p2, g2, u2 = [], f2;
    J(this.renderer, "complexColor", { args: arguments }, function() {
      if (t11.radialGradient ? r2 = "radialGradient" : t11.linearGradient && (r2 = "linearGradient"), r2) {
        if (a2 = t11[r2], h2 = s10.gradients, l2 = t11.stops, p2 = i10.radialReference, td(a2) && (t11[r2] = a2 = { x1: a2[0], y1: a2[1], x2: a2[2], y2: a2[3], gradientUnits: "userSpaceOnUse" }), "radialGradient" === r2 && p2 && !$(a2.gradientUnits) && (n2 = a2, a2 = tg(a2, s10.getRadialAttr(p2, n2), { gradientUnits: "userSpaceOnUse" })), tf(a2, function(t12, e11) {
          "id" !== e11 && u2.push(e11, t12);
        }), tf(l2, function(t12) {
          u2.push(t12);
        }), h2[u2 = u2.join(",")]) g2 = h2[u2].attr("id");
        else {
          a2.id = g2 = tD();
          let t12 = h2[u2] = s10.createElement(r2).attr(a2).add(s10.defs);
          t12.radAttr = n2, t12.stops = [], l2.forEach(function(e11) {
            0 === e11[1].indexOf("rgba") ? (d2 = (o2 = tV.parse(e11[1])).get("rgb"), c2 = o2.get("a")) : (d2 = e11[1], c2 = 1);
            let i11 = s10.createElement("stop").attr({ offset: e11[0], "stop-color": d2, "stop-opacity": c2 }).add(t12);
            t12.stops.push(i11);
          });
        }
        f2 = "url(" + s10.url + "#" + g2 + ")", i10.setAttribute(e10, f2), i10.gradient = u2, t11.toString = function() {
          return f2;
        };
      }
    });
  }
  css(t11) {
    let e10 = this.styles, i10 = {}, s10 = this.element, o2, r2 = !e10;
    if (e10 && tf(t11, function(t12, s11) {
      e10 && e10[s11] !== t12 && (i10[s11] = t12, r2 = true);
    }), r2) {
      e10 && (t11 = K(e10, i10)), null === t11.width || "auto" === t11.width ? delete this.textWidth : "text" === s10.nodeName.toLowerCase() && t11.width && (o2 = this.textWidth = tb(t11.width)), K(this.styles, t11), o2 && !ed && this.renderer.forExport && delete t11.width;
      let r3 = eg && t11.fontSize || null;
      r3 && (th(r3) || /^\d+$/.test(r3)) && (t11.fontSize += "px");
      let a2 = tg(t11);
      s10.namespaceURI === this.SVG_NS && (["textOutline", "textOverflow", "whiteSpace", "width"].forEach((t12) => a2 && delete a2[t12]), a2.color && (a2.fill = a2.color, delete a2.color)), j(s10, a2);
    }
    return this.added && ("text" === this.element.nodeName && this.renderer.buildText(this), t11.textOutline && this.applyTextOutline(t11.textOutline)), this;
  }
  dashstyleSetter(t11) {
    let e10, i10 = this["stroke-width"];
    if ("inherit" === i10 && (i10 = 1), t11) {
      let s10 = (t11 = t11.toLowerCase()).replace("shortdashdotdot", "3,1,1,1,1,1,").replace("shortdashdot", "3,1,1,1").replace("shortdot", "1,1,").replace("shortdash", "3,1,").replace("longdash", "8,3,").replace(/dot/g, "1,3,").replace("dash", "4,3,").replace(/,$/, "").split(",");
      for (e10 = s10.length; e10--; ) s10[e10] = "" + tb(s10[e10]) * ty(i10, NaN);
      t11 = s10.join(",").replace(/NaN/g, "none"), this.element.setAttribute("stroke-dasharray", t11);
    }
  }
  destroy() {
    let t11 = this, { element: e10 = {}, renderer: i10, stops: s10 } = t11, o2 = e10.ownerSVGElement, r2 = "SPAN" === e10.nodeName && t11.parentGroup || void 0, a2;
    if (e10.onclick = e10.onmouseout = e10.onmouseover = e10.onmousemove = e10.point = null, en(t11), t11.clipPath && o2) {
      let e11 = t11.clipPath;
      [].forEach.call(o2.querySelectorAll("[clip-path],[CLIP-PATH]"), function(t12) {
        t12.getAttribute("clip-path").indexOf(e11.element.id) > -1 && t12.removeAttribute("clip-path");
      }), t11.clipPath = e11.destroy();
    }
    if (s10) {
      for (let t12 of s10) t12.destroy();
      s10.length = 0;
    }
    for (t11.safeRemoveChild(e10); r2?.div && 0 === r2.div.childNodes.length; ) a2 = r2.parentGroup, t11.safeRemoveChild(r2.div), delete r2.div, r2 = a2;
    t11.alignOptions && _(i10.alignedObjects, t11), tf(t11, (e11, i11) => {
      (t11[i11]?.parentGroup === t11 || -1 !== ["connector", "foreignObject"].indexOf(i11)) && t11[i11]?.destroy?.(), delete t11[i11];
    });
  }
  dSetter(t11, e10, i10) {
    td(t11) && ("string" == typeof t11[0] && (t11 = this.renderer.pathToSegments(t11)), this.pathArray = t11, t11 = t11.reduce((t12, e11, i11) => e11?.join ? (i11 ? t12 + " " : "") + e11.join(" ") : (e11 || "").toString(), "")), /(NaN| {2}|^$)/.test(t11) && (t11 = "M 0 0"), this[e10] !== t11 && (i10.setAttribute(e10, t11), this[e10] = t11);
  }
  fillSetter(t11, e10, i10) {
    "string" == typeof t11 ? i10.setAttribute(e10, t11) : t11 && this.complexColor(t11, e10, i10);
  }
  hrefSetter(t11, e10, i10) {
    i10.setAttributeNS("http://www.w3.org/1999/xlink", e10, t11);
  }
  getBBox(t11, e10) {
    let i10, s10, o2, { element: r2, renderer: a2, styles: n2, textStr: h2 } = this, { cache: l2, cacheKeys: d2 } = a2, c2 = r2.namespaceURI === this.SVG_NS, p2 = ty(e10, this.rotation, 0), g2 = a2.styledMode ? r2 && _eu.prototype.getStyle.call(r2, "font-size") : n2.fontSize, u2 = this.getBBoxCacheKey([a2.rootFontSize, this.textWidth, this.alignValue, n2.fontWeight, n2.lineClamp, n2.textOverflow, g2, p2]);
    if (u2 && !t11 && (i10 = l2[u2]), !i10 || i10.polygon) {
      if (c2 || a2.forExport) {
        try {
          o2 = this.fakeTS && function(t13) {
            let e11 = r2.querySelector(".highcharts-text-outline");
            e11 && j(e11, { display: t13 });
          }, tc(o2) && o2("none"), i10 = r2.getBBox ? K({}, r2.getBBox()) : { width: r2.offsetWidth, height: r2.offsetHeight, x: 0, y: 0 }, tc(o2) && o2("");
        } catch {
        }
        (!i10 || i10.width < 0) && (i10 = { x: 0, y: 0, width: 0, height: 0 });
      } else i10 = this.htmlGetBBox();
      s10 = i10.height, c2 && (i10.height = s10 = { "11px,17": 14, "13px,20": 16 }[`${g2 || ""},${Math.round(s10)}`] || s10), p2 && (i10 = this.getRotatedBox(i10, p2));
      let t12 = { bBox: i10 };
      J(this, "afterGetBBox", t12), i10 = t12.bBox;
    }
    if (u2 && ("" === h2 || i10.height > 0)) {
      for (; d2.length > 250; ) delete l2[d2.shift()];
      l2[u2] || d2.push(u2), l2[u2] = i10;
    }
    return i10;
  }
  getBBoxCacheKey(t11) {
    if ($(this.textStr)) {
      let e10 = "" + this.textStr;
      return -1 === e10.indexOf("<") && (e10 = e10.replace(/\d/g, "0")), [e10, ...t11].join(",");
    }
  }
  getRotatedBox(t11, e10) {
    let { x: i10, y: s10, width: o2, height: r2 } = t11, { alignValue: a2, translateY: n2, rotationOriginX: h2 = 0, rotationOriginY: l2 = 0 } = this, d2 = Q(a2), c2 = Number(this.element.getAttribute("y") || 0) - (n2 ? 0 : s10), p2 = e10 * eh, g2 = (e10 - 90) * eh, u2 = Math.cos(p2), f2 = Math.sin(p2), m2 = o2 * u2, x2 = o2 * f2, y2 = Math.cos(g2), b2 = Math.sin(g2), [[v2, k2], [w2, M2]] = [h2, l2].map((t12) => [t12 - t12 * u2, t12 * f2]), S2 = i10 + d2 * (o2 - m2) + v2 + M2 + c2 * y2, T2 = S2 + m2, C2 = T2 - r2 * y2, A2 = C2 - m2, P2 = s10 + c2 - d2 * x2 - k2 + w2 + c2 * b2, L2 = P2 + x2, O2 = L2 - r2 * b2, E2 = O2 - x2, I2 = Math.min(S2, T2, C2, A2), D2 = Math.min(P2, L2, O2, E2), B2 = Math.max(S2, T2, C2, A2) - I2, N2 = Math.max(P2, L2, O2, E2) - D2;
    return { x: I2, y: D2, width: B2, height: N2, polygon: [[S2, P2], [T2, L2], [C2, O2], [A2, E2]] };
  }
  getStyle(t11) {
    return ep.getComputedStyle(this.element || this, "").getPropertyValue(t11);
  }
  hasClass(t11) {
    return -1 !== ("" + this.attr("class")).split(" ").indexOf(t11);
  }
  hide() {
    return this.attr({ visibility: "hidden" });
  }
  htmlGetBBox() {
    return { height: 0, width: 0, x: 0, y: 0 };
  }
  constructor(t11, e10) {
    this.onEvents = {}, this.opacity = 1, this.SVG_NS = ec, this.element = "span" === e10 || "body" === e10 ? F(e10) : el.createElementNS(this.SVG_NS, e10), this.renderer = t11, this.styles = {}, J(this, "afterInit");
  }
  on(t11, e10) {
    let { onEvents: i10 } = this;
    return i10[t11] && i10[t11](), i10[t11] = z(this.element, t11, e10), this;
  }
  opacitySetter(t11, e10, i10) {
    let s10 = Number(Number(t11).toFixed(3));
    this.opacity = s10, i10.setAttribute(e10, s10);
  }
  reAlign() {
    this.alignOptions?.width && "left" !== this.alignOptions.align && (this.alignOptions.width = this.getBBox().width, this.placed = false, this.align());
  }
  removeClass(t11) {
    return this.attr("class", ("" + this.attr("class")).replace(tl(t11) ? RegExp(`(^| )${t11}( |$)`) : t11, " ").replace(/ +/g, " ").trim());
  }
  removeTextOutline() {
    let t11 = this.element.querySelector("tspan.highcharts-text-outline");
    t11 && this.safeRemoveChild(t11);
  }
  safeRemoveChild(t11) {
    let e10 = t11.parentNode;
    e10 && e10.removeChild(t11);
  }
  setRadialReference(t11) {
    let e10 = this.element.gradient && this.renderer.gradients[this.element.gradient] || void 0;
    return this.element.radialReference = t11, e10?.radAttr && e10.animate(this.renderer.getRadialAttr(t11, e10.radAttr)), this;
  }
  shadow(t11) {
    let { renderer: e10 } = this, i10 = tg(this.parentGroup?.rotation === 90 ? { offsetX: -1, offsetY: -1 } : {}, tp(t11) ? t11 : {}), s10 = e10.shadowDefinition(i10);
    return this.attr({ filter: t11 ? `url(${e10.url}#${s10})` : "none" });
  }
  show(t11 = true) {
    return this.attr({ visibility: t11 ? "inherit" : "visible" });
  }
  "stroke-widthSetter"(t11, e10, i10) {
    this[e10] = t11, i10.setAttribute(e10, t11);
  }
  strokeWidth() {
    if (!this.renderer.styledMode) return this["stroke-width"] || 0;
    let t11 = this.getStyle("stroke-width"), e10 = 0, i10;
    return /px$/.test(t11) ? e10 = tb(t11) : "" !== t11 && (X(i10 = el.createElementNS(ec, "rect"), { width: t11, "stroke-width": 0 }), this.element.parentNode.appendChild(i10), e10 = i10.getBBox().width, i10.parentNode.removeChild(i10)), e10;
  }
  symbolAttr(t11) {
    let e10 = this;
    _eu.symbolCustomAttribs.forEach(function(i10) {
      e10[i10] = ty(t11[i10], e10[i10]);
    }), e10.attr({ d: e10.renderer.symbols[e10.symbolName](e10.x, e10.y, e10.width, e10.height, e10) });
  }
  textSetter(t11) {
    t11 !== this.textStr && (delete this.textPxLength, this.textStr = t11, this.added && this.renderer.buildText(this), this.reAlign());
  }
  titleSetter(t11) {
    let e10 = this.element, i10 = e10.getElementsByTagName("title")[0] || el.createElementNS(this.SVG_NS, "title");
    e10.insertBefore ? e10.insertBefore(i10, e10.firstChild) : e10.appendChild(i10), i10.textContent = tw(ty(t11, ""), [/<[^>]*>/g, ""]).replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  toFront() {
    let t11 = this.element;
    return t11.parentNode.appendChild(t11), this;
  }
  translate(t11, e10) {
    return this.attr({ translateX: t11, translateY: e10 });
  }
  updateTransform(t11 = "transform") {
    let { element: e10, foreignObject: i10, matrix: s10, padding: o2, rotation: r2 = 0, rotationOriginX: a2, rotationOriginY: n2, scaleX: h2, scaleY: l2, text: d2, translateX: c2 = 0, translateY: p2 = 0 } = this, g2 = [`translate(${c2},${p2})`];
    $(s10) && g2.push("matrix(" + s10.join(",") + ")"), r2 && (g2.push("rotate(" + r2 + " " + (a2 ?? e10.getAttribute("x") ?? this.x ?? 0) + " " + (n2 ?? e10.getAttribute("y") ?? this.y ?? 0) + ")"), d2?.element.tagName !== "SPAN" || d2?.foreignObject || d2.attr({ rotation: r2, rotationOriginX: (a2 || 0) - o2, rotationOriginY: (n2 || 0) - o2 })), ($(h2) || $(l2)) && g2.push(`scale(${h2 ?? 1} ${l2 ?? 1})`), g2.length && !(d2 || this).textPath && (i10?.element || e10).setAttribute(t11, g2.join(" "));
  }
  visibilitySetter(t11, e10, i10) {
    "inherit" === t11 ? i10.removeAttribute(e10) : this[e10] !== t11 && i10.setAttribute(e10, t11), this[e10] = t11;
  }
  xGetter(t11) {
    return "circle" === this.element.nodeName && ("x" === t11 ? t11 = "cx" : "y" === t11 && (t11 = "cy")), this._defaultGetter(t11);
  }
  zIndexSetter(t11, e10) {
    let i10 = this.renderer, s10 = this.parentGroup, o2 = (s10 || i10).element || i10.box, r2 = this.element, a2 = o2 === i10.box, n2, h2, l2, d2 = false, c2, p2 = this.added, g2;
    if ($(t11) ? (r2.setAttribute("data-z-index", t11), t11 *= 1, this[e10] === t11 && (p2 = false)) : $(this[e10]) && r2.removeAttribute("data-z-index"), this[e10] = t11, p2) {
      for ((t11 = this.zIndex) && s10 && (s10.handleZ = true), g2 = (n2 = o2.childNodes).length - 1; g2 >= 0 && !d2; g2--) c2 = !$(l2 = (h2 = n2[g2]).getAttribute("data-z-index")), h2 !== r2 && (t11 < 0 && c2 && !a2 && !g2 ? (o2.insertBefore(r2, n2[g2]), d2 = true) : (tb(l2) <= t11 || c2 && (!$(t11) || t11 >= 0)) && (o2.insertBefore(r2, n2[g2 + 1]), d2 = true));
      d2 || (o2.insertBefore(r2, n2[3 * !!a2]), d2 = true);
    }
    return d2;
  }
};
eu.symbolCustomAttribs = ["anchorX", "anchorY", "clockwise", "end", "height", "innerR", "r", "start", "width", "x", "y"], eu.prototype.strokeSetter = eu.prototype.fillSetter, eu.prototype.yGetter = eu.prototype.xGetter, eu.prototype.matrixSetter = eu.prototype.rotationOriginXSetter = eu.prototype.rotationOriginYSetter = eu.prototype.rotationSetter = eu.prototype.scaleXSetter = eu.prototype.scaleYSetter = eu.prototype.translateXSetter = eu.prototype.translateYSetter = eu.prototype.verticalAlignSetter = function(t11, e10) {
  this[e10] = t11, this.doTransform = true;
};
var ef = eu;
var em = class _em extends ef {
  constructor(t11, e10, i10, s10, o2, r2, a2, n2, h2, l2) {
    let d2;
    super(t11, "g"), this.paddingLeftSetter = this.paddingSetter, this.paddingRightSetter = this.paddingSetter, this.doUpdate = false, this.textStr = e10, this.x = i10, this.y = s10, this.anchorX = r2, this.anchorY = a2, this.baseline = h2, this.className = l2, this.addClass("button" === l2 ? "highcharts-no-tooltip" : "highcharts-label"), l2 && this.addClass("highcharts-" + l2), this.text = t11.text(void 0, 0, 0, n2).attr({ zIndex: 1 }), "string" == typeof o2 && ((d2 = /^url\((.*?)\)$/.test(o2)) || this.renderer.symbols[o2]) && (this.symbolKey = o2), this.bBox = _em.emptyBBox, this.padding = 3, this.baselineOffset = 0, this.needsBox = t11.styledMode || d2, this.deferredAttr = {}, this.alignFactor = 0;
  }
  alignSetter(t11) {
    let e10 = Q(t11);
    this.textAlign = t11, e10 !== this.alignFactor && (this.alignFactor = e10, this.bBox && th(this.xSetting) && this.attr({ x: this.xSetting }), this.updateTextPadding());
  }
  anchorXSetter(t11, e10) {
    this.anchorX = t11, this.boxAttr(e10, Math.round(t11) - this.getCrispAdjust() - this.xSetting);
  }
  anchorYSetter(t11, e10) {
    this.anchorY = t11, this.boxAttr(e10, t11 - this.ySetting);
  }
  boxAttr(t11, e10) {
    this.box ? this.box.attr(t11, e10) : this.deferredAttr[t11] = e10;
  }
  css(t11) {
    if (t11) {
      let e10 = {};
      t11 = tg(t11), _em.textProps.forEach((i10) => {
        void 0 !== t11[i10] && (e10[i10] = t11[i10], delete t11[i10]);
      }), this.text.css(e10), "fontSize" in e10 || "fontWeight" in e10 || "width" in e10 ? this.updateTextPadding() : "textOverflow" in e10 && this.updateBoxSize();
    }
    return ef.prototype.css.call(this, t11);
  }
  destroy() {
    tM(this.element, "mouseenter"), tM(this.element, "mouseleave"), this.text && this.text.destroy(), this.box && (this.box = this.box.destroy()), ef.prototype.destroy.call(this);
  }
  fillSetter(t11, e10) {
    t11 && (this.needsBox = true), this.fill = t11, this.boxAttr(e10, t11);
  }
  getBBox(t11, e10) {
    (this.textStr && 0 === this.bBox.width && 0 === this.bBox.height || this.rotation) && this.updateBoxSize();
    let { padding: i10, height: s10 = 0, translateX: o2 = 0, translateY: r2 = 0, width: a2 = 0 } = this, n2 = ty(this.paddingLeft, i10), h2 = e10 ?? (this.rotation || 0), l2 = { width: a2, height: s10, x: o2 + this.bBox.x - n2, y: r2 + this.bBox.y - i10 + this.baselineOffset };
    return h2 && (l2 = this.getRotatedBox(l2, h2)), l2;
  }
  getCrispAdjust() {
    return (this.renderer.styledMode && this.box ? this.box.strokeWidth() : this["stroke-width"] ? parseInt(this["stroke-width"], 10) : 0) % 2 / 2;
  }
  heightSetter(t11) {
    this.heightSetting = t11, this.doUpdate = true;
  }
  afterSetters() {
    super.afterSetters(), this.doUpdate && (this.updateBoxSize(), this.doUpdate = false);
  }
  onAdd() {
    this.text.add(this), this.attr({ text: ty(this.textStr, ""), x: this.x || 0, y: this.y || 0 }), this.box && $(this.anchorX) && this.attr({ anchorX: this.anchorX, anchorY: this.anchorY });
  }
  paddingSetter(t11, e10) {
    th(t11) ? t11 !== this[e10] && (this[e10] = t11, this.updateTextPadding()) : this[e10] = void 0;
  }
  rSetter(t11, e10) {
    this.boxAttr(e10, t11);
  }
  strokeSetter(t11, e10) {
    this.stroke = t11, this.boxAttr(e10, t11);
  }
  "stroke-widthSetter"(t11, e10) {
    t11 && (this.needsBox = true), this["stroke-width"] = t11, this.boxAttr(e10, t11);
  }
  "text-alignSetter"(t11) {
    this.textAlign = this["text-align"] = t11, this.updateTextPadding();
  }
  textSetter(t11) {
    void 0 !== t11 && this.text.attr({ text: t11 }), this.updateTextPadding(), this.reAlign();
  }
  updateBoxSize() {
    let t11, e10 = this.text, i10 = {}, s10 = this.padding, o2 = this.bBox = (!th(this.widthSetting) || !th(this.heightSetting) || this.textAlign) && $(e10.textStr) ? e10.getBBox(void 0, 0) : _em.emptyBBox;
    this.width = this.getPaddedWidth(), this.height = (this.heightSetting || o2.height || 0) + 2 * s10;
    let r2 = this.renderer.fontMetrics(e10);
    if (this.baselineOffset = s10 + Math.min((this.text.firstLineMetrics || r2).b, o2.height || 1 / 0), this.heightSetting && (this.baselineOffset += (this.heightSetting - r2.h) / 2), this.needsBox && !e10.textPath) {
      if (!this.box) {
        let t12 = this.box = this.symbolKey ? this.renderer.symbol(this.symbolKey) : this.renderer.rect();
        t12.addClass(("button" === this.className ? "" : "highcharts-label-box") + (this.className ? " highcharts-" + this.className + "-box" : "")), t12.add(this);
      }
      i10.x = t11 = this.getCrispAdjust(), i10.y = (this.baseline ? -this.baselineOffset : 0) + t11, i10.width = Math.round(this.width), i10.height = Math.round(this.height), this.box.attr(K(i10, this.deferredAttr)), this.deferredAttr = {};
    }
  }
  updateTextPadding() {
    let t11 = this.text, e10 = t11.styles.textAlign || this.textAlign;
    if (!t11.textPath) {
      this.updateBoxSize();
      let i10 = this.baseline ? 0 : this.baselineOffset, s10 = (this.paddingLeft ?? this.padding) + Q(e10) * (this.widthSetting ?? this.bBox.width);
      (s10 !== t11.x || i10 !== t11.y) && (t11.attr({ align: e10, x: s10 }), void 0 !== i10 && t11.attr("y", i10)), t11.x = s10, t11.y = i10;
    }
  }
  widthSetter(t11) {
    this.widthSetting = th(t11) ? t11 : void 0, this.doUpdate = true;
  }
  getPaddedWidth() {
    let t11 = this.padding, e10 = ty(this.paddingLeft, t11), i10 = ty(this.paddingRight, t11);
    return (this.widthSetting || this.bBox.width || 0) + e10 + i10;
  }
  xSetter(t11) {
    this.x = t11, this.alignFactor && (t11 -= this.alignFactor * this.getPaddedWidth(), this["forceAnimate:x"] = true), this.anchorX && (this["forceAnimate:anchorX"] = true), this.xSetting = Math.round(t11), this.attr("translateX", this.xSetting);
  }
  ySetter(t11) {
    this.anchorY && (this["forceAnimate:anchorY"] = true), this.ySetting = this.y = Math.round(t11), this.attr("translateY", this.ySetting);
  }
};
function ex(t11, e10, i10, s10, o2) {
  let r2 = [];
  if (o2) {
    let a2 = o2.start || 0, n2 = o2.end || 0, h2 = ty(o2.r, i10), l2 = ty(o2.r, s10 || i10), d2 = 1e-4 > Math.abs(n2 - a2 - 2 * Math.PI);
    d2 && (a2 = Math.PI / 2, n2 = 2.5 * Math.PI - 1e-4);
    let c2 = o2.innerR, p2 = ty(o2.open, d2), g2 = d2 ? 0 : Math.cos(a2), u2 = d2 ? 1 : Math.sin(a2), f2 = d2 ? 0 : Math.cos(n2), m2 = d2 ? 1 : Math.sin(n2), x2 = ty(o2.longArc, n2 - a2 - Math.PI < 1e-4 ? 0 : 1), y2 = ["A", h2, l2, 0, x2, ty(o2.clockwise, 1), t11 + (d2 ? 1e-3 : h2 * f2), e10 + l2 * m2];
    y2.params = { start: a2, end: n2, cx: t11, cy: e10 }, r2.push(["M", t11 + h2 * g2, e10 + l2 * u2], y2), $(c2) && ((y2 = ["A", c2, c2, 0, x2, $(o2.clockwise) ? 1 - o2.clockwise : 0, t11 + (d2 ? -1e-3 : c2 * g2), e10 + c2 * u2]).params = { start: n2, end: a2, cx: t11, cy: e10 }, r2.push(p2 ? ["M", t11 + c2 * f2, e10 + c2 * m2] : ["L", t11 + c2 * f2, e10 + c2 * m2], y2)), p2 || r2.push(["Z"]);
  }
  return r2;
}
function ey(t11, e10, i10, s10, o2) {
  return o2?.r ? eb(t11, e10, i10, s10, o2) : [["M", t11, e10], ["L", t11 + i10, e10], ["L", t11 + i10, e10 + s10], ["L", t11, e10 + s10], ["Z"]];
}
function eb(t11, e10, i10, s10, o2) {
  let r2 = o2?.r || 0;
  return [["M", t11 + r2, e10], ["L", t11 + i10 - r2, e10], ["A", r2, r2, 0, 0, 1, t11 + i10, e10 + r2], ["L", t11 + i10, e10 + s10 - r2], ["A", r2, r2, 0, 0, 1, t11 + i10 - r2, e10 + s10], ["L", t11 + r2, e10 + s10], ["A", r2, r2, 0, 0, 1, t11, e10 + s10 - r2], ["L", t11, e10 + r2], ["A", r2, r2, 0, 0, 1, t11 + r2, e10], ["Z"]];
}
em.emptyBBox = { width: 0, height: 0, x: 0, y: 0 }, em.textProps = ["color", "direction", "fontFamily", "fontSize", "fontStyle", "fontWeight", "lineClamp", "lineHeight", "textAlign", "textDecoration", "textOutline", "textOverflow", "whiteSpace", "width"];
var ev = { arc: ex, callout: function(t11, e10, i10, s10, o2) {
  let r2 = Math.min(o2?.r || 0, i10, s10), a2 = r2 + 6, n2 = o2?.anchorX, h2 = o2?.anchorY || 0, l2 = eb(t11, e10, i10, s10, { r: r2 });
  if (!th(n2) || n2 < i10 && n2 > 0 && h2 < s10 && h2 > 0) return l2;
  if (t11 + n2 > i10 - a2) if (h2 > e10 + a2 && h2 < e10 + s10 - a2) l2.splice(3, 1, ["L", t11 + i10, h2 - 6], ["L", t11 + i10 + 6, h2], ["L", t11 + i10, h2 + 6], ["L", t11 + i10, e10 + s10 - r2]);
  else if (n2 < i10) {
    let o3 = h2 < e10 + a2, d2 = o3 ? e10 : e10 + s10;
    l2.splice(o3 ? 2 : 5, 0, ["L", n2, h2], ["L", t11 + i10 - r2, d2]);
  } else l2.splice(3, 1, ["L", t11 + i10, s10 / 2], ["L", n2, h2], ["L", t11 + i10, s10 / 2], ["L", t11 + i10, e10 + s10 - r2]);
  else if (t11 + n2 < a2) if (h2 > e10 + a2 && h2 < e10 + s10 - a2) l2.splice(7, 1, ["L", t11, h2 + 6], ["L", t11 - 6, h2], ["L", t11, h2 - 6], ["L", t11, e10 + r2]);
  else if (n2 > 0) {
    let i11 = h2 < e10 + a2, o3 = i11 ? e10 : e10 + s10;
    l2.splice(i11 ? 1 : 6, 0, ["L", n2, h2], ["L", t11 + r2, o3]);
  } else l2.splice(7, 1, ["L", t11, s10 / 2], ["L", n2, h2], ["L", t11, s10 / 2], ["L", t11, e10 + r2]);
  else h2 > s10 && n2 < i10 - a2 ? l2.splice(5, 1, ["L", n2 + 6, e10 + s10], ["L", n2, e10 + s10 + 6], ["L", n2 - 6, e10 + s10], ["L", t11 + r2, e10 + s10]) : h2 < 0 && n2 > a2 && l2.splice(1, 1, ["L", n2 - 6, e10], ["L", n2, e10 - 6], ["L", n2 + 6, e10], ["L", i10 - r2, e10]);
  return l2;
}, circle: function(t11, e10, i10, s10) {
  return ex(t11 + i10 / 2, e10 + s10 / 2, i10 / 2, s10 / 2, { start: 0.5 * Math.PI, end: 2.5 * Math.PI, open: false });
}, diamond: function(t11, e10, i10, s10) {
  return [["M", t11 + i10 / 2, e10], ["L", t11 + i10, e10 + s10 / 2], ["L", t11 + i10 / 2, e10 + s10], ["L", t11, e10 + s10 / 2], ["Z"]];
}, rect: ey, roundedRect: eb, square: ey, triangle: function(t11, e10, i10, s10) {
  return [["M", t11 + i10 / 2, e10], ["L", t11 + i10, e10 + s10], ["L", t11, e10 + s10], ["Z"]];
}, "triangle-down": function(t11, e10, i10, s10) {
  return [["M", t11, e10], ["L", t11 + i10, e10], ["L", t11 + i10 / 2, e10 + s10], ["Z"]];
} };
var { doc: ek, SVG_NS: ew, win: eM } = D;
var eS = (t11, e10) => t11.substring(0, e10) + "…";
var eT = class {
  constructor(t11) {
    let e10 = t11.styles;
    this.renderer = t11.renderer, this.svgElement = t11, this.width = t11.textWidth, this.textLineHeight = e10?.lineHeight, this.textOutline = e10?.textOutline, this.ellipsis = e10?.textOverflow === "ellipsis", this.lineClamp = e10?.lineClamp, this.noWrap = e10?.whiteSpace === "nowrap";
  }
  buildSVG() {
    let t11 = this.svgElement, e10 = t11.element, i10 = t11.renderer, s10 = ty(t11.textStr, "").toString(), o2 = -1 !== s10.indexOf("<"), r2 = e10.childNodes, a2 = !t11.added && i10.box, n2 = [s10, this.ellipsis, this.noWrap, this.textLineHeight, this.textOutline, t11.getStyle("font-size"), t11.styles.lineClamp, this.width].join(",");
    if (n2 !== t11.textCache) {
      t11.textCache = n2, delete t11.actualWidth;
      for (let t12 = r2.length; t12--; ) e10.removeChild(r2[t12]);
      if (o2 || this.ellipsis || this.width || t11.textPath || -1 !== s10.indexOf(" ") && (!this.noWrap || /<br.*?>/g.test(s10))) {
        if ("" !== s10) {
          a2 && a2.appendChild(e10);
          let i11 = new t5(s10);
          this.modifyTree(i11.nodes), i11.addToDOM(e10), this.modifyDOM(), this.ellipsis && -1 !== (e10.textContent || "").indexOf("…") && t11.attr("title", this.unescapeEntities(t11.textStr || "", ["&lt;", "&gt;"])), a2 && a2.removeChild(e10);
        }
      } else e10.appendChild(ek.createTextNode(this.unescapeEntities(s10)));
      tl(this.textOutline) && t11.applyTextOutline && t11.applyTextOutline(this.textOutline);
    }
  }
  modifyDOM() {
    let t11, e10 = this.svgElement, i10 = X(e10.element, "x");
    for (e10.firstLineMetrics = void 0; t11 = e10.element.firstChild; ) if (/^[\s\u200B]*$/.test(t11.textContent || " ")) e10.element.removeChild(t11);
    else break;
    [].forEach.call(e10.element.querySelectorAll("tspan.highcharts-br"), (t12, s11) => {
      t12.nextSibling && t12.previousSibling && (0 === s11 && 1 === t12.previousSibling.nodeType && (e10.firstLineMetrics = e10.renderer.fontMetrics(t12.previousSibling)), X(t12, { dy: this.getLineHeight(t12.nextSibling), x: i10 }));
    });
    let s10 = this.width || 0;
    if (!s10) return;
    let o2 = (t12, o3) => {
      let r3 = t12.textContent || "", a2 = r3.replace(/([^\^])-/g, "$1- ").split(" "), n2 = !this.noWrap && (a2.length > 1 || e10.element.childNodes.length > 1), h2 = this.getLineHeight(o3), l2 = Math.max(0, s10 - 0.8 * h2), d2 = 0, c2 = e10.actualWidth;
      if (n2) {
        let r4 = [], n3 = [];
        for (; o3.firstChild && o3.firstChild !== t12; ) n3.push(o3.firstChild), o3.removeChild(o3.firstChild);
        for (; a2.length; ) if (a2.length && !this.noWrap && d2 > 0 && (r4.push(t12.textContent || ""), t12.textContent = a2.join(" ").replace(/- /g, "-")), this.truncate(t12, void 0, a2, 0 === d2 && c2 || 0, s10, l2, (t13, e11) => a2.slice(0, e11).join(" ").replace(/- /g, "-")), c2 = e10.actualWidth, d2++, this.lineClamp && d2 >= this.lineClamp) {
          a2.length && (this.truncate(t12, t12.textContent || "", void 0, 0, s10, l2, eS), t12.textContent = t12.textContent?.replace("…", "") + "…");
          break;
        }
        n3.forEach((e11) => {
          o3.insertBefore(e11, t12);
        }), r4.forEach((e11) => {
          o3.insertBefore(ek.createTextNode(e11), t12);
          let s11 = ek.createElementNS(ew, "tspan");
          s11.textContent = "​", X(s11, { dy: h2, x: i10 }), o3.insertBefore(s11, t12);
        });
      } else this.ellipsis && r3 && this.truncate(t12, r3, void 0, 0, s10, l2, eS);
    }, r2 = (t12) => {
      [].slice.call(t12.childNodes).forEach((i11) => {
        i11.nodeType === eM.Node.TEXT_NODE ? o2(i11, t12) : (-1 !== i11.className.baseVal.indexOf("highcharts-br") && (e10.actualWidth = 0), r2(i11));
      });
    };
    r2(e10.element);
  }
  getLineHeight(t11) {
    let e10 = t11.nodeType === eM.Node.TEXT_NODE ? t11.parentElement : t11;
    return this.textLineHeight ? parseInt(this.textLineHeight.toString(), 10) : this.renderer.fontMetrics(e10 || this.svgElement.element).h;
  }
  modifyTree(t11) {
    let e10 = (i10, s10) => {
      let { attributes: o2 = {}, children: r2, style: a2 = {}, tagName: n2 } = i10, h2 = this.renderer.styledMode;
      if ("b" === n2 || "strong" === n2 ? h2 ? o2.class = "highcharts-strong" : a2.fontWeight = "bold" : ("i" === n2 || "em" === n2) && (h2 ? o2.class = "highcharts-emphasized" : a2.fontStyle = "italic"), a2?.color && (a2.fill = a2.color), "br" === n2) {
        o2.class = "highcharts-br", i10.textContent = "​";
        let e11 = t11[s10 + 1];
        e11?.textContent && (e11.textContent = e11.textContent.replace(/^ +/gm, ""));
      } else "a" === n2 && r2 && r2.some((t12) => "#text" === t12.tagName) && (i10.children = [{ children: r2, tagName: "tspan" }]);
      "#text" !== n2 && "a" !== n2 && (i10.tagName = "tspan"), K(i10, { attributes: o2, style: a2 }), r2 && r2.filter((t12) => "#text" !== t12.tagName).forEach(e10);
    };
    t11.forEach(e10), J(this.svgElement, "afterModifyTree", { nodes: t11 });
  }
  truncate(t11, e10, i10, s10, o2, r2, a2) {
    let n2, h2, l2 = this.svgElement, { rotation: d2 } = l2, c2 = [], p2 = i10 && !s10 ? 1 : 0, g2 = (e10 || i10 || "").length, u2 = g2;
    i10 || (o2 = r2);
    let f2 = function(e11, o3) {
      let r3 = o3 || e11, a3 = t11.parentNode;
      if (a3 && void 0 === c2[r3] && a3.getSubStringLength) try {
        c2[r3] = s10 + a3.getSubStringLength(0, i10 ? r3 + 1 : r3);
      } catch {
      }
      return c2[r3];
    };
    if (l2.rotation = 0, s10 + (h2 = f2(t11.textContent.length)) > o2) {
      for (; p2 <= g2; ) u2 = Math.ceil((p2 + g2) / 2), i10 && (n2 = a2(i10, u2)), h2 = f2(u2, n2 && n2.length - 1), p2 === g2 ? p2 = g2 + 1 : h2 > o2 ? g2 = u2 - 1 : p2 = u2;
      0 === g2 ? t11.textContent = "" : e10 && g2 === e10.length - 1 || (t11.textContent = n2 || a2(e10 || i10, u2)), this.ellipsis && h2 > o2 && this.truncate(t11, t11.textContent || "", void 0, 0, o2, r2, eS);
    }
    i10 && i10.splice(0, u2), l2.actualWidth = h2, l2.rotation = d2;
  }
  unescapeEntities(t11, e10) {
    return tf(this.renderer.escapes, function(i10, s10) {
      e10 && -1 !== e10.indexOf(i10) || (t11 = t11.toString().replace(RegExp(i10, "g"), s10));
    }), t11;
  }
};
var { defaultOptions: eC } = tF;
var { charts: eA, deg2rad: eP, doc: eL, isFirefox: eO, isMS: eE, isWebKit: eI, noop: eD, SVG_NS: eB, symbolSizes: eN, win: ez } = D;
var eR = class {
  constructor(t11, e10, i10, s10, o2, r2, a2) {
    let n2, h2;
    this.x = 0, this.y = 0;
    let l2 = this.createElement("svg").attr({ version: "1.1", class: "highcharts-root" }), d2 = l2.element;
    a2 || l2.css(this.getStyle(s10 || {})), t11.appendChild(d2), X(t11, "dir", "ltr"), -1 === t11.innerHTML.indexOf("xmlns") && X(d2, "xmlns", this.SVG_NS), this.box = d2, this.boxWrapper = l2, this.alignedObjects = [], this.url = this.getReferenceURL(), this.createElement("desc").add().element.appendChild(eL.createTextNode("Created with Highcharts 12.6.0")), this.defs = this.createElement("defs").add(), this.allowHTML = r2, this.forExport = o2, this.styledMode = a2, this.gradients = {}, this.cache = {}, this.cacheKeys = [], this.asyncCounter = 0, this.rootFontSize = l2.getStyle("font-size"), this.setSize(e10, i10, false), eO && t11.getBoundingClientRect && ((n2 = function() {
      j(t11, { left: 0, top: 0 }), h2 = t11.getBoundingClientRect(), j(t11, { left: Math.ceil(h2.left) - h2.left + "px", top: Math.ceil(h2.top) - h2.top + "px" });
    })(), this.unSubPixelFix = z(ez, "resize", n2));
  }
  definition(t11) {
    return new t5([t11]).addToDOM(this.defs.element);
  }
  getReferenceURL() {
    if ((eO || eI) && eL.getElementsByTagName("base").length) {
      if (!$(e)) {
        let t11 = tD(), i10 = new t5([{ tagName: "svg", attributes: { width: 8, height: 8 }, children: [{ tagName: "defs", children: [{ tagName: "clipPath", attributes: { id: t11 }, children: [{ tagName: "rect", attributes: { width: 4, height: 4 } }] }] }, { tagName: "rect", attributes: { id: "hitme", width: 8, height: 8, "clip-path": `url(#${t11})`, fill: "rgba(0,0,0,0.001)" } }] }]).addToDOM(eL.body);
        j(i10, { position: "fixed", top: 0, left: 0, zIndex: 9e5 });
        let s10 = eL.elementFromPoint(6, 6);
        e = s10?.id === "hitme", eL.body.removeChild(i10);
      }
      if (e) return tw(ez.location.href.split("#")[0], [/<[^>]*>/g, ""], [/([\('\)])/g, "\\$1"], [/ /g, "%20"]);
    }
    return "";
  }
  getStyle(t11) {
    return this.style = K({ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif', fontSize: "1rem" }, t11), this.style;
  }
  setStyle(t11) {
    this.boxWrapper.css(this.getStyle(t11));
  }
  isHidden() {
    return !this.boxWrapper.getBBox().width;
  }
  destroy() {
    let t11 = this.defs;
    return this.box = null, this.boxWrapper = this.boxWrapper.destroy(), V(this.gradients || {}), this.gradients = null, this.defs = t11.destroy(), this.unSubPixelFix && this.unSubPixelFix(), this.alignedObjects = null, null;
  }
  createElement(t11) {
    return new this.Element(this, t11);
  }
  getRadialAttr(t11, e10) {
    return { cx: t11[0] - t11[2] / 2 + (e10.cx || 0) * t11[2], cy: t11[1] - t11[2] / 2 + (e10.cy || 0) * t11[2], r: (e10.r || 0) * t11[2] };
  }
  shadowDefinition(t11) {
    let e10 = [`highcharts-drop-shadow-${this.chartIndex}`, ...Object.keys(t11).map((e11) => `${e11}-${t11[e11]}`)].join("-").toLowerCase().replace(/[^a-z\d\-]/g, ""), i10 = tg({ color: "#000000", offsetX: 1, offsetY: 1, opacity: 0.15, width: 5 }, t11);
    return this.defs.element.querySelector(`#${e10}`) || this.definition({ tagName: "filter", attributes: { id: e10, filterUnits: i10.filterUnits }, children: this.getShadowFilterContent(i10) }), e10;
  }
  getShadowFilterContent(t11) {
    return [{ tagName: "feDropShadow", attributes: { dx: t11.offsetX, dy: t11.offsetY, "flood-color": t11.color, "flood-opacity": Math.min(5 * t11.opacity, 1), stdDeviation: t11.width / 2 } }];
  }
  buildText(t11) {
    new eT(t11).buildSVG();
  }
  getContrast(t11) {
    if ("transparent" === t11) return "#000000";
    let e10 = tV.parse(t11).rgba, i10 = " clamp(0,calc(9e9*(0.5 - (0.2126*r + 0.7152*g + 0.0722*b))),1)";
    if (th(e10[0]) || !tV.useColorMix) {
      let t12 = e10.map((t13) => {
        let e11 = t13 / 255;
        return e11 <= 0.04 ? e11 / 12.92 : Math.pow((e11 + 0.055) / 1.055, 2.4);
      }), i11 = 0.2126 * t12[0] + 0.7152 * t12[1] + 0.0722 * t12[2];
      return 1.05 / (i11 + 0.05) > (i11 + 0.05) / 0.05 ? "#FFFFFF" : "#000000";
    }
    return "color(from " + t11 + " srgb" + i10 + i10 + i10 + ")";
  }
  button(t11, e10, i10, s10, o2 = {}, r2, a2, n2, h2, l2) {
    let d2 = this.label(t11, e10, i10, h2, void 0, void 0, l2, void 0, "button"), c2 = this.styledMode, p2 = arguments, g2 = 0;
    o2 = tg(eC.global.buttonTheme, o2), c2 && (delete o2.fill, delete o2.stroke, delete o2["stroke-width"]);
    let u2 = o2.states || {}, f2 = o2.style || {};
    delete o2.states, delete o2.style;
    let m2 = [t5.filterUserAttributes(o2)], x2 = [f2];
    return c2 || ["hover", "select", "disabled"].forEach((t12, e11) => {
      m2.push(tg(m2[0], t5.filterUserAttributes(p2[e11 + 5] || u2[t12] || {}))), x2.push(m2[e11 + 1].style), delete m2[e11 + 1].style;
    }), z(d2.element, eE ? "mouseover" : "mouseenter", function() {
      3 !== g2 && d2.setState(1);
    }), z(d2.element, eE ? "mouseout" : "mouseleave", function() {
      3 !== g2 && d2.setState(g2);
    }), d2.setState = (t12 = 0) => {
      if (1 !== t12 && (d2.state = g2 = t12), d2.removeClass(/highcharts-button-(normal|hover|pressed|disabled)/).addClass("highcharts-button-" + ["normal", "hover", "pressed", "disabled"][t12]), !c2) {
        d2.attr(m2[t12]);
        let e11 = x2[t12];
        tp(e11) && d2.css(e11);
      }
    }, d2.attr(m2[0]), !c2 && (d2.css(K({ cursor: "default" }, f2)), l2 && d2.text.css({ pointerEvents: "none" })), d2.on("touchstart", (t12) => t12.stopPropagation()).on("click", function(t12) {
      3 !== g2 && s10?.call(d2, t12);
    });
  }
  crispLine(t11, e10) {
    let [i10, s10] = t11;
    return $(i10[1]) && i10[1] === s10[1] && (i10[1] = s10[1] = Y(i10[1], e10)), $(i10[2]) && i10[2] === s10[2] && (i10[2] = s10[2] = Y(i10[2], e10)), t11;
  }
  path(t11) {
    let e10 = this.styledMode ? {} : { fill: "none" };
    return td(t11) ? e10.d = t11 : tp(t11) && K(e10, t11), this.createElement("path").attr(e10);
  }
  circle(t11, e10, i10) {
    let s10 = tp(t11) ? t11 : void 0 === t11 ? {} : { x: t11, y: e10, r: i10 }, o2 = this.createElement("circle");
    return o2.xSetter = o2.ySetter = function(t12, e11, i11) {
      i11.setAttribute("c" + e11, t12);
    }, o2.attr(s10);
  }
  arc(t11, e10, i10, s10, o2, r2) {
    let a2;
    tp(t11) ? (e10 = (a2 = t11).y, i10 = a2.r, s10 = a2.innerR, o2 = a2.start, r2 = a2.end, t11 = a2.x) : a2 = { innerR: s10, start: o2, end: r2 };
    let n2 = this.symbol("arc", t11, e10, i10, i10, a2);
    return n2.r = i10, n2;
  }
  rect(t11, e10, i10, s10, o2, r2) {
    let a2 = tp(t11) ? t11 : void 0 === t11 ? {} : { x: t11, y: e10, r: o2, width: Math.max(i10 || 0, 0), height: Math.max(s10 || 0, 0) }, n2 = this.createElement("rect");
    return this.styledMode || (void 0 !== r2 && (a2["stroke-width"] = r2, K(a2, n2.crisp(a2))), a2.fill = "none"), n2.rSetter = function(t12, e11, i11) {
      n2.r = t12, X(i11, { rx: t12, ry: t12 });
    }, n2.rGetter = function() {
      return n2.r || 0;
    }, n2.attr(a2);
  }
  roundedRect(t11) {
    return this.symbol("roundedRect").attr(t11);
  }
  setSize(t11, e10, i10) {
    this.width = t11, this.height = e10, this.boxWrapper.animate({ width: t11, height: e10 }, { step: function() {
      this.attr({ viewBox: "0 0 " + this.attr("width") + " " + this.attr("height") });
    }, duration: ty(i10, true) ? void 0 : 0 }), this.alignElements();
  }
  g(t11) {
    let e10 = this.createElement("g");
    return t11 ? e10.attr({ class: "highcharts-" + t11 }) : e10;
  }
  image(t11, e10, i10, s10, o2, r2) {
    let a2 = { preserveAspectRatio: "none" };
    th(e10) && (a2.x = e10), th(i10) && (a2.y = i10), th(s10) && (a2.width = s10), th(o2) && (a2.height = o2);
    let n2 = this.createElement("image").attr(a2), h2 = function(e11) {
      n2.attr({ href: t11 }), r2.call(n2, e11);
    };
    if (r2) {
      n2.attr({ href: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" });
      let e11 = new ez.Image();
      z(e11, "load", h2), e11.src = t11, e11.complete && h2({});
    } else n2.attr({ href: t11 });
    return n2;
  }
  symbol(t11, e10, i10, s10, o2, r2) {
    let a2, n2, h2, l2, d2 = this, c2 = /^url\((.*?)\)$/, p2 = c2.test(t11), g2 = !p2 && (this.symbols[t11] ? t11 : "circle"), u2 = g2 && this.symbols[g2];
    if (u2) "number" == typeof e10 && (n2 = u2.call(this.symbols, e10 || 0, i10 || 0, s10 || 0, o2 || 0, r2)), a2 = this.path(n2), d2.styledMode || a2.attr("fill", "none"), K(a2, { symbolName: g2 || void 0, x: e10, y: i10, width: s10, height: o2 }), r2 && K(a2, r2);
    else if (p2) {
      h2 = t11.match(c2)[1];
      let s11 = a2 = this.image(h2);
      s11.imgwidth = ty(r2?.width, eN[h2]?.width), s11.imgheight = ty(r2?.height, eN[h2]?.height), l2 = (t12) => t12.attr({ width: t12.width, height: t12.height }), ["width", "height"].forEach((t12) => {
        s11[`${t12}Setter`] = function(t13, e11) {
          this[e11] = t13;
          let { alignByTranslate: i11, element: s12, width: o3, height: a3, imgwidth: n3, imgheight: h3 } = this, l3 = "width" === e11 ? n3 : h3, d3 = 1;
          r2 && "within" === r2.backgroundSize && o3 && a3 && n3 && h3 ? (d3 = Math.min(o3 / n3, a3 / h3), X(s12, { width: Math.round(n3 * d3), height: Math.round(h3 * d3) })) : s12 && l3 && s12.setAttribute(e11, l3), !i11 && n3 && h3 && this.translate(((o3 || 0) - n3 * d3) / 2, ((a3 || 0) - h3 * d3) / 2);
        };
      }), $(e10) && s11.attr({ x: e10, y: i10 }), s11.isImg = true, $(s11.imgwidth) && $(s11.imgheight) ? l2(s11) : (s11.attr({ width: 0, height: 0 }), F("img", { onload: function() {
        let t12 = eA[d2.chartIndex];
        0 === this.width && (j(this, { position: "absolute", top: "-999em" }), eL.body.appendChild(this)), eN[h2] = { width: this.width, height: this.height }, s11.imgwidth = this.width, s11.imgheight = this.height, s11.element && l2(s11), this.parentNode && this.parentNode.removeChild(this), d2.asyncCounter--, d2.asyncCounter || !t12 || t12.hasLoaded || t12.onload();
      }, src: h2 }), this.asyncCounter++);
    }
    return a2;
  }
  clipRect(t11, e10, i10, s10) {
    return this.rect(t11, e10, i10, s10, 0);
  }
  text(t11, e10, i10, s10) {
    let o2 = {};
    if (s10 && (this.allowHTML || !this.forExport)) return this.html(t11, e10, i10);
    o2.x = Math.round(e10 || 0), i10 && (o2.y = Math.round(i10)), $(t11) && (o2.text = t11);
    let r2 = this.createElement("text").attr(o2);
    return s10 && (!this.forExport || this.allowHTML) || (r2.xSetter = function(t12, e11, i11) {
      let s11 = i11.getElementsByTagName("tspan"), o3 = i11.getAttribute(e11);
      for (let i12 = 0, r3; i12 < s11.length; i12++) (r3 = s11[i12]).getAttribute(e11) === o3 && r3.setAttribute(e11, t12);
      i11.setAttribute(e11, t12);
    }), r2;
  }
  fontMetrics(t11) {
    let e10 = th(t11) ? t11 : tb(ef.prototype.getStyle.call(t11, "font-size") || 0), i10 = e10 < 24 ? e10 + 3 : Math.round(1.2 * e10), s10 = Math.round(0.8 * i10);
    return { h: i10, b: s10, f: e10 };
  }
  rotCorr(t11, e10, i10) {
    let s10 = t11;
    return e10 && i10 && (s10 = Math.max(s10 * Math.cos(e10 * eP), 4)), { x: -t11 / 3 * Math.sin(e10 * eP), y: s10 };
  }
  pathToSegments(t11) {
    let e10 = [], i10 = [], s10 = { A: 8, C: 7, H: 2, L: 3, M: 3, Q: 5, S: 5, T: 3, V: 2 };
    for (let o2 = 0; o2 < t11.length; o2++) tl(i10[0]) && th(t11[o2]) && i10.length === s10[i10[0].toUpperCase()] && t11.splice(o2, 0, i10[0].replace("M", "L").replace("m", "l")), "string" == typeof t11[o2] && (i10.length && e10.push(i10.slice(0)), i10.length = 0), i10.push(t11[o2]);
    return e10.push(i10.slice(0)), e10;
  }
  label(t11, e10, i10, s10, o2, r2, a2, n2, h2) {
    return new em(this, t11, e10, i10, s10, o2, r2, a2, n2, h2);
  }
  alignElements() {
    this.alignedObjects.forEach((t11) => t11.align());
  }
};
K(eR.prototype, { Element: ef, SVG_NS: eB, escapes: { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }, symbols: ev, draw: eD }), es.registerRendererType("svg", eR, true);
var { composed: eW, isFirefox: eX } = D;
function eG(t11, e10, i10) {
  let s10 = this.div?.style;
  ef.prototype[`${e10}Setter`].call(this, t11, e10, i10), s10 && (i10.style[e10] = s10[e10] = t11);
}
var eH = (t11, e10) => {
  if (!t11.div) {
    let i10 = X(t11.element, "class"), s10 = t11.css, o2 = F("div", i10 ? { className: i10 } : void 0, __spreadProps(__spreadValues({ position: "absolute", left: `${t11.translateX || 0}px`, top: `${t11.translateY || 0}px` }, t11.styles), { display: t11.display, opacity: t11.opacity, visibility: t11.visibility }), t11.parentGroup?.div || e10);
    t11.classSetter = (t12, e11, i11) => {
      i11.setAttribute("class", t12), o2.className = t12;
    }, t11.translateXSetter = t11.translateYSetter = (e11, i11) => {
      t11[i11] = e11, o2.style["translateX" === i11 ? "left" : "top"] = `${e11}px`, t11.doTransform = true;
    }, t11.scaleXSetter = t11.scaleYSetter = (e11, i11) => {
      t11[i11] = e11, t11.doTransform = true;
    }, t11.opacitySetter = t11.visibilitySetter = eG, t11.css = (e11) => (s10.call(t11, e11), e11.cursor && (o2.style.cursor = e11.cursor), e11.pointerEvents && (o2.style.pointerEvents = e11.pointerEvents), t11), t11.on = function() {
      return ef.prototype.on.apply({ element: o2, onEvents: t11.onEvents }, arguments), t11;
    }, t11.div = o2;
  }
  return t11.div;
};
var eF = class _eF extends ef {
  static compose(t11) {
    tv(eW, this.compose) && (t11.prototype.html = function(t12, e10, i10) {
      return new _eF(this, "span").attr({ text: t12, x: Math.round(e10), y: Math.round(i10) });
    });
  }
  constructor(t11, e10) {
    super(t11, e10), _eF.useForeignObject ? this.foreignObject = t11.createElement("foreignObject").attr({ zIndex: 2 }) : this.css(__spreadValues({ position: "absolute" }, t11.styledMode ? {} : { fontFamily: t11.style.fontFamily, fontSize: t11.style.fontSize })), this.element.style.whiteSpace = "nowrap";
  }
  getSpanCorrection(t11, e10, i10) {
    this.xCorr = -t11 * i10, this.yCorr = -e10;
  }
  css(t11) {
    let e10, { element: i10 } = this, s10 = "SPAN" === i10.tagName && t11 && "width" in t11, o2 = s10 && t11.width;
    return s10 && (delete t11.width, this.textWidth = tb(o2) || void 0, e10 = true), t11?.textOverflow === "ellipsis" && (t11.overflow = "hidden", t11.whiteSpace = "nowrap"), t11?.lineClamp && (t11.display = "-webkit-box", t11.WebkitLineClamp = t11.lineClamp, t11.WebkitBoxOrient = "vertical", t11.overflow = "hidden"), th(Number(t11?.fontSize)) && (t11.fontSize += "px"), K(this.styles, t11), j(i10, t11), e10 && this.updateTransform(), this;
  }
  htmlGetBBox() {
    let { element: t11 } = this;
    return { x: t11.offsetLeft, y: t11.offsetTop, width: t11.offsetWidth, height: t11.offsetHeight };
  }
  updateTransform() {
    if (!this.added) {
      this.alignOnAdd = true;
      return;
    }
    let { element: t11, foreignObject: e10, oldTextWidth: i10, renderer: s10, rotation: o2, rotationOriginX: r2, rotationOriginY: a2, scaleX: n2, scaleY: h2, styles: { display: l2 = "inline-block", whiteSpace: d2 }, textAlign: c2 = "left", textWidth: p2, translateX: g2 = 0, translateY: u2 = 0, x: f2 = 0, y: m2 = 0 } = this, x2 = () => this.textPxLength ? this.textPxLength : (j(t11, { width: "", whiteSpace: d2 || "nowrap" }), t11.offsetWidth);
    if (e10 || j(t11, { marginLeft: `${g2}px`, marginTop: `${u2}px` }), "SPAN" === t11.tagName) {
      let g3, u3 = [o2, c2, t11.innerHTML, p2, this.textAlign].join(","), y2 = -(this.parentGroup?.padding * 1) || 0;
      if (p2 !== i10) {
        let e11 = x2(), r3 = p2 || 0, a3 = !s10.styledMode && "" === t11.style.textOverflow && t11.style.webkitLineClamp;
        (r3 > i10 || e11 > r3 || a3) && (/[\-\s\u00AD]/.test(t11.textContent || t11.innerText) || "ellipsis" === t11.style.textOverflow) && (j(t11, { width: (o2 || n2 || e11 > r3) && th(p2) ? p2 + "px" : a3 ? Math.min(e11 + 1, r3) + "px" : "auto", display: l2, whiteSpace: d2 || "normal" }), this.oldTextWidth = p2);
      }
      e10 && (j(t11, { display: "inline-block", verticalAlign: "top" }), e10.attr({ width: s10.width, height: s10.height })), u3 !== this.cTT && (g3 = s10.fontMetrics(t11).b, $(o2) && !e10 && (o2 !== (this.oldRotation || 0) || c2 !== this.oldAlign) && j(t11, { transform: `rotate(${o2}deg)`, transformOrigin: `${y2}% ${y2}px` }), this.getSpanCorrection(!$(o2) && !this.textWidth && this.textPxLength || t11.offsetWidth, g3, Q(c2)));
      let { xCorr: b2 = 0, yCorr: v2 = 0 } = this, k2 = { left: `${f2 + b2}px`, top: `${m2 + v2}px`, textAlign: c2, transformOrigin: `${(r2 ?? f2) - b2 - f2 - y2}px ${(a2 ?? m2) - v2 - m2 - y2}px` };
      (n2 || h2) && (k2.transform = `scale(${n2 ?? 1},${h2 ?? 1})`), e10 ? (super.updateTransform(), th(f2) && th(m2) ? (e10.attr({ x: f2 + b2, y: m2 + v2, width: t11.offsetWidth + 3, height: t11.offsetHeight, "transform-origin": t11.getAttribute("transform-origin") || "0 0" }), j(t11, { display: l2, textAlign: c2 })) : eX && e10.attr({ width: 0, height: 0 })) : j(t11, k2), this.cTT = u3, this.oldRotation = o2, this.oldAlign = c2;
    }
  }
  add(t11) {
    let { foreignObject: e10, renderer: i10 } = this, s10 = i10.box.parentNode, o2 = [];
    if (e10) e10.add(t11), super.add(i10.createElement("body").attr({ xmlns: "http://www.w3.org/1999/xhtml" }).css({ background: "transparent", margin: "0 3px 0 0" }).add(e10));
    else {
      let e11;
      if (this.parentGroup = t11, t11 && !(e11 = t11.div)) {
        let i11 = t11;
        for (; i11; ) o2.push(i11), i11 = i11.parentGroup;
        for (let t12 of o2.reverse()) e11 = eH(t12, s10);
      }
      (e11 || s10).appendChild(this.element);
    }
    return this.added = true, this.alignOnAdd && this.updateTransform(), this;
  }
  textSetter(t11) {
    t11 !== this.textStr && (delete this.bBox, delete this.oldTextWidth, t5.setElementHTML(this.element, t11 ?? ""), this.textStr = t11, this.doTransform = true);
  }
  alignSetter(t11) {
    this.alignValue = this.textAlign = t11, this.doTransform = true;
  }
  xSetter(t11, e10) {
    this[e10] = t11, this.doTransform = true;
  }
};
var eY = eF.prototype;
eY.visibilitySetter = eY.opacitySetter = eG, eY.ySetter = eY.rotationSetter = eY.rotationOriginXSetter = eY.rotationOriginYSetter = eY.xSetter, (h = y || (y = {})).xAxis = { alignTicks: true, allowDecimals: void 0, panningEnabled: true, zIndex: 2, zoomEnabled: true, dateTimeLabelFormats: { millisecond: { main: "%[HMSL]", range: false }, second: { main: "%[HMS]", range: false }, minute: { main: "%[HM]", range: false }, hour: { main: "%[HM]", range: false }, day: { main: "%[eb]" }, week: { main: "%[eb]" }, month: { main: "%[bY]" }, year: { main: "%Y" } }, endOnTick: false, gridLineDashStyle: "Solid", gridZIndex: 1, labels: { autoRotationLimit: 80, distance: 15, enabled: true, indentation: 10, overflow: "justify", reserveSpace: void 0, rotation: void 0, staggerLines: 0, step: 0, useHTML: false, zIndex: 7, style: { color: "#333333", cursor: "default", fontSize: "0.8em", textOverflow: "ellipsis" } }, maxPadding: 0.01, minorGridLineDashStyle: "Solid", minorTickLength: 2, minorTickPosition: "outside", minorTicksPerMajor: 5, minPadding: 0.01, offset: void 0, reversed: void 0, reversedStacks: false, showEmpty: true, showFirstLabel: true, showLastLabel: true, startOfWeek: 1, startOnTick: false, tickLength: 10, tickmarkPlacement: "between", tickPixelInterval: 100, tickPosition: "outside", title: { align: "middle", useHTML: false, x: 0, y: 0, style: { color: "#666666", fontSize: "0.8em" } }, visible: true, minorGridLineColor: "#f2f2f2", minorGridLineWidth: 1, minorTickColor: "#999999", lineColor: "#333333", lineWidth: 1, gridLineColor: "#e6e6e6", gridLineWidth: void 0, tickColor: "#333333" }, h.yAxis = { reversedStacks: true, endOnTick: true, maxPadding: 0.05, minPadding: 0.05, tickPixelInterval: 72, showLastLabel: true, labels: { x: void 0 }, startOnTick: true, title: {}, stackLabels: { animation: {}, allowOverlap: false, enabled: false, crop: true, overflow: "justify", formatter: function() {
  return this.axis.chart.numberFormatter(this.total || 0, -1);
}, style: { color: "#000000", fontSize: "0.7em", fontWeight: "bold", textOutline: "1px contrast" } }, gridLineWidth: 1, lineWidth: 0 };
var ej = y;
(b || (b = {})).registerEventOptions = function(t11, e10) {
  t11.eventOptions = t11.eventOptions || {}, tf(e10.events, function(e11, i10) {
    t11.eventOptions[i10] !== e11 && (t11.eventOptions[i10] && (tM(t11, i10, t11.eventOptions[i10]), delete t11.eventOptions[i10]), tc(e11) && (t11.eventOptions[i10] = e11, z(t11, i10, e11, { order: 0 })));
  });
};
var e$ = b;
var { deg2rad: eV } = D;
var eU = class {
  constructor(t11, e10, i10, s10, o2) {
    this.isNew = true, this.isNewLabel = true, this.axis = t11, this.pos = e10, this.type = i10 || "", this.parameters = o2 || {}, this.tickmarkOffset = this.parameters.tickmarkOffset, this.options = this.parameters.options, J(this, "init"), i10 || s10 || this.addLabel();
  }
  addLabel() {
    let t11 = this, e10 = t11.axis, i10 = e10.options, s10 = e10.chart, o2 = e10.categories, r2 = e10.logarithmic, a2 = e10.names, n2 = t11.pos, h2 = ty(t11.options?.labels, i10.labels), l2 = e10.tickPositions, d2 = n2 === l2[0], c2 = n2 === l2[l2.length - 1], p2 = (!h2.step || 1 === h2.step) && 1 === e10.tickInterval, g2 = l2.info, u2 = t11.label, f2, m2, x2, y2 = this.parameters.category || (o2 ? ty(o2[n2], a2[n2], n2) : n2);
    r2 && th(y2) && (y2 = H(r2.lin2log(y2))), e10.dateTime && (g2 ? f2 = (m2 = s10.time.resolveDTLFormat(i10.dateTimeLabelFormats[!i10.grid?.enabled && g2.higherRanks[n2] || g2.unitName])).main : th(y2) && (f2 = e10.dateTime.getXDateFormat(y2, i10.dateTimeLabelFormats || {}))), t11.isFirst = d2, t11.isLast = c2;
    let b2 = { axis: e10, chart: s10, dateTimeLabelFormat: f2, isFirst: d2, isLast: c2, pos: n2, tick: t11, tickPositionInfo: g2, value: y2 };
    J(this, "labelFormat", b2);
    let v2 = (t12) => h2.formatter ? h2.formatter.call(t12, t12) : h2.format ? (t12.text = e10.defaultLabelFormatter.call(t12), ei.format(h2.format, t12, s10)) : e10.defaultLabelFormatter.call(t12), k2 = v2.call(b2, b2), w2 = m2?.list;
    w2 ? t11.shortenLabel = function() {
      for (x2 = 0; x2 < w2.length; x2++) if (K(b2, { dateTimeLabelFormat: w2[x2] }), u2.attr({ text: v2.call(b2, b2) }), u2.getBBox().width < e10.getSlotWidth(t11) - 2 * (h2.padding || 0)) return;
      u2.attr({ text: "" });
    } : t11.shortenLabel = void 0, p2 && e10._addedPlotLB && t11.moveLabel(k2, h2), $(u2) || t11.movedLabel ? u2 && u2.textStr !== k2 && !p2 && (!u2.textWidth || h2.style.width || u2.styles.width || u2.css({ width: null }), u2.attr({ text: k2 }), u2.textPxLength = u2.getBBox().width) : (t11.label = u2 = t11.createLabel(k2, h2), t11.rotation = 0);
  }
  createLabel(t11, e10, i10) {
    let s10 = this.axis, { renderer: o2, styledMode: r2 } = s10.chart, a2 = e10.style.whiteSpace, n2 = $(t11) && e10.enabled ? o2.text(t11, i10?.x, i10?.y, e10.useHTML).add(s10.labelGroup) : void 0;
    return n2 && (r2 || n2.css(tg(e10.style)), n2.textPxLength = n2.getBBox().width, !r2 && a2 && n2.css({ whiteSpace: a2 })), n2;
  }
  destroy() {
    V(this, this.axis);
  }
  getPosition(t11, e10, i10, s10) {
    let o2 = this.axis, r2 = o2.chart, a2 = s10 && r2.oldChartHeight || r2.chartHeight, n2 = { x: t11 ? H(o2.translate(e10 + i10, void 0, void 0, s10) + o2.transB) : o2.left + o2.offset + (o2.opposite ? (s10 && r2.oldChartWidth || r2.chartWidth) - o2.right - o2.left : 0), y: t11 ? a2 - o2.bottom + o2.offset - (o2.opposite ? o2.height : 0) : H(a2 - o2.translate(e10 + i10, void 0, void 0, s10) - o2.transB) };
    return n2.y = G(n2.y, -1e9, 1e9), J(this, "afterGetPosition", { pos: n2 }), n2;
  }
  getLabelPosition(t11, e10, i10, s10, o2, r2, a2, n2) {
    let h2, l2, d2 = this.axis, c2 = d2.transA, p2 = d2.isLinked && d2.linkedParent ? d2.linkedParent.reversed : d2.reversed, g2 = d2.staggerLines, u2 = d2.tickRotCorr || { x: 0, y: 0 }, f2 = s10 || d2.reserveSpaceDefault ? 0 : -d2.labelOffset * ("center" === d2.labelAlign ? 0.5 : 1), m2 = o2.distance, x2 = {};
    return h2 = 0 === d2.side ? i10.rotation ? -m2 : -i10.getBBox().height : 2 === d2.side ? u2.y + m2 : Math.cos(i10.rotation * eV) * (u2.y - i10.getBBox(false, 0).height / 2), $(o2.y) && (h2 = 0 === d2.side && d2.horiz ? o2.y + h2 : o2.y), t11 = t11 + ty(o2.x, [0, 1, 0, -1][d2.side] * m2) + f2 + u2.x - (r2 && s10 ? r2 * c2 * (p2 ? -1 : 1) : 0), e10 = e10 + h2 - (r2 && !s10 ? r2 * c2 * (p2 ? 1 : -1) : 0), g2 && (l2 = a2 / (n2 || 1) % g2, d2.opposite && (l2 = g2 - l2 - 1), e10 += l2 * (d2.labelOffset / g2)), x2.x = t11, x2.y = Math.round(e10), J(this, "afterGetLabelPosition", { pos: x2, tickmarkOffset: r2, index: a2 }), x2;
  }
  getLabelSize() {
    return this.label ? this.label.getBBox()[this.axis.horiz ? "height" : "width"] : 0;
  }
  getMarkPath(t11, e10, i10, s10, o2 = false, r2) {
    return r2.crispLine([["M", t11, e10], ["L", t11 + (o2 ? 0 : -i10), e10 + (o2 ? i10 : 0)]], s10);
  }
  handleOverflow(t11) {
    let e10 = this.axis, i10 = e10.options.labels, s10 = t11.x, o2 = e10.chart.chartWidth, r2 = e10.chart.spacing, a2 = ty(e10.labelLeft, Math.min(e10.pos, r2[3])), n2 = ty(e10.labelRight, Math.max(e10.isRadial ? 0 : e10.pos + e10.len, o2 - r2[1])), h2 = this.label, l2 = this.rotation, d2 = Q(e10.labelAlign || h2.attr("align")), c2 = h2.getBBox().width, p2 = e10.getSlotWidth(this), g2 = p2, u2 = 1, f2;
    l2 || "justify" !== i10.overflow ? l2 < 0 && s10 - d2 * c2 < a2 ? f2 = Math.round(s10 / Math.cos(l2 * eV) - a2) : l2 > 0 && s10 + d2 * c2 > n2 && (f2 = Math.round((o2 - s10) / Math.cos(l2 * eV))) : (s10 - d2 * c2 < a2 ? g2 = t11.x + g2 * (1 - d2) - a2 : s10 + (1 - d2) * c2 > n2 && (g2 = n2 - t11.x + g2 * d2, u2 = -1), (g2 = Math.min(p2, g2)) < p2 && "center" === e10.labelAlign && (t11.x += u2 * (p2 - g2 - d2 * (p2 - Math.min(c2, g2)))), (c2 > g2 || e10.autoRotation && h2?.styles?.width) && (f2 = g2)), f2 && h2 && (this.shortenLabel ? this.shortenLabel() : h2.css(K({}, { width: Math.floor(f2) + "px", lineClamp: +!e10.isRadial })));
  }
  moveLabel(t11, e10) {
    let i10 = this, s10 = i10.label, o2 = i10.axis, r2 = false, a2;
    s10 && s10.textStr === t11 ? (i10.movedLabel = s10, r2 = true, delete i10.label) : tf(o2.ticks, function(e11) {
      r2 || e11.isNew || e11 === i10 || !e11.label || e11.label.textStr !== t11 || (i10.movedLabel = e11.label, r2 = true, e11.labelPos = i10.movedLabel.xy, delete e11.label);
    }), !r2 && (i10.labelPos || s10) && (a2 = i10.labelPos || s10.xy, i10.movedLabel = i10.createLabel(t11, e10, a2), i10.movedLabel && i10.movedLabel.attr({ opacity: 0 }));
  }
  render(t11, e10, i10) {
    let s10 = this.axis, o2 = s10.horiz, r2 = this.pos, a2 = ty(this.tickmarkOffset, s10.tickmarkOffset), n2 = this.getPosition(o2, r2, a2, e10), h2 = n2.x, l2 = n2.y, d2 = s10.pos, c2 = d2 + s10.len, p2 = o2 ? h2 : l2, g2 = ty(i10, this.label?.newOpacity, 1);
    !s10.chart.polar && (H(p2) < d2 || p2 > c2) && (i10 = 0), i10 ?? (i10 = 1), this.isActive = true, this.renderGridLine(e10, i10), this.renderMark(n2, i10), this.renderLabel(n2, e10, g2, t11), this.isNew = false, J(this, "afterRender");
  }
  renderGridLine(t11, e10) {
    let i10 = this.axis, s10 = i10.options, o2 = {}, r2 = this.pos, a2 = this.type, n2 = ty(this.tickmarkOffset, i10.tickmarkOffset), h2 = i10.chart.renderer, l2 = this.gridLine, d2, c2 = s10.gridLineWidth, p2 = s10.gridLineColor, g2 = s10.gridLineDashStyle;
    "minor" === this.type && (c2 = s10.minorGridLineWidth, p2 = s10.minorGridLineColor, g2 = s10.minorGridLineDashStyle), l2 || (i10.chart.styledMode || (o2.stroke = p2, o2["stroke-width"] = c2 || 0, o2.dashstyle = g2), a2 || (o2.zIndex = 1), t11 && (e10 = 0), this.gridLine = l2 = h2.path().attr(o2).addClass("highcharts-" + (a2 ? a2 + "-" : "") + "grid-line").add(i10.gridGroup)), l2 && (d2 = i10.getPlotLinePath({ value: r2 + n2, lineWidth: l2.strokeWidth(), force: "pass", old: t11, acrossPanes: false })) && l2[t11 || this.isNew ? "attr" : "animate"]({ d: d2, opacity: e10 });
  }
  renderMark(t11, e10) {
    let i10 = this.axis, s10 = i10.options, o2 = i10.chart.renderer, r2 = this.type, a2 = i10.tickSize(r2 ? r2 + "Tick" : "tick"), n2 = t11.x, h2 = t11.y, l2 = ty(s10["minor" !== r2 ? "tickWidth" : "minorTickWidth"], !r2 && i10.isXAxis ? 1 : 0), d2 = s10["minor" !== r2 ? "tickColor" : "minorTickColor"], c2 = this.mark, p2 = !c2;
    a2 && (i10.opposite && (a2[0] = -a2[0]), !c2 && (this.mark = c2 = o2.path().addClass("highcharts-" + (r2 ? r2 + "-" : "") + "tick").add(i10.axisGroup), i10.chart.styledMode || c2.attr({ stroke: d2, "stroke-width": l2 })), c2[p2 ? "attr" : "animate"]({ d: this.getMarkPath(n2, h2, a2[0], c2.strokeWidth(), i10.horiz, o2), opacity: e10 }));
  }
  renderLabel(t11, e10, i10, s10) {
    let o2 = this.axis, r2 = o2.horiz, a2 = o2.options, n2 = this.label, h2 = a2.labels, l2 = h2.step, d2 = ty(this.tickmarkOffset, o2.tickmarkOffset), c2 = t11.x, p2 = t11.y, g2 = true;
    n2 && th(c2) && (n2.xy = t11 = this.getLabelPosition(c2, p2, n2, r2, h2, d2, s10, l2), (!this.isFirst || this.isLast || a2.showFirstLabel) && (!this.isLast || this.isFirst || a2.showLastLabel) ? r2 && !e10 && 0 !== i10 && this.handleOverflow(t11) : g2 = false, l2 && s10 % l2 && (g2 = false), g2 && th(t11.y) ? (t11.opacity = i10, n2[this.isNewLabel ? "attr" : "animate"](t11).show(true), this.isNewLabel = false) : (n2.hide(), this.isNewLabel = true));
  }
  replaceMovedLabel() {
    let t11 = this.label, e10 = this.axis;
    t11 && !this.isNew && (t11.animate({ opacity: 0 }, void 0, t11.destroy), delete this.label), e10.isDirty = true, this.label = this.movedLabel, delete this.movedLabel;
  }
};
var { animObject: eZ } = tJ;
var { xAxis: e_, yAxis: eK } = ej;
var { defaultOptions: eq } = tF;
var { registerEventOptions: eJ } = e$;
var { deg2rad: eQ } = D;
var e0 = (t11, e10) => tu(e10, void 0, void 0, ty(t11.options.allowDecimals, e10 < 0.5 || void 0 !== t11.tickAmount), !!t11.tickAmount);
K(eq, { xAxis: e_, yAxis: tg(e_, eK) });
var e1 = class _e1 {
  constructor(t11, e10, i10) {
    this.init(t11, e10, i10);
  }
  init(t11, e10, i10 = this.coll) {
    let s10 = "xAxis" === i10, o2 = this.isZAxis || (t11.inverted ? !s10 : s10);
    this.chart = t11, this.horiz = o2, this.isXAxis = s10, this.coll = i10, J(this, "init", { userOptions: e10 }), this.opposite = ty(e10.opposite, this.opposite), this.side = ty(e10.side, this.side, o2 ? 2 * !this.opposite : this.opposite ? 1 : 3), this.setOptions(e10);
    let r2 = this.options, a2 = r2.labels;
    this.type ?? (this.type = r2.type || "linear"), this.uniqueNames ?? (this.uniqueNames = r2.uniqueNames ?? true), J(this, "afterSetType"), this.userOptions = e10, this.minPixelPadding = 0, this.reversed = ty(r2.reversed, this.reversed), this.visible = r2.visible, this.zoomEnabled = r2.zoomEnabled, this.hasNames = "category" === this.type || true === r2.categories, this.categories = td(r2.categories) && r2.categories || (this.hasNames ? [] : void 0), this.names || (this.names = [], this.names.keys = {}), this.plotLinesAndBandsGroups = {}, this.positiveValuesOnly = !!this.logarithmic, this.isLinked = $(r2.linkedTo), this.ticks = {}, this.labelEdge = [], this.minorTicks = {}, this.plotLinesAndBands = [], this.alternateBands = {}, this.len ?? (this.len = 0), this.minRange = this.userMinRange = r2.minRange || r2.maxZoom, this.range = r2.range, this.offset = r2.offset || 0, this.max = void 0, this.min = void 0;
    let n2 = ty(r2.crosshair, tS(t11.options.tooltip.crosshairs)[+!s10]);
    this.crosshair = true === n2 ? {} : n2, -1 === t11.axes.indexOf(this) && (s10 ? t11.axes.splice(t11.xAxis.length, 0, this) : t11.axes.push(this), tE(this, t11[this.coll])), t11.orderItems(this.coll), this.series = this.series || [], t11.inverted && !this.isZAxis && s10 && !$(this.reversed) && (this.reversed = true), this.labelRotation = th(a2.rotation) ? a2.rotation : void 0, eJ(this, r2), J(this, "afterInit");
  }
  setOptions(t11) {
    let e10 = this.horiz ? { labels: { autoRotation: [-45], padding: 3 }, margin: 15 } : { labels: { padding: 1 }, title: { rotation: 90 * this.side } };
    this.options = tg(e10, "yAxis" === this.coll ? { title: { text: this.chart.options.lang.yAxisTitle } } : {}, eq[this.coll], t11), J(this, "afterSetOptions", { userOptions: t11 });
  }
  defaultLabelFormatter() {
    let t11 = this.axis, e10 = this.chart, { numberFormatter: i10 } = e10, s10 = th(this.value) ? this.value : NaN, o2 = t11.chart.time, r2 = t11.categories, a2 = this.dateTimeLabelFormat, n2 = eq.lang, h2 = n2.numericSymbols, l2 = n2.numericSymbolMagnitude || 1e3, d2 = t11.logarithmic ? Math.abs(s10) : t11.tickInterval, c2 = h2?.length, p2, g2;
    if (r2) g2 = `${this.value}`;
    else if (a2) g2 = o2.dateFormat(a2, s10, true);
    else if (c2 && h2 && d2 >= 1e3) for (; c2-- && void 0 === g2; ) d2 >= (p2 = Math.pow(l2, c2 + 1)) && 10 * s10 % p2 == 0 && null !== h2[c2] && 0 !== s10 && (g2 = i10(s10 / p2, -1, void 0, void 0, e10) + h2[c2]);
    return g2 ?? (g2 = i10(s10, -1, void 0, 1e4 > Math.abs(s10) ? "" : void 0, e10)), g2;
  }
  getSeriesExtremes() {
    let t11, e10 = this;
    J(this, "getSeriesExtremes", null, function() {
      e10.hasVisibleSeries = false, e10.dataMin = e10.dataMax = e10.threshold = void 0, e10.softThreshold = !e10.isXAxis, e10.series.forEach((i10) => {
        if (i10.reserveSpace()) {
          let s10 = i10.options, o2, r2 = s10.threshold, a2, n2;
          if (e10.hasVisibleSeries = true, e10.positiveValuesOnly && 0 >= (r2 || 0) && (r2 = void 0), e10.isXAxis) (o2 = i10.getColumn("x")).length && (o2 = e10.logarithmic ? o2.filter((t12) => t12 > 0) : o2, a2 = (t11 = i10.getXExtremes(o2)).min, n2 = t11.max, th(a2) || a2 instanceof Date || (o2 = o2.filter(th), a2 = (t11 = i10.getXExtremes(o2)).min, n2 = t11.max), o2.length && (e10.dataMin = Math.min(ty(e10.dataMin, a2), a2), e10.dataMax = Math.max(ty(e10.dataMax, n2), n2)));
          else {
            let t12 = i10.applyExtremes();
            th(t12.dataMin) && (a2 = t12.dataMin, e10.dataMin = Math.min(ty(e10.dataMin, a2), a2)), th(t12.dataMax) && (n2 = t12.dataMax, e10.dataMax = Math.max(ty(e10.dataMax, n2), n2)), $(r2) && (e10.threshold = r2), (!s10.softThreshold || e10.positiveValuesOnly) && (e10.softThreshold = false);
          }
        }
      });
    }), J(this, "afterGetSeriesExtremes");
  }
  translate(t11, e10, i10, s10, o2, r2) {
    let a2 = this.linkedParent || this, n2 = s10 && a2.old ? a2.old.min : a2.min;
    if (!th(n2)) return NaN;
    let h2 = a2.minPixelPadding, l2 = (a2.isOrdinal || a2.brokenAxis?.hasBreaks || a2.logarithmic && o2) && !!a2.lin2val, d2 = 1, c2 = 0, p2 = s10 && a2.old ? a2.old.transA : a2.transA, g2 = 0;
    return p2 || (p2 = a2.transA), i10 && (d2 *= -1, c2 = a2.len), a2.reversed && (d2 *= -1, c2 -= d2 * (a2.sector || a2.len)), e10 ? (g2 = (t11 = t11 * d2 + c2 - h2) / p2 + n2, l2 && (g2 = a2.lin2val(g2))) : (l2 && (t11 = a2.val2lin(t11)), g2 = d2 * (t11 - n2) * p2 + c2 + d2 * h2 + (th(r2) ? p2 * r2 : 0), a2.isRadial || (g2 = H(g2))), g2;
  }
  toPixels(t11, e10) {
    return this.translate(this.chart?.time.parse(t11) ?? NaN, false, !this.horiz, void 0, true) + (e10 ? 0 : this.pos);
  }
  toValue(t11, e10) {
    return this.translate(t11 - (e10 ? 0 : this.pos), true, !this.horiz, void 0, true);
  }
  getPlotLinePath(t11) {
    let e10 = this, i10 = e10.chart, s10 = e10.left, o2 = e10.top, r2 = t11.old, a2 = t11.value, n2 = t11.lineWidth, h2 = r2 && i10.oldChartHeight || i10.chartHeight, l2 = r2 && i10.oldChartWidth || i10.chartWidth, d2 = e10.transB, c2 = t11.translatedValue, p2 = t11.force, g2, u2, f2, m2, x2;
    function y2(t12, e11, i11) {
      return "pass" !== p2 && (t12 < e11 || t12 > i11) && (p2 ? t12 = G(t12, e11, i11) : x2 = true), t12;
    }
    let b2 = { value: a2, lineWidth: n2, old: r2, force: p2, acrossPanes: t11.acrossPanes, translatedValue: c2 };
    return J(this, "getPlotLinePath", b2, function(t12) {
      g2 = f2 = (c2 = G(c2 = ty(c2, e10.translate(a2, void 0, void 0, r2)), -1e9, 1e9)) + d2, u2 = m2 = h2 - c2 - d2, th(c2) ? e10.horiz ? (u2 = o2, m2 = h2 - e10.bottom + (e10.options.isInternal ? 0 : i10.scrollablePixelsY || 0), g2 = f2 = y2(g2, s10, s10 + e10.width)) : (g2 = s10, f2 = l2 - e10.right + (i10.scrollablePixelsX || 0), u2 = m2 = y2(u2, o2, o2 + e10.height)) : (x2 = true, p2 = false), t12.path = x2 && !p2 ? void 0 : i10.renderer.crispLine([["M", g2, u2], ["L", f2, m2]], n2 || 1);
    }), b2.path;
  }
  getLinearTickPositions(t11, e10, i10) {
    let s10, o2, r2, a2 = H(Math.floor(e10 / t11) * t11), n2 = H(Math.ceil(i10 / t11) * t11), h2 = [];
    if (H(a2 + t11) === a2 && (r2 = 20), this.single) return [e10];
    for (s10 = a2; s10 <= n2 && (h2.push(s10), (s10 = H(s10 + t11, r2)) !== o2); ) o2 = s10;
    return h2;
  }
  getMinorTickInterval() {
    let { minorTicks: t11, minorTickInterval: e10 } = this.options;
    return true === t11 ? ty(e10, "auto") : false !== t11 ? e10 : void 0;
  }
  getMinorTickPositions() {
    let t11 = this.options, e10 = this.tickPositions, i10 = this.minorTickInterval, s10 = this.pointRangePadding || 0, o2 = (this.min || 0) - s10, r2 = (this.max || 0) + s10, a2 = this.brokenAxis?.hasBreaks ? this.brokenAxis.unitLength : r2 - o2, n2 = [], h2;
    if (a2 && a2 / i10 < this.len / 3) {
      let s11 = this.logarithmic;
      if (s11) this.paddedTicks.forEach(function(t12, e11, o3) {
        e11 && n2.push.apply(n2, s11.getLogTickPositions(i10, o3[e11 - 1], o3[e11], true));
      });
      else if (this.dateTime && "auto" === this.getMinorTickInterval()) n2 = n2.concat(this.getTimeTicks(this.dateTime.normalizeTimeTickInterval(i10), o2, r2, t11.startOfWeek));
      else for (h2 = o2 + (e10[0] - o2) % i10; h2 <= r2 && h2 !== n2[0]; h2 += i10) n2.push(h2);
    }
    return 0 !== n2.length && this.trimTicks(n2), n2;
  }
  adjustForMinRange() {
    let t11 = this.options, e10 = this.logarithmic, i10 = this.chart.time, { max: s10, min: o2, minRange: r2 } = this, a2, n2, h2, l2;
    this.isXAxis && void 0 === r2 && !e10 && (r2 = $(t11.min) || $(t11.max) || $(t11.floor) || $(t11.ceiling) ? null : Math.min(5 * (tt(this.series.map((t12) => {
      let e11 = t12.getColumn("x");
      return t12.xIncrement ? e11.slice(0, 2) : e11;
    })) || 0), this.dataMax - this.dataMin)), th(s10) && th(o2) && th(r2) && s10 - o2 < r2 && (n2 = this.dataMax - this.dataMin >= r2, a2 = (r2 - s10 + o2) / 2, h2 = [o2 - a2, i10.parse(t11.min) ?? o2 - a2], n2 && (h2[2] = e10 ? e10.log2lin(this.dataMin) : this.dataMin), l2 = [(o2 = W(h2)) + r2, i10.parse(t11.max) ?? o2 + r2], n2 && (l2[2] = e10 ? e10.log2lin(this.dataMax) : this.dataMax), (s10 = R(l2)) - o2 < r2 && (h2[0] = s10 - r2, h2[1] = i10.parse(t11.min) ?? s10 - r2, o2 = W(h2))), this.minRange = r2, this.min = o2, this.max = s10;
  }
  getClosest() {
    let t11, e10;
    if (this.categories) e10 = 1;
    else {
      let i10 = [];
      this.series.forEach(function(t12) {
        let s10 = t12.closestPointRange, o2 = t12.getColumn("x");
        1 === o2.length ? i10.push(o2[0]) : t12.sorted && $(s10) && t12.reserveSpace() && (e10 = $(e10) ? Math.min(e10, s10) : s10);
      }), i10.length && (i10.sort((t12, e11) => t12 - e11), t11 = tt([i10]));
    }
    return t11 && e10 ? Math.min(t11, e10) : t11 || e10;
  }
  nameToX(t11) {
    let e10 = td(this.options.categories), i10 = e10 ? this.categories : this.names, s10 = t11.options.x, o2;
    return t11.series.requireSorting = false, $(s10) || (s10 = this.uniqueNames && i10 ? e10 ? i10.indexOf(t11.name) : ty(i10.keys[t11.name], -1) : t11.series.autoIncrement()), -1 === s10 ? !e10 && i10 && (o2 = i10.length) : th(s10) && (o2 = s10), void 0 !== o2 ? (this.names[o2] = t11.name, this.names.keys[t11.name] = o2) : t11.x && (o2 = t11.x), o2;
  }
  updateNames() {
    let t11 = this, e10 = this.names;
    e10.length > 0 && (Object.keys(e10.keys).forEach(function(t12) {
      delete e10.keys[t12];
    }), e10.length = 0, this.minRange = this.userMinRange, (this.series || []).forEach((e11) => {
      e11.xIncrement = null, (!e11.points || e11.isDirtyData) && (t11.max = Math.max(t11.max || 0, e11.dataTable.rowCount - 1), e11.processData(), e11.generatePoints());
      let i10 = e11.getColumn("x").slice();
      e11.data.forEach((e12, s10) => {
        let o2 = i10[s10];
        e12?.options && void 0 !== e12.name && void 0 !== (o2 = t11.nameToX(e12)) && o2 !== e12.x && (i10[s10] = e12.x = o2);
      }), e11.dataTable.setColumn("x", i10);
    }));
  }
  setAxisTranslation() {
    let t11 = this, e10 = t11.max - t11.min, i10 = t11.linkedParent, s10 = !!t11.categories, o2 = t11.isXAxis, r2 = t11.axisPointRange || 0, a2, n2 = 0, h2 = 0, l2, d2 = t11.transA;
    (o2 || s10 || r2) && (a2 = t11.getClosest(), i10 ? (n2 = i10.minPointOffset, h2 = i10.pointRangePadding) : t11.series.forEach(function(e11) {
      let i11 = s10 ? 1 : o2 ? ty(e11.options.pointRange, a2, 0) : t11.axisPointRange || 0, l3 = e11.options.pointPlacement;
      if (r2 = Math.max(r2, i11), !t11.single || s10) {
        let t12 = e11.is("xrange") ? !o2 : o2;
        n2 = Math.max(n2, t12 && tl(l3) ? 0 : i11 / 2), h2 = Math.max(h2, t12 && "on" === l3 ? 0 : i11);
      }
    }), l2 = t11.ordinal?.slope && a2 ? t11.ordinal.slope / a2 : 1, t11.minPointOffset = n2 *= l2, t11.pointRangePadding = h2 *= l2, t11.pointRange = Math.min(r2, t11.single && s10 ? 1 : e10), o2 && (t11.closestPointRange = a2)), t11.translationSlope = t11.transA = d2 = t11.staticScale || t11.len / (e10 + h2 || 1), t11.transB = t11.horiz ? t11.left : t11.bottom, t11.minPixelPadding = d2 * n2, J(this, "afterSetAxisTranslation");
  }
  minFromRange() {
    let { max: t11, min: e10 } = this;
    return th(t11) && th(e10) && t11 - e10 || void 0;
  }
  setTickInterval(t11) {
    let { categories: e10, chart: i10, dataMax: s10, dataMin: o2, dateTime: r2, isXAxis: a2, logarithmic: n2, options: h2, softThreshold: l2 } = this, d2 = i10.time, c2 = th(this.threshold) ? this.threshold : void 0, p2 = this.minRange || 0, { ceiling: g2, floor: u2, linkedTo: f2, softMax: m2, softMin: x2 } = h2, y2 = th(f2) && i10[this.coll]?.[f2], b2 = h2.tickPixelInterval, v2 = h2.maxPadding, k2 = h2.minPadding, w2 = 0, M2, S2 = th(h2.tickInterval) && h2.tickInterval >= 0 ? h2.tickInterval : void 0, T2, C2, A2, P2;
    if (r2 || e10 || y2 || this.getTickAmount(), A2 = ty(this.userMin, d2.parse(h2.min)), P2 = ty(this.userMax, d2.parse(h2.max)), y2 ? (this.linkedParent = y2, M2 = y2.getExtremes(), this.min = ty(M2.min, M2.dataMin), this.max = ty(M2.max, M2.dataMax), this.type !== y2.type && tO(11, true, i10)) : (l2 && $(c2) && th(s10) && th(o2) && (o2 >= c2 ? (T2 = c2, k2 = 0) : s10 <= c2 && (C2 = c2, v2 = 0)), this.min = ty(A2, T2, o2), this.max = ty(P2, C2, s10)), th(this.max) && th(this.min) && (n2 && (this.positiveValuesOnly && !t11 && 0 >= Math.min(this.min, ty(o2, this.min)) && tO(10, true, i10), this.min = H(n2.log2lin(this.min), 16), this.max = H(n2.log2lin(this.max), 16)), this.range && th(o2) && (this.userMin = this.min = A2 = Math.max(o2, this.minFromRange() || 0), this.userMax = P2 = this.max, this.range = void 0)), J(this, "foundExtremes"), this.adjustForMinRange(), th(this.min) && th(this.max)) {
      if (!th(this.userMin) && th(x2) && x2 < this.min && (this.min = A2 = x2), !th(this.userMax) && th(m2) && m2 > this.max && (this.max = P2 = m2), e10 || this.axisPointRange || this.stacking?.usePercentage || y2 || (w2 = this.max - this.min) && (!$(A2) && k2 && (this.min -= w2 * k2), !$(P2) && v2 && (this.max += w2 * v2)), !th(this.userMin) && th(u2) && (this.min = Math.max(this.min, u2)), !th(this.userMax) && th(g2) && (this.max = Math.min(this.max, g2)), l2 && th(o2) && th(s10)) {
        let t12 = c2 || 0;
        !$(A2) && this.min < t12 && o2 >= t12 ? this.min = h2.minRange ? Math.min(t12, this.max - p2) : t12 : !$(P2) && this.max > t12 && s10 <= t12 && (this.max = h2.minRange ? Math.max(t12, this.min + p2) : t12);
      }
      !i10.polar && this.min > this.max && ($(h2.min) ? this.max = this.min : $(h2.max) && (this.min = this.max)), w2 = this.max - this.min;
    }
    if (this.min !== this.max && th(this.min) && th(this.max) ? y2 && !S2 && b2 === y2.options.tickPixelInterval ? this.tickInterval = S2 = y2.tickInterval : this.tickInterval = ty(S2, this.tickAmount ? w2 / Math.max(this.tickAmount - 1, 1) : void 0, e10 ? 1 : w2 * b2 / Math.max(this.len, b2)) : this.tickInterval = 1, a2 && !t11) {
      let t12 = this.min !== this.old?.min || this.max !== this.old?.max;
      this.series.forEach(function(e11) {
        e11.forceCrop = e11.forceCropping?.(), e11.processData(t12);
      }), J(this, "postProcessData", { hasExtremesChanged: t12 });
    }
    this.setAxisTranslation(), J(this, "initialAxisTranslation"), this.pointRange && !S2 && (this.tickInterval = Math.max(this.pointRange, this.tickInterval));
    let L2 = ty(h2.minTickInterval, r2 && !this.series.some((t12) => !t12.sorted) ? this.closestPointRange : 0);
    !S2 && L2 && this.tickInterval < L2 && (this.tickInterval = L2), r2 || n2 || S2 || (this.tickInterval = e0(this, this.tickInterval)), this.tickAmount || (this.tickInterval = this.unsquish()), this.setTickPositions();
  }
  setTickPositions() {
    let t11 = this.options, e10 = t11.tickPositions, i10 = t11.tickPositioner, s10 = this.getMinorTickInterval(), o2 = !this.isPanning, r2 = o2 && t11.startOnTick, a2 = o2 && t11.endOnTick, n2 = [], h2;
    if (this.tickmarkOffset = this.categories && "between" === t11.tickmarkPlacement && 1 === this.tickInterval ? 0.5 : 0, this.single = this.min === this.max && $(this.min) && !this.tickAmount && (this.min % 1 == 0 || false !== t11.allowDecimals), e10) n2 = e10.slice();
    else if (th(this.min) && th(this.max)) {
      if (!this.ordinal?.positions && (this.max - this.min) / this.tickInterval > Math.max(2 * this.len, 200)) n2 = [this.min, this.max], tO(19, false, this.chart);
      else if (this.dateTime) n2 = this.getTimeTicks(this.dateTime.normalizeTimeTickInterval(this.tickInterval, t11.units), this.min, this.max, t11.startOfWeek, this.ordinal?.positions, this.closestPointRange, true);
      else if (this.logarithmic) n2 = this.logarithmic.getLogTickPositions(this.tickInterval, this.min, this.max);
      else {
        let t12 = this.tickInterval, e11 = t12;
        for (; e11 <= 2 * t12; ) if (n2 = this.getLinearTickPositions(this.tickInterval, this.min, this.max), this.tickAmount && n2.length > this.tickAmount) this.tickInterval = e0(this, e11 *= 1.1);
        else break;
      }
      n2.length > this.len && (n2 = [n2[0], n2[n2.length - 1]])[0] === n2[1] && (n2.length = 1), i10 && (this.tickPositions = n2, (h2 = i10.apply(this, [this.min, this.max, this])) && (n2 = h2));
    }
    this.isDirty || n2.length === this.tickPositions?.length || (this.isDirty = true), this.tickPositions = n2, this.minorTickInterval = "auto" === s10 && this.tickInterval ? this.tickInterval / t11.minorTicksPerMajor : s10, this.paddedTicks = n2.slice(0), this.trimTicks(n2, r2, a2), !this.isLinked && th(this.min) && th(this.max) && (this.single && n2.length < 2 && !this.categories && !this.series.some((t12) => t12.is("heatmap") && "between" === t12.options.pointPlacement) && (this.min -= 0.5, this.max += 0.5), e10 || h2 || this.adjustTickAmount()), J(this, "afterSetTickPositions");
  }
  trimTicks(t11, e10, i10) {
    let s10 = t11[0], o2 = t11[t11.length - 1], r2 = !this.isOrdinal && this.minPointOffset || 0;
    if (J(this, "trimTicks"), !this.isLinked || !this.grid) {
      if (e10 && s10 !== -1 / 0) this.min = s10;
      else for (; this.min - r2 > t11[0]; ) t11.shift();
      if (i10) this.max = o2;
      else for (; this.max + r2 < t11[t11.length - 1]; ) t11.pop();
      0 === t11.length && $(s10) && !this.options.tickPositions && t11.push((o2 + s10) / 2);
    }
  }
  alignToOthers() {
    let t11, e10 = this, i10 = e10.chart, s10 = [this], o2 = e10.options, r2 = i10.options.chart, a2 = "yAxis" === this.coll && r2.alignThresholds, n2 = [];
    if (e10.thresholdAlignment = void 0, (false !== r2.alignTicks && o2.alignTicks || a2) && false !== o2.startOnTick && false !== o2.endOnTick && !e10.logarithmic) {
      let o3 = (t12) => {
        let { horiz: e11, options: i11 } = t12;
        return [e11 ? i11.left : i11.top, i11.width, i11.height, i11.pane].join(",");
      }, r3 = o3(this);
      i10[this.coll].forEach(function(i11) {
        let { series: a3 } = i11;
        a3.length && a3.some((t12) => t12.visible) && i11 !== e10 && o3(i11) === r3 && (t11 = true, s10.push(i11));
      });
    }
    if (t11 && a2) {
      s10.forEach((t13) => {
        let i11 = t13.getThresholdAlignment(e10);
        th(i11) && n2.push(i11);
      });
      let t12 = n2.length > 1 ? n2.reduce((t13, e11) => t13 += e11, 0) / n2.length : void 0;
      s10.forEach((e11) => {
        e11.thresholdAlignment = t12;
      });
    }
    return t11;
  }
  getThresholdAlignment(t11) {
    if ((!th(this.dataMin) || this !== t11 && this.series.some((t12) => t12.isDirty || t12.isDirtyData || t12.xAxis?.isDirty)) && this.getSeriesExtremes(), th(this.threshold)) {
      let t12 = G((this.threshold - (this.dataMin || 0)) / ((this.dataMax || 0) - (this.dataMin || 0)), 0, 1);
      return this.options.reversed && (t12 = 1 - t12), t12;
    }
  }
  getTickAmount() {
    let t11 = this.options, e10 = t11.tickPixelInterval, i10 = t11.tickAmount;
    $(t11.tickInterval) || i10 || !(this.len < e10) || this.isRadial || this.logarithmic || !t11.startOnTick || !t11.endOnTick || (i10 = 2), !i10 && this.alignToOthers() && (i10 = Math.ceil(this.len / e10) + 1), i10 < 4 && (this.finalTickAmt = i10, i10 = 5), this.tickAmount = i10;
  }
  adjustTickAmount() {
    let t11 = this, { finalTickAmt: e10, max: i10, min: s10, options: o2, tickPositions: r2, tickAmount: a2, thresholdAlignment: n2 } = t11, h2 = r2?.length, l2 = ty(t11.threshold, t11.softThreshold ? 0 : null), d2, c2, p2 = t11.tickInterval, g2, u2 = () => r2.push(H(r2[r2.length - 1] + p2)), f2 = () => r2.unshift(H(r2[0] - p2));
    if (th(n2) && (g2 = 0 === n2 ? 0 : 1 === n2 ? a2 - 1 : Math.round(G(n2 * (a2 - 1), 1, a2 - 2)), o2.reversed && (g2 = a2 - 1 - g2)), t11.hasData() && th(s10) && th(i10)) {
      let n3 = () => {
        t11.transA *= (h2 - 1) / (a2 - 1), t11.min = o2.startOnTick ? r2[0] : Math.min(s10, r2[0]), t11.max = o2.endOnTick ? r2[r2.length - 1] : Math.max(i10, r2[r2.length - 1]);
      };
      if (th(g2) && th(t11.threshold)) {
        for (; r2[g2] !== l2 || r2.length !== a2 || r2[0] > s10 || r2[r2.length - 1] < i10; ) {
          for (r2.length = 0, r2.push(t11.threshold); r2.length < a2; ) void 0 === r2[g2] || r2[g2] > t11.threshold ? f2() : u2();
          if (p2 > 8 * t11.tickInterval) break;
          p2 *= 2;
        }
        n3();
      } else if (h2 < a2) {
        for (; r2.length < a2; ) r2.length % 2 || s10 === l2 ? u2() : f2();
        n3();
      }
      if ($(e10)) {
        for (c2 = d2 = r2.length; c2--; ) (3 === e10 && c2 % 2 == 1 || e10 <= 2 && c2 > 0 && c2 < d2 - 1) && r2.splice(c2, 1);
        t11.finalTickAmt = void 0;
      }
    }
  }
  setScale() {
    let { coll: t11, stacking: e10 } = this, i10 = false, s10 = false;
    this.series.forEach((t12) => {
      i10 = i10 || t12.isDirtyData || t12.isDirty, s10 = s10 || t12.xAxis?.isDirty || false;
    }), this.setAxisSize();
    let o2 = this.len !== this.old?.len;
    o2 || i10 || s10 || this.isLinked || this.forceRedraw || this.userMin !== this.old?.userMin || this.userMax !== this.old?.userMax || this.alignToOthers() ? (e10 && "yAxis" === t11 && e10.buildStacks(), this.forceRedraw = false, this.userMinRange || (this.minRange = void 0), this.getSeriesExtremes(), this.setTickInterval(), e10 && "xAxis" === t11 && e10.buildStacks(), this.isDirty || (this.isDirty = o2 || this.min !== this.old?.min || this.max !== this.old?.max)) : e10 && e10.cleanStacks(), i10 && delete this.allExtremes, J(this, "afterSetScale");
  }
  setExtremes(t11, e10, i10 = true, s10, o2) {
    let r2 = this.chart;
    this.series.forEach((t12) => {
      delete t12.kdTree;
    }), t11 = r2.time.parse(t11), e10 = r2.time.parse(e10), J(this, "setExtremes", o2 = K(o2, { min: t11, max: e10 }), (t12) => {
      this.userMin = t12.min, this.userMax = t12.max, this.eventArgs = t12, i10 && r2.redraw(s10);
    });
  }
  setAxisSize() {
    let t11 = this.chart, e10 = this.options, i10 = e10.offsets || [0, 0, 0, 0], s10 = this.horiz, o2 = this.width = Math.round(tk(ty(e10.width, t11.plotWidth - i10[3] + i10[1]), t11.plotWidth)), r2 = this.height = Math.round(tk(ty(e10.height, t11.plotHeight - i10[0] + i10[2]), t11.plotHeight)), a2 = this.top = Math.round(tk(ty(e10.top, t11.plotTop + i10[0]), t11.plotHeight, t11.plotTop)), n2 = this.left = Math.round(tk(ty(e10.left, t11.plotLeft + i10[3]), t11.plotWidth, t11.plotLeft));
    this.bottom = t11.chartHeight - r2 - a2, this.right = t11.chartWidth - o2 - n2, this.len = Math.max(s10 ? o2 : r2, 0), this.pos = s10 ? n2 : a2;
  }
  getExtremes() {
    let t11 = this.logarithmic;
    return { min: t11 ? H(t11.lin2log(this.min)) : this.min, max: t11 ? H(t11.lin2log(this.max)) : this.max, dataMin: this.dataMin, dataMax: this.dataMax, userMin: this.userMin, userMax: this.userMax };
  }
  getThreshold(t11) {
    let e10 = this.logarithmic, i10 = e10 ? e10.lin2log(this.min) : this.min, s10 = e10 ? e10.lin2log(this.max) : this.max;
    return null === t11 || t11 === -1 / 0 ? t11 = i10 : t11 === 1 / 0 ? t11 = s10 : i10 > t11 ? t11 = i10 : s10 < t11 && (t11 = s10), this.translate(t11, 0, 1, 0, 1);
  }
  autoLabelAlign(t11) {
    let e10 = ((t11 - 90 * this.side) % 360 + 360) % 360, i10 = { align: "center" };
    return J(this, "autoLabelAlign", i10, function(t12) {
      e10 > 15 && e10 < 165 ? t12.align = "right" : e10 > 195 && e10 < 345 && (t12.align = "left");
    }), i10.align;
  }
  tickSize(t11) {
    let e10 = this.options, i10 = ty(e10["tick" === t11 ? "tickWidth" : "minorTickWidth"], "tick" === t11 && this.isXAxis && !this.categories ? 1 : 0), s10 = e10["tick" === t11 ? "tickLength" : "minorTickLength"], o2;
    i10 && s10 && ("inside" === e10[t11 + "Position"] && (s10 = -s10), o2 = [s10, i10]);
    let r2 = { tickSize: o2 };
    return J(this, "afterTickSize", r2), r2.tickSize;
  }
  labelMetrics() {
    let t11 = this.chart.renderer, e10 = this.ticks, i10 = e10[Object.keys(e10)[0]] || {};
    return this.chart.renderer.fontMetrics(i10.label || i10.movedLabel || t11.box);
  }
  unsquish() {
    let t11 = this.options.labels, e10 = t11.padding || 0, i10 = this.horiz, s10 = this.tickInterval, o2 = this.len / ((+!!this.categories + this.max - this.min) / s10), r2 = t11.rotation, a2 = H(0.8 * this.labelMetrics().h), n2 = Math.max(this.max - this.min, 0), h2 = function(t12) {
      let i11 = (t12 + 2 * e10) / (o2 || 1);
      return (i11 = i11 > 1 ? Math.ceil(i11) : 1) * s10 > n2 && t12 !== 1 / 0 && o2 !== 1 / 0 && n2 && (i11 = Math.ceil(n2 / s10)), H(i11 * s10);
    }, l2 = s10, d2, c2 = Number.MAX_VALUE, p2;
    if (i10) {
      if (!t11.staggerLines && (th(r2) ? p2 = [r2] : o2 < t11.autoRotationLimit && (p2 = t11.autoRotation)), p2) {
        let t12, e11;
        for (let i11 of p2) (i11 === r2 || i11 && i11 >= -90 && i11 <= 90) && (e11 = (t12 = h2(Math.abs(a2 / Math.sin(eQ * i11)))) + Math.abs(i11 / 360)) < c2 && (c2 = e11, d2 = i11, l2 = t12);
      }
    } else l2 = h2(0.75 * a2);
    return this.autoRotation = p2, this.labelRotation = ty(d2, th(r2) ? r2 : 0), t11.step ? s10 : l2;
  }
  getSlotWidth(t11) {
    let e10 = this.chart, i10 = this.horiz, s10 = this.options.labels, o2 = Math.max(this.tickPositions.length - !this.categories, 1), r2 = e10.margin[3];
    if (t11 && th(t11.slotWidth)) return t11.slotWidth;
    if (i10 && s10.step < 2 && !this.isRadial) return s10.rotation ? 0 : (this.staggerLines || 1) * this.len / o2;
    if (!i10) {
      let t12 = s10.style.width;
      if (void 0 !== t12) return parseInt(String(t12), 10);
      if (!this.opposite && r2) return r2 - e10.spacing[3];
    }
    return 0.33 * e10.chartWidth;
  }
  renderUnsquish() {
    let t11 = this.chart, e10 = t11.renderer, i10 = this.tickPositions, s10 = this.ticks, o2 = this.options.labels, r2 = o2.style, a2 = this.horiz, n2 = this.getSlotWidth(), h2 = Math.max(1, Math.round(n2 - (a2 ? 2 * (o2.padding || 0) : o2.distance || 0))), l2 = {}, d2 = this.labelMetrics(), c2 = r2.lineClamp, p2, g2 = c2 ?? (Math.floor(this.len / (i10.length * d2.h)) || 1), u2 = 0;
    tl(o2.rotation) || (l2.rotation = o2.rotation || 0), i10.forEach(function(t12) {
      let e11 = s10[t12];
      e11.movedLabel && e11.replaceMovedLabel();
      let i11 = e11.label?.textPxLength || 0;
      i11 > u2 && (u2 = i11);
    }), this.maxLabelLength = u2, this.autoRotation ? u2 > h2 && u2 > d2.h ? l2.rotation = this.labelRotation : this.labelRotation = 0 : n2 && (p2 = h2), l2.rotation && (p2 = u2 > 0.5 * t11.chartHeight ? 0.33 * t11.chartHeight : u2, c2 || (g2 = 1)), this.labelAlign = o2.align || this.autoLabelAlign(this.labelRotation || 0), this.labelAlign && (l2.align = this.labelAlign), i10.forEach(function(t12) {
      let e11 = s10[t12], i11 = e11?.label, o3 = r2.width, a3 = {};
      i11 && (i11.attr(l2), e11.shortenLabel ? e11.shortenLabel() : p2 && !o3 && "nowrap" !== r2.whiteSpace && (p2 < (i11.textPxLength || 0) || "SPAN" === i11.element.tagName) ? i11.css(K(a3, { width: `${p2}px`, lineClamp: g2 })) : !i11.styles.width || a3.width || o3 || i11.css({ width: "auto" }), e11.rotation = l2.rotation);
    }, this), this.tickRotCorr = e10.rotCorr(d2.b, this.labelRotation || 0, 0 !== this.side);
  }
  hasData() {
    return this.series.some(function(t11) {
      return t11.hasData();
    }) || this.options.showEmpty && $(this.min) && $(this.max);
  }
  addTitle(t11) {
    let e10, i10 = this.chart.renderer, s10 = this.horiz, o2 = this.opposite, r2 = this.options.title, a2 = this.chart.styledMode;
    this.axisTitle || ((e10 = r2.textAlign) || (e10 = (s10 ? { low: "left", middle: "center", high: "right" } : { low: o2 ? "right" : "left", middle: "center", high: o2 ? "left" : "right" })[r2.align]), this.axisTitle = i10.text(r2.text || "", 0, 0, r2.useHTML).attr({ zIndex: 7, rotation: r2.rotation || 0, align: e10 }).addClass("highcharts-axis-title"), a2 || this.axisTitle.css(tg(r2.style)), this.axisTitle.add(this.axisGroup), this.axisTitle.isNew = true), a2 || r2.style.width || this.isRadial || this.axisTitle.css({ width: this.len + "px" }), this.axisTitle[t11 ? "show" : "hide"](t11);
  }
  generateTick(t11) {
    let e10 = this.ticks;
    e10[t11] ? e10[t11].addLabel() : e10[t11] = new eU(this, t11);
  }
  createGroups() {
    let { axisParent: t11, chart: e10, coll: i10, options: s10 } = this, o2 = e10.renderer, r2 = (e11, r3, a2) => o2.g(e11).attr({ zIndex: a2 }).addClass(`highcharts-${i10.toLowerCase()}${r3} ` + (this.isRadial ? `highcharts-radial-axis${r3} ` : "") + (s10.className || "")).add(t11);
    this.axisGroup || (this.gridGroup = r2("grid", "-grid", s10.gridZIndex), this.axisGroup = r2("axis", "", s10.zIndex), this.labelGroup = r2("axis-labels", "-labels", s10.labels.zIndex));
  }
  getOffset() {
    let t11 = this, { chart: e10, horiz: i10, options: s10, side: o2, ticks: r2, tickPositions: a2, coll: n2 } = t11, h2 = e10.inverted && !t11.isZAxis ? [1, 0, 3, 2][o2] : o2, l2 = t11.hasData(), d2 = s10.title, c2 = s10.labels, p2 = th(s10.crossing), g2 = e10.axisOffset, u2 = e10.clipOffset, f2 = [-1, 1, 1, -1][o2], m2, x2 = 0, y2, b2 = 0, v2 = 0, k2, w2;
    if (t11.showAxis = m2 = l2 || s10.showEmpty, t11.staggerLines = t11.horiz && c2.staggerLines || void 0, t11.createGroups(), l2 || t11.isLinked ? (a2.forEach(function(e11) {
      t11.generateTick(e11);
    }), t11.renderUnsquish(), t11.reserveSpaceDefault = 0 === o2 || 2 === o2 || { 1: "left", 3: "right" }[o2] === t11.labelAlign, ty(c2.reserveSpace, !p2 && null, "center" === t11.labelAlign || null, t11.reserveSpaceDefault) && a2.forEach(function(t12) {
      v2 = Math.max(r2[t12].getLabelSize(), v2);
    }), t11.staggerLines && (v2 *= t11.staggerLines), t11.labelOffset = v2 * (t11.opposite ? -1 : 1)) : tf(r2, function(t12, e11) {
      t12.destroy(), delete r2[e11];
    }), d2?.text && false !== d2.enabled && (t11.addTitle(m2), m2 && !p2 && false !== d2.reserveSpace && (t11.titleOffset = x2 = t11.axisTitle.getBBox()[i10 ? "height" : "width"], b2 = $(y2 = d2.offset) ? 0 : ty(d2.margin, i10 ? 5 : 10))), t11.renderLine(), t11.offset = f2 * ty(s10.offset, g2[o2] ? g2[o2] + (s10.margin || 0) : 0), t11.tickRotCorr = t11.tickRotCorr || { x: 0, y: 0 }, w2 = 0 === o2 ? -t11.labelMetrics().h : 2 === o2 ? t11.tickRotCorr.y : 0, k2 = Math.abs(v2) + b2, v2 && (k2 -= w2, k2 += f2 * (i10 ? ty(c2.y, t11.tickRotCorr.y + f2 * c2.distance) : ty(c2.x, f2 * c2.distance))), t11.axisTitleMargin = ty(y2, k2), t11.getMaxLabelDimensions && (t11.maxLabelDimensions = t11.getMaxLabelDimensions(r2, a2)), "colorAxis" !== n2 && u2) {
      let e11 = this.tickSize("tick");
      g2[o2] = Math.max(g2[o2], (t11.axisTitleMargin || 0) + x2 + f2 * t11.offset, k2, a2?.length && e11 ? e11[0] + f2 * t11.offset : 0);
      let i11 = !t11.axisLine || s10.offset ? 0 : t11.axisLine.strokeWidth() / 2;
      u2[h2] = Math.max(u2[h2], i11);
    }
    J(this, "afterGetOffset");
  }
  getLinePath(t11) {
    let e10 = this.chart, i10 = this.opposite, s10 = this.offset, o2 = this.horiz, r2 = this.left + (i10 ? this.width : 0) + s10, a2 = e10.chartHeight - this.bottom - (i10 ? this.height : 0) + s10;
    return i10 && (t11 *= -1), e10.renderer.crispLine([["M", o2 ? this.left : r2, o2 ? a2 : this.top], ["L", o2 ? e10.chartWidth - this.right : r2, o2 ? a2 : e10.chartHeight - this.bottom]], t11);
  }
  renderLine() {
    !this.axisLine && (this.axisLine = this.chart.renderer.path().addClass("highcharts-axis-line").add(this.axisGroup), this.chart.styledMode || this.axisLine.attr({ stroke: this.options.lineColor, "stroke-width": this.options.lineWidth, zIndex: 7 }));
  }
  getTitlePosition(t11) {
    let e10 = this.horiz, i10 = this.left, s10 = this.top, o2 = this.len, r2 = this.options.title, a2 = e10 ? i10 : s10, n2 = this.opposite, h2 = this.offset, l2 = r2.x, d2 = r2.y, c2 = this.chart.renderer.fontMetrics(t11), p2 = t11 ? Math.max(t11.getBBox(false, 0).height - c2.h - 1, 0) : 0, g2 = { low: a2 + (e10 ? 0 : o2), middle: a2 + o2 / 2, high: a2 + (e10 ? o2 : 0) }[r2.align], u2 = (e10 ? s10 + this.height : i10) + (e10 ? 1 : -1) * (n2 ? -1 : 1) * (this.axisTitleMargin || 0) + [-p2, p2, c2.f, -p2][this.side], f2 = { x: e10 ? g2 + l2 : u2 + (n2 ? this.width : 0) + h2 + l2, y: e10 ? u2 + d2 - (n2 ? this.height : 0) + h2 : g2 + d2 };
    return J(this, "afterGetTitlePosition", { titlePosition: f2 }), f2;
  }
  renderMinorTick(t11, e10) {
    let i10 = this.minorTicks;
    i10[t11] || (i10[t11] = new eU(this, t11, "minor")), e10 && i10[t11].isNew && i10[t11].render(null, true), i10[t11].render(null, false, 1);
  }
  renderTick(t11, e10, i10) {
    let s10 = this.isLinked, o2 = this.ticks;
    (!s10 || t11 >= this.min && t11 <= this.max || this.grid?.isColumn) && (o2[t11] || (o2[t11] = new eU(this, t11)), i10 && o2[t11].isNew && o2[t11].render(e10, true, -1), o2[t11].render(e10));
  }
  render() {
    let t11, e10, i10 = this, s10 = i10.chart, o2 = i10.logarithmic, r2 = s10.renderer, a2 = i10.options, n2 = i10.isLinked, h2 = i10.tickPositions, l2 = i10.axisTitle, d2 = i10.ticks, c2 = i10.minorTicks, p2 = i10.alternateBands, g2 = a2.stackLabels, u2 = a2.alternateGridColor, f2 = a2.crossing, m2 = i10.tickmarkOffset, x2 = i10.axisLine, y2 = i10.showAxis, b2 = eZ(r2.globalAnimation);
    if (i10.labelEdge.length = 0, i10.overlap = false, [d2, c2, p2].forEach(function(t12) {
      tf(t12, function(t13) {
        t13.isActive = false;
      });
    }), th(f2)) {
      let t12 = this.isXAxis ? s10.yAxis[0] : s10.xAxis[0], e11 = [1, -1, -1, 1][this.side];
      if (t12) {
        let s11 = t12.toPixels(f2, true);
        i10.horiz && (s11 = t12.len - s11), i10.offset = e11 * s11;
      }
    }
    if (i10.hasData() || n2) {
      let r3 = i10.chart.hasRendered && i10.old && th(i10.old.min);
      i10.minorTickInterval && !i10.categories && i10.getMinorTickPositions().forEach(function(t12) {
        i10.renderMinorTick(t12, r3);
      }), h2.length && (h2.forEach(function(t12, e11) {
        i10.renderTick(t12, e11, r3);
      }), m2 && (0 === i10.min || i10.single) && (d2[-1] || (d2[-1] = new eU(i10, -1, null, true)), d2[-1].render(-1))), u2 && h2.forEach(function(r4, a3) {
        e10 = void 0 !== h2[a3 + 1] ? h2[a3 + 1] + m2 : i10.max - m2, a3 % 2 == 0 && r4 < i10.max && e10 <= i10.max + (s10.polar ? -m2 : m2) && (p2[r4] || (p2[r4] = new D.PlotLineOrBand(i10, {})), t11 = r4 + m2, p2[r4].options = { from: o2 ? o2.lin2log(t11) : t11, to: o2 ? o2.lin2log(e10) : e10, color: u2, className: "highcharts-alternate-grid" }, p2[r4].render(), p2[r4].isActive = true);
      }), i10._addedPlotLB || (i10._addedPlotLB = true, (a2.plotLines || []).concat(a2.plotBands || []).forEach(function(t12) {
        i10.addPlotBandOrLine(t12);
      }));
    }
    [d2, c2, p2].forEach(function(t12) {
      let e11 = [], i11 = b2.duration;
      tf(t12, function(t13, i12) {
        t13.isActive || (t13.render(i12, false, 0), t13.isActive = false, e11.push(i12));
      }), tC(function() {
        let i12 = e11.length;
        for (; i12--; ) t12[e11[i12]] && !t12[e11[i12]].isActive && (t12[e11[i12]].destroy(), delete t12[e11[i12]]);
      }, t12 !== p2 && s10.hasRendered && i11 ? i11 : 0);
    }), x2 && (x2[x2.isPlaced ? "animate" : "attr"]({ d: this.getLinePath(x2.strokeWidth()) }), x2.isPlaced = true, x2[y2 ? "show" : "hide"](y2)), l2 && y2 && (l2[l2.isNew ? "attr" : "animate"](i10.getTitlePosition(l2)), l2.isNew = false), g2?.enabled && i10.stacking && i10.stacking.renderStackTotals(), i10.old = { len: i10.len, max: i10.max, min: i10.min, transA: i10.transA, userMax: i10.userMax, userMin: i10.userMin }, i10.isDirty = false, J(this, "afterRender");
  }
  redraw() {
    this.visible && (this.render(), this.plotLinesAndBands.forEach(function(t11) {
      t11.render();
    })), this.series.forEach(function(t11) {
      t11.isDirty = true;
    });
  }
  getKeepProps() {
    return this.keepProps || _e1.keepProps;
  }
  destroy(t11) {
    let e10 = this, i10 = e10.plotLinesAndBands, s10 = this.eventOptions;
    if (J(this, "destroy", { keepEvents: t11 }), t11 || tM(e10), [e10.ticks, e10.minorTicks, e10.alternateBands].forEach(function(t12) {
      V(t12);
    }), i10) {
      let t12 = i10.length;
      for (; t12--; ) i10[t12].destroy();
    }
    for (let t12 in ["axisLine", "axisTitle", "axisGroup", "gridGroup", "labelGroup", "cross", "scrollbar"].forEach(function(t13) {
      e10[t13] && (e10[t13] = e10[t13].destroy());
    }), e10.plotLinesAndBandsGroups) e10.plotLinesAndBandsGroups[t12] = e10.plotLinesAndBandsGroups[t12].destroy();
    tf(e10, function(t12, i11) {
      -1 === e10.getKeepProps().indexOf(i11) && delete e10[i11];
    }), this.eventOptions = s10;
  }
  drawCrosshair(t11, e10) {
    let i10, s10, o2, r2, a2 = this.crosshair, n2 = a2?.snap ?? true, h2 = this.chart, l2 = this.cross;
    if (J(this, "drawCrosshair", { e: t11, point: e10 }), t11 || (t11 = this.cross?.e), a2 && false !== ($(e10) || !n2)) {
      if (clearTimeout(this.crossShowTimer), n2 ? $(e10) && (s10 = ty("colorAxis" !== this.coll ? e10.crosshairPos : null, this.isXAxis ? e10.plotX : this.len - e10.plotY)) : s10 = t11 && (this.horiz ? t11.chartX - this.pos : this.len - t11.chartY + this.pos), $(s10) && (r2 = { value: e10 && (this.isXAxis ? e10.x : ty(e10.stackY, e10.y)), translatedValue: s10 }, h2.polar && K(r2, { isCrosshair: true, chartX: t11?.chartX, chartY: t11?.chartY, point: e10 }), i10 = this.getPlotLinePath(r2) || null), !$(i10)) return void this.hideCrosshair();
      o2 = this.categories && !this.isRadial, this.crossShowTimer = tC(() => {
        let e11 = this.cross;
        e11 || (this.cross = e11 = h2.renderer.path().addClass("highcharts-crosshair highcharts-crosshair-" + (o2 ? "category " : "thin ") + (a2.className || "")).attr({ zIndex: ty(a2.zIndex, 2) }).add(), !h2.styledMode && (e11.attr({ stroke: a2.color || (o2 ? tV.parse("#ccd3ff").setOpacity(0.25).get() : "#cccccc"), "stroke-width": ty(a2.width, 1) }).css({ "pointer-events": "none" }), a2.dashStyle && e11.attr({ dashstyle: a2.dashStyle }))), e11.show().animate({ d: i10 }, eZ(a2?.animation)), o2 && !a2.width && e11.attr({ "stroke-width": this.transA }), this.cross && (this.cross.e = t11);
      }, (!l2 || "hidden" === l2.attr("visibility")) && a2.showDelay || 0);
    } else this.hideCrosshair();
    J(this, "afterDrawCrosshair", { e: t11, point: e10 });
  }
  hideCrosshair() {
    clearTimeout(this.crossShowTimer), this.cross && this.cross.hide(), J(this, "afterHideCrosshair");
  }
  update(t11, e10) {
    let i10 = this.chart;
    t11 = tg(this.userOptions, t11), this.destroy(true), this.init(i10, t11), i10.isDirtyBox = true, ty(e10, true) && i10.redraw();
  }
  remove(t11) {
    let e10 = this.chart, i10 = this.coll, s10 = this.series, o2 = s10.length;
    for (; o2--; ) s10[o2] && s10[o2].remove(false);
    _(e10.axes, this), _(e10[i10] || [], this), e10.orderItems(i10), this.destroy(), e10.isDirtyBox = true, ty(t11, true) && e10.redraw();
  }
  setTitle(t11, e10) {
    this.update({ title: t11 }, e10);
  }
  setCategories(t11, e10) {
    this.update({ categories: t11 }, e10);
  }
};
e1.keepProps = ["coll", "extKey", "hcEvents", "len", "names", "series", "userMax", "userMin"], !(function(t11) {
  function e10() {
    return this.chart.time.getTimeTicks.apply(this.chart.time, arguments);
  }
  function i10() {
    if ("datetime" !== this.type) {
      this.dateTime = void 0;
      return;
    }
    this.dateTime || (this.dateTime = new s10(this));
  }
  t11.compose = function(t12) {
    return t12.keepProps.includes("dateTime") || (t12.keepProps.push("dateTime"), t12.prototype.getTimeTicks = e10, z(t12, "afterSetType", i10)), t12;
  };
  class s10 {
    constructor(t12) {
      this.axis = t12;
    }
    normalizeTimeTickInterval(t12, e11) {
      let i11 = e11 || [["millisecond", [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]], ["second", [1, 2, 5, 10, 15, 30]], ["minute", [1, 2, 5, 10, 15, 30]], ["hour", [1, 2, 3, 4, 6, 8, 12]], ["day", [1, 2]], ["week", [1, 2]], ["month", [1, 2, 3, 4, 6]], ["year", null]], s11 = i11[i11.length - 1], o2 = tI[s11[0]], r2 = s11[1], a2, n2;
      for (a2 = 0; a2 < i11.length; a2++) if (o2 = tI[(s11 = i11[a2])[0]], r2 = s11[1], i11[a2 + 1]) {
        let e12 = (o2 * r2[r2.length - 1] + tI[i11[a2 + 1][0]]) / 2;
        if (t12 <= e12) {
          n2 = e12 / t12;
          break;
        }
      }
      o2 === tI.year && t12 < 5 * o2 && (r2 = [1, 2, 5]);
      let h2 = tu(t12 / o2, r2, "year" === s11[0] ? Math.max(te(t12 / o2), 1) : 1);
      return { unitRange: o2, count: h2, unitName: s11[0], match: n2 };
    }
    getXDateFormat(t12, e11) {
      let { axis: i11 } = this, s11 = i11.chart.time;
      return i11.closestPointRange ? s11.getDateFormat(i11.closestPointRange, t12, i11.options.startOfWeek, e11) || s11.resolveDTLFormat(e11.year).main : s11.resolveDTLFormat(e11.day).main;
    }
  }
  t11.Additions = s10;
})(v || (v = {}));
var e2 = v;
!(function(t11) {
  function e10() {
    "logarithmic" !== this.type ? this.logarithmic = void 0 : this.logarithmic ?? (this.logarithmic = new s10(this));
  }
  function i10() {
    let t12 = this.logarithmic;
    t12 && (this.lin2val = function(e11) {
      return t12.lin2log(e11);
    }, this.val2lin = function(e11) {
      return t12.log2lin(e11);
    });
  }
  t11.compose = function(t12) {
    return t12.keepProps.includes("logarithmic") || (t12.keepProps.push("logarithmic"), z(t12, "afterSetType", e10), z(t12, "afterInit", i10)), t12;
  };
  class s10 {
    constructor(t12) {
      this.axis = t12;
    }
    getLogTickPositions(t12, e11, i11, s11) {
      let o2 = this.axis, r2 = o2.len, a2 = o2.options, n2 = [];
      if (s11 || (this.minorAutoInterval = void 0), t12 >= 0.5) t12 = Math.round(t12), n2 = o2.getLinearTickPositions(t12, e11, i11);
      else if (t12 >= 0.08) {
        let o3, r3, a3, h2, l2, d2, c2, p2 = Math.floor(e11);
        for (o3 = t12 > 0.3 ? [1, 2, 4] : t12 > 0.15 ? [1, 2, 4, 6, 8] : [1, 2, 3, 4, 5, 6, 7, 8, 9], r3 = p2; r3 < i11 + 1 && !c2; r3++) for (a3 = 0, h2 = o3.length; a3 < h2 && !c2; a3++) (l2 = this.log2lin(this.lin2log(r3) * o3[a3])) > e11 && (!s11 || d2 <= i11) && void 0 !== d2 && n2.push(d2), d2 > i11 && (c2 = true), d2 = l2;
      } else {
        let h2 = this.lin2log(e11), l2 = this.lin2log(i11), d2 = s11 ? o2.getMinorTickInterval() : a2.tickInterval, c2 = a2.tickPixelInterval / (s11 ? 5 : 1), p2 = s11 ? r2 / o2.tickPositions.length : r2;
        t12 = tu(t12 = ty("auto" === d2 ? null : d2, this.minorAutoInterval, (l2 - h2) * c2 / (p2 || 1))), n2 = o2.getLinearTickPositions(t12, h2, l2).map(this.log2lin), s11 || (this.minorAutoInterval = t12 / 5);
      }
      return s11 || (o2.tickInterval = t12), n2;
    }
    lin2log(t12) {
      return Math.pow(10, t12);
    }
    log2lin(t12) {
      return Math.log(t12) / Math.LN10;
    }
  }
  t11.Additions = s10;
})(k || (k = {}));
var e3 = k;
!(function(t11) {
  let e10;
  function i10(t12) {
    return this.addPlotBandOrLine(t12, "plotBands");
  }
  function s10(t12, i11) {
    let s11 = this.userOptions, o3 = new e10(this, t12);
    if (this.visible && (o3 = o3.render()), o3) {
      if (this._addedPlotLB || (this._addedPlotLB = true, (s11.plotLines || []).concat(s11.plotBands || []).forEach((t13) => {
        this.addPlotBandOrLine(t13);
      })), i11) {
        let e11 = s11[i11] || [];
        e11.push(t12), s11[i11] = e11;
      }
      this.plotLinesAndBands.push(o3);
    }
    return o3;
  }
  function o2(t12) {
    return this.addPlotBandOrLine(t12, "plotLines");
  }
  function r2(t12, e11, i11) {
    i11 = i11 || this.options;
    let s11 = this.getPlotLinePath({ value: e11, force: true, acrossPanes: i11.acrossPanes }), o3 = [], r3 = this.horiz, a3 = !th(this.min) || !th(this.max) || t12 < this.min && e11 < this.min || t12 > this.max && e11 > this.max, n3 = this.getPlotLinePath({ value: t12, force: true, acrossPanes: i11.acrossPanes }), h3, l2 = 1, d2;
    if (n3 && s11) for (a3 && (d2 = n3.toString() === s11.toString(), l2 = 0), h3 = 0; h3 < n3.length; h3 += 2) {
      let t13 = n3[h3], e12 = n3[h3 + 1], i12 = s11[h3], a4 = s11[h3 + 1];
      ("M" === t13[0] || "L" === t13[0]) && ("M" === e12[0] || "L" === e12[0]) && ("M" === i12[0] || "L" === i12[0]) && ("M" === a4[0] || "L" === a4[0]) && (r3 && i12[1] === t13[1] ? (i12[1] += l2, a4[1] += l2) : r3 || i12[2] !== t13[2] || (i12[2] += l2, a4[2] += l2), o3.push(["M", t13[1], t13[2]], ["L", e12[1], e12[2]], ["L", a4[1], a4[2]], ["L", i12[1], i12[2]], ["Z"])), o3.isFlat = d2;
    }
    return o3;
  }
  function a2(t12) {
    this.removePlotBandOrLine(t12);
  }
  function n2(t12) {
    let e11 = this.plotLinesAndBands, i11 = this.options, s11 = this.userOptions;
    if (e11) {
      let o3 = e11.length;
      for (; o3--; ) e11[o3].id === t12 && e11[o3].destroy();
      [i11.plotLines || [], s11.plotLines || [], i11.plotBands || [], s11.plotBands || []].forEach(function(e12) {
        for (o3 = e12.length; o3--; ) e12[o3]?.id === t12 && _(e12, e12[o3]);
      });
    }
  }
  function h2(t12) {
    this.removePlotBandOrLine(t12);
  }
  t11.compose = function(t12, l2) {
    let d2 = l2.prototype;
    return d2.addPlotBand || (e10 = t12, K(d2, { addPlotBand: i10, addPlotLine: o2, addPlotBandOrLine: s10, getPlotBandPath: r2, removePlotBand: a2, removePlotLine: h2, removePlotBandOrLine: n2 })), l2;
  };
})(w || (w = {}));
var e5 = w;
var e6 = class _e6 {
  static compose(t11, e10) {
    return z(t11, "afterInit", function() {
      this.labelCollectors.push(() => {
        let t12 = [];
        for (let e11 of this.axes) for (let { label: i10, options: s10 } of e11.plotLinesAndBands) i10 && !s10?.label?.allowOverlap && t12.push(i10);
        return t12;
      });
    }), e5.compose(_e6, e10);
  }
  constructor(t11, e10) {
    this.axis = t11, this.options = e10, this.id = e10.id;
  }
  render() {
    J(this, "render");
    let { axis: t11, options: e10 } = this, { horiz: i10, logarithmic: s10 } = t11, { color: o2, events: r2, zIndex: a2 = 0 } = e10, { renderer: n2, time: h2 } = t11.chart, l2 = {}, d2 = h2.parse(e10.to), c2 = h2.parse(e10.from), p2 = h2.parse(e10.value), g2 = e10.borderWidth, u2 = e10.label, { label: f2, svgElem: m2 } = this, x2 = [], y2, b2 = $(c2) && $(d2), v2 = $(p2), k2 = !m2, w2 = { class: "highcharts-plot-" + (b2 ? "band " : "line ") + (e10.className || "") }, M2 = b2 ? "bands" : "lines";
    if (!t11.chart.styledMode && (v2 ? (w2.stroke = o2 || "#999999", w2["stroke-width"] = ty(e10.width, 1), e10.dashStyle && (w2.dashstyle = e10.dashStyle)) : b2 && (w2.fill = o2 || "#e6e9ff", g2 && (w2.stroke = e10.borderColor, w2["stroke-width"] = g2))), l2.zIndex = a2, M2 += "-" + a2, (y2 = t11.plotLinesAndBandsGroups[M2]) || (t11.plotLinesAndBandsGroups[M2] = y2 = n2.g("plot-" + M2).attr(l2).add()), m2 || (this.svgElem = m2 = n2.path().attr(w2).add(y2)), $(p2)) x2 = t11.getPlotLinePath({ value: s10?.log2lin(p2) ?? p2, lineWidth: m2.strokeWidth(), acrossPanes: e10.acrossPanes });
    else {
      if (!($(c2) && $(d2))) return;
      x2 = t11.getPlotBandPath(s10?.log2lin(c2) ?? c2, s10?.log2lin(d2) ?? d2, e10);
    }
    return !this.eventsAdded && r2 && (tf(r2, (t12, e11) => {
      m2?.on(e11, (t13) => {
        r2[e11].apply(this, [t13, this]);
      });
    }), this.eventsAdded = true), (k2 || !m2.d) && x2?.length ? m2.attr({ d: x2 }) : m2 && (x2 ? (m2.show(), m2.animate({ d: x2 })) : m2.d && (m2.hide(), f2 && (this.label = f2 = f2.destroy()))), u2 && ($(u2.text) || $(u2.formatter)) && x2?.length && t11.width > 0 && t11.height > 0 && !x2.isFlat ? (u2 = tg(__spreadValues({ align: i10 && b2 ? "center" : void 0, x: i10 ? !b2 && 4 : 10, verticalAlign: !i10 && b2 ? "middle" : void 0, y: i10 ? b2 ? 16 : 10 : b2 ? 6 : -4, rotation: i10 && !b2 ? 90 : 0 }, b2 ? { inside: true } : {}), u2), this.renderLabel(u2, x2, b2, a2)) : f2 && f2.hide(), this;
  }
  renderLabel(t11, e10, i10, s10) {
    let o2 = this.axis, r2 = o2.chart.renderer, a2 = t11.inside, n2 = this.label;
    n2 || (this.label = n2 = r2.text(this.getLabelText(t11), 0, 0, t11.useHTML).attr({ align: t11.textAlign || t11.align, rotation: t11.rotation, class: "highcharts-plot-" + (i10 ? "band" : "line") + "-label " + (t11.className || ""), zIndex: s10 }), o2.chart.styledMode || n2.css(tg({ color: o2.chart.options.title?.style?.color, fontSize: "0.8em", textOverflow: i10 && !a2 ? "" : "ellipsis" }, t11.style)), n2.add());
    let h2 = e10.xBounds || [e10[0][1], e10[1][1], i10 ? e10[2][1] : e10[0][1]], l2 = e10.yBounds || [e10[0][2], e10[1][2], i10 ? e10[2][2] : e10[0][2]], d2 = R(h2), c2 = R(l2), p2 = W(h2) - d2;
    n2.align(t11, false, { x: d2, y: c2, width: p2, height: W(l2) - c2 }), n2.alignAttr.y -= r2.fontMetrics(n2).b, (!n2.alignValue || "left" === n2.alignValue || $(a2)) && n2.css({ width: (t11.style?.width || (i10 && a2 ? p2 : 90 === n2.rotation ? o2.height - (n2.alignAttr.y - o2.top) : (t11.clip ? o2.width + o2.left : o2.chart.chartWidth) - n2.alignAttr.x)) + "px" }), n2.show(true);
  }
  getLabelText(t11) {
    return $(t11.formatter) ? t11.formatter.call(this, this) : t11.text;
  }
  destroy() {
    _(this.axis.plotLinesAndBands, this), delete this.axis, V(this);
  }
};
var { animObject: e9 } = tJ;
var { format: e4 } = ei;
var { composed: e8, dateFormats: e7, doc: it, isSafari: ie } = D;
var { distribute: ii } = eo;
var is = (t11) => {
  clearTimeout(t11.hideTimer), clearTimeout(t11.showTimer);
};
var io = class {
  constructor(t11, e10, i10) {
    this.allowShared = true, this.crosshairs = [], this.distance = 0, this.isHidden = true, this.isSticky = false, this.options = {}, this.outside = false, this.chart = t11, this.init(t11, e10), this.pointer = i10;
  }
  bodyFormatter(t11) {
    return t11.map((t12) => {
      let e10 = t12.series.tooltipOptions, i10 = t12.formatPrefix || "point";
      return (e10[i10 + "Formatter"] || t12.tooltipFormatter).call(t12, e10[i10 + "Format"] || "", t12);
    });
  }
  cleanSplit(t11) {
    this.chart.series.forEach(function(e10) {
      let i10 = e10?.tt;
      i10 && (!i10.isActive || t11 ? e10.tt = i10.destroy() : i10.isActive = false);
    });
  }
  defaultFormatter(t11) {
    let e10, i10 = this.points || tS(this);
    return (e10 = (e10 = [t11.headerFooterFormatter(i10[0])]).concat(t11.bodyFormatter(i10))).push(t11.headerFooterFormatter(i10[0], true)), e10;
  }
  destroy() {
    this.label && (this.label = this.label.destroy()), this.split && (this.cleanSplit(true), this.tt && (this.tt = this.tt.destroy())), this.renderer && (this.renderer = this.renderer.destroy(), U(this.container)), tr(this.hideTimer), is(this);
  }
  getAnchor(t11, e10) {
    let i10, { chart: s10, pointer: o2 } = this, r2 = s10.inverted, a2 = s10.plotTop, n2 = s10.plotLeft;
    if (t11 = tS(t11), t11[0].series?.yAxis && !t11[0].series.yAxis.options.reversedStacks && (t11 = t11.slice().reverse()), this.followPointer && e10) void 0 === e10.chartX && (e10 = o2.normalize(e10)), i10 = [e10.chartX - n2, e10.chartY - a2];
    else if (t11[0].tooltipPos) i10 = t11[0].tooltipPos;
    else {
      let s11 = 0, o3 = 0;
      t11.forEach(function(t12) {
        let e11 = t12.pos(true);
        e11 && (s11 += e11[0], o3 += e11[1]);
      }), s11 /= t11.length, o3 /= t11.length, this.shared && t11.length > 1 && e10 && (r2 ? s11 = e10.chartX : o3 = e10.chartY), i10 = [s11 - n2, o3 - a2];
    }
    let h2 = { point: t11[0], ret: i10 };
    return J(this, "getAnchor", h2), h2.ret.map(Math.round);
  }
  getClassName(t11, e10, i10) {
    let s10 = this.options, o2 = t11.series, r2 = o2.options;
    return [s10.className, "highcharts-label", i10 && "highcharts-tooltip-header", e10 ? "highcharts-tooltip-box" : "highcharts-tooltip", !i10 && "highcharts-color-" + ty(t11.colorIndex, o2.colorIndex), r2?.className].filter(tl).join(" ");
  }
  getLabel({ anchorX: t11, anchorY: e10 } = { anchorX: 0, anchorY: 0 }) {
    let i10 = this, s10 = this.chart.styledMode, o2 = this.options, r2 = this.split && this.allowShared, a2 = this.container, n2 = this.chart.renderer;
    if (this.label) {
      let t12 = !this.label.hasClass("highcharts-label");
      (!r2 && t12 || r2 && !t12) && this.destroy();
    }
    if (!this.label) {
      if (this.outside) {
        let t12 = this.chart, e11 = t12.options.chart.style, i11 = es.getRendererType();
        this.container = a2 = D.doc.createElement("div"), a2.className = "highcharts-tooltip-container " + (t12.renderTo.className.match(/(highcharts[a-zA-Z0-9-]+)\s?/gm) || ""), j(a2, { position: "absolute", top: "1px", pointerEvents: "none", zIndex: Math.max(this.options.style.zIndex || 0, (e11?.zIndex || 0) + 3) }), this.renderer = n2 = new i11(a2, 0, 0, e11, void 0, void 0, n2.styledMode);
      }
      if (r2 ? this.label = n2.g("tooltip") : (this.label = n2.label("", t11, e10, o2.shape || "callout", void 0, void 0, o2.useHTML, void 0, "tooltip").attr({ padding: o2.padding, r: o2.borderRadius }), s10 || this.label.attr({ fill: o2.backgroundColor, "stroke-width": o2.borderWidth || 0 }).css(o2.style).css({ pointerEvents: o2.style.pointerEvents || (this.shouldStickOnContact() ? "auto" : "none") })), i10.outside) {
        let t12 = this.label;
        [t12.xSetter, t12.ySetter].forEach((e11, s11) => {
          t12[s11 ? "ySetter" : "xSetter"] = (o3) => {
            e11.call(t12, i10.distance), t12[s11 ? "y" : "x"] = o3, a2 && (a2.style[s11 ? "top" : "left"] = `${o3}px`);
          };
        });
      }
      this.label.attr({ zIndex: 8 }).shadow(o2.shadow ?? !o2.fixed).add();
    }
    return a2 && !a2.parentElement && D.doc.body.appendChild(a2), this.label;
  }
  getPlayingField() {
    let { body: t11, documentElement: e10 } = it, { chart: i10, distance: s10, outside: o2 } = this;
    return { width: o2 ? Math.max(t11.scrollWidth, e10.scrollWidth, t11.offsetWidth, e10.offsetWidth, e10.clientWidth) - 2 * s10 - 2 : i10.chartWidth, height: o2 ? Math.max(t11.scrollHeight, e10.scrollHeight, t11.offsetHeight, e10.offsetHeight, e10.clientHeight) : i10.chartHeight };
  }
  getPosition(t11, e10, i10) {
    let { distance: s10, chart: o2, outside: r2, pointer: a2 } = this, { inverted: n2, plotLeft: h2, plotTop: l2, polar: d2 } = o2, { plotX: c2 = 0, plotY: p2 = 0 } = i10, g2 = {}, u2 = n2 && i10.h || 0, { height: f2, width: m2 } = this.getPlayingField(), x2 = a2.getChartPosition(), y2 = (i11) => {
      let a3 = "x" === i11;
      return [i11, a3 ? m2 : f2, a3 ? t11 : e10].concat(r2 ? [a3 ? t11 * x2.scaleX : e10 * x2.scaleY, a3 ? x2.left - s10 + (c2 + h2) * x2.scaleX : x2.top - s10 + (p2 + l2) * x2.scaleY, 0, a3 ? m2 : f2] : [a3 ? t11 : e10, a3 ? c2 + h2 : p2 + l2, a3 ? h2 : l2, a3 ? h2 + o2.plotWidth : l2 + o2.plotHeight]);
    }, b2 = y2("y"), v2 = y2("x"), k2, w2 = !!i10.negative;
    !d2 && o2.hoverSeries?.yAxis?.reversed && (w2 = !w2);
    let M2 = !this.followPointer && ty(i10.ttBelow, !d2 && !n2 === w2), S2 = function(t12, e11, i11, o3, a3, n3, h3) {
      let l3 = r2 ? "y" === t12 ? s10 * x2.scaleY : s10 * x2.scaleX : s10, d3 = (i11 - o3) / 2, c3 = o3 < a3 - s10, p3 = a3 + s10 + o3 < e11, f3 = a3 - l3 - i11 + d3, m3 = a3 + l3 - d3;
      if (M2 && p3) g2[t12] = m3;
      else if (!M2 && c3) g2[t12] = f3;
      else if (c3) g2[t12] = Math.min(h3 - o3, f3 - u2 < 0 ? f3 : f3 - u2);
      else {
        if (!p3) return g2[t12] = 0, false;
        g2[t12] = Math.max(n3, m3 + u2 + i11 > e11 ? m3 : m3 + u2);
      }
    }, T2 = function(t12, e11, i11, o3, r3) {
      if (r3 < s10 || r3 > e11 - s10) return false;
      r3 < i11 / 2 ? g2[t12] = 1 : r3 > e11 - o3 / 2 ? g2[t12] = e11 - o3 - 2 : g2[t12] = r3 - i11 / 2;
    }, C2 = function(t12) {
      [b2, v2] = [v2, b2], k2 = t12;
    }, A2 = () => {
      false !== S2.apply(0, b2) ? false !== T2.apply(0, v2) || k2 || (C2(true), A2()) : k2 ? g2.x = g2.y = 0 : (C2(true), A2());
    };
    return (n2 && !d2 || this.len > 1) && C2(), A2(), r2 && (g2.x -= x2.left, g2.y -= x2.top), g2;
  }
  getFixedPosition(t11, e10, i10) {
    let s10 = i10.series, { chart: o2, options: r2, split: a2 } = this, n2 = r2.position, h2 = n2.relativeTo, l2 = r2.shared || s10?.yAxis?.isRadial && ("pane" === h2 || !h2) ? "plotBox" : h2, d2 = "chart" === l2 ? o2.renderer : o2[l2] || o2.getClipBox(s10, true);
    return { x: d2.x + (d2.width - t11) * Q(n2.align) + n2.x, y: d2.y + (d2.height - e10) * Q(n2.verticalAlign) + (!a2 && n2.y || 0) };
  }
  hide(t11) {
    let e10 = this;
    is(this), t11 = ty(t11, this.options.hideDelay), this.isHidden || (this.hideTimer = tC(function() {
      let i10 = e10.getLabel();
      e10.getLabel().animate({ opacity: 0 }, { duration: t11 ? 150 : t11, complete: () => {
        i10.hide(), e10.container && e10.container.remove();
      } }), e10.isHidden = true;
    }, t11));
  }
  init(t11, e10) {
    this.chart = t11, this.options = e10, this.crosshairs = [], this.isHidden = true, this.split = e10.split && !t11.inverted && !t11.polar, this.shared = e10.shared || this.split, this.outside = ty(e10.outside, !!(t11.scrollablePixelsX || t11.scrollablePixelsY));
  }
  shouldStickOnContact(t11) {
    return !!(!this.followPointer && this.options.stickOnContact && (!t11 || this.pointer.inClass(t11.target, "highcharts-tooltip")));
  }
  move(t11, e10, i10, s10) {
    let { followPointer: o2, options: r2 } = this, a2 = e9(!o2 && !this.isHidden && !r2.fixed && r2.animation), n2 = o2 || (this.len || 0) > 1, h2 = { x: t11, y: e10 };
    n2 ? h2.anchorX = h2.anchorY = NaN : (h2.anchorX = i10, h2.anchorY = s10), a2.step = () => this.drawTracker(), this.getLabel().animate(h2, a2);
  }
  refresh(t11, e10) {
    let i10 = this, { chart: s10, options: o2, pointer: r2, shared: a2 } = this, n2 = tS(t11), h2 = n2[0], l2 = o2.format, d2 = o2.formatter || i10.defaultFormatter, c2 = s10.styledMode, p2 = i10.allowShared;
    if (!o2.enabled || !h2.series) return;
    is(this), i10.allowShared = !(!td(t11) && t11.series && t11.series.noSharedTooltip), p2 = p2 && !i10.allowShared, i10.followPointer = !i10.split && h2.series.tooltipOptions.followPointer;
    let g2 = i10.getAnchor(t11, e10), u2 = g2[0], f2 = g2[1];
    a2 && i10.allowShared && (r2.applyInactiveState(n2), n2.forEach((t12) => t12.setState("hover")), h2.points = n2), this.len = n2.length;
    let m2 = tl(l2) ? e4(l2, h2, s10) : d2.call(h2, i10, h2);
    h2.points = void 0;
    let x2 = h2.series;
    this.distance = ty(x2.tooltipOptions.distance, 16), false === m2 ? this.hide() : this.showTimer = tC(() => {
      if (i10.split && i10.allowShared) i10.renderSplit(m2, n2);
      else {
        let t12 = u2, a3 = f2;
        if (e10 && r2.isDirectTouch && (t12 = e10.chartX - s10.plotLeft, a3 = e10.chartY - s10.plotTop), !(s10.polar || false === x2.options.clip || n2.some((e11) => r2.isDirectTouch || e11.series.shouldShowTooltip(t12, a3)))) return void i10.hide();
        {
          let t13 = i10.getLabel(p2 && i10.tt || {});
          (!o2.style.width || c2) && t13.css({ width: (this.outside ? this.getPlayingField() : s10.spacingBox).width - 2 * o2.padding + "px" }), t13.attr({ class: i10.getClassName(h2), text: td(m2) ? m2.join("") : m2 }), this.outside && t13.attr({ x: G(t13.x || 0, 0, this.getPlayingField().width - (t13.width || 0) - 1) }), c2 || t13.attr({ stroke: o2.borderColor || h2.color || x2.color || "#666666" }), i10.updatePosition({ plotX: u2, plotY: f2, negative: h2.negative, ttBelow: h2.ttBelow, series: x2, h: g2[2] || 0 });
        }
      }
      i10.isHidden && i10.label && i10.label.attr({ opacity: 1 }).show(), i10.isHidden = false;
    }, i10.isHidden && o2.showDelay || 0), J(this, "refresh");
  }
  renderSplit(t11, e10) {
    let i10 = this, { chart: s10, chart: { chartWidth: o2, chartHeight: r2, plotHeight: a2, plotLeft: n2, plotTop: h2, scrollablePixelsY: l2 = 0, scrollablePixelsX: d2, styledMode: c2 }, distance: p2, options: g2, options: { fixed: u2, position: f2, positioner: m2 }, pointer: x2 } = i10, { scrollLeft: y2 = 0, scrollTop: b2 = 0 } = s10.scrollablePlotArea?.scrollingContainer || {}, v2 = i10.outside && "number" != typeof d2 ? it.documentElement.getBoundingClientRect() : { left: y2, right: y2 + o2, top: b2, bottom: b2 + r2 }, k2 = i10.getLabel(), w2 = this.renderer || s10.renderer, M2 = !!s10.xAxis[0]?.opposite, { left: S2, top: T2 } = x2.getChartPosition(), C2 = m2 || u2, A2 = h2 + b2, P2 = 0, L2 = a2 - l2, O2 = function(t12, e11, s11, o3, r3 = [0, 0], a3 = true) {
      let n3, h3;
      if (s11.isHeader) h3 = M2 ? 0 : L2, n3 = G(r3[0] - t12 / 2, v2.left, v2.right - t12 - (i10.outside ? S2 : 0));
      else if (u2 && s11) {
        let o4 = i10.getFixedPosition(t12, e11, s11);
        n3 = o4.x, h3 = o4.y - A2;
      } else h3 = r3[1] - A2, n3 = G(n3 = a3 ? r3[0] - t12 - p2 : r3[0] + p2, a3 ? n3 : v2.left, v2.right);
      return { x: n3, y: h3 };
    };
    tl(t11) && (t11 = [false, t11]);
    let E2 = t11.slice(0, e10.length + 1).reduce(function(t12, s11, o3) {
      if (false !== s11 && "" !== s11) {
        let r3 = e10[o3 - 1] || { isHeader: true, plotX: e10[0].plotX, plotY: a2, series: {} }, l3 = r3.isHeader, d3 = l3 ? i10 : r3.series, f3 = d3.tt = (function(t13, e11, s12) {
          let o4 = t13, { isHeader: r4, series: a3 } = e11, n3 = a3.tooltipOptions || g2;
          if (!o4) {
            let t14 = { padding: n3.padding, r: n3.borderRadius };
            c2 || (t14.fill = n3.backgroundColor, t14["stroke-width"] = n3.borderWidth ?? (u2 && !r4 ? 0 : 1)), o4 = w2.label("", 0, 0, n3[r4 ? "headerShape" : "shape"] || (u2 && !r4 ? "rect" : "callout"), void 0, void 0, n3.useHTML).addClass(i10.getClassName(e11, true, r4)).attr(t14).add(k2);
          }
          return o4.isActive = true, o4.attr({ text: s12 }), c2 || o4.css(n3.style).attr({ stroke: n3.borderColor || e11.color || a3.color || "#333333" }), o4;
        })(d3.tt, r3, s11.toString()), x3 = f3.getBBox(), y3 = x3.width + f3.strokeWidth();
        l3 && (P2 = x3.height, L2 += P2, M2 && (A2 -= P2));
        let { anchorX: b3, anchorY: S3 } = (function(t13) {
          let e11, i11, { isHeader: s12, plotX: o4 = 0, plotY: r4 = 0, series: l4 } = t13;
          if (s12) e11 = Math.max(n2 + o4, n2), i11 = h2 + a2 / 2;
          else {
            let { xAxis: t14, yAxis: s13 } = l4;
            e11 = t14.pos + G(o4, -p2, t14.len + p2), l4.shouldShowTooltip(0, s13.pos - h2 + r4, { ignoreX: true }) && (i11 = s13.pos + r4);
          }
          return { anchorX: e11 = G(e11, v2.left - p2, v2.right + p2), anchorY: i11 };
        })(r3);
        if ("number" == typeof S3) {
          let e11 = x3.height + 1, s12 = (m2 || O2).call(i10, y3, e11, r3, i10, [b3, S3]);
          t12.push({ align: C2 ? 0 : void 0, anchorX: b3, anchorY: S3, boxWidth: y3, point: r3, rank: ty(s12.rank, +!!l3), size: e11, target: s12.y, tt: f3, x: s12.x });
        } else f3.isActive = false;
      }
      return t12;
    }, []);
    !C2 && E2.some((t12) => {
      let { outside: e11 } = i10, s11 = (e11 ? S2 : 0) + t12.anchorX;
      return s11 < v2.left && s11 + t12.boxWidth < v2.right || s11 < S2 - v2.left + t12.boxWidth && v2.right - s11 > s11;
    }) && (E2 = E2.map((t12) => {
      let { x: e11, y: i11 } = O2.call(this, t12.boxWidth, t12.size, t12.point, void 0, [t12.anchorX, t12.anchorY], false);
      return K(t12, { target: i11, x: e11 });
    })), i10.cleanSplit(), ii(E2, L2);
    let I2 = { left: S2, right: S2 };
    E2.forEach(function(t12) {
      let { x: e11, boxWidth: s11, isHeader: o3 } = t12;
      !o3 && (i10.outside && S2 + e11 < I2.left && (I2.left = S2 + e11), !o3 && i10.outside && I2.left + s11 > I2.right && (I2.right = S2 + e11));
    }), E2.forEach(function(t12) {
      let { x: e11, anchorX: s11, anchorY: o3, pos: r3, point: { isHeader: a3 } } = t12, n3 = { visibility: void 0 === r3 ? "hidden" : "inherit", x: e11, y: (r3 || 0) + A2 + (u2 && f2.y || 0), anchorX: s11, anchorY: o3 };
      if (i10.outside && e11 < s11) {
        let t13 = S2 - I2.left;
        t13 > 0 && (a3 || (n3.x = e11 + t13, n3.anchorX = s11 + t13), a3 && (n3.x = (I2.right - I2.left) / 2, n3.anchorX = s11 + t13));
      }
      t12.tt.attr(n3);
    });
    let { container: D2, outside: B2, renderer: N2 } = i10;
    if (B2 && D2 && N2) {
      let { width: t12, height: e11, x: i11, y: s11 } = k2.getBBox();
      N2.setSize(t12 + i11, e11 + s11, false), D2.style.left = I2.left + "px", D2.style.top = T2 + "px";
    }
    ie && k2.attr({ opacity: 1 === k2.opacity ? 0.999 : 1 });
  }
  drawTracker() {
    let t11 = this;
    if (!this.shouldStickOnContact()) {
      t11.tracker && (t11.tracker = t11.tracker.destroy());
      return;
    }
    let e10 = t11.chart, i10 = t11.label, s10 = t11.shared ? e10.hoverPoints : e10.hoverPoint;
    if (!i10 || !s10) return;
    let o2 = { x: 0, y: 0, width: 0, height: 0 }, r2 = this.getAnchor(s10), a2 = i10.getBBox();
    r2[0] += e10.plotLeft - (i10.translateX || 0), r2[1] += e10.plotTop - (i10.translateY || 0), o2.x = Math.min(0, r2[0]), o2.y = Math.min(0, r2[1]), o2.width = r2[0] < 0 ? Math.max(Math.abs(r2[0]), a2.width - r2[0]) : Math.max(Math.abs(r2[0]), a2.width), o2.height = r2[1] < 0 ? Math.max(Math.abs(r2[1]), a2.height - Math.abs(r2[1])) : Math.max(Math.abs(r2[1]), a2.height), t11.tracker ? t11.tracker.attr(o2) : (t11.tracker = i10.renderer.rect(o2).addClass("highcharts-tracker").add(i10), z(t11.tracker.element, "mouseenter", () => is(t11)), e10.styledMode || t11.tracker.attr({ fill: "rgba(0,0,0,0)" }));
  }
  styledModeFormat(t11) {
    return t11.replace('style="font-size: 0.8em"', 'class="highcharts-header"').replace(/style="color:{(point|series)\.color}"/g, 'class="highcharts-color-{$1.colorIndex} {series.options.className} {point.options.className}"');
  }
  headerFooterFormatter(t11, e10) {
    let i10 = t11.series, s10 = i10.tooltipOptions, o2 = i10.xAxis, r2 = o2?.dateTime, a2 = { isFooter: e10, point: t11 }, n2 = s10.xDateFormat || "", h2 = s10[e10 ? "footerFormat" : "headerFormat"];
    return J(this, "headerFormatter", a2, function(e11) {
      if (r2 && !n2 && th(t11.key) && (n2 = r2.getXDateFormat(t11.key, s10.dateTimeLabelFormats)), r2 && n2) {
        if (tp(n2)) {
          let t12 = n2;
          e7[0] = (e12) => i10.chart.time.dateFormat(t12, e12), n2 = "%0";
        }
        (t11.tooltipDateKeys || ["key"]).forEach((t12) => {
          h2 = h2.replace(RegExp("point\\." + t12 + "([ \\)}])"), `(point.${t12}:${n2})$1`);
        });
      }
      i10.chart.styledMode && (h2 = this.styledModeFormat(h2)), e11.text = e4(h2, t11, this.chart);
    }), a2.text || "";
  }
  update(t11) {
    this.destroy(), this.init(this.chart, tg(true, this.options, t11));
  }
  updatePosition(t11) {
    let { chart: e10, container: i10, distance: s10, options: o2, pointer: r2, renderer: a2 } = this, { height: n2 = 0, width: h2 = 0 } = this.getLabel(), { fixed: l2, positioner: d2 } = o2, { left: c2, top: p2, scaleX: g2, scaleY: u2 } = r2.getChartPosition(), f2 = (d2 || l2 && this.getFixedPosition || this.getPosition).call(this, h2, n2, t11, this), m2 = D.doc, x2 = (t11.plotX || 0) + e10.plotLeft, y2 = (t11.plotY || 0) + e10.plotTop, b2;
    if (a2 && i10) {
      let { scrollLeft: t12 = 0, scrollTop: r3 = 0 } = e10.scrollablePlotArea?.scrollingContainer || {};
      f2.x += t12 + c2, f2.y += r3 + p2, b2 = (o2.borderWidth || 0) + 2 * s10 + 2, a2.setSize(G(h2 + b2, 0, m2.documentElement.clientWidth) - 1, n2 + b2, false), (1 !== g2 || 1 !== u2) && (j(i10, { transform: `scale(${g2}, ${u2})` }), x2 *= g2, y2 *= u2), x2 += c2 - f2.x, y2 += p2 - f2.y;
    }
    this.move(Math.round(f2.x), Math.round(f2.y || 0), x2, y2);
  }
};
(l = io || (io = {})).compose = function(t11) {
  tv(e8, "Core.Tooltip") && z(t11, "afterInit", function() {
    let t12 = this.chart;
    t12.options.tooltip && (t12.tooltip = new l(t12, t12.options.tooltip, this));
  });
};
var ir = io;
var { animObject: ia } = tJ;
var { defaultOptions: ih } = tF;
var { format: il } = ei;
var id = class _id {
  constructor(t11, e10, i10) {
    this.formatPrefix = "point", this.visible = true, this.point = this, this.series = t11, this.applyOptions(e10, i10), this.id ?? (this.id = tD()), this.resolveColor(), this.dataLabelOnNull ?? (this.dataLabelOnNull = t11.options.nullInteraction), t11.chart.pointCount++, this.category = t11.xAxis?.categories?.[this.x] ?? this.x, this.key = this.name ?? this.category, J(this, "afterInit");
  }
  animateBeforeDestroy() {
    let t11 = this, e10 = { x: t11.startXPos, opacity: 0 }, i10 = t11.getGraphicalProps();
    i10.singular.forEach(function(i11) {
      t11[i11] = t11[i11].animate("dataLabel" === i11 ? { x: t11[i11].startXPos, y: t11[i11].startYPos, opacity: 0 } : e10);
    }), i10.plural.forEach(function(e11) {
      t11[e11].forEach(function(e12) {
        e12.element && e12.animate(K({ x: t11.startXPos }, e12.startYPos ? { x: e12.startXPos, y: e12.startYPos } : {}));
      });
    });
  }
  applyOptions(t11, e10) {
    let i10 = this.series, s10 = i10.options.pointValKey || i10.pointValKey;
    return K(this, t11 = _id.prototype.optionsToObject.call(this, t11)), this.options ? this.options = i10.chart.options.chart.allowMutatingData ? K(this.options, t11) : tg(this.options, t11) : this.options = t11, t11.group && delete this.group, t11.dataLabels && delete this.dataLabels, s10 && (this.y = _id.prototype.getNestedProperty.call(this, s10)), this.selected && (this.state = "select"), "name" in this && void 0 === e10 && i10.xAxis && i10.xAxis.hasNames && (this.x = i10.xAxis.nameToX(this)), void 0 === this.x && i10 ? this.x = e10 ?? i10.autoIncrement() : th(t11.x) && i10.options.relativeXValue ? this.x = i10.autoIncrement(t11.x) : "string" == typeof this.x && (e10 ?? (e10 = i10.chart.time.parse(this.x)), th(e10) && (this.x = e10)), this.isNull = this.isValid && !this.isValid(), this.formatPrefix = this.isNull ? "null" : "point", this;
  }
  destroy() {
    if (!this.destroyed) {
      let t11 = this, e10 = t11.series, i10 = e10.chart, s10 = e10.options.dataSorting, o2 = i10.hoverPoints, r2 = ia(t11.series.chart.renderer.globalAnimation), a2 = () => {
        for (let e11 in (t11.graphic || t11.graphics || t11.dataLabel || t11.dataLabels) && (tM(t11), t11.destroyElements()), t11) delete t11[e11];
      };
      t11.legendItem && i10.legend.destroyItem(t11), o2 && (t11.setState(), _(o2, t11), o2.length || (i10.hoverPoints = null)), t11 === i10.hoverPoint && t11.onMouseOut(), s10?.enabled ? (this.animateBeforeDestroy(), tC(a2, r2.duration)) : a2(), i10.pointCount--;
    }
    this.destroyed = true;
  }
  destroyElements(t11) {
    let e10 = this, i10 = e10.getGraphicalProps(t11);
    i10.singular.forEach(function(t12) {
      e10[t12] = e10[t12].destroy();
    }), i10.plural.forEach(function(t12) {
      e10[t12].forEach(function(t13) {
        t13?.element && t13.destroy();
      }), delete e10[t12];
    });
  }
  firePointEvent(t11, e10, i10) {
    let s10 = this, o2 = this.series.options;
    s10.manageEvent(t11), "click" === t11 && o2.allowPointSelect && (i10 = function(t12) {
      !s10.destroyed && s10.select && s10.select(null, t12.ctrlKey || t12.metaKey || t12.shiftKey);
    }), J(s10, t11, e10, i10);
  }
  getClassName() {
    return "highcharts-point" + (this.selected ? " highcharts-point-select" : "") + (this.negative && false !== this.series.options.negativeColor ? " highcharts-negative" : "") + (this.isNull ? " highcharts-null-point" : "") + (void 0 !== this.colorIndex ? " highcharts-color-" + this.colorIndex : "") + (this.options.className ? " " + this.options.className : "") + (this.zone?.className ? " " + this.zone.className.replace("highcharts-negative", "") : "");
  }
  getGraphicalProps(t11) {
    let e10, i10, s10 = this, o2 = [], r2 = { singular: [], plural: [] };
    for ((t11 = t11 || { graphic: 1, dataLabel: 1 }).graphic && o2.push("graphic", "connector"), t11.dataLabel && o2.push("dataLabel", "dataLabelPath", "dataLabelUpper"), i10 = o2.length; i10--; ) s10[e10 = o2[i10]] && r2.singular.push(e10);
    return ["graphic", "dataLabel"].forEach(function(e11) {
      let i11 = e11 + "s";
      t11[e11] && s10[i11] && r2.plural.push(i11);
    }), r2;
  }
  getNestedProperty(t11) {
    if (t11) return 0 === t11.indexOf("custom.") ? ti(t11, this.options) : this[t11];
  }
  getZone() {
    let t11 = this.series, e10 = t11.zones, i10 = t11.zoneAxis || "y", s10, o2 = 0;
    for (s10 = e10[0]; this[i10] >= s10.value; ) s10 = e10[++o2];
    return this.nonZonedColor || (this.nonZonedColor = this.color), s10?.color && !this.options.color ? this.color = s10.color : this.color = this.nonZonedColor, s10;
  }
  hasNewShapeType() {
    return (this.graphic && (this.graphic.symbolName || this.graphic.element.nodeName)) !== this.shapeType;
  }
  isValid() {
    return (th(this.x) || this.x instanceof Date) && th(this.y);
  }
  optionsToObject(t11) {
    let e10 = this.series, i10 = e10.options.keys, s10 = i10 || e10.pointArrayMap || ["y"], o2 = s10.length, r2 = {}, a2, n2 = 0, h2 = 0;
    if (th(t11) || null === t11) r2[s10[0]] = t11;
    else if (td(t11)) for (!i10 && t11.length > o2 && ("string" == (a2 = typeof t11[0]) ? e10.xAxis?.dateTime ? r2.x = e10.chart.time.parse(t11[0]) : r2.name = t11[0] : "number" === a2 && (r2.x = t11[0]), n2++); h2 < o2; ) i10 && void 0 === t11[n2] || (s10[h2].indexOf(".") > 0 ? _id.prototype.setNestedProperty(r2, t11[n2], s10[h2]) : r2[s10[h2]] = t11[n2]), n2++, h2++;
    else "object" == typeof t11 && (r2 = t11, t11.dataLabels && (e10.hasDataLabels = () => true), t11.marker && (e10._hasPointMarkers = true));
    return r2;
  }
  pos(t11, e10 = this.plotY) {
    if (!this.destroyed) {
      let { plotX: i10, series: s10 } = this, { chart: o2, xAxis: r2, yAxis: a2 } = s10, n2 = 0, h2 = 0;
      if (th(i10) && th(e10)) return t11 && (n2 = r2 ? r2.pos : o2.plotLeft, h2 = a2 ? a2.pos : o2.plotTop), o2.inverted && r2 && a2 ? [a2.len - e10 + h2, r2.len - i10 + n2] : [i10 + n2, e10 + h2];
    }
  }
  resolveColor() {
    let t11 = this.series, e10 = t11.chart.options.chart, i10 = t11.chart.styledMode, s10, o2, r2 = e10.colorCount, a2;
    delete this.nonZonedColor, t11.options.colorByPoint ? (i10 || (s10 = (o2 = t11.options.colors || t11.chart.options.colors)[t11.colorCounter], r2 = o2.length), a2 = t11.colorCounter, t11.colorCounter++, t11.colorCounter === r2 && (t11.colorCounter = 0)) : (i10 || (s10 = t11.color), a2 = t11.colorIndex), this.colorIndex = ty(this.options.colorIndex, a2), this.color = ty(this.options.color, s10);
  }
  setNestedProperty(t11, e10, i10) {
    return i10.split(".").reduce(function(t12, i11, s10, o2) {
      let r2 = o2.length - 1 === s10;
      return t12[i11] = r2 ? e10 : tp(t12[i11], true) ? t12[i11] : {}, t12[i11];
    }, t11), t11;
  }
  shouldDraw() {
    return !this.isNull;
  }
  tooltipFormatter(t11) {
    let { chart: e10, pointArrayMap: i10 = ["y"], tooltipOptions: s10 } = this.series, { valueDecimals: o2 = "", valuePrefix: r2 = "", valueSuffix: a2 = "" } = s10;
    return e10.styledMode && (t11 = e10.tooltip?.styledModeFormat(t11) || t11), i10.forEach((e11) => {
      e11 = "{point." + e11, (r2 || a2) && (t11 = t11.replace(RegExp(e11 + "}", "g"), r2 + e11 + "}" + a2)), t11 = t11.replace(RegExp(e11 + "}", "g"), e11 + ":,." + o2 + "f}");
    }), il(t11, this, e10);
  }
  update(t11, e10, i10, s10) {
    let o2, r2 = this, a2 = r2.series, n2 = r2.graphic, h2 = a2.chart, l2 = a2.options, d2 = l2.data;
    function c2() {
      r2.applyOptions(t11);
      let s11 = n2 && r2.hasMockGraphic, c3 = null === r2.y ? !s11 : s11;
      n2 && c3 && (r2.graphic = n2.destroy(), delete r2.hasMockGraphic), tp(t11, true) && (n2?.element && t11 && t11.marker && void 0 !== t11.marker.symbol && (r2.graphic = n2.destroy()), t11?.dataLabels && r2.dataLabel && (r2.dataLabel = r2.dataLabel.destroy())), o2 = r2.index;
      let p2 = {};
      for (let t12 of a2.dataColumnKeys()) p2[t12] = r2[t12];
      a2.dataTable.setRow(p2, o2), d2 && !a2.processedData && (d2[o2] = tp(d2[o2], true) || tp(t11, true) ? r2.options : t11 ?? d2[o2]), a2.isDirty = a2.isDirtyData = true, !a2.fixedBox && a2.hasCartesianSeries && (h2.isDirtyBox = true), "point" === l2.legendType && (h2.isDirtyLegend = true), e10 && h2.redraw(i10);
    }
    e10 = ty(e10, true), false === s10 ? c2() : r2.firePointEvent("update", { options: t11 }, c2);
  }
  remove(t11, e10) {
    this.series.removePoint(this.series.data.indexOf(this), t11, e10);
  }
  select(t11, e10) {
    let i10 = this, s10 = i10.series, o2 = s10.chart;
    t11 = ty(t11, !i10.selected), this.selectedStaging = t11, i10.firePointEvent(t11 ? "select" : "unselect", { accumulate: e10 }, function() {
      i10.selected = i10.options.selected = t11, s10.options.data[s10.data.indexOf(i10)] = i10.options, i10.setState(t11 && "select"), e10 || o2.getSelectedPoints().forEach(function(t12) {
        let e11 = t12.series;
        t12.selected && t12 !== i10 && (t12.selected = t12.options.selected = false, e11.options.data[e11.data.indexOf(t12)] = t12.options, t12.setState(o2.hoverPoints && e11.options.inactiveOtherPoints ? "inactive" : ""), t12.firePointEvent("unselect"));
      });
    }), delete this.selectedStaging;
  }
  onMouseOver(t11) {
    let { inverted: e10, pointer: i10 } = this.series.chart;
    i10 && (t11 = t11 ? i10.normalize(t11) : i10.getChartCoordinatesFromPoint(this, e10), i10.runPointActions(t11, this));
  }
  onMouseOut() {
    let t11 = this.series.chart;
    this.firePointEvent("mouseOut"), this.series.options.inactiveOtherPoints || (t11.hoverPoints || []).forEach(function(t12) {
      t12.setState();
    }), t11.hoverPoints = t11.hoverPoint = null;
  }
  manageEvent(t11) {
    let e10 = tg(this.series.options.point, this.options), i10 = e10.events?.[t11];
    tc(i10) && (!this.hcEvents?.[t11] || this.hcEvents?.[t11]?.map((t12) => t12.fn).indexOf(i10) === -1) ? (this.importedUserEvent?.(), this.importedUserEvent = z(this, t11, i10), this.hcEvents && (this.hcEvents[t11].userEvent = true)) : this.importedUserEvent && !i10 && this.hcEvents?.[t11] && this.hcEvents?.[t11].userEvent && (tM(this, t11), delete this.hcEvents[t11], Object.keys(this.hcEvents) || delete this.importedUserEvent);
  }
  setState(t11, e10) {
    let i10 = this.series, s10 = this.state, o2 = i10.options.states[t11 || "normal"] || {}, r2 = ih.plotOptions[i10.type].marker && i10.options.marker, a2 = r2 && false === r2.enabled, n2 = r2?.states?.[t11 || "normal"] || {}, h2 = false === n2.enabled, l2 = this.marker || {}, d2 = i10.chart, c2 = r2 && i10.markerAttribs, p2 = i10.halo, g2, u2, f2, m2 = i10.stateMarkerGraphic, x2;
    if ((t11 = t11 || "") === this.state && !e10 || this.selected && "select" !== t11 || false === o2.enabled || t11 && (h2 || a2 && false === n2.enabled) || t11 && l2.states && l2.states[t11] && false === l2.states[t11].enabled) return;
    if (this.state = t11, c2 && (g2 = i10.markerAttribs(this, t11)), this.graphic && !this.hasMockGraphic) {
      if (s10 && this.graphic.removeClass("highcharts-point-" + s10), t11 && this.graphic.addClass("highcharts-point-" + t11), !d2.styledMode) {
        u2 = i10.pointAttribs(this, t11), f2 = ty(d2.options.chart.animation, o2.animation);
        let e11 = u2.opacity;
        i10.options.inactiveOtherPoints && th(e11) && (this.dataLabels || []).forEach(function(t12) {
          t12 && !t12.hasClass("highcharts-data-label-hidden") && (t12.animate({ opacity: e11 }, f2), t12.connector && t12.connector.animate({ opacity: e11 }, f2));
        }), this.graphic.animate(u2, f2);
      }
      g2 && this.graphic.animate(g2, ty(d2.options.chart.animation, n2.animation, r2.animation)), m2 && m2.hide();
    } else t11 && n2 && (x2 = l2.symbol || i10.symbol, m2 && m2.currentSymbol !== x2 && (m2 = m2.destroy()), g2 && (m2 ? m2[e10 ? "animate" : "attr"]({ x: g2.x, y: g2.y }) : x2 && (i10.stateMarkerGraphic = m2 = d2.renderer.symbol(x2, g2.x, g2.y, g2.width, g2.height, tg(r2, n2)).add(i10.markerGroup), m2.currentSymbol = x2)), !d2.styledMode && m2 && "inactive" !== this.state && m2.attr(i10.pointAttribs(this, t11))), m2 && (m2[t11 && this.isInside ? "show" : "hide"](), m2.element.point = this, m2.addClass(this.getClassName(), true));
    let y2 = o2.halo, b2 = this.graphic || m2, v2 = b2?.visibility || "inherit";
    y2?.size && b2 && "hidden" !== v2 && !this.isCluster ? (p2 || (i10.halo = p2 = d2.renderer.path().add(b2.parentGroup)), p2.show()[e10 ? "animate" : "attr"]({ d: this.haloPath(y2.size) }), p2.attr({ class: "highcharts-halo highcharts-color-" + ty(this.colorIndex, i10.colorIndex) + (this.className ? " " + this.className : ""), visibility: v2, zIndex: -1 }), p2.point = this, d2.styledMode || p2.attr(K({ fill: this.color || i10.color, "fill-opacity": y2.opacity }, t5.filterUserAttributes(y2.attributes || {})))) : p2?.point?.haloPath && !p2.point.destroyed && p2.animate({ d: p2.point.haloPath(0) }, null, p2.hide), J(this, "afterSetState", { state: t11 });
  }
  haloPath(t11) {
    let e10 = this.pos();
    return e10 ? this.series.chart.renderer.symbols.circle(Y(e10[0], 1) - t11, e10[1] - t11, 2 * t11, 2 * t11) : [];
  }
};
var ic = id;
var { parse: ip } = tV;
var { charts: ig, composed: iu, isTouchDevice: im } = D;
var ix = (t11, e10) => !$(e10) || t11[`${e10}Key`];
var iy = class _iy {
  applyInactiveState(t11 = []) {
    let e10 = [];
    for (let i10 of (t11.forEach((t12) => {
      let i11 = t12.series;
      e10.push(i11), i11.linkedParent && e10.push(i11.linkedParent), i11.linkedSeries && e10.push.apply(e10, i11.linkedSeries), i11.navigatorSeries && e10.push(i11.navigatorSeries), i11.boosted && i11.markerGroup && e10.push.apply(e10, this.chart.series.filter((t13) => t13.markerGroup === i11.markerGroup));
    }), this.chart.series)) {
      let t12 = i10.options;
      t12.states?.inactive?.enabled !== false && (-1 === e10.indexOf(i10) ? i10.setState("inactive", true) : t12.inactiveOtherPoints && i10.setAllPointsToState("inactive"));
    }
  }
  destroy() {
    let t11 = this;
    this.eventsToUnbind.forEach((t12) => t12()), this.eventsToUnbind = [], !D.chartCount && (_iy.unbindDocumentMouseUp.forEach((t12) => t12.unbind()), _iy.unbindDocumentMouseUp.length = 0, _iy.unbindDocumentTouchEnd && (_iy.unbindDocumentTouchEnd = _iy.unbindDocumentTouchEnd())), tf(t11, function(e10, i10) {
      t11[i10] = void 0;
    });
  }
  getSelectionMarkerAttrs(t11, e10) {
    let i10 = { args: { chartX: t11, chartY: e10 }, attrs: {}, shapeType: "rect" };
    return J(this, "getSelectionMarkerAttrs", i10, (i11) => {
      let s10, { chart: o2, zoomHor: r2, zoomVert: a2 } = this, { mouseDownX: n2 = 0, mouseDownY: h2 = 0 } = o2, l2 = i11.attrs;
      l2.x = o2.plotLeft, l2.y = o2.plotTop, l2.width = r2 ? 1 : o2.plotWidth, l2.height = a2 ? 1 : o2.plotHeight, r2 && (l2.width = Math.max(1, Math.abs(s10 = t11 - n2)), l2.x = (s10 > 0 ? 0 : s10) + n2), a2 && (l2.height = Math.max(1, Math.abs(s10 = e10 - h2)), l2.y = (s10 > 0 ? 0 : s10) + h2);
    }), i10;
  }
  drag(t11) {
    let { chart: e10 } = this, { mouseDownX: i10 = 0, mouseDownY: s10 = 0 } = e10, { panning: o2, panKey: r2, selectionMarkerFill: a2 } = e10.options.chart, n2 = e10.plotLeft, h2 = e10.plotTop, l2 = e10.plotWidth, d2 = e10.plotHeight, c2 = tp(o2) ? o2.enabled : o2, p2 = r2 && t11[`${r2}Key`], g2 = t11.chartX, u2 = t11.chartY, f2, m2 = this.selectionMarker;
    if ((!m2 || !m2.touch) && (g2 < n2 ? g2 = n2 : g2 > n2 + l2 && (g2 = n2 + l2), u2 < h2 ? u2 = h2 : u2 > h2 + d2 && (u2 = h2 + d2), this.hasDragged = Math.sqrt(Math.pow(i10 - g2, 2) + Math.pow(s10 - u2, 2)), this.hasDragged > 10)) {
      f2 = e10.isInsidePlot(i10 - n2, s10 - h2, { visiblePlotOnly: true });
      let { shapeType: l3, attrs: d3 } = this.getSelectionMarkerAttrs(g2, u2);
      this.hasZoom && f2 && !p2 && !m2 && (this.selectionMarker = m2 = e10.renderer[l3](), m2.attr({ class: "highcharts-selection-marker", zIndex: 7 }).add(), e10.styledMode || m2.attr({ fill: a2 || ip("#334eff").setOpacity(0.25).get() })), m2 && m2.attr(d3), f2 && !m2 && c2 && ix(t11, r2) && e10.pan(t11, o2);
    }
  }
  dragStart(t11) {
    let e10 = this.chart;
    e10.mouseIsDown = t11.type, e10.cancelClick = false, e10.mouseDownX = t11.chartX, e10.mouseDownY = t11.chartY;
  }
  getSelectionBox(t11) {
    let e10 = { args: { marker: t11 }, result: t11.getBBox() };
    return J(this, "getSelectionBox", e10), e10.result;
  }
  drop(t11) {
    let e10, { chart: i10, selectionMarker: s10 } = this;
    for (let t12 of i10.axes) t12.isPanning && (t12.isPanning = false, (t12.options.startOnTick || t12.options.endOnTick || t12.series.some((t13) => t13.boosted)) && (t12.forceRedraw = true, t12.setExtremes(t12.userMin, t12.userMax, false), e10 = true));
    if (e10 && i10.redraw(), s10 && t11) {
      if (this.hasDragged) {
        let e11 = this.getSelectionBox(s10);
        i10.transform({ axes: i10.axes.filter((t12) => t12.zoomEnabled && ("xAxis" === t12.coll && this.zoomX || "yAxis" === t12.coll && this.zoomY)), selection: __spreadValues({ originalEvent: t11, xAxis: [], yAxis: [] }, e11), from: e11 });
      }
      th(i10.index) && (this.selectionMarker = s10.destroy());
    }
    i10 && th(i10.index) && (j(i10.container, { cursor: i10._cursor }), i10.cancelClick = this.hasDragged > 10, i10.mouseIsDown = false, this.hasDragged = 0, this.pinchDown = [], this.hasPinchMoved = false);
  }
  findNearestKDPoint(t11, e10, i10) {
    let s10;
    return t11.forEach(function(t12) {
      var o2;
      let r2, a2, n2, h2 = !(t12.noSharedTooltip && e10) && 0 > t12.options.findNearestPointBy.indexOf("y"), l2 = t12.searchPoint(i10, h2);
      tp(l2, true) && l2.series && (!tp(s10, true) || (r2 = (o2 = s10).distX - l2.distX, a2 = o2.dist - l2.dist, n2 = l2.series.group?.zIndex - o2.series.group?.zIndex, (0 !== r2 && e10 ? r2 : 0 !== a2 ? a2 : 0 !== n2 ? n2 : o2.series.index > l2.series.index ? -1 : 1) > 0)) && (s10 = l2);
    }), s10;
  }
  getChartCoordinatesFromPoint(t11, e10) {
    let { xAxis: i10, yAxis: s10 } = t11.series, o2 = t11.shapeArgs;
    if (i10 && s10) {
      let r2 = t11.clientX ?? t11.plotX ?? 0, a2 = t11.plotY || 0;
      return t11.isNode && o2 && th(o2.x) && th(o2.y) && (r2 = o2.x, a2 = o2.y), e10 ? { chartX: s10.len + s10.pos - a2, chartY: i10.len + i10.pos - r2 } : { chartX: r2 + i10.pos, chartY: a2 + s10.pos };
    }
    if (o2?.x && o2.y) return { chartX: o2.x, chartY: o2.y };
  }
  getChartPosition() {
    if (this.chartPosition) return this.chartPosition;
    let { container: t11 } = this.chart, e10 = tm(t11);
    this.chartPosition = { left: e10.left, top: e10.top, scaleX: 1, scaleY: 1 };
    let { offsetHeight: i10, offsetWidth: s10 } = t11;
    return s10 > 2 && i10 > 2 && (this.chartPosition.scaleX = e10.width / s10, this.chartPosition.scaleY = e10.height / i10), this.chartPosition;
  }
  getCoordinates(t11) {
    let e10 = { xAxis: [], yAxis: [] };
    for (let i10 of this.chart.axes) e10[i10.isXAxis ? "xAxis" : "yAxis"].push({ axis: i10, value: i10.toValue(t11[i10.horiz ? "chartX" : "chartY"]) });
    return e10;
  }
  getHoverData(t11, e10, i10, s10, o2, r2) {
    let a2 = [], n2 = function(t12) {
      return t12.visible && !(!o2 && t12.directTouch) && ty(t12.options.enableMouseTracking, true);
    }, h2 = e10, l2, d2 = { chartX: r2 ? r2.chartX : void 0, chartY: r2 ? r2.chartY : void 0, shared: o2 };
    J(this, "beforeGetHoverData", d2), l2 = h2 && !h2.stickyTracking ? [h2] : i10.filter((t12) => t12.stickyTracking && (d2.filter || n2)(t12));
    let c2 = s10 && t11 || !r2 ? t11 : this.findNearestKDPoint(l2, o2, r2);
    return h2 = c2?.series, c2 && (o2 && !h2.noSharedTooltip ? (l2 = i10.filter(function(t12) {
      return d2.filter ? d2.filter(t12) : n2(t12) && !t12.noSharedTooltip;
    })).forEach(function(t12) {
      let e11 = t12.options?.nullInteraction, i11 = to(t12.points, function(t13) {
        return t13.x === c2.x && (!t13.isNull || !!e11);
      });
      tp(i11) && (t12.boosted && t12.boost && (i11 = t12.boost.getPoint(i11)), a2.push(i11));
    }) : a2.push(c2)), J(this, "afterGetHoverData", d2 = { hoverPoint: c2 }), { hoverPoint: d2.hoverPoint, hoverSeries: h2, hoverPoints: a2 };
  }
  getPointFromEvent(t11) {
    let e10 = t11.target, i10;
    for (; e10 && !i10; ) i10 = e10.point, e10 = e10.parentNode;
    return i10;
  }
  onTrackerMouseOut(t11) {
    let e10 = this.chart, i10 = t11.relatedTarget, s10 = e10.hoverSeries;
    this.isDirectTouch = false, !s10 || !i10 || s10.stickyTracking || this.inClass(i10, "highcharts-tooltip") || this.inClass(i10, "highcharts-series-" + s10.index) && this.inClass(i10, "highcharts-tracker") || s10.onMouseOut();
  }
  inClass(t11, e10) {
    let i10 = t11, s10;
    for (; i10; ) {
      if (s10 = X(i10, "class")) {
        if (-1 !== s10.indexOf(e10)) return true;
        if (-1 !== s10.indexOf("highcharts-container")) return false;
      }
      i10 = i10.parentElement;
    }
  }
  constructor(t11, e10) {
    this.hasDragged = 0, this.pointerCaptureEventsToUnbind = [], this.eventsToUnbind = [], this.options = e10, this.chart = t11, this.runChartClick = !!e10.chart.events?.click, this.pinchDown = [], this.setDOMEvents(), J(this, "afterInit");
  }
  normalize(t11, e10) {
    let i10 = t11.touches, s10 = i10 ? i10.length ? i10.item(0) : ty(i10.changedTouches, t11.changedTouches)[0] : t11;
    e10 || (e10 = this.getChartPosition());
    let o2 = s10.pageX - e10.left, r2 = s10.pageY - e10.top;
    return K(t11, { chartX: Math.round(o2 /= e10.scaleX), chartY: Math.round(r2 /= e10.scaleY) });
  }
  onContainerClick(t11) {
    let e10 = this.chart, i10 = e10.hoverPoint, s10 = this.normalize(t11), o2 = e10.plotLeft, r2 = e10.plotTop;
    !e10.cancelClick && (i10 && this.inClass(s10.target, "highcharts-tracker") ? (J(i10.series, "click", K(s10, { point: i10 })), e10.hoverPoint && i10.firePointEvent("click", s10)) : (K(s10, this.getCoordinates(s10)), e10.isInsidePlot(s10.chartX - o2, s10.chartY - r2, { visiblePlotOnly: true }) && J(e10, "click", s10)));
  }
  onContainerMouseDown(t11) {
    let e10 = (1 & (t11.buttons || t11.button)) == 1;
    t11 = this.normalize(t11), D.isFirefox && 0 !== t11.button && this.onContainerMouseMove(t11), (void 0 === t11.button || e10) && (this.zoomOption(t11), e10 && t11.preventDefault?.(), this.dragStart(t11));
  }
  onContainerMouseLeave(t11) {
    let { pointer: e10 } = ig[ty(_iy.hoverChartIndex, -1)] || {};
    t11 = this.normalize(t11), this.onContainerMouseMove(t11), e10 && !this.inClass(t11.relatedTarget, "highcharts-tooltip") && (e10.reset(), e10.chartPosition = void 0);
  }
  onContainerMouseEnter() {
    delete this.chartPosition;
  }
  onContainerMouseMove(t11) {
    let e10 = this.chart, i10 = e10.tooltip, s10 = this.normalize(t11);
    this.setHoverChartIndex(t11), ("mousedown" === e10.mouseIsDown || this.touchSelect(s10)) && this.drag(s10), !e10.exporting?.openMenu && (this.inClass(s10.target, "highcharts-tracker") || e10.isInsidePlot(s10.chartX - e10.plotLeft, s10.chartY - e10.plotTop, { visiblePlotOnly: true })) && !i10?.shouldStickOnContact(s10) && (this.inClass(s10.target, "highcharts-no-tooltip") ? this.reset(false, 0) : this.runPointActions(s10));
  }
  onDocumentTouchEnd(t11) {
    this.onDocumentMouseUp(t11);
  }
  onContainerTouchMove(t11) {
    this.touchSelect(t11) ? this.onContainerMouseMove(t11) : this.touch(t11);
  }
  onContainerTouchStart(t11) {
    this.touchSelect(t11) ? this.onContainerMouseDown(t11) : (this.zoomOption(t11), this.touch(t11, true));
  }
  onDocumentMouseMove(t11) {
    let e10 = this.chart, i10 = e10.tooltip, s10 = this.chartPosition, o2 = this.normalize(t11, s10);
    !s10 || e10.isInsidePlot(o2.chartX - e10.plotLeft, o2.chartY - e10.plotTop, { visiblePlotOnly: true }) || i10?.shouldStickOnContact(o2) || o2.target !== e10.container.ownerDocument && this.inClass(o2.target, "highcharts-tracker") || this.reset();
  }
  onDocumentMouseUp(t11) {
    t11?.touches && this.hasPinchMoved && t11?.preventDefault?.(), ig[ty(_iy.hoverChartIndex, -1)]?.pointer?.drop(t11);
  }
  pinch(t11) {
    let e10 = this, { chart: i10, hasZoom: s10, lastTouches: o2 } = e10, r2 = [].map.call(t11.touches || [], (t12) => e10.normalize(t12)), a2 = r2.length, n2 = 1 === a2 && (e10.inClass(t11.target, "highcharts-tracker") && i10.runTrackerClick || e10.runChartClick), h2 = i10.tooltip, l2 = 1 === a2 && ty(h2?.options.followTouchMove, true);
    a2 > 1 ? e10.initiated = true : l2 && (e10.initiated = false), s10 && e10.initiated && !n2 && false !== t11.cancelable && t11.preventDefault(), "touchstart" === t11.type ? (e10.pinchDown = r2, e10.res = true, i10.mouseDownX = t11.chartX) : l2 ? this.runPointActions(e10.normalize(t11)) : o2 && (J(i10, "touchpan", { originalEvent: t11, touches: r2 }, () => {
      let e11 = (t12) => {
        let e12 = t12[0], i11 = t12[1] || e12;
        return { x: e12.chartX, y: e12.chartY, width: i11.chartX - e12.chartX, height: i11.chartY - e12.chartY };
      };
      i10.transform({ axes: i10.axes.filter((t12) => t12.zoomEnabled && (this.zoomHor && t12.horiz || this.zoomVert && !t12.horiz)), to: e11(r2), from: e11(o2), trigger: t11.type });
    }), e10.res && (e10.res = false, this.reset(false, 0))), e10.lastTouches = r2;
  }
  reset(t11, e10) {
    let i10 = this.chart, s10 = i10.hoverSeries, o2 = i10.hoverPoint, r2 = i10.hoverPoints, a2 = i10.tooltip, n2 = a2?.shared ? r2 : o2;
    t11 && n2 && tS(n2).forEach(function(e11) {
      e11.series.isCartesian && void 0 === e11.plotX && (t11 = false);
    }), t11 ? a2 && n2 && tS(n2).length && (a2.refresh(n2), a2.shared && r2 ? r2.forEach(function(t12) {
      t12.setState(t12.state, true), t12.series.isCartesian && (t12.series.xAxis.crosshair && t12.series.xAxis.drawCrosshair(null, t12), t12.series.yAxis.crosshair && t12.series.yAxis.drawCrosshair(null, t12));
    }) : o2 && (o2.setState(o2.state, true), i10.axes.forEach(function(t12) {
      t12.crosshair && o2.series[t12.coll] === t12 && t12.drawCrosshair(null, o2);
    }))) : (o2 && o2.onMouseOut(), r2 && r2.forEach(function(t12) {
      t12.setState();
    }), s10 && s10.onMouseOut(), a2 && a2.hide(e10), this.unDocMouseMove && (this.unDocMouseMove = this.unDocMouseMove()), i10.axes.forEach(function(t12) {
      t12.hideCrosshair();
    }), i10.hoverPoints = i10.hoverPoint = void 0);
  }
  runPointActions(t11, e10, i10) {
    let s10 = this.chart, o2 = s10.series, r2 = s10.tooltip?.options.enabled ? s10.tooltip : void 0, a2 = !!r2 && r2.shared, n2 = e10 || s10.hoverPoint, h2 = n2?.series || s10.hoverSeries, l2 = (!t11 || "touchmove" !== t11.type) && (!!e10 || h2?.directTouch && this.isDirectTouch), d2 = this.getHoverData(n2, h2, o2, l2, a2, t11);
    n2 = d2.hoverPoint, h2 = d2.hoverSeries;
    let c2 = d2.hoverPoints, p2 = h2?.tooltipOptions.followPointer && !h2.tooltipOptions.split, g2 = a2 && h2 && !h2.noSharedTooltip;
    if (n2 && (i10 || n2 !== s10.hoverPoint || r2?.isHidden)) {
      if ((s10.hoverPoints || []).forEach(function(t12) {
        -1 === c2.indexOf(t12) && t12.setState();
      }), s10.hoverSeries !== h2 && h2.onMouseOver(), this.applyInactiveState(c2), (c2 || []).forEach(function(t12) {
        t12.setState("hover");
      }), s10.hoverPoint && s10.hoverPoint.firePointEvent("mouseOut"), !n2.series) return;
      s10.hoverPoints = c2, s10.hoverPoint = n2, n2.firePointEvent("mouseOver", void 0, () => {
        r2 && n2 && r2.refresh(g2 ? c2 : n2, t11);
      });
    } else if (p2 && r2 && !r2.isHidden) {
      let e11 = r2.getAnchor([{}], t11);
      s10.isInsidePlot(e11[0], e11[1], { visiblePlotOnly: true }) && r2.updatePosition({ plotX: e11[0], plotY: e11[1] });
    }
    this.unDocMouseMove || (this.unDocMouseMove = z(s10.container.ownerDocument, "mousemove", (t12) => ig[_iy.hoverChartIndex ?? -1]?.pointer?.onDocumentMouseMove(t12)), this.eventsToUnbind.push(this.unDocMouseMove)), s10.axes.forEach(function(e11) {
      let i11, o3 = e11.crosshair?.snap ?? true;
      o3 && ((i11 = s10.hoverPoint) && i11.series[e11.coll] === e11 || (i11 = to(c2, (t12) => t12.series?.[e11.coll] === e11))), i11 || !o3 ? e11.drawCrosshair(t11, i11) : e11.hideCrosshair();
    });
  }
  setDOMEvents() {
    let t11 = this.chart.container, e10 = t11.ownerDocument, i10 = (t12) => t12.parentElement || t12.getRootNode()?.host?.parentElement;
    t11.onmousedown = this.onContainerMouseDown.bind(this), t11.onmousemove = this.onContainerMouseMove.bind(this), t11.onclick = this.onContainerClick.bind(this), this.eventsToUnbind.push(z(t11, "mouseenter", this.onContainerMouseEnter.bind(this)), z(t11, "mouseleave", this.onContainerMouseLeave.bind(this))), _iy.unbindDocumentMouseUp.some((t12) => t12.doc === e10) || _iy.unbindDocumentMouseUp.push({ doc: e10, unbind: z(e10, "mouseup", this.onDocumentMouseUp.bind(this)) });
    let s10 = i10(this.chart.renderTo);
    for (; s10 && "BODY" !== s10.tagName; ) this.eventsToUnbind.push(z(s10, "scroll", () => {
      delete this.chartPosition;
    })), s10 = i10(s10);
    this.eventsToUnbind.push(z(t11, "touchstart", this.onContainerTouchStart.bind(this), { passive: false }), z(t11, "touchmove", this.onContainerTouchMove.bind(this), { passive: false })), _iy.unbindDocumentTouchEnd || (_iy.unbindDocumentTouchEnd = z(e10, "touchend", this.onDocumentTouchEnd.bind(this), { passive: false })), this.setPointerCapture(), z(this.chart, "redraw", this.setPointerCapture.bind(this));
  }
  setPointerCapture() {
    if (!im) return;
    let t11 = this.pointerCaptureEventsToUnbind, e10 = this.chart, i10 = e10.container, s10 = ty(e10.options.tooltip?.followTouchMove, true) && e10.series.some((t12) => t12.options.findNearestPointBy.indexOf("y") > -1);
    !this.hasPointerCapture && s10 ? (t11.push(z(i10, "pointerdown", (t12) => {
      t12.target?.hasPointerCapture(t12.pointerId) && t12.target?.releasePointerCapture(t12.pointerId);
    }), z(i10, "pointermove", (t12) => {
      e10.pointer?.getPointFromEvent(t12)?.onMouseOver(t12);
    })), e10.styledMode || j(i10, { "touch-action": "none" }), i10.className += " highcharts-no-touch-action", this.hasPointerCapture = true) : this.hasPointerCapture && !s10 && (t11.forEach((t12) => t12()), t11.length = 0, e10.styledMode || j(i10, { "touch-action": ty(e10.options.chart.style?.["touch-action"], "manipulation") }), i10.className = i10.className.replace(" highcharts-no-touch-action", ""), this.hasPointerCapture = false);
  }
  setHoverChartIndex(t11) {
    let e10 = this.chart, i10 = D.charts[ty(_iy.hoverChartIndex, -1)];
    if (i10 && i10 !== e10) {
      let s10 = { relatedTarget: e10.container };
      t11 && !t11?.relatedTarget && Object.assign({}, t11, s10), i10.pointer?.onContainerMouseLeave(t11 || s10);
    }
    i10?.mouseIsDown || (_iy.hoverChartIndex = e10.index);
  }
  touch(t11, e10) {
    let i10, { chart: s10, pinchDown: o2 = [] } = this;
    this.setHoverChartIndex(), 1 === (t11 = this.normalize(t11)).touches.length ? s10.isInsidePlot(t11.chartX - s10.plotLeft, t11.chartY - s10.plotTop, { visiblePlotOnly: true }) && !s10.exporting?.openMenu ? (e10 && this.runPointActions(t11), "touchmove" === t11.type && (this.hasPinchMoved = i10 = !!o2[0] && Math.pow(o2[0].chartX - t11.chartX, 2) + Math.pow(o2[0].chartY - t11.chartY, 2) >= 16), ty(i10, true) && this.pinch(t11)) : e10 && this.reset() : 2 === t11.touches.length && this.pinch(t11);
  }
  touchSelect(t11) {
    return !!(this.chart.zooming.singleTouch && t11.touches && 1 === t11.touches.length);
  }
  zoomOption(t11) {
    let e10 = this.chart, i10 = e10.inverted, s10 = e10.zooming.type || "", o2, r2;
    /touch/.test(t11.type) && (s10 = ty(e10.zooming.pinchType, s10)), this.zoomX = o2 = /x/.test(s10), this.zoomY = r2 = /y/.test(s10), this.zoomHor = o2 && !i10 || r2 && i10, this.zoomVert = r2 && !i10 || o2 && i10, this.hasZoom = (o2 || r2) && ix(t11, e10.zooming.key);
  }
};
iy.unbindDocumentMouseUp = [], (d = iy || (iy = {})).compose = function(t11) {
  tv(iu, "Core.Pointer") && z(t11, "beforeRender", function() {
    this.pointer = new d(this, this.options);
  });
};
var ib = iy;
var { setLength: iv, splice: ik } = { convertToNumber: function(t11, e10) {
  switch (typeof t11) {
    case "boolean":
      return +!!t11;
    case "number":
      return isNaN(t11) && !e10 ? null : t11;
    default:
      return isNaN(t11 = parseFloat(`${t11 ?? ""}`)) && !e10 ? null : t11;
  }
}, setLength: function(t11, e10, i10) {
  return Array.isArray(t11) ? (t11.length = e10, t11) : t11[i10 ? "subarray" : "slice"](0, e10);
}, splice: function(t11, e10, i10, s10, o2 = []) {
  if (Array.isArray(t11)) return Array.isArray(o2) || (o2 = Array.from(o2)), { removed: t11.splice(e10, i10, ...o2), array: t11 };
  let r2 = Object.getPrototypeOf(t11).constructor, a2 = t11[s10 ? "subarray" : "slice"](e10, e10 + i10), n2 = new r2(t11.length - i10 + o2.length);
  return n2.set(t11.subarray(0, e10), 0), n2.set(o2, e10), n2.set(t11.subarray(e10 + i10), e10 + o2.length), { removed: a2, array: n2 };
} };
var iw = class {
  constructor(t11 = {}) {
    this.autoId = !t11.id, this.columns = {}, this.id = t11.id || tD(), this.rowCount = 0, this.versionTag = tD();
    let e10 = 0;
    tf(t11.columns || {}, (t12, i10) => {
      this.columns[i10] = t12.slice(), e10 = Math.max(e10, t12.length);
    }), this.applyRowCount(e10);
  }
  applyRowCount(t11) {
    this.rowCount = t11, tf(this.columns, (e10, i10) => {
      e10.length !== t11 && (this.columns[i10] = iv(e10, t11));
    });
  }
  deleteRows(t11, e10 = 1) {
    if (e10 > 0 && t11 < this.rowCount) {
      let i10 = 0;
      tf(this.columns, (s10, o2) => {
        this.columns[o2] = ik(s10, t11, e10).array, i10 = s10.length;
      }), this.rowCount = i10;
    }
    J(this, "afterDeleteRows", { rowIndex: t11, rowCount: e10 }), this.versionTag = tD();
  }
  getColumn(t11, e10) {
    return this.columns[t11];
  }
  getColumns(t11, e10) {
    return (t11 || Object.keys(this.columns)).reduce((t12, e11) => (t12[e11] = this.columns[e11], t12), {});
  }
  getRow(t11, e10) {
    return (e10 || Object.keys(this.columns)).map((e11) => this.columns[e11]?.[t11]);
  }
  setColumn(t11, e10 = [], i10 = 0, s10) {
    this.setColumns({ [t11]: e10 }, i10, s10);
  }
  setColumns(t11, e10, i10) {
    let s10 = this.rowCount;
    tf(t11, (t12, e11) => {
      this.columns[e11] = t12.slice(), s10 = t12.length;
    }), this.applyRowCount(s10), i10?.silent || (J(this, "afterSetColumns"), this.versionTag = tD());
  }
  setRow(t11, e10 = this.rowCount, i10, s10) {
    let { columns: o2 } = this, r2 = i10 ? this.rowCount + 1 : e10 + 1, a2 = Object.keys(t11);
    if (s10?.addColumns !== false) for (let t12 = 0, e11 = a2.length; t12 < e11; t12++) {
      let e12 = a2[t12];
      o2[e12] || (o2[e12] = []);
    }
    tf(o2, (a3, n2) => {
      a3 || s10?.addColumns === false || (a3 = Array(r2)), a3 && (i10 ? a3 = ik(a3, e10, 0, true, [t11[n2] ?? null]).array : a3[e10] = t11[n2] ?? null, o2[n2] = a3);
    }), r2 > this.rowCount && this.applyRowCount(r2), s10?.silent || (J(this, "afterSetRows"), this.versionTag = tD());
  }
  getModified() {
    return this.modified || this;
  }
};
var iM = M || (M = {});
function iS(t11, e10, i10) {
  let s10 = this.legendItem = this.legendItem || {}, { chart: o2, options: r2 } = this, { baseline: a2 = 0, symbolWidth: n2, symbolHeight: h2 } = t11, l2 = this.symbol || "circle", d2 = h2 / 2, c2 = o2.renderer, p2 = s10.group, g2 = a2 - Math.round((t11.fontMetrics?.b || h2) * (i10 ? 0.4 : 0.3)), u2 = {}, f2, m2 = r2.marker, x2 = 0;
  if (o2.styledMode || (u2["stroke-width"] = Math.min(r2.lineWidth || 0, 24), r2.dashStyle ? u2.dashstyle = r2.dashStyle : "square" !== r2.linecap && (u2["stroke-linecap"] = "round")), s10.line = c2.path().addClass("highcharts-graph").attr(u2).add(p2), i10 && (s10.area = c2.path().addClass("highcharts-area").add(p2)), u2["stroke-linecap"] && (x2 = Math.min(s10.line.strokeWidth(), n2) / 2), n2) {
    let t12 = [["M", x2, g2], ["L", n2 - x2, g2]];
    s10.line.attr({ d: t12 }), s10.area?.attr({ d: [...t12, ["L", n2 - x2, a2], ["L", x2, a2]] });
  }
  if (m2 && false !== m2.enabled && n2) {
    let t12 = Math.min(ty(m2.radius, d2), d2);
    0 === l2.indexOf("url") && (m2 = tg(m2, { width: h2, height: h2 }), t12 = 0), s10.symbol = f2 = c2.symbol(l2, n2 / 2 - t12, g2 - t12, 2 * t12, 2 * t12, K({ context: "legend" }, m2)).addClass("highcharts-point").add(p2), f2.isMarker = true;
  }
}
iM.areaMarker = function(t11, e10) {
  iS.call(this, t11, e10, true);
}, iM.lineMarker = iS;
var iT = M;
var { defaultOptions: iC } = tF;
var iA = S || (S = {});
function iP(t11, e10) {
  let i10 = iC.plotOptions || {}, s10 = e10.defaultOptions, o2 = e10.prototype;
  return o2.type = t11, o2.pointClass || (o2.pointClass = ic), !iA.seriesTypes[t11] && (s10 && (i10[t11] = s10), iA.seriesTypes[t11] = e10, true);
}
iA.seriesTypes = D.seriesTypes, iA.registerSeriesType = iP, iA.seriesType = function(t11, e10, i10, s10, o2) {
  let r2 = iC.plotOptions || {};
  if (e10 = e10 || "", r2[t11] = tg(r2[e10], i10), delete iA.seriesTypes[t11], iP(t11, q(iA.seriesTypes[e10] || D.Series, s10)), iA.seriesTypes[t11].prototype.type = t11, o2) {
    class e11 extends ic {
    }
    K(e11.prototype, o2), iA.seriesTypes[t11].prototype.pointClass = e11;
  }
  return iA.seriesTypes[t11];
};
var iL = S;
var { animObject: iO, setAnimation: iE } = tJ;
var { defaultOptions: iI } = tF;
var { registerEventOptions: iD } = e$;
var { svg: iB, win: iN } = D;
var { seriesTypes: iz } = iL;
var { format: iR } = ei;
var iW = class _iW {
  constructor() {
    this.zoneAxis = "y";
  }
  init(t11, e10) {
    let i10;
    J(this, "init", { options: e10 }), this.dataTable ?? (this.dataTable = new iw());
    let s10 = t11.series;
    this.eventsToUnbind = [], this.chart = t11, this.options = this.setOptions(e10);
    let o2 = this.options, r2 = false !== o2.visible;
    this.linkedSeries = [], this.bindAxes(), K(this, { name: o2.name, state: "", visible: r2, selected: true === o2.selected }), iD(this, o2);
    let a2 = o2.events;
    (a2?.click || o2.point?.events?.click || o2.allowPointSelect) && (t11.runTrackerClick = true), this.getColor(), this.getSymbol(), this.isCartesian && (t11.hasCartesianSeries = true), s10.length && (i10 = s10[s10.length - 1]), this._i = ty(i10?._i, -1) + 1, this.opacity = this.options.opacity, t11.orderItems("series", tE(this, s10)), o2.dataSorting?.enabled ? this.setDataSortingOptions() : this.points || this.data || this.setData(o2.data, false), J(this, "afterInit");
  }
  is(t11) {
    return iz[t11] && this instanceof iz[t11];
  }
  bindAxes() {
    let t11, e10 = this, i10 = e10.options, s10 = e10.chart;
    J(this, "bindAxes", null, function() {
      (e10.axisTypes || []).forEach(function(o2) {
        (s10[o2] || []).forEach(function(s11) {
          t11 = s11.options, (ty(i10[o2], 0) === s11.index || void 0 !== i10[o2] && i10[o2] === t11.id) && (tE(e10, s11.series), e10[o2] = s11, s11.isDirty = true);
        }), e10[o2] || e10.optionalAxis === o2 || tO(18, true, s10);
      });
    }), J(this, "afterBindAxes");
  }
  hasData() {
    return this.visible && void 0 !== this.dataMax && void 0 !== this.dataMin || this.visible && this.dataTable.rowCount > 0;
  }
  hasMarkerChanged(t11, e10) {
    let i10 = t11.marker, s10 = e10.marker || {};
    return i10 && (s10.enabled && !i10.enabled || s10.symbol !== i10.symbol || s10.height !== i10.height || s10.width !== i10.width);
  }
  autoIncrement(t11) {
    let e10, i10 = this.options, { pointIntervalUnit: s10, relativeXValue: o2 } = this.options, r2 = this.chart.time, a2 = this.xIncrement ?? r2.parse(i10.pointStart) ?? 0;
    if (this.pointInterval = e10 = ty(this.pointInterval, i10.pointInterval, 1), o2 && th(t11) && (e10 *= t11), s10) {
      let t12 = r2.toParts(a2);
      "day" === s10 ? t12[2] += e10 : "month" === s10 ? t12[1] += e10 : "year" === s10 && (t12[0] += e10), e10 = r2.makeTime.apply(r2, t12) - a2;
    }
    return o2 && th(t11) ? a2 + e10 : (this.xIncrement = a2 + e10, a2);
  }
  setDataSortingOptions() {
    let t11 = this.options;
    K(this, { requireSorting: false, sorted: false, enabledDataSorting: true, allowDG: false }), $(t11.pointRange) || (t11.pointRange = 1);
  }
  setOptions(t11) {
    let e10, i10 = this.chart, s10 = i10.options.plotOptions, o2 = i10.userOptions || {}, r2 = tg(t11), a2 = i10.styledMode, n2 = { plotOptions: s10, userOptions: r2 };
    J(this, "setOptions", n2);
    let h2 = n2.plotOptions[this.type], l2 = o2.plotOptions || {}, d2 = l2.series || {}, c2 = iI.plotOptions[this.type] || {}, p2 = l2[this.type] || {};
    h2.dataLabels = this.mergeArrays(c2.dataLabels, h2.dataLabels), this.userOptions = n2.userOptions;
    let g2 = tg(h2, s10.series, p2, r2);
    this.tooltipOptions = tg(iI.tooltip, iI.plotOptions.series?.tooltip, c2?.tooltip, i10.userOptions.tooltip, l2.series?.tooltip, p2.tooltip, r2.tooltip), this.stickyTracking = ty(r2.stickyTracking, p2.stickyTracking, d2.stickyTracking, !!this.tooltipOptions.shared && !this.noSharedTooltip || g2.stickyTracking), null === h2.marker && delete g2.marker;
    let { negativeColor: u2, negativeFillColor: f2, zoneAxis: m2 = "y", zones: x2 } = g2, y2 = this.zones = (x2 || []).map((t12) => __spreadValues({}, t12));
    return this.zoneAxis = m2, (u2 || f2) && !x2 && (e10 = { value: g2[m2 + "Threshold"] || g2.threshold || 0, className: "highcharts-negative" }, a2 || ("boolean" != typeof u2 && (e10.color = u2), e10.fillColor = f2), y2.push(e10)), y2.length && $(y2[y2.length - 1].value) && y2.push(a2 ? {} : { color: this.color, fillColor: this.fillColor }), J(this, "afterSetOptions", { options: g2 }), g2;
  }
  getName() {
    return this.options.name ?? iR(this.chart.options.lang.seriesName, this, this.chart);
  }
  getCyclic(t11, e10, i10) {
    let s10, o2, r2 = this.chart, a2 = `${t11}Index`, n2 = `${t11}Counter`, h2 = i10?.length || r2.options.chart.colorCount;
    !e10 && ($(o2 = ty("color" === t11 ? this.options.colorIndex : void 0, this[a2])) ? s10 = o2 : (r2.series.length || (r2[n2] = 0), s10 = r2[n2] % h2, r2[n2] += 1), i10 && (e10 = i10[s10])), void 0 !== s10 && (this[a2] = s10), this[t11] = e10;
  }
  getColor() {
    this.chart.styledMode ? this.getCyclic("color") : this.options.colorByPoint ? this.color = "#cccccc" : this.getCyclic("color", this.options.color || iI.plotOptions[this.type].color, this.chart.options.colors);
  }
  getPointsCollection() {
    return (this.hasGroupedData ? this.points : this.data) || [];
  }
  getSymbol() {
    let t11 = this.options.marker;
    this.getCyclic("symbol", t11.symbol, this.chart.options.symbols);
  }
  getColumn(t11, e10) {
    return (e10 ? this.dataTable.getModified() : this.dataTable).getColumn(t11, true) || [];
  }
  findPointIndex(t11, e10) {
    let i10, s10, o2, { id: r2, x: a2 } = t11, n2 = this.points, h2 = this.options.dataSorting, l2 = this.cropStart || 0;
    if (r2) {
      let t12 = this.chart.get(r2);
      t12 instanceof ic && (i10 = t12);
    } else if (this.linkedParent || this.enabledDataSorting || this.options.relativeXValue) {
      let e11 = (e12) => !e12.touched && e12.index === t11.index;
      if (h2?.matchByName ? e11 = (e12) => !e12.touched && e12.name === t11.name : this.options.relativeXValue && (e11 = (e12) => !e12.touched && e12.options.x === t11.x), !(i10 = to(n2, e11))) return;
    }
    return i10 && void 0 !== (o2 = i10?.index) && (s10 = true), void 0 === o2 && th(a2) && (o2 = this.getColumn("x").indexOf(a2, e10)), -1 !== o2 && void 0 !== o2 && this.cropped && (o2 = o2 >= l2 ? o2 - l2 : o2), !s10 && th(o2) && n2[o2]?.touched && (o2 = void 0), o2;
  }
  updateData(t11, e10) {
    let { options: i10, requireSorting: s10 } = this, o2 = i10.dataSorting, r2 = this.points, a2 = [], n2 = t11.length === r2.length, h2 = this.xIncrement, l2, d2, c2, p2, g2 = true;
    if (this.xIncrement = null, t11.forEach((t12, e11) => {
      let h3, d3 = $(t12) && this.pointClass.prototype.optionsToObject.call({ series: this }, t12) || {}, { id: c3, x: g3 } = d3;
      c3 || th(g3) ? (-1 === (h3 = this.findPointIndex(d3, p2)) || void 0 === h3 ? a2.push(t12) : r2[h3] && t12 !== i10.data?.[h3] ? (r2[h3].update(t12, false, void 0, false), r2[h3].touched = true, s10 && (p2 = h3 + 1)) : r2[h3] && (r2[h3].touched = true), (!n2 || e11 !== h3 || o2?.enabled || this.hasDerivedData) && (l2 = true)) : a2.push(t12);
    }, this), l2) for (d2 = r2.length; d2--; ) (c2 = r2[d2]) && !c2.touched && c2.remove?.(false, e10);
    else n2 && !o2?.enabled ? (t11.forEach((t12, e11) => {
      t12 === r2[e11].y || r2[e11].destroyed || r2[e11].update(t12, false, void 0, false);
    }), a2.length = 0) : g2 = false;
    if (r2.forEach((t12) => {
      t12 && (t12.touched = false);
    }), !g2) return false;
    a2.forEach((t12) => {
      this.addPoint(t12, false, void 0, void 0, false);
    }, this);
    let u2 = this.getColumn("x");
    return null !== h2 && null === this.xIncrement && u2.length && (this.xIncrement = W(u2), this.autoIncrement()), true;
  }
  dataColumnKeys() {
    return ["x", ...this.pointArrayMap || ["y"]];
  }
  setData(t11, e10 = true, i10, s10) {
    let o2 = this.points, r2 = o2?.length || 0, a2 = this.options, n2 = this.chart, h2 = a2.dataSorting, l2 = this.xAxis, d2 = a2.turboThreshold, c2 = this.dataTable, p2 = this.dataColumnKeys(), g2 = this.pointValKey || "y", u2 = (this.pointArrayMap || []).length, f2 = a2.keys, m2, x2, y2 = 0, b2 = 1, v2;
    n2.options.chart.allowMutatingData || (a2.data && delete this.options.data, this.userOptions.data && delete this.userOptions.data, v2 = tg(true, t11));
    let k2 = (t11 = v2 || t11 || []).length;
    if (h2?.enabled && (t11 = this.sortData(t11)), false !== s10 && k2 && r2 && !this.cropped && !this.hasGroupedData && this.visible && !this.boosted && (x2 = this.updateData(t11, i10)), !x2) {
      this.xIncrement = null, this.colorCounter = 0;
      let e11 = d2 && !a2.relativeXValue && k2 > d2;
      if (e11) {
        let i11 = this.getFirstValidPoint(t11), s11 = this.getFirstValidPoint(t11, k2 - 1, -1), o3 = (t12) => !!(td(t12) && (f2 || th(t12[0])));
        if (th(i11) && th(s11)) {
          let e12 = [], i12 = [];
          for (let s12 of t11) e12.push(this.autoIncrement()), i12.push(s12);
          c2.setColumns({ x: e12, [g2]: i12 });
        } else if (o3(i11) && o3(s11)) if (u2) {
          let e12 = +(i11.length === u2), s12 = Array(p2.length).fill(0).map(() => []);
          for (let i12 of t11) {
            e12 && s12[0].push(this.autoIncrement());
            for (let t12 = e12; t12 <= u2; t12++) s12[t12]?.push(i12[t12 - e12]);
          }
          c2.setColumns(p2.reduce((t12, e13, i12) => (t12[e13] = s12[i12], t12), {}));
        } else {
          f2 && (y2 = f2.indexOf("x"), b2 = f2.indexOf("y"), y2 = y2 >= 0 ? y2 : 0, b2 = b2 >= 0 ? b2 : 1), 1 === i11.length && (b2 = 0);
          let e12 = [], s12 = [];
          for (let i12 of t11) y2 === b2 ? e12.push(this.autoIncrement()) : e12.push(i12[y2] ?? i12.x ?? null), s12.push(i12[b2] ?? i12.y ?? null);
          c2.setColumns({ x: e12, [g2]: s12 });
        }
        else e11 = false;
      }
      if (!e11) {
        let e12 = p2.reduce((t12, e13) => (t12[e13] = [], t12), {});
        for (m2 = 0; m2 < k2; m2++) {
          let i11 = this.pointClass.prototype.applyOptions.apply({ series: this }, [t11[m2]]);
          for (let t12 of p2) e12[t12][m2] = i11[t12];
        }
        c2.setColumns(e12);
      }
      for (tl(this.getColumn("y")[0]) && tO(14, true, n2), this.data = [], this.options.data = this.userOptions.data = t11, m2 = r2; m2--; ) o2[m2]?.destroy();
      l2 && (l2.minRange = l2.userMinRange), this.isDirty = n2.isDirtyBox = true, this.isDirtyData = !!o2, i10 = false;
    }
    "point" === a2.legendType && (this.processData(), this.generatePoints()), e10 && n2.redraw(i10);
  }
  sortData(t11) {
    let e10 = this, i10 = e10.options.dataSorting.sortKey || "y", s10 = function(t12, e11) {
      return $(e11) && t12.pointClass.prototype.optionsToObject.call({ series: t12 }, e11) || {};
    };
    return t11.forEach(function(i11, o2) {
      t11[o2] = s10(e10, i11), t11[o2].index = o2;
    }, this), t11.concat().sort((t12, e11) => {
      let s11 = ti(i10, t12), o2 = ti(i10, e11);
      return o2 < s11 ? -1 : +(o2 > s11);
    }).forEach(function(t12, e11) {
      t12.x = e11;
    }, this), e10.linkedSeries && e10.linkedSeries.forEach(function(e11) {
      let i11 = e11.options, o2 = i11.data;
      !i11.dataSorting?.enabled && o2 && (o2.forEach(function(i12, r2) {
        o2[r2] = s10(e11, i12), t11[r2] && (o2[r2].x = t11[r2].x, o2[r2].index = r2);
      }), e11.setData(o2, false));
    }), t11;
  }
  getProcessedData(t11) {
    let e10 = this, { dataTable: i10, isCartesian: s10, options: o2, xAxis: r2 } = e10, a2 = o2.cropThreshold, n2 = t11 || e10.getExtremesFromAll, h2 = r2?.logarithmic, l2 = i10.rowCount, d2, c2, p2 = 0, g2, u2, f2, m2 = e10.getColumn("x"), x2 = i10, y2 = false;
    return r2 && (u2 = (g2 = r2.getExtremes()).min, f2 = g2.max, y2 = !!(r2.categories && !r2.names.length), s10 && e10.sorted && !n2 && (!a2 || l2 > a2 || e10.forceCrop) && (m2[l2 - 1] < u2 || m2[0] > f2 ? x2 = new iw() : e10.getColumn(e10.pointValKey || "y").length && (m2[0] < u2 || m2[l2 - 1] > f2) && (x2 = (d2 = this.cropData(i10, u2, f2)).modified, p2 = d2.start, c2 = true))), m2 = x2.getColumn("x") || [], { modified: x2, cropped: c2, cropStart: p2, closestPointRange: tt([h2 ? m2.map(h2.log2lin) : m2], () => e10.requireSorting && !y2 && tO(15, false, e10.chart)) };
  }
  processData(t11) {
    let e10 = this.xAxis, i10 = this.dataTable;
    if (this.isCartesian && !this.isDirty && !e10.isDirty && !this.yAxis.isDirty && !t11) return false;
    let s10 = this.getProcessedData();
    i10.modified = s10.modified, this.cropped = s10.cropped, this.cropStart = s10.cropStart, this.closestPointRange = this.basePointRange = s10.closestPointRange, J(this, "afterProcessData");
  }
  cropData(t11, e10, i10) {
    let s10 = t11.getColumn("x", true) || [], o2 = s10.length, r2 = {}, a2, n2, h2 = 0, l2 = o2;
    for (a2 = 0; a2 < o2; a2++) if (s10[a2] >= e10) {
      h2 = Math.max(0, a2 - 1);
      break;
    }
    for (n2 = a2; n2 < o2; n2++) if (s10[n2] > i10) {
      l2 = n2 + 1;
      break;
    }
    for (let e11 of this.dataColumnKeys()) {
      let i11 = t11.getColumn(e11, true);
      i11 && (r2[e11] = i11.slice(h2, l2));
    }
    return { modified: new iw({ columns: r2 }), start: h2, end: l2 };
  }
  generatePoints() {
    let t11 = this.options, e10 = this.processedData || t11.data, i10 = this.dataTable.getModified(), s10 = this.getColumn("x", true), o2 = this.pointClass, r2 = i10.rowCount, a2 = this.cropStart || 0, n2 = this.hasGroupedData, h2 = t11.keys, l2 = [], d2 = t11.dataGrouping?.groupAll ? a2 : 0, c2 = this.pointArrayMap || ["y"], p2 = this.dataColumnKeys(), g2, u2, f2, m2, x2 = this.data, y2;
    if (!x2 && !n2) {
      let t12 = [];
      t12.length = e10?.length || 0, x2 = this.data = t12;
    }
    for (h2 && n2 && (this.options.keys = false), m2 = 0; m2 < r2; m2++) u2 = a2 + m2, n2 ? ((f2 = new o2(this, i10.getRow(m2, p2) || [])).dataGroup = this.groupMap?.[d2 + m2], f2.dataGroup?.options && (f2.options = f2.dataGroup.options, K(f2, f2.dataGroup.options), delete f2.dataLabels, f2.key = f2.name ?? f2.category)) : (f2 = x2[u2], y2 = e10 ? e10[u2] : i10.getRow(m2, c2), f2 || void 0 === y2 ? f2 && (f2.category = this.xAxis?.categories?.[f2.x] ?? f2.x, f2.key = f2.name ?? f2.category) : x2[u2] = f2 = new o2(this, y2, s10[m2])), f2 && (f2.index = n2 ? d2 + m2 : u2, l2[m2] = f2);
    if (this.options.keys = h2, x2 && (r2 !== (g2 = x2.length) || n2)) for (m2 = 0; m2 < g2; m2++) m2 !== a2 || n2 || (m2 += r2), x2[m2] && (x2[m2].destroyElements(), x2[m2].plotX = void 0);
    this.data = x2, this.points = l2, J(this, "afterGeneratePoints");
  }
  getXExtremes(t11) {
    return { min: R(t11), max: W(t11) };
  }
  getExtremes(t11, e10) {
    let { xAxis: i10, yAxis: s10 } = this, o2 = e10 || this.getExtremesFromAll || this.options.getExtremesFromAll, r2 = o2 && this.cropped ? this.dataTable : this.dataTable.getModified(), a2 = r2.rowCount, n2 = t11 || this.stackedYData, h2 = n2 ? [n2] : (this.keysAffectYAxis || this.pointArrayMap || ["y"])?.map((t12) => r2.getColumn(t12, true) || []) || [], l2 = this.getColumn("x", true), d2 = [], c2 = this.requireSorting && !this.is("column") ? 1 : 0, p2 = !!s10 && s10.positiveValuesOnly, g2 = o2 || this.cropped || !i10, u2, f2, m2, x2 = 0, y2 = 0;
    for (i10 && (x2 = (u2 = i10.getExtremes()).min, y2 = u2.max), m2 = 0; m2 < a2; m2++) if (f2 = l2[m2], g2 || (l2[m2 + c2] || f2) >= x2 && (l2[m2 - c2] || f2) <= y2) for (let t12 of h2) {
      let e11 = t12[m2];
      th(e11) && (e11 > 0 || !p2) && d2.push(e11);
    }
    let b2 = { activeYData: d2, dataMin: R(d2), dataMax: W(d2) };
    return J(this, "afterGetExtremes", { dataExtremes: b2 }), b2;
  }
  applyExtremes() {
    let t11 = this.getExtremes();
    return this.dataMin = t11.dataMin, this.dataMax = t11.dataMax, t11;
  }
  getFirstValidPoint(t11, e10 = 0, i10 = 1) {
    let s10 = t11.length, o2 = e10;
    for (; o2 >= 0 && o2 < s10; ) {
      if ($(t11[o2])) return t11[o2];
      o2 += i10;
    }
  }
  translate() {
    this.generatePoints();
    let t11 = this.options, e10 = t11.stacking, i10 = this.xAxis, s10 = this.enabledDataSorting, o2 = this.yAxis, r2 = this.points, a2 = r2.length, n2 = this.pointPlacementToXValue(), h2 = !!n2, l2 = t11.threshold, d2 = t11.startFromThreshold ? l2 : 0, c2 = t11?.nullInteraction && o2.len, p2, g2, u2, f2, m2 = Number.MAX_VALUE;
    function x2(t12) {
      return G(t12, -1e9, 1e9);
    }
    for (p2 = 0; p2 < a2; p2++) {
      let t12, a3 = r2[p2], y2 = a3.x, b2, v2, k2 = a3.y, w2 = a3.low, M2 = e10 && o2.stacking?.stacks[(this.negStacks && k2 < (d2 ? 0 : l2) ? "-" : "") + this.stackKey];
      a3.plotX = th(g2 = i10.translate(y2, false, false, false, true, n2)) ? H(x2(g2)) : void 0, e10 && this.visible && M2 && M2[y2] && (f2 = this.getStackIndicator(f2, y2, this.index), !a3.isNull && f2.key && (v2 = (b2 = M2[y2]).points[f2.key]), b2 && td(v2) && (w2 = v2[0], k2 = v2[1], w2 === d2 && f2.key === M2[y2].base && (w2 = ty(th(l2) ? l2 : o2.min)), o2.positiveValuesOnly && $(w2) && w2 <= 0 && (w2 = void 0), a3.total = a3.stackTotal = ty(b2.total), a3.percentage = $(a3.y) && b2.total ? a3.y / b2.total * 100 : void 0, a3.stackY = k2, this.irregularWidths || b2.setOffset(this.pointXOffset || 0, this.barW || 0, void 0, void 0, void 0, this.xAxis))), a3.yBottom = $(w2) ? x2(o2.translate(w2, false, true, false, true)) : void 0, this.dataModify && (k2 = this.dataModify.modifyValue(k2, p2)), th(k2) && void 0 !== a3.plotX ? t12 = th(t12 = o2.translate(k2, false, true, false, true)) ? x2(t12) : void 0 : !th(k2) && c2 && (t12 = c2), a3.plotY = t12, a3.isInside = this.isPointInside(a3), a3.clientX = h2 ? H(i10.translate(y2, false, false, false, true, n2)) : g2, a3.negative = (a3.y || 0) < (l2 || 0), a3.isNull || false === a3.visible || (void 0 !== u2 && (m2 = Math.min(m2, Math.abs(g2 - u2))), u2 = g2), a3.zone = this.zones.length ? a3.getZone() : void 0, !a3.graphic && this.group && s10 && (a3.isNew = true);
    }
    this.closestPointRangePx = m2, J(this, "afterTranslate");
  }
  getValidPoints(t11, e10, i10) {
    let s10 = this.chart;
    return (t11 || this.points || []).filter(function(t12) {
      let { plotX: o2, plotY: r2 } = t12;
      return (!!i10 || !t12.isNull && !!th(r2)) && (!e10 || !!s10.isInsidePlot(o2, r2, { inverted: s10.inverted })) && false !== t12.visible;
    });
  }
  getSharedClipKey() {
    return this.sharedClipKey = (this.options.xAxis || 0) + "," + (this.options.yAxis || 0), this.sharedClipKey;
  }
  setClip() {
    let { chart: t11, group: e10, markerGroup: i10 } = this, s10 = t11.sharedClips, o2 = t11.renderer, r2 = t11.getClipBox(this), a2 = this.getSharedClipKey(), n2 = s10[a2];
    J(this, "setClip", { clipBox: r2 }), n2 ? n2.animate(r2) : s10[a2] = n2 = o2.clipRect(r2), e10 && e10.clip(false === this.options.clip ? void 0 : n2), i10 && i10.clip();
  }
  animate(t11) {
    let { chart: e10, group: i10, markerGroup: s10 } = this, o2 = e10.inverted, r2 = iO(this.options.animation), a2 = [this.getSharedClipKey(), r2.duration, r2.easing, r2.defer].join(","), n2 = e10.sharedClips[a2], h2 = e10.sharedClips[a2 + "m"];
    if (t11 && i10) {
      let t12 = e10.getClipBox(this);
      if (n2) n2.attr("height", t12.height);
      else {
        t12.width = 0, o2 && (t12.x = e10.plotHeight), n2 = e10.renderer.clipRect(t12), e10.sharedClips[a2] = n2;
        let i11 = { x: -99, y: -99, width: o2 ? e10.plotWidth + 199 : 99, height: o2 ? 99 : e10.plotHeight + 199 };
        h2 = e10.renderer.clipRect(i11), e10.sharedClips[a2 + "m"] = h2;
      }
      i10.clip(n2), s10?.clip(h2);
    } else if (n2 && !n2.hasClass("highcharts-animating")) {
      let t12 = e10.getClipBox(this), i11 = r2.step;
      (s10?.element.childNodes.length || e10.series.length > 1) && (r2.step = function(t13, e11) {
        i11 && i11.apply(e11, arguments), "width" === e11.prop && h2?.element && h2.attr(o2 ? "height" : "width", t13 + 99);
      }), n2.addClass("highcharts-animating").animate(t12, r2);
    }
  }
  afterAnimate() {
    this.setClip(), tf(this.chart.sharedClips, (t11, e10, i10) => {
      t11 && !this.chart.container.querySelector(`[clip-path="url(#${t11.id})"]`) && (t11.destroy(), delete i10[e10]);
    }), this.finishedAnimating = true, J(this, "afterAnimate");
  }
  drawPoints(t11 = this.points) {
    let e10, i10, s10, o2, r2, a2, n2, h2 = this.chart, l2 = h2.styledMode, { colorAxis: d2, options: c2 } = this, p2 = c2.marker, g2 = c2.nullInteraction, u2 = this[this.specialGroup || "markerGroup"], f2 = this.xAxis, m2 = ty(p2.enabled, !f2 || !!f2.isRadial || null, this.closestPointRangePx >= p2.enabledThreshold * p2.radius);
    if (false !== p2.enabled || this._hasPointMarkers) for (e10 = 0; e10 < t11.length; e10++) {
      o2 = (s10 = (i10 = t11[e10]).graphic) ? "animate" : "attr", r2 = i10.marker || {}, a2 = !!i10.marker;
      let c3 = i10.isNull;
      if ((m2 && !$(r2.enabled) || r2.enabled) && (!c3 || g2) && false !== i10.visible) {
        let t12 = ty(r2.symbol, this.symbol, "rect");
        n2 = this.markerAttribs(i10, i10.selected && "select"), this.enabledDataSorting && (i10.startXPos = f2.reversed ? -(n2.width || 0) : f2.width);
        let e11 = false !== i10.isInside;
        if (!s10 && e11 && ((n2.width || 0) > 0 || i10.hasImage) && (i10.graphic = s10 = h2.renderer.symbol(t12, n2.x, n2.y, n2.width, n2.height, a2 ? r2 : p2).add(u2), this.enabledDataSorting && h2.hasRendered && (s10.attr({ x: i10.startXPos }), o2 = "animate")), s10 && "animate" === o2 && s10[e11 ? "show" : "hide"](e11).animate(n2), s10) {
          let t13 = this.pointAttribs(i10, l2 || !i10.selected ? void 0 : "select");
          l2 ? d2 && s10.css({ fill: t13.fill }) : s10[o2](t13);
        }
        s10 && s10.addClass(i10.getClassName(), true);
      } else s10 && (i10.graphic = s10.destroy());
    }
  }
  markerAttribs(t11, e10) {
    let i10 = this.options, s10 = i10.marker, o2 = t11.marker || {}, r2 = o2.symbol || s10.symbol, a2 = {}, n2, h2, l2 = ty(o2.radius, s10?.radius);
    e10 && (n2 = s10?.states?.[e10], h2 = o2.states?.[e10], l2 = ty(h2?.radius, n2?.radius, l2 && l2 + (n2?.radiusPlus || 0))), t11.hasImage = r2 && 0 === r2.indexOf("url"), t11.hasImage && (l2 = 0);
    let d2 = t11.pos();
    return th(l2) && d2 && (i10.crisp && (d2[0] = Y(d2[0], t11.hasImage ? 0 : "rect" === r2 ? s10?.lineWidth || 0 : 1)), a2.x = d2[0] - l2, a2.y = d2[1] - l2), l2 && (a2.width = a2.height = 2 * l2), a2;
  }
  pointAttribs(t11, e10) {
    let i10 = this.options, s10 = i10.marker, o2 = t11?.options, r2 = o2?.marker || {}, a2 = o2?.color, n2 = t11?.color, h2 = t11?.zone?.color, l2, d2, c2 = this.color, p2, g2, u2 = ty(r2.lineWidth, s10.lineWidth), f2 = t11?.isNull && i10.nullInteraction ? 0 : 1;
    return c2 = a2 || h2 || n2 || c2, p2 = r2.fillColor || s10.fillColor || c2, g2 = r2.lineColor || s10.lineColor || c2, e10 = e10 || "normal", l2 = s10.states[e10] || {}, u2 = ty((d2 = r2.states && r2.states[e10] || {}).lineWidth, l2.lineWidth, u2 + ty(d2.lineWidthPlus, l2.lineWidthPlus, 0)), p2 = d2.fillColor || l2.fillColor || p2, g2 = d2.lineColor || l2.lineColor || g2, { stroke: g2, "stroke-width": u2, fill: p2, opacity: f2 = ty(d2.opacity, l2.opacity, f2) };
  }
  destroy(t11) {
    let e10, i10, s10 = this, o2 = s10.chart, r2 = /AppleWebKit\/533/.test(iN.navigator.userAgent), a2 = s10.data || [];
    for (J(s10, "destroy", { keepEventsForUpdate: t11 }), this.removeEvents(t11), (s10.axisTypes || []).forEach(function(t12) {
      i10 = s10[t12], i10?.series && (_(i10.series, s10), i10.isDirty = i10.forceRedraw = true);
    }), s10.legendItem && s10.chart.legend.destroyItem(s10), e10 = a2.length; e10--; ) a2[e10]?.destroy?.();
    for (let t12 of s10.zones) V(t12, void 0, true);
    tr(s10.animationTimeout), tf(s10, function(t12, e11) {
      t12 instanceof ef && !t12.survive && t12[r2 && "group" === e11 ? "hide" : "destroy"]();
    }), o2.hoverSeries === s10 && (o2.hoverSeries = void 0), _(o2.series, s10), o2.orderItems("series"), tf(s10, function(e11, i11) {
      t11 && "hcEvents" === i11 || delete s10[i11];
    });
  }
  applyZones() {
    let { area: t11, chart: e10, graph: i10, zones: s10, points: o2, xAxis: r2, yAxis: a2, zoneAxis: n2 } = this, { inverted: h2, renderer: l2 } = e10, d2 = this[`${n2}Axis`], { isXAxis: c2, len: p2 = 0, minPointOffset: g2 = 0 } = d2 || {}, u2 = (i10?.strokeWidth() || 0) / 2 + 1, f2 = (t12, e11 = 0, i11 = 0) => {
      h2 && (i11 = p2 - i11);
      let { translated: s11 = 0, lineClip: o3 } = t12, r3 = i11 - s11;
      o3?.push(["L", e11, Math.abs(r3) < u2 ? i11 - u2 * (r3 <= 0 ? -1 : 1) : s11]);
    };
    if (s10.length && (i10 || t11) && d2 && th(d2.min)) {
      let e11 = d2.getExtremes().max + g2, u3 = (t12) => {
        t12.forEach((e12, i11) => {
          ("M" === e12[0] || "L" === e12[0]) && (t12[i11] = [e12[0], c2 ? p2 - e12[1] : e12[1], c2 ? e12[2] : p2 - e12[2]]);
        });
      };
      if (s10.forEach((t12) => {
        t12.lineClip = [], t12.translated = G(d2.toPixels(ty(t12.value, e11), true) || 0, 0, p2);
      }), i10 && !this.showLine && i10.hide(), t11 && t11.hide(), "y" === n2 && o2.length < r2.len) for (let t12 of o2) {
        let { plotX: e12, plotY: i11, zone: o3 } = t12, r3 = o3 && s10[s10.indexOf(o3) - 1];
        o3 && f2(o3, e12, i11), r3 && f2(r3, e12, i11);
      }
      let m2 = [], x2 = d2.toPixels(d2.getExtremes().min - g2, true);
      s10.forEach((e12) => {
        let s11 = e12.lineClip || [], o3 = Math.round(e12.translated || 0);
        r2.reversed && s11.reverse();
        let { clip: n3, simpleClip: d3 } = e12, p3 = 0, g3 = 0, f3 = r2.len, y2 = a2.len;
        c2 ? (p3 = o3, f3 = x2) : (g3 = o3, y2 = x2);
        let b2 = [["M", p3, g3], ["L", f3, g3], ["L", f3, y2], ["L", p3, y2], ["Z"]], v2 = [b2[0], ...s11, b2[1], b2[2], ...m2, b2[3], b2[4]];
        m2 = s11.reverse(), x2 = o3, h2 && (u3(v2), t11 && u3(b2)), n3 ? (n3.animate({ d: v2 }), d3?.animate({ d: b2 })) : (n3 = e12.clip = l2.path(v2), t11 && (d3 = e12.simpleClip = l2.path(b2))), i10 && e12.graph?.clip(n3), t11 && e12.area?.clip(d3);
      });
    } else this.visible && (i10 && i10.show(), t11 && t11.show());
  }
  plotGroup(t11, e10, i10, s10, o2) {
    let r2 = this[t11], a2 = !r2, n2 = { visibility: i10, zIndex: s10 || 0.1 };
    return $(this.opacity) && !this.chart.styledMode && "inactive" !== this.state && (n2.opacity = this.opacity), r2 || (this[t11] = r2 = this.chart.renderer.g().add(o2)), r2.addClass("highcharts-" + e10 + " highcharts-series-" + this.index + " highcharts-" + this.type + "-series " + ($(this.colorIndex) ? "highcharts-color-" + this.colorIndex + " " : "") + (this.options.className || "") + (r2.hasClass("highcharts-tracker") ? " highcharts-tracker" : ""), true), r2.attr(n2)[a2 ? "attr" : "animate"](this.getPlotBox(e10)), r2;
  }
  getPlotBox(t11) {
    let e10 = this.xAxis, i10 = this.yAxis, s10 = this.chart, o2 = s10.inverted && !s10.polar && e10 && this.invertible && "series" === t11;
    s10.inverted && (e10 = i10, i10 = this.xAxis);
    let r2 = { scale: 1, translateX: e10 ? e10.left : s10.plotLeft, translateY: i10 ? i10.top : s10.plotTop, name: t11 };
    J(this, "getPlotBox", r2);
    let { scale: a2, translateX: n2, translateY: h2 } = r2;
    return { translateX: n2, translateY: h2, rotation: 90 * !!o2, rotationOriginX: o2 ? a2 * (e10.len - i10.len) / 2 : 0, rotationOriginY: o2 ? a2 * (e10.len + i10.len) / 2 : 0, scaleX: o2 ? -a2 : a2, scaleY: a2 };
  }
  removeEvents(t11) {
    let { eventsToUnbind: e10 } = this;
    t11 || tM(this), e10.length && (e10.forEach((t12) => {
      t12();
    }), e10.length = 0);
  }
  render() {
    let t11 = this, { chart: e10, options: i10, hasRendered: s10 } = t11, o2 = iO(i10.animation), r2 = t11.visible ? "inherit" : "hidden", a2 = i10.zIndex, n2 = e10.seriesGroup, h2 = t11.finishedAnimating ? 0 : o2.duration;
    J(this, "render"), t11.plotGroup("group", "series", r2, a2, n2), t11.markerGroup = t11.plotGroup("markerGroup", "markers", r2, a2, n2), false !== i10.clip && t11.setClip(), h2 && t11.animate?.(true), t11.drawGraph && (t11.drawGraph(), t11.applyZones()), t11.visible && t11.drawPoints(), t11.drawDataLabels?.(), t11.redrawPoints?.(), i10.enableMouseTracking && t11.drawTracker?.(), h2 && t11.animate?.(), s10 || (h2 && o2.defer && (h2 += o2.defer), t11.animationTimeout = tC(() => {
      t11.afterAnimate();
    }, h2 || 0)), t11.isDirty = false, t11.hasRendered = true, J(t11, "afterRender");
  }
  redraw() {
    let t11 = this.isDirty || this.isDirtyData;
    this.translate(), this.render(), t11 && delete this.kdTree;
  }
  reserveSpace() {
    return this.visible || !this.chart.options.chart.ignoreHiddenSeries;
  }
  searchPoint(t11, e10) {
    let { xAxis: i10, yAxis: s10 } = this, o2 = this.chart.inverted;
    return this.searchKDTree({ clientX: o2 ? i10.len - t11.chartY + i10.pos : t11.chartX - i10.pos, plotY: o2 ? s10.len - t11.chartX + s10.pos : t11.chartY - s10.pos }, e10, t11);
  }
  buildKDTree(t11) {
    this.buildingKdTree = true;
    let e10 = this, i10 = e10.options, s10 = i10.findNearestPointBy.indexOf("y") > -1 ? 2 : 1;
    delete e10.kdTree, tC(function() {
      e10.kdTree = (function t12(i11, s11, o2) {
        let r2, a2, n2 = i11?.length;
        if (n2) return r2 = e10.kdAxisArray[s11 % o2], i11.sort((t13, e11) => (t13[r2] || 0) - (e11[r2] || 0)), { point: i11[a2 = Math.floor(n2 / 2)], left: t12(i11.slice(0, a2), s11 + 1, o2), right: t12(i11.slice(a2 + 1), s11 + 1, o2) };
      })(e10.getValidPoints(void 0, !e10.directTouch, i10?.nullInteraction), s10, s10), e10.buildingKdTree = false;
    }, i10.kdNow || t11?.type === "touchstart" ? 0 : 1);
  }
  searchKDTree(t11, e10, i10, s10, o2) {
    let r2 = this, [a2, n2] = this.kdAxisArray, h2 = e10 ? "distX" : "dist", l2 = (r2.options.findNearestPointBy || "").indexOf("y") > -1 ? 2 : 1, d2 = !!r2.isBubble, c2 = s10 || ((t12, e11, i11) => {
      let s11 = t12[i11] || 0, o3 = e11[i11] || 0;
      return [s11 === o3 && t12.index > e11.index || s11 < o3 ? t12 : e11, false];
    }), p2 = o2 || ((t12, e11) => t12 < e11);
    if (this.kdTree || this.buildingKdTree || this.buildKDTree(i10), this.kdTree) return (function t12(e11, i11, s11, o3) {
      let l3, g2, u2, f2, m2, x2, y2, b2 = i11.point, v2 = r2.kdAxisArray[s11 % o3], k2 = b2, w2 = false;
      l3 = e11[a2], g2 = b2[a2], u2 = $(l3) && $(g2) ? l3 - g2 : null, f2 = e11[n2], m2 = b2[n2], x2 = $(f2) && $(m2) ? f2 - m2 : 0, y2 = d2 && b2.marker?.radius || 0, b2.dist = Math.sqrt((u2 && u2 * u2 || 0) + x2 * x2) - y2, b2.distX = $(u2) ? Math.abs(u2) - y2 : Number.MAX_VALUE;
      let M2 = (e11[v2] || 0) - (b2[v2] || 0) + (d2 && b2.marker?.radius || 0), S2 = M2 < 0 ? "left" : "right", T2 = M2 < 0 ? "right" : "left";
      return i11[S2] && ([k2, w2] = c2(b2, t12(e11, i11[S2], s11 + 1, o3), h2)), i11[T2] && p2(Math.sqrt(M2 * M2), k2[h2], w2) && (k2 = c2(k2, t12(e11, i11[T2], s11 + 1, o3), h2)[0]), k2;
    })(t11, this.kdTree, l2, l2);
  }
  pointPlacementToXValue() {
    let { options: t11, xAxis: e10 } = this, i10 = t11.pointPlacement;
    return "between" === i10 && (i10 = e10.reversed ? -0.5 : 0.5), th(i10) ? i10 * (t11.pointRange || e10.pointRange) : 0;
  }
  isPointInside(t11) {
    let { chart: e10, xAxis: i10, yAxis: s10 } = this, { plotX: o2 = -1, plotY: r2 = -1 } = t11;
    return r2 >= 0 && r2 <= (s10 ? s10.len : e10.plotHeight) && o2 >= 0 && o2 <= (i10 ? i10.len : e10.plotWidth);
  }
  drawTracker() {
    let t11 = this, e10 = t11.options, i10 = e10.trackByArea, s10 = [].concat((i10 ? t11.areaPath : t11.graphPath) || []), o2 = t11.chart, r2 = o2.pointer, a2 = o2.renderer, n2 = o2.options.tooltip?.snap || 0, h2 = () => {
      e10.enableMouseTracking && o2.hoverSeries !== t11 && t11.onMouseOver();
    }, l2 = "rgba(192,192,192," + (iB ? 1e-4 : 2e-3) + ")", d2 = t11.tracker;
    d2 ? d2.attr({ d: s10 }) : t11.graph && (t11.tracker = d2 = a2.path(s10).attr({ visibility: t11.visible ? "inherit" : "hidden", zIndex: 2 }).addClass(i10 ? "highcharts-tracker-area" : "highcharts-tracker-line").add(t11.group), o2.styledMode || d2.attr({ "stroke-linecap": "round", "stroke-linejoin": "round", stroke: l2, fill: i10 ? l2 : "none", "stroke-width": t11.graph.strokeWidth() + (i10 ? 0 : 2 * n2) }), [t11.tracker, t11.markerGroup, ...t11.dataLabelsGroups || []].forEach((t12) => {
      t12 && (t12.addClass("highcharts-tracker").on("mouseover", h2).on("mouseout", (t13) => {
        r2?.onTrackerMouseOut(t13);
      }), e10.cursor && !o2.styledMode && t12.css({ cursor: e10.cursor }), t12.on("touchstart", h2));
    })), J(this, "afterDrawTracker");
  }
  addPoint(t11, e10, i10, s10, o2) {
    let r2, a2, n2 = this.options, { chart: h2, data: l2, dataTable: d2, xAxis: c2 } = this, p2 = c2?.hasNames && c2.names, g2 = n2.data, u2 = this.getColumn("x");
    e10 = ty(e10, true);
    let f2 = { series: this };
    this.pointClass.prototype.applyOptions.apply(f2, [t11]);
    let m2 = f2.x;
    if (a2 = u2.length, this.requireSorting && m2 < u2[a2 - 1]) for (r2 = true; a2 && u2[a2 - 1] > m2; ) a2--;
    d2.setRow(f2, a2, true, { addColumns: false }), p2 && f2.name && (p2[m2] = f2.name), g2?.splice(a2, 0, t11), (r2 || this.processedData) && (this.data.splice(a2, 0, null), this.processData()), "point" === n2.legendType && this.generatePoints(), i10 && (l2[0] && l2[0].remove ? l2[0].remove(false) : ([l2, g2].filter($).forEach((t12) => {
      t12.shift();
    }), d2.deleteRows(0))), false !== o2 && J(this, "addPoint", { point: f2 }), this.isDirty = true, this.isDirtyData = true, e10 && h2.redraw(s10);
  }
  removePoint(t11, e10, i10) {
    let s10 = this, { chart: o2, data: r2, points: a2, dataTable: n2 } = s10, h2 = r2[t11], l2 = function() {
      [a2?.length === r2.length ? a2 : void 0, r2, s10.options.data].filter($).forEach((e11) => {
        e11.splice(t11, 1);
      }), n2.deleteRows(t11), h2?.destroy(), s10.isDirty = true, s10.isDirtyData = true, e10 && o2.redraw();
    };
    iE(i10, o2), e10 = ty(e10, true), h2 ? h2.firePointEvent("remove", null, l2) : l2();
  }
  remove(t11, e10, i10, s10) {
    let o2 = this, r2 = o2.chart;
    function a2() {
      o2.destroy(s10), r2.isDirtyLegend = r2.isDirtyBox = true, r2.linkSeries(s10), ty(t11, true) && r2.redraw(e10);
    }
    false !== i10 ? J(o2, "remove", null, a2) : a2();
  }
  update(t11, e10) {
    J(this, "update", { options: t11 = Z(t11, this.userOptions) });
    let i10 = this, s10 = i10.chart, o2 = i10.userOptions, r2 = i10.initialType || i10.type, a2 = s10.options.plotOptions, n2 = iz[r2].prototype, h2 = i10.finishedAnimating && { animation: false }, l2 = {}, d2, c2, p2 = _iW.keepProps.slice(), g2 = t11.type || o2.type || s10.options.chart.type, u2 = !(this.hasDerivedData || g2 && g2 !== this.type || void 0 !== t11.keys || void 0 !== t11.pointStart || void 0 !== t11.pointInterval || void 0 !== t11.relativeXValue || t11.joinBy || t11.mapData || ["dataGrouping", "pointStart", "pointInterval", "pointIntervalUnit", "keys"].some((t12) => i10.hasOptionChanged(t12)));
    g2 = g2 || r2, u2 ? (p2.push.apply(p2, _iW.keepPropsForPoints), false !== t11.visible && p2.push("area", "graph"), i10.parallelArrays.forEach(function(t12) {
      p2.push(t12 + "Data");
    }), t11.data && (t11.dataSorting && K(i10.options.dataSorting, t11.dataSorting), this.setData(t11.data, false))) : this.dataTable.modified = this.dataTable, t11.dataLabels && o2.dataLabels && (t11.dataLabels = this.mergeArrays(o2.dataLabels, t11.dataLabels)), t11 = tg(o2, { index: void 0 === o2.index ? i10.index : o2.index, pointStart: a2?.series?.pointStart ?? o2.pointStart ?? i10.getColumn("x")[0] }, !u2 && { data: i10.options.data }, t11, h2), u2 && t11.data && (t11.data = i10.options.data), (p2 = ["dataLabelsGroup", "dataLabelsGroups", "dataLabelsParentGroups", "group", "markerGroup", "transformGroup"].concat(p2)).forEach(function(t12) {
      p2[t12] = i10[t12], delete i10[t12];
    });
    let f2 = false;
    if (iz[g2]) {
      if (f2 = g2 !== i10.type, i10.remove(false, false, false, true), f2) if (s10.propFromSeries(), Object.setPrototypeOf) Object.setPrototypeOf(i10, iz[g2].prototype);
      else {
        let t12 = Object.hasOwnProperty.call(i10, "hcEvents") && i10.hcEvents;
        for (c2 in n2) i10[c2] = void 0;
        K(i10, iz[g2].prototype), t12 ? i10.hcEvents = t12 : delete i10.hcEvents;
      }
    } else tO(17, true, s10, { missingModuleFor: g2 });
    if (p2.forEach(function(t12) {
      i10[t12] = p2[t12];
    }), i10.init(s10, t11), u2 && this.points) for (let t12 of (false === (d2 = i10.options).visible ? (l2.graphic = 1, l2.dataLabel = 1) : (this.hasMarkerChanged(d2, o2) && (l2.graphic = 1), i10.hasDataLabels?.() || (l2.dataLabel = 1)), this.points)) t12?.series && (t12.resolveColor(), Object.keys(l2).length && t12.destroyElements(l2), false === d2.showInLegend && t12.legendItem && s10.legend.destroyItem(t12));
    i10.initialType = r2, s10.linkSeries(), s10.setSortedData(), f2 && i10.linkedSeries.length && (i10.isDirtyData = true), J(this, "afterUpdate"), ty(e10, true) && s10.redraw(!!u2 && void 0);
  }
  setName(t11) {
    this.name = this.options.name = this.userOptions.name = t11, this.chart.isDirtyLegend = true;
  }
  hasOptionChanged(t11) {
    let e10 = this.chart, i10 = this.options[t11], s10 = e10.options.plotOptions, o2 = this.userOptions[t11], r2 = ty(s10?.[this.type]?.[t11], s10?.series?.[t11]);
    return o2 && !$(r2) ? i10 !== o2 : i10 !== ty(r2, i10);
  }
  onMouseOver() {
    let t11 = this.chart, e10 = t11.hoverSeries, i10 = t11.pointer;
    i10?.setHoverChartIndex(), e10 && e10 !== this && e10.onMouseOut(), this.options.events.mouseOver && J(this, "mouseOver"), this.setState("hover"), t11.hoverSeries = this;
  }
  onMouseOut() {
    let t11 = this.options, e10 = this.chart, i10 = e10.tooltip, s10 = e10.hoverPoint;
    e10.hoverSeries = null, s10 && s10.onMouseOut(), this && t11.events.mouseOut && J(this, "mouseOut"), i10 && !this.stickyTracking && (!i10.shared || this.noSharedTooltip) && i10.hide(), e10.series.forEach(function(t12) {
      t12.setState("", true);
    });
  }
  setState(t11, e10) {
    let i10 = this, { graph: s10, options: o2 } = i10, { inactiveOtherPoints: r2, states: a2 } = o2, n2 = ty(a2?.[t11 || "normal"]?.animation, i10.chart.options.chart.animation), { lineWidth: h2, opacity: l2 } = o2;
    if (t11 = t11 || "", i10.state !== t11 && ([i10.group, i10.markerGroup, ...i10.dataLabelsGroups || []].forEach(function(e11) {
      e11 && (i10.state && e11.removeClass("highcharts-series-" + i10.state), t11 && e11.addClass("highcharts-series-" + t11));
    }), i10.state = t11, !i10.chart.styledMode)) {
      if (a2[t11]?.enabled === false) return;
      if (t11 && (h2 = a2[t11].lineWidth || h2 + (a2[t11].lineWidthPlus || 0), l2 = ty(a2[t11].opacity, l2)), s10 && !s10.dashstyle && th(h2)) for (let t12 of [s10, ...this.zones.map((t13) => t13.graph)]) t12?.animate({ "stroke-width": h2 }, n2);
      r2 || [i10.group, i10.markerGroup, ...i10.dataLabelsGroups || [], i10.labelBySeries].forEach(function(t12) {
        t12?.animate({ opacity: l2 }, n2);
      });
    }
    e10 && r2 && i10.points && i10.setAllPointsToState(t11 || void 0);
  }
  setAllPointsToState(t11) {
    this.points.forEach(function(e10) {
      e10.setState && e10.setState(t11);
    });
  }
  setVisible(t11, e10) {
    let i10 = this, s10 = i10.chart, o2 = s10.options.chart.ignoreHiddenSeries, r2 = i10.visible;
    i10.visible = t11 = i10.options.visible = i10.userOptions.visible = void 0 === t11 ? !r2 : t11;
    let a2 = t11 ? "show" : "hide";
    ["group", "markerGroup", "tracker", "tt"].forEach((t12) => {
      i10[t12]?.[a2]();
    }), i10.dataLabelsGroups?.forEach((t12) => {
      t12?.[a2]();
    }), (s10.hoverSeries === i10 || s10.hoverPoint?.series === i10) && i10.onMouseOut(), i10.legendItem && s10.legend.colorizeItem(i10, t11), i10.isDirty = true, i10.options.stacking && s10.series.forEach((t12) => {
      t12.options.stacking && t12.visible && (t12.isDirty = true);
    }), i10.linkedSeries.forEach((e11) => {
      e11.setVisible(t11, false);
    }), o2 && (s10.isDirtyBox = true), J(i10, a2), false !== e10 && s10.redraw();
  }
  show() {
    this.setVisible(true);
  }
  hide() {
    this.setVisible(false);
  }
  select(t11) {
    this.selected = t11 = this.options.selected = void 0 === t11 ? !this.selected : t11, this.checkbox && (this.checkbox.checked = t11), J(this, t11 ? "select" : "unselect");
  }
  shouldShowTooltip(t11, e10, i10 = {}) {
    return i10.series = this, i10.visiblePlotOnly = true, this.chart.isInsidePlot(t11, e10, i10);
  }
  drawLegendSymbol(t11, e10) {
    let i10 = this.chart.renderer, s10 = this.options.legendSymbol || "rectangle", o2 = e10.legendItem || {}, { options: r2, symbolHeight: a2, symbolWidth: n2 } = t11, h2 = r2.squareSymbol, l2 = h2 ? a2 : n2, d2 = h2 ? (n2 - a2) / 2 : 0, c2 = (t11.baseline || 0) - a2 + 1, p2 = r2.symbolRadius ?? a2, g2 = "rectangle" === s10 ? i10.rect(d2, c2, l2, a2, p2) : i10.symbols[s10] && i10.symbol(s10, d2, c2, l2, a2, { r: p2 });
    g2 ? o2.symbol = g2.addClass("highcharts-point").attr({ zIndex: 3 }).add(o2.group) : iT[s10]?.call(this, t11, e10);
  }
};
iW.defaultOptions = { lineWidth: 2, allowPointSelect: false, crisp: true, showCheckbox: false, animation: { duration: 1e3 }, enableMouseTracking: true, events: {}, marker: { enabledThreshold: 2, lineColor: "#ffffff", lineWidth: 0, radius: 4, states: { normal: { animation: true }, hover: { animation: { duration: 150 }, enabled: true, radiusPlus: 2, lineWidthPlus: 1 }, select: { fillColor: "#cccccc", lineColor: "#000000", lineWidth: 2 } } }, point: { events: {} }, dataLabels: { animation: {}, align: "center", borderWidth: 0, defer: true, formatter: function() {
  let { numberFormatter: t11 } = this.series.chart;
  return "number" != typeof this.y ? "" : t11(this.y, -1);
}, padding: 5, style: { fontSize: "0.7em", fontWeight: "bold", color: "contrast", textOutline: "1px contrast" }, verticalAlign: "bottom", x: 0, y: 0 }, cropThreshold: 300, opacity: 1, pointRange: 0, softThreshold: true, states: { normal: { animation: true }, hover: { animation: { duration: 150 }, lineWidthPlus: 1, marker: {}, halo: { size: 10, opacity: 0.25 } }, select: { animation: { duration: 0 } }, inactive: { animation: { duration: 150 }, opacity: 0.2 } }, stickyTracking: true, turboThreshold: 1e3, findNearestPointBy: "x" }, iW.types = iL.seriesTypes, iW.registerType = iL.registerSeriesType, iW.keepProps = ["colorIndex", "eventOptions", "navigatorSeries", "symbolIndex", "baseSeries"], iW.keepPropsForPoints = ["data", "isDirtyData", "isDirtyCanvas", "points", "dataTable", "processedData", "xIncrement", "cropped", "_hasPointMarkers", "hasDataLabels", "nodes", "layout", "level", "mapMap", "mapData", "minY", "maxY", "minX", "maxX", "transformGroups"], K(iW.prototype, { axisTypes: ["xAxis", "yAxis"], coll: "series", colorCounter: 0, directTouch: false, invertible: true, isCartesian: true, kdAxisArray: ["clientX", "plotY"], parallelArrays: ["x", "y"], pointClass: ic, requireSorting: true, sorted: true }), iL.series = iW;
var iX = iW;
var { animObject: iG, setAnimation: iH } = tJ;
var { registerEventOptions: iF } = e$;
var { composed: iY, marginNames: ij } = D;
var { distribute: i$ } = eo;
var { format: iV } = ei;
var iU = class {
  constructor(t11, e10) {
    this.allItems = [], this.initialItemY = 0, this.itemHeight = 0, this.itemMarginBottom = 0, this.itemMarginTop = 0, this.itemX = 0, this.itemY = 0, this.lastItemY = 0, this.lastLineHeight = 0, this.legendHeight = 0, this.legendWidth = 0, this.maxItemWidth = 0, this.maxLegendWidth = 0, this.offsetWidth = 0, this.padding = 0, this.pages = [], this.symbolHeight = 0, this.symbolWidth = 0, this.titleHeight = 0, this.totalItemWidth = 0, this.widthOption = 0, this.chart = t11, this.setOptions(e10), e10.enabled && (this.render(), iF(this, e10), z(this.chart, "endResize", function() {
      this.legend.positionCheckboxes();
    })), z(this.chart, "render", () => {
      this.options.enabled && this.proximate && (this.proximatePositions(), this.positionItems());
    });
  }
  setOptions(t11) {
    let e10 = ty(t11.padding, 8);
    this.options = t11, this.chart.styledMode || (this.itemStyle = t11.itemStyle, this.itemHiddenStyle = tg(this.itemStyle, t11.itemHiddenStyle)), this.itemMarginTop = t11.itemMarginTop, this.itemMarginBottom = t11.itemMarginBottom, this.padding = e10, this.initialItemY = e10 - 5, this.symbolWidth = ty(t11.symbolWidth, 16), this.pages = [], this.proximate = "proximate" === t11.layout && !this.chart.inverted, this.baseline = void 0;
  }
  update(t11, e10) {
    let i10 = this.chart;
    this.setOptions(tg(true, this.options, t11)), "events" in this.options && iF(this, this.options), this.destroy(), i10.isDirtyLegend = i10.isDirtyBox = true, ty(e10, true) && i10.redraw(), J(this, "afterUpdate", { redraw: e10 });
  }
  colorizeItem(t11, e10) {
    let i10 = t11.color, { area: s10, group: o2, label: r2, line: a2, symbol: n2 } = t11.legendItem || {};
    if ((t11 instanceof iX || t11 instanceof ic) && (t11.color = t11.options?.legendSymbolColor || i10), o2?.[e10 ? "removeClass" : "addClass"]("highcharts-legend-item-hidden"), !this.chart.styledMode) {
      let { itemHiddenStyle: i11 = {} } = this, o3 = i11.color, { fillColor: h2, fillOpacity: l2, lineColor: d2, marker: c2 } = t11.options, p2 = (t12) => (!e10 && (t12.fill && (t12.fill = o3), t12.stroke && (t12.stroke = o3)), t12);
      r2?.css(tg(e10 ? this.itemStyle : i11)), a2?.attr(p2({ stroke: d2 || t11.color })), n2 && n2.attr(p2(c2 && n2.isMarker ? t11.pointAttribs() : { fill: t11.color })), s10?.attr(p2({ fill: h2 || t11.color, "fill-opacity": h2 ? 1 : l2 ?? 0.75 }));
    }
    t11.color = i10, J(this, "afterColorizeItem", { item: t11, visible: e10 });
  }
  positionItems() {
    this.allItems.forEach(this.positionItem, this), this.chart.isResizing || this.positionCheckboxes();
  }
  positionItem(t11) {
    let { group: e10, x: i10 = 0, y: s10 = 0 } = t11.legendItem || {}, o2 = this.options, r2 = o2.symbolPadding, a2 = !o2.rtl, n2 = t11.checkbox;
    if (e10?.element) {
      let o3 = { translateX: a2 ? i10 : this.legendWidth - i10 - 2 * r2 - 4, translateY: s10 }, n3 = () => {
        J(this, "afterPositionItem", { item: t11 });
      };
      e10[$(e10.translateY) ? "animate" : "attr"](o3, void 0, n3);
    }
    n2 && (n2.x = i10, n2.y = s10);
  }
  destroyItem(t11) {
    let e10 = t11.legendItem || {};
    for (let t12 of ["group", "label", "line", "symbol"]) e10[t12] && (e10[t12] = e10[t12].destroy());
    t11.checkbox = U(t11.checkbox), t11.legendItem = void 0;
  }
  destroy() {
    for (let t11 of this.getAllItems()) this.destroyItem(t11);
    for (let t11 of ["clipRect", "up", "down", "pager", "nav", "box", "title", "group"]) this[t11] && (this[t11] = this[t11].destroy());
    this.display = null;
  }
  positionCheckboxes() {
    let t11, e10 = this.group?.alignAttr, i10 = this.clipHeight || this.legendHeight, s10 = this.titleHeight;
    e10 && (t11 = e10.translateY, this.allItems.forEach(function(o2) {
      let r2, a2 = o2.checkbox;
      a2 && (r2 = t11 + s10 + a2.y + (this.scrollOffset || 0) + 3, j(a2, { left: e10.translateX + o2.checkboxOffset + a2.x - 20 + "px", top: r2 + "px", display: this.proximate || r2 > t11 - 6 && r2 < t11 + i10 - 6 ? "" : "none" }));
    }, this));
  }
  renderTitle() {
    let t11 = this.options, e10 = this.padding, i10 = t11.title, s10, o2 = 0;
    i10.text && (this.title || (this.title = this.chart.renderer.label(i10.text, e10 - 3, e10 - 4, void 0, void 0, void 0, t11.useHTML, void 0, "legend-title").attr({ zIndex: 1 }), this.chart.styledMode || this.title.css(i10.style), this.title.add(this.group)), i10.width || this.title.css({ width: this.maxLegendWidth + "px" }), o2 = (s10 = this.title.getBBox()).height, this.offsetWidth = s10.width, this.contentGroup.attr({ translateY: o2 })), this.titleHeight = o2;
  }
  setText(t11) {
    let e10 = this.options;
    t11.legendItem.label.attr({ text: e10.labelFormat ? iV(e10.labelFormat, t11, this.chart) : e10.labelFormatter.call(t11, t11) });
  }
  renderItem(t11) {
    let e10 = t11.legendItem = t11.legendItem || {}, i10 = this.chart, s10 = i10.renderer, o2 = this.options, r2 = "horizontal" === o2.layout, a2 = this.symbolWidth, n2 = o2.symbolPadding || 0, h2 = this.itemStyle, l2 = this.itemHiddenStyle, d2 = r2 ? ty(o2.itemDistance, 20) : 0, c2 = !o2.rtl, p2 = !t11.series, g2 = !p2 && t11.series.drawLegendSymbol ? t11.series : t11, u2 = g2.options, f2 = !!this.createCheckboxForItem && u2 && u2.showCheckbox, m2 = o2.useHTML, x2 = t11.options.className, y2 = e10.label, b2 = a2 + n2 + d2 + 20 * !!f2;
    !y2 && (e10.group = s10.g("legend-item").addClass("highcharts-" + g2.type + "-series highcharts-color-" + t11.colorIndex + (x2 ? " " + x2 : "") + (p2 ? " highcharts-series-" + t11.index : "")).attr({ zIndex: 1 }).add(this.scrollGroup), e10.label = y2 = s10.text("", c2 ? a2 + n2 : -n2, this.baseline || 0, m2), i10.styledMode || y2.css(tg(t11.visible ? h2 : l2)), y2.attr({ align: c2 ? "left" : "right", zIndex: 2 }).add(e10.group), !this.baseline && (this.fontMetrics = s10.fontMetrics(y2), this.baseline = this.fontMetrics.f + 3 + this.itemMarginTop, y2.attr("y", this.baseline), this.symbolHeight = ty(o2.symbolHeight, this.fontMetrics.f), o2.squareSymbol && (this.symbolWidth = ty(o2.symbolWidth, Math.max(this.symbolHeight, 16)), b2 = this.symbolWidth + n2 + d2 + 20 * !!f2, c2 && y2.attr("x", this.symbolWidth + n2))), g2.drawLegendSymbol(this, t11), this.setItemEvents && this.setItemEvents(t11, y2, m2)), f2 && !t11.checkbox && this.createCheckboxForItem && this.createCheckboxForItem(t11), this.colorizeItem(t11, t11.visible), (i10.styledMode || !h2.width) && y2.css({ width: Math.min(o2.itemWidth || this.widthOption || i10.spacingBox.width, o2.maxWidth ? tk(o2.maxWidth, i10.chartWidth) : 1 / 0) - b2 + "px" }), this.setText(t11);
    let v2 = y2.getBBox(), k2 = this.fontMetrics?.h || 0;
    t11.itemWidth = t11.checkboxOffset = o2.itemWidth || e10.labelWidth || v2.width + b2, this.maxItemWidth = Math.max(this.maxItemWidth, t11.itemWidth), this.totalItemWidth += t11.itemWidth, this.itemHeight = t11.itemHeight = Math.round(e10.labelHeight || (v2.height > 1.5 * k2 ? v2.height : k2));
  }
  layoutItem(t11) {
    let e10 = this.options, i10 = this.padding, s10 = "horizontal" === e10.layout, o2 = t11.itemHeight, r2 = this.itemMarginBottom, a2 = this.itemMarginTop, n2 = s10 ? ty(e10.itemDistance, 20) : 0, h2 = this.maxLegendWidth, l2 = e10.alignColumns && this.totalItemWidth > h2 ? this.maxItemWidth : t11.itemWidth, d2 = t11.legendItem || {};
    s10 && this.itemX - i10 + l2 > h2 && (this.itemX = i10, this.lastLineHeight && (this.itemY += a2 + this.lastLineHeight + r2), this.lastLineHeight = 0), this.lastItemY = a2 + this.itemY + r2, this.lastLineHeight = Math.max(o2, this.lastLineHeight), d2.x = this.itemX, d2.y = this.itemY, s10 ? this.itemX += l2 : (this.itemY += a2 + o2 + r2, this.lastLineHeight = o2), this.offsetWidth = this.widthOption || Math.max((s10 ? this.itemX - i10 - (t11.checkbox ? 0 : n2) : l2) + i10, this.offsetWidth);
  }
  getAllItems() {
    let t11 = [];
    return this.chart.series.forEach(function(e10) {
      let i10 = e10?.options;
      e10 && ty(i10.showInLegend, !$(i10.linkedTo) && void 0, true) && (t11 = t11.concat(e10.legendItem?.labels || ("point" === i10.legendType ? e10.data : e10)));
    }), J(this, "afterGetAllItems", { allItems: t11 }), t11;
  }
  getAlignment() {
    let t11 = this.options;
    return this.proximate ? t11.align.charAt(0) + "tv" : t11.floating ? "" : t11.align.charAt(0) + t11.verticalAlign.charAt(0) + t11.layout.charAt(0);
  }
  adjustMargins(t11, e10) {
    let i10 = this.chart, s10 = this.options, o2 = this.getAlignment();
    o2 && [/(lth|ct|rth)/, /(rtv|rm|rbv)/, /(rbh|cb|lbh)/, /(lbv|lm|ltv)/].forEach((r2, a2) => {
      r2.test(o2) && !$(t11[a2]) && (i10[ij[a2]] = Math.max(i10[ij[a2]], i10.legend[(a2 + 1) % 2 ? "legendHeight" : "legendWidth"] + [1, -1, -1, 1][a2] * s10[a2 % 2 ? "x" : "y"] + (s10.margin ?? 12) + e10[a2] + (i10.titleOffset[a2] || 0)));
    });
  }
  proximatePositions() {
    let t11, e10 = this.chart, i10 = [], s10 = "left" === this.options.align;
    for (let o2 of (this.allItems.forEach(function(t12) {
      let o3, r2, a2 = s10, n2, h2;
      t12.yAxis && (t12.xAxis.options.reversed && (a2 = !a2), t12.points && (o3 = to(a2 ? t12.points : t12.points.slice(0).reverse(), function(t13) {
        return th(t13.plotY);
      })), r2 = this.itemMarginTop + t12.legendItem.label.getBBox().height + this.itemMarginBottom, h2 = t12.yAxis.top - e10.plotTop, n2 = t12.visible ? (o3 ? o3.plotY : t12.yAxis.height) + (h2 - 0.3 * r2) : h2 + t12.yAxis.height, i10.push({ target: n2, size: r2, item: t12 }));
    }, this), i$(i10, e10.plotHeight))) t11 = o2.item.legendItem || {}, th(o2.pos) && (t11.y = e10.plotTop - e10.spacing[0] + o2.pos);
  }
  render() {
    let t11 = this.chart, e10 = t11.spacingBox.width, i10 = t11.renderer, s10 = this.options, o2 = this.padding, r2 = this.getAllItems(), a2, n2, h2, l2 = this.group, d2, c2 = this.box;
    this.itemX = o2, this.itemY = this.initialItemY, this.offsetWidth = 0, this.lastItemY = 0, this.widthOption = tk(s10.width, e10 - o2), d2 = e10 - 2 * o2 - s10.x, ["rm", "lm"].indexOf(this.getAlignment().substring(0, 2)) > -1 && (d2 /= 2), this.maxLegendWidth = this.widthOption || d2, l2 || (this.group = l2 = i10.g("legend").addClass(s10.className || "").attr({ zIndex: 7 }).add(), this.contentGroup = i10.g().attr({ zIndex: 1 }).add(l2), this.scrollGroup = i10.g().add(this.contentGroup)), this.renderTitle(), tT(r2, (t12, e11) => (t12.options?.legendIndex || 0) - (e11.options?.legendIndex || 0)), s10.reversed && r2.reverse(), this.allItems = r2, this.display = a2 = !!r2.length, this.lastLineHeight = 0, this.maxItemWidth = 0, this.totalItemWidth = 0, this.itemHeight = 0, r2.forEach(this.renderItem, this), r2.forEach(this.layoutItem, this), n2 = (s10.maxWidth ? Math.min(this.widthOption || this.offsetWidth, d2, tk(s10.maxWidth, t11.chartWidth) || 1 / 0) : this.widthOption || this.offsetWidth) + o2, h2 = this.lastItemY + this.lastLineHeight + this.titleHeight, h2 = this.handleOverflow(h2) + o2, c2 || (this.box = c2 = i10.rect().addClass("highcharts-legend-box").attr({ r: s10.borderRadius }).add(l2)), t11.styledMode || c2.attr({ stroke: s10.borderColor, "stroke-width": s10.borderWidth || 0, fill: s10.backgroundColor || "none" }).shadow(s10.shadow), n2 > 0 && h2 > 0 && c2[c2.placed ? "animate" : "attr"](c2.crisp.call({}, { x: 0, y: 0, width: n2, height: h2 }, c2.strokeWidth())), l2[a2 ? "show" : "hide"](), t11.styledMode && "none" === l2.getStyle("display") && (n2 = h2 = 0), this.legendWidth = n2, this.legendHeight = h2, a2 && this.align(), this.proximate || this.positionItems(), J(this, "afterRender");
  }
  align(t11 = this.chart.spacingBox) {
    let e10 = this.chart, i10 = this.options, s10 = t11.y;
    /(lth|ct|rth)/.test(this.getAlignment()) && e10.titleOffset[0] > 0 ? s10 += e10.titleOffset[0] : /(lbh|cb|rbh)/.test(this.getAlignment()) && e10.titleOffset[2] > 0 && (s10 -= e10.titleOffset[2]), s10 !== t11.y && (t11 = tg(t11, { y: s10 })), e10.hasRendered || (this.group.placed = false), this.group.align(tg(i10, { width: this.legendWidth, height: this.legendHeight, verticalAlign: this.proximate ? "top" : i10.verticalAlign }), true, t11);
  }
  handleOverflow(t11) {
    let e10 = this, i10 = this.chart, s10 = i10.renderer, o2 = this.options, r2 = o2.y, a2 = "top" === o2.verticalAlign, n2 = this.padding, h2 = o2.maxHeight, l2 = o2.navigation, d2 = ty(l2.animation, true), c2 = l2.arrowSize || 12, p2 = this.pages, g2 = this.allItems, u2 = function(t12) {
      "number" == typeof t12 ? w2.attr({ height: t12 }) : w2 && (e10.clipRect = w2.destroy(), e10.contentGroup.clip()), e10.contentGroup.div && (e10.contentGroup.div.style.clip = t12 ? "rect(" + n2 + "px,9999px," + (n2 + t12) + "px,0)" : "auto");
    }, f2 = function(t12) {
      return e10[t12] = s10.circle(0, 0, 1.3 * c2).translate(c2 / 2, c2 / 2).add(k2), i10.styledMode || e10[t12].attr("fill", "rgba(0,0,0,0.0001)"), e10[t12];
    }, m2, x2, y2, b2, v2 = i10.spacingBox.height + (a2 ? -r2 : r2) - n2, k2 = this.nav, w2 = this.clipRect;
    return "horizontal" !== o2.layout || "middle" === o2.verticalAlign || o2.floating || (v2 /= 2), h2 && (v2 = Math.min(v2, h2)), p2.length = 0, t11 && v2 > 0 && t11 > v2 && false !== l2.enabled ? (this.clipHeight = m2 = Math.max(v2 - 20 - this.titleHeight - n2, 0), this.currentPage = ty(this.currentPage, 1), this.fullHeight = t11, g2.forEach((t12, e11) => {
      let i11 = (y2 = t12.legendItem || {}).y || 0, s11 = Math.round(y2.label.getBBox().height), o3 = p2.length;
      (!o3 || i11 - p2[o3 - 1] > m2 && (x2 || i11) !== p2[o3 - 1]) && (p2.push(x2 || i11), o3++), y2.pageIx = o3 - 1, x2 && b2 && (b2.pageIx = o3 - 1), e11 === g2.length - 1 && i11 + s11 - p2[o3 - 1] > m2 && i11 > p2[o3 - 1] && (p2.push(i11), y2.pageIx = o3), i11 !== x2 && (x2 = i11), b2 = y2;
    }), w2 || (w2 = e10.clipRect = s10.clipRect(0, n2 - 2, 9999, 0), e10.contentGroup.clip(w2)), u2(m2), k2 || (this.nav = k2 = s10.g().attr({ zIndex: 1 }).add(this.group), this.up = s10.symbol("triangle", 0, 0, c2, c2).add(k2), f2("upTracker").on("click", function() {
      e10.scroll(-1, d2);
    }), this.pager = s10.text("", 15, 10).addClass("highcharts-legend-navigation"), !i10.styledMode && l2.style && this.pager.css(l2.style), this.pager.add(k2), this.down = s10.symbol("triangle-down", 0, 0, c2, c2).add(k2), f2("downTracker").on("click", function() {
      e10.scroll(1, d2);
    })), e10.scroll(0), t11 = v2) : k2 && (u2(), this.nav = k2.destroy(), this.scrollGroup.attr({ translateY: 1 }), this.clipHeight = 0), t11;
  }
  scroll(t11, e10) {
    let i10 = this.chart, s10 = this.pages, o2 = s10.length, r2 = this.clipHeight, a2 = this.options.navigation, n2 = this.pager, h2 = this.padding, l2 = this.currentPage + t11;
    l2 > o2 && (l2 = o2), l2 > 0 && (void 0 !== e10 && iH(e10, i10), this.nav.attr({ translateX: h2, translateY: r2 + this.padding + 7 + this.titleHeight, visibility: "inherit" }), [this.up, this.upTracker].forEach(function(t12) {
      t12.attr({ class: 1 === l2 ? "highcharts-legend-nav-inactive" : "highcharts-legend-nav-active" });
    }), n2.attr({ text: l2 + "/" + o2 }), [this.down, this.downTracker].forEach(function(t12) {
      t12.attr({ x: 18 + this.pager.getBBox().width, class: l2 === o2 ? "highcharts-legend-nav-inactive" : "highcharts-legend-nav-active" });
    }, this), i10.styledMode || (this.up.attr({ fill: 1 === l2 ? a2.inactiveColor : a2.activeColor }), this.upTracker.css({ cursor: 1 === l2 ? "default" : "pointer" }), this.down.attr({ fill: l2 === o2 ? a2.inactiveColor : a2.activeColor }), this.downTracker.css({ cursor: l2 === o2 ? "default" : "pointer" })), this.scrollOffset = -s10[l2 - 1] + this.initialItemY, this.scrollGroup.animate({ translateY: this.scrollOffset }), this.currentPage = l2, this.positionCheckboxes(), tC(() => {
      J(this, "afterScroll", { currentPage: l2 });
    }, iG(ty(e10, i10.renderer.globalAnimation, true)).duration));
  }
  setItemEvents(t11, e10, i10) {
    let s10 = this, o2 = t11.legendItem || {}, r2 = s10.chart.renderer.boxWrapper, a2 = t11 instanceof ic, n2 = t11 instanceof iX, h2 = "highcharts-legend-" + (a2 ? "point" : "series") + "-active", l2 = s10.chart.styledMode, d2 = i10 ? [e10, o2.symbol] : [o2.group], c2 = (e11) => {
      s10.allItems.forEach((i11) => {
        t11 !== i11 && [i11].concat(i11.linkedSeries || []).forEach((t12) => {
          t12.setState(e11, !a2);
        });
      });
    };
    for (let i11 of d2) i11 && i11.on("mouseover", function() {
      t11.visible && c2("inactive"), t11.setState("hover"), t11.visible && r2.addClass(h2), l2 || e10.css(s10.options.itemHoverStyle);
    }).on("mouseout", function() {
      s10.chart.styledMode || e10.css(tg(t11.visible ? s10.itemStyle : s10.itemHiddenStyle)), c2(""), r2.removeClass(h2), t11.setState();
    }).on("click", function(e11) {
      let i12 = function() {
        t11.setVisible && t11.setVisible(), c2(t11.visible ? "inactive" : "");
      };
      r2.removeClass(h2), J(s10, "itemClick", { browserEvent: e11, legendItem: t11, context: s10 }, i12), a2 ? t11.firePointEvent("legendItemClick", { browserEvent: e11 }) : n2 && J(t11, "legendItemClick", { browserEvent: e11 });
    });
  }
  createCheckboxForItem(t11) {
    t11.checkbox = F("input", { type: "checkbox", className: "highcharts-legend-checkbox", checked: t11.selected, defaultChecked: t11.selected }, this.options.itemCheckboxStyle, this.chart.container), z(t11.checkbox, "click", function(e10) {
      let i10 = e10.target;
      J(t11.series || t11, "checkboxClick", { checked: i10.checked, item: t11 }, function() {
        t11.select();
      });
    });
  }
};
(c = iU || (iU = {})).compose = function(t11) {
  tv(iY, "Core.Legend") && z(t11, "beforeMargins", function() {
    this.legend = new c(this, this.options.legend);
  });
};
var iZ = iU;
var { animate: i_, animObject: iK, setAnimation: iq } = tJ;
var { defaultOptions: iJ } = tF;
var { numberFormat: iQ } = ei;
var { registerEventOptions: i0 } = e$;
var { charts: i1, doc: i2, marginNames: i3, svg: i5, win: i6 } = D;
var { seriesTypes: i9 } = iL;
var i4 = class _i4 {
  static chart(t11, e10, i10) {
    return new _i4(t11, e10, i10);
  }
  constructor(t11, e10, i10) {
    if (this.sharedClips = {}, !i2) return void tO(36, false, this);
    let s10 = [...arguments];
    (tl(t11) || t11.nodeName) && (this.renderTo = s10.shift()), this.init(s10[0], s10[1]);
  }
  setZoomOptions() {
    let t11 = this.options.chart, e10 = t11.zooming;
    this.zooming = __spreadProps(__spreadValues({}, e10), { type: ty(t11.zoomType, e10.type), key: ty(t11.zoomKey, e10.key), pinchType: ty(t11.pinchType, e10.pinchType), singleTouch: ty(t11.zoomBySingleTouch, e10.singleTouch, false), resetButton: tg(e10.resetButton, t11.resetZoomButton) });
  }
  init(t11, e10) {
    J(this, "init", { args: arguments }, function() {
      let i10 = tg(iJ, t11), s10 = i10.chart, o2 = this.renderTo || s10.renderTo;
      this.userOptions = K({}, t11), (this.renderTo = tl(o2) ? i2.getElementById(o2) : o2) || tO(13, true, this), this.margin = [], this.spacing = [], this.labelCollectors = [], this.callback = e10, this.isResizing = 0, this.options = i10, this.axes = [], this.series = [], this.locale = i10.lang.locale ?? this.renderTo.closest("[lang]")?.lang, this.time = new tW(K(i10.time || {}, { locale: this.locale }), i10.lang), i10.time = this.time.options, this.numberFormatter = (s10.numberFormatter || iQ).bind(this), this.styledMode = s10.styledMode, this.hasCartesianSeries = s10.showAxes, this.index = i1.length, i1.push(this), D.chartCount++, i0(this, s10), this.xAxis = [], this.yAxis = [], this.pointCount = this.colorCounter = this.symbolCounter = 0, this.setZoomOptions(), J(this, "afterInit"), this.firstRender();
    });
  }
  initSeries(t11) {
    let e10 = this.options.chart, i10 = t11.type || e10.type, s10 = i9[i10];
    s10 || tO(17, true, this, { missingModuleFor: i10 });
    let o2 = new s10();
    return "function" == typeof o2.init && o2.init(this, t11), o2;
  }
  setSortedData() {
    this.getSeriesOrderByLinks().forEach(function(t11) {
      t11.points || t11.data || !t11.enabledDataSorting || t11.setData(t11.options.data, false);
    });
  }
  getSeriesOrderByLinks() {
    return this.series.concat().sort(function(t11, e10) {
      return t11.linkedSeries.length || e10.linkedSeries.length ? e10.linkedSeries.length - t11.linkedSeries.length : 0;
    });
  }
  orderItems(t11, e10 = 0) {
    let i10 = this[t11], s10 = this.options[t11] = tS(this.options[t11]).slice(), o2 = this.userOptions[t11] = this.userOptions[t11] ? tS(this.userOptions[t11]).slice() : [];
    if (this.hasRendered && (s10.splice(e10), o2.splice(e10)), i10) for (let t12 = e10, r2 = i10.length; t12 < r2; ++t12) {
      let e11 = i10[t12];
      e11 && (e11.index = t12, e11 instanceof iX && (e11.name = e11.getName()), e11.options.isInternal || (s10[t12] = e11.options, o2[t12] = e11.userOptions));
    }
  }
  getClipBox(t11, e10) {
    let i10 = this.inverted, { xAxis: s10, yAxis: o2 } = t11 || {}, { x: r2, y: a2, width: n2, height: h2 } = tg(this.clipBox);
    return t11 && (s10 && s10.len !== this.plotSizeX && (n2 = s10.len), o2 && o2.len !== this.plotSizeY && (h2 = o2.len), i10 && !t11.invertible && ([n2, h2] = [h2, n2])), e10 && (r2 += (i10 ? o2 : s10)?.pos ?? this.plotLeft, a2 += (i10 ? s10 : o2)?.pos ?? this.plotTop), { x: r2, y: a2, width: n2, height: h2 };
  }
  isInsidePlot(t11, e10, i10 = {}) {
    let { inverted: s10, plotBox: o2, plotLeft: r2, plotTop: a2, scrollablePlotBox: n2 } = this, { scrollLeft: h2 = 0, scrollTop: l2 = 0 } = i10.visiblePlotOnly && this.scrollablePlotArea?.scrollingContainer || {}, d2 = i10.series, c2 = i10.visiblePlotOnly && n2 || o2, p2 = i10.inverted ? e10 : t11, g2 = i10.inverted ? t11 : e10, u2 = { x: p2, y: g2, isInsidePlot: true, options: i10 };
    if (!i10.ignoreX) {
      let t12 = d2 && (s10 && !this.polar ? d2.yAxis : d2.xAxis) || { pos: r2, len: 1 / 0 }, e11 = i10.paneCoordinates ? t12.pos + p2 : r2 + p2;
      e11 >= Math.max(h2 + r2, t12.pos) && e11 <= Math.min(h2 + r2 + c2.width, t12.pos + t12.len) || (u2.isInsidePlot = false);
    }
    if (!i10.ignoreY && u2.isInsidePlot) {
      let t12 = !s10 && i10.axis && !i10.axis.isXAxis && i10.axis || d2 && (s10 ? d2.xAxis : d2.yAxis) || { pos: a2, len: 1 / 0 }, e11 = i10.paneCoordinates ? t12.pos + g2 : a2 + g2;
      e11 >= Math.max(l2 + a2, t12.pos) && e11 <= Math.min(l2 + a2 + c2.height, t12.pos + t12.len) || (u2.isInsidePlot = false);
    }
    return J(this, "afterIsInsidePlot", u2), u2.isInsidePlot;
  }
  redraw(t11) {
    J(this, "beforeRedraw");
    let e10 = this.hasCartesianSeries ? this.axes : this.colorAxis || [], i10 = this.series, s10 = this.pointer, o2 = this.legend, r2 = this.userOptions.legend, a2 = this.renderer, n2 = a2.isHidden(), h2 = [], l2, d2, c2, p2 = this.isDirtyBox, g2 = this.isDirtyLegend, u2;
    for (a2.rootFontSize = a2.boxWrapper.getStyle("font-size"), this.setResponsive && this.setResponsive(false), iq(!!this.hasRendered && t11, this), n2 && this.temporaryDisplay(), this.layOutTitles(false), c2 = i10.length; c2--; ) if (((u2 = i10[c2]).options.stacking || u2.options.centerInCategory) && (d2 = true, u2.isDirty)) {
      l2 = true;
      break;
    }
    if (l2) for (c2 = i10.length; c2--; ) (u2 = i10[c2]).options.stacking && (u2.isDirty = true);
    i10.forEach(function(t12) {
      t12.isDirty && ("point" === t12.options.legendType ? ("function" == typeof t12.updateTotals && t12.updateTotals(), g2 = true) : r2 && (r2.labelFormatter || r2.labelFormat) && (g2 = true)), t12.isDirtyData && J(t12, "updatedData");
    }), g2 && o2 && o2.options.enabled && (o2.render(), this.isDirtyLegend = false), d2 && this.getStacks(), e10.forEach(function(t12) {
      t12.updateNames(), t12.setScale();
    }), this.getMargins(), e10.forEach(function(t12) {
      t12.isDirty && (p2 = true);
    }), e10.forEach(function(t12) {
      let e11 = t12.min + "," + t12.max;
      t12.extKey !== e11 && (t12.extKey = e11, h2.push(function() {
        J(t12, "afterSetExtremes", K(t12.eventArgs, t12.getExtremes())), delete t12.eventArgs;
      })), (p2 || d2) && t12.redraw();
    }), p2 && this.drawChartBox(), J(this, "predraw"), i10.forEach(function(t12) {
      (p2 || t12.isDirty) && t12.visible && t12.redraw(), t12.isDirtyData = false;
    }), s10 && s10.reset(true), a2.draw(), J(this, "redraw"), J(this, "render"), n2 && this.temporaryDisplay(true), h2.forEach(function(t12) {
      t12.call();
    });
  }
  get(t11) {
    let e10 = this.series;
    function i10(e11) {
      return e11.id === t11 || e11.options && e11.options.id === t11;
    }
    let s10 = to(this.axes, i10) || to(this.series, i10);
    for (let t12 = 0; !s10 && t12 < e10.length; t12++) s10 = to(e10[t12].points || [], i10);
    return s10;
  }
  createAxes() {
    let t11 = this.userOptions;
    for (let e10 of (J(this, "createAxes"), ["xAxis", "yAxis"])) for (let i10 of t11[e10] = tS(t11[e10] || {})) new e1(this, i10, e10);
    J(this, "afterCreateAxes");
  }
  getSelectedPoints() {
    return this.series.reduce((t11, e10) => (e10.getPointsCollection().forEach((e11) => {
      ty(e11.selectedStaging, e11.selected) && t11.push(e11);
    }), t11), []);
  }
  getSelectedSeries() {
    return this.series.filter((t11) => t11.selected);
  }
  setTitle(t11, e10, i10) {
    this.applyDescription("title", t11), this.applyDescription("subtitle", e10), this.applyDescription("caption", void 0), this.layOutTitles(i10);
  }
  applyDescription(t11, e10) {
    let i10 = this, s10 = this.options[t11] = tg(this.options[t11], e10), o2 = this[t11];
    o2 && e10 && (this[t11] = o2 = o2.destroy()), s10 && !o2 && ((o2 = this.renderer.text(s10.text, 0, 0, s10.useHTML).attr({ align: s10.align, class: "highcharts-" + t11, zIndex: s10.zIndex || 4 }).css({ textOverflow: "ellipsis", whiteSpace: "nowrap" }).add()).update = function(e11, s11) {
      i10.applyDescription(t11, e11), i10.layOutTitles(s11);
    }, this.styledMode || o2.css(K("title" === t11 ? { fontSize: this.options.isStock ? "1em" : "1.2em" } : {}, s10.style)), o2.textPxLength = o2.getBBox().width, o2.css({ whiteSpace: s10.style?.whiteSpace }), this[t11] = o2);
  }
  layOutTitles(t11 = true) {
    let e10 = [0, 0, 0], { options: i10, renderer: s10, spacingBox: o2 } = this;
    ["title", "subtitle", "caption"].forEach((t12) => {
      let i11 = this[t12], r3 = this.options[t12], a2 = tg(o2), n2 = i11?.textPxLength || 0;
      if (i11 && r3) {
        J(this, "layOutTitle", { alignTo: a2, key: t12, textPxLength: n2 });
        let o3 = s10.fontMetrics(i11), h2 = o3.b, l2 = o3.h, d2 = r3.verticalAlign || "top", c2 = "top" === d2, p2 = c2 && r3.minScale || 1, g2 = "title" === t12 ? c2 ? -3 : 0 : c2 ? e10[0] + 2 : 0, u2 = Math.min(a2.width / n2, 1), f2 = Math.max(p2, u2), m2 = tg({ y: "bottom" === d2 ? h2 : g2 + h2 }, r3), x2 = (r3.width || (u2 > p2 ? this.chartWidth : a2.width) / f2) + "px";
        m2.align ?? (m2.align = "title" === t12 ? u2 < p2 ? "left" : "center" : this.title?.alignValue), i11.alignValue !== m2.align && (i11.placed = false);
        let y2 = Math.round(i11.css({ width: x2 }).getBBox(r3.useHTML).height);
        if (m2.height = y2, i11.align(m2, false, a2).attr({ align: m2.align, scaleX: f2, scaleY: f2, "transform-origin": `${a2.x + n2 * f2 * Q(m2.align)} ${l2}` }), !r3.floating) {
          let t13 = y2 * (y2 < 1.2 * l2 ? 1 : f2);
          "top" === d2 ? e10[0] = Math.ceil(e10[0] + t13) : "bottom" === d2 && (e10[2] = Math.ceil(e10[2] + t13));
        }
      }
    }, this), e10[0] && "top" === (i10.title?.verticalAlign || "top") && (e10[0] += i10.title?.margin || 0), e10[2] && i10.caption?.verticalAlign === "bottom" && (e10[2] += i10.caption?.margin || 0);
    let r2 = !this.titleOffset || this.titleOffset.join(",") !== e10.join(",");
    this.titleOffset = e10, J(this, "afterLayOutTitles"), !this.isDirtyBox && r2 && (this.isDirtyBox = this.isDirtyLegend = r2, this.hasRendered && t11 && this.isDirtyBox && this.redraw());
  }
  getContainerBox() {
    let t11 = [].map.call(this.renderTo.children, (t12) => {
      if (t12 !== this.container) {
        let e11 = t12.style.display;
        return t12.style.display = "none", [t12, e11];
      }
    }), e10 = { width: ts(this.renderTo, "width", true) || 0, height: ts(this.renderTo, "height", true) || 0 };
    return t11.filter(Boolean).forEach(([t12, e11]) => {
      t12.style.display = e11;
    }), e10;
  }
  getChartSize() {
    let t11 = this.options.chart, e10 = t11.width, i10 = t11.height, s10 = this.getContainerBox(), o2 = s10.height <= 1 || !this.renderTo.parentElement?.style.height && "100%" === this.renderTo.style.height;
    this.chartWidth = Math.max(0, e10 || s10.width || 600), this.chartHeight = Math.max(0, tk(i10, this.chartWidth) || (o2 ? 400 : s10.height)), this.containerBox = s10;
  }
  temporaryDisplay(t11) {
    let e10 = this.renderTo, i10;
    if (t11) for (; e10?.style; ) e10.hcOrigStyle && (j(e10, e10.hcOrigStyle), delete e10.hcOrigStyle), e10.hcOrigDetached && (i2.body.removeChild(e10), e10.hcOrigDetached = false), e10 = e10.parentNode;
    else for (; e10?.style && (i2.body.contains(e10) || e10.parentNode || (e10.hcOrigDetached = true, i2.body.appendChild(e10)), ("none" === ts(e10, "display", false) || e10.hcOrigDetached) && (e10.hcOrigStyle = { display: e10.style.display, height: e10.style.height, overflow: e10.style.overflow }, i10 = { display: "block", overflow: "hidden" }, e10 !== this.renderTo && (i10.height = 0), j(e10, i10), e10.offsetWidth || e10.style.setProperty("display", "block", "important")), (e10 = e10.parentNode) !== i2.body); ) ;
  }
  setClassName(t11) {
    this.container.className = "highcharts-container " + (t11 || "");
  }
  getContainer() {
    let t11, e10 = this.options, i10 = e10.chart, s10 = "data-highcharts-chart", o2 = tD(), r2 = this.renderTo, a2 = tb(X(r2, s10));
    th(a2) && i1[a2] && i1[a2].hasRendered && i1[a2].destroy(), X(r2, s10, this.index), r2.innerHTML = t5.emptyHTML, i10.skipClone || r2.offsetWidth || this.temporaryDisplay(), this.getChartSize();
    let n2 = this.chartHeight, h2 = this.chartWidth;
    j(r2, { overflow: "hidden" }), this.styledMode || (t11 = K({ position: "relative", overflow: "hidden", width: h2 + "px", height: n2 + "px", textAlign: "left", lineHeight: "normal", zIndex: 0, "-webkit-tap-highlight-color": "rgba(0,0,0,0)", userSelect: "none", "touch-action": "manipulation", outline: "none", padding: "0px" }, i10.style || {}));
    let l2 = F("div", { id: o2 }, t11, r2);
    this.container = l2, this.getChartSize(), h2 !== this.chartWidth && (h2 = this.chartWidth, this.styledMode || j(l2, { width: ty(i10.style?.width, h2 + "px") })), this.containerBox = this.getContainerBox(), this._cursor = l2.style.cursor;
    let d2 = i10.renderer || !i5 ? es.getRendererType(i10.renderer) : eR;
    if (this.renderer = new d2(l2, h2, n2, void 0, i10.forExport, e10.exporting?.allowHTML, this.styledMode), iq(void 0, this), this.setClassName(i10.className), this.styledMode) for (let t12 in e10.defs) this.renderer.definition(e10.defs[t12]);
    else this.renderer.setStyle(i10.style);
    this.renderer.chartIndex = this.index, J(this, "afterGetContainer");
  }
  getMargins(t11) {
    let { spacing: e10, margin: i10, titleOffset: s10 } = this;
    this.resetMargins(), s10[0] && !$(i10[0]) && (this.plotTop = Math.max(this.plotTop, s10[0] + e10[0])), s10[2] && !$(i10[2]) && (this.marginBottom = Math.max(this.marginBottom, s10[2] + e10[2])), this.legend?.display && this.legend.adjustMargins(i10, e10), J(this, "getMargins"), t11 || this.getAxisMargins();
  }
  getAxisMargins() {
    let t11 = this, e10 = t11.axisOffset = [0, 0, 0, 0], i10 = t11.colorAxis, s10 = t11.margin, o2 = (t12) => {
      t12.forEach((t13) => {
        t13.visible && t13.getOffset();
      });
    };
    t11.hasCartesianSeries ? o2(t11.axes) : i10?.length && o2(i10), i3.forEach((i11, o3) => {
      $(s10[o3]) || (t11[i11] += e10[o3]);
    }), t11.setChartSize();
  }
  getOptions() {
    return Z(this.userOptions, iJ);
  }
  reflow(t11) {
    let e10 = this, i10 = e10.containerBox, s10 = e10.getContainerBox();
    delete e10.pointer?.chartPosition, !e10.exporting?.isPrinting && !e10.isResizing && i10 && s10.width && ((s10.width !== i10.width || s10.height !== i10.height) && (tr(e10.reflowTimeout), e10.reflowTimeout = tC(function() {
      if (e10.container) {
        e10.setSize(void 0, void 0, false);
        let t12 = e10.containerBox;
        t12 && (t12.height = e10.chartHeight);
      }
    }, 100 * !!t11)), e10.containerBox = s10);
  }
  setReflow() {
    let t11 = this, e10 = (e11) => {
      t11.options?.chart.reflow && t11.hasLoaded && t11.reflow(e11);
    };
    if ("function" == typeof ResizeObserver) new ResizeObserver(e10).observe(t11.renderTo);
    else {
      let t12 = z(i6, "resize", e10);
      z(this, "destroy", t12);
    }
  }
  setSize(t11, e10, i10) {
    let s10 = this, o2 = s10.renderer;
    s10.isResizing += 1, iq(i10, s10);
    let r2 = o2.globalAnimation;
    s10.oldChartHeight = s10.chartHeight, s10.oldChartWidth = s10.chartWidth, void 0 !== t11 && (s10.options.chart.width = t11), void 0 !== e10 && (s10.options.chart.height = e10), s10.getChartSize();
    let { chartWidth: a2, chartHeight: n2, scrollablePixelsX: h2 = 0, scrollablePixelsY: l2 = 0 } = s10;
    (s10.isDirtyBox || a2 !== s10.oldChartWidth || n2 !== s10.oldChartHeight) && (s10.styledMode || (r2 ? i_ : j)(s10.container, { width: `${a2 + h2}px`, height: `${n2 + l2}px` }, r2), s10.setChartSize(true), o2.setSize(a2, n2, r2), s10.axes.forEach(function(t12) {
      t12.isDirty = true, t12.setScale();
    }), s10.isDirtyLegend = true, s10.isDirtyBox = true, s10.layOutTitles(), s10.getMargins(), s10.redraw(r2), s10.oldChartHeight = void 0, J(s10, "resize"), setTimeout(() => {
      s10 && J(s10, "endResize");
    }, iK(r2).duration)), s10.isResizing -= 1;
  }
  setChartSize(t11) {
    let e10, i10, s10, o2, { chartHeight: r2, chartWidth: a2, inverted: n2, spacing: h2, renderer: l2 } = this, d2 = this.clipOffset, c2 = Math[n2 ? "floor" : "round"];
    this.plotLeft = e10 = Math.round(this.plotLeft), this.plotTop = i10 = Math.round(this.plotTop), this.plotWidth = s10 = Math.max(0, Math.round(a2 - e10 - (this.marginRight ?? 0))), this.plotHeight = o2 = Math.max(0, Math.round(r2 - i10 - (this.marginBottom ?? 0))), this.plotSizeX = n2 ? o2 : s10, this.plotSizeY = n2 ? s10 : o2, this.spacingBox = l2.spacingBox = { x: h2[3], y: h2[0], width: a2 - h2[3] - h2[1], height: r2 - h2[0] - h2[2] }, this.plotBox = l2.plotBox = { x: e10, y: i10, width: s10, height: o2 }, d2 && (this.clipBox = { x: c2(d2[3]), y: c2(d2[0]), width: c2(this.plotSizeX - d2[1] - d2[3]), height: c2(this.plotSizeY - d2[0] - d2[2]) }), t11 || (this.axes.forEach(function(t12) {
      t12.setAxisSize(), t12.setAxisTranslation();
    }), l2.alignElements()), J(this, "afterSetChartSize", { skipAxes: t11 });
  }
  resetMargins() {
    J(this, "resetMargins");
    let t11 = this, e10 = t11.options.chart, i10 = e10.plotBorderWidth || 0, s10 = Math.round(i10) / 2;
    ["margin", "spacing"].forEach((i11) => {
      let s11 = e10[i11], o2 = tp(s11) ? s11 : [s11, s11, s11, s11];
      ["Top", "Right", "Bottom", "Left"].forEach((s12, r2) => {
        t11[i11][r2] = e10[`${i11}${s12}`] ?? o2[r2];
      });
    }), i3.forEach((e11, i11) => {
      t11[e11] = t11.margin[i11] ?? t11.spacing[i11];
    }), t11.axisOffset = [0, 0, 0, 0], t11.clipOffset = [s10, s10, s10, s10], t11.plotBorderWidth = i10;
  }
  drawChartBox() {
    let t11 = this.options.chart, e10 = this.renderer, i10 = this.chartWidth, s10 = this.chartHeight, o2 = this.styledMode, r2 = this.plotBGImage, a2 = t11.backgroundColor, n2 = t11.plotBackgroundColor, h2 = t11.plotBackgroundImage, l2 = this.plotLeft, d2 = this.plotTop, c2 = this.plotWidth, p2 = this.plotHeight, g2 = this.plotBox, u2 = this.clipRect, f2 = this.clipBox, m2 = this.chartBackground, x2 = this.plotBackground, y2 = this.plotBorder, b2, v2, k2, w2 = "animate";
    m2 || (this.chartBackground = m2 = e10.rect().addClass("highcharts-background").add(), w2 = "attr"), o2 ? b2 = v2 = m2.strokeWidth() : (v2 = (b2 = t11.borderWidth || 0) + 8 * !!t11.shadow, k2 = { fill: a2 || "none" }, (b2 || m2["stroke-width"]) && (k2.stroke = t11.borderColor, k2["stroke-width"] = b2), m2.attr(k2).shadow(t11.shadow)), m2[w2]({ x: v2 / 2, y: v2 / 2, width: i10 - v2 - b2 % 2, height: s10 - v2 - b2 % 2, r: t11.borderRadius }), w2 = "animate", x2 || (w2 = "attr", this.plotBackground = x2 = e10.rect().addClass("highcharts-plot-background").add()), x2[w2](g2), !o2 && (x2.attr({ fill: n2 || "none" }).shadow(t11.plotShadow), h2 && (r2 ? (h2 !== r2.attr("href") && r2.attr("href", h2), r2.animate(g2)) : this.plotBGImage = e10.image(h2, l2, d2, c2, p2).add())), u2 ? u2.animate({ width: f2.width, height: f2.height }) : this.clipRect = e10.clipRect(f2), w2 = "animate", y2 || (w2 = "attr", this.plotBorder = y2 = e10.rect().addClass("highcharts-plot-border").attr({ zIndex: 1 }).add()), o2 || y2.attr({ stroke: t11.plotBorderColor, "stroke-width": t11.plotBorderWidth || 0, fill: "none" }), y2[w2](y2.crisp(g2, -y2.strokeWidth())), this.isDirtyBox = false, J(this, "afterDrawChartBox");
  }
  propFromSeries() {
    let t11, e10, i10, s10 = this, o2 = s10.options.chart, r2 = s10.options.series;
    ["inverted", "angular", "polar"].forEach(function(a2) {
      for (e10 = i9[o2.type], i10 = o2[a2] || e10 && e10.prototype[a2], t11 = r2?.length; !i10 && t11--; ) (e10 = i9[r2[t11].type]) && e10.prototype[a2] && (i10 = true);
      s10[a2] = i10;
    });
  }
  linkSeries(t11) {
    let e10 = this, i10 = e10.series;
    i10.forEach(function(t12) {
      t12.linkedSeries.length = 0;
    }), i10.forEach(function(t12) {
      let { linkedTo: s10 } = t12.options, o2 = tl(s10) && (":previous" === s10 ? i10[t12.index - 1] : e10.get(s10));
      o2 && o2.linkedParent !== t12 && (o2.linkedSeries.push(t12), t12.linkedParent = o2, o2.enabledDataSorting && t12.setDataSortingOptions(), t12.visible = t12.options.visible ?? o2.options.visible ?? t12.visible);
    }), J(this, "afterLinkSeries", { isUpdating: t11 });
  }
  renderSeries() {
    this.series.forEach(function(t11) {
      t11.translate(), t11.render();
    });
  }
  render() {
    let t11 = this.axes, e10 = this.colorAxis, i10 = this.renderer, s10 = this.options.chart.axisLayoutRuns || 2, o2 = (t12) => {
      t12.forEach((t13) => {
        t13.visible && t13.render();
      });
    }, r2 = 0, a2 = true, n2, h2 = 0;
    for (let e11 of (this.setTitle(), J(this, "beforeMargins"), this.getStacks?.(), this.getMargins(true), this.setChartSize(), t11)) {
      let { options: t12 } = e11, { labels: i11 } = t12;
      if (this.hasCartesianSeries && e11.horiz && e11.visible && i11.enabled && e11.series.length && "colorAxis" !== e11.coll && !this.polar) {
        r2 = t12.tickLength, e11.createGroups();
        let s11 = new eU(e11, 0, "", true), o3 = s11.createLabel("x", i11);
        if (s11.destroy(), o3 && ty(i11.reserveSpace, !th(t12.crossing)) && (r2 = o3.getBBox().height + i11.distance + Math.max(t12.offset || 0, 0)), r2) {
          o3?.destroy();
          break;
        }
      }
    }
    for (this.plotHeight = Math.max(this.plotHeight - r2, 0); (a2 || n2 || s10 > 1) && h2 < s10; ) {
      let e11 = this.plotWidth, i11 = this.plotHeight, s11 = [1.05, 1.1];
      for (let e12 of t11) {
        let t12 = +(e12.horiz || 0);
        if (0 === h2) {
          e12.setScale();
          let i12 = e12.tickPositions?.info?.match;
          i12 && (s11[t12] = Math.min(i12, s11[t12]));
        } else (t12 && a2 || !t12 && n2) && e12.setTickInterval(true);
      }
      0 === h2 ? this.getAxisMargins() : this.getMargins(), a2 = e11 / this.plotWidth > (h2 ? 1 : s11[1]), n2 = i11 / this.plotHeight > (h2 ? 1 : s11[0]), h2++;
    }
    this.drawChartBox(), this.hasCartesianSeries ? o2(t11) : e10?.length && o2(e10), this.seriesGroup || (this.seriesGroup = i10.g("series-group").attr({ zIndex: 3 }).shadow(this.options.chart.seriesGroupShadow).add()), this.renderSeries(), this.addCredits(), this.setResponsive && this.setResponsive(), this.hasRendered = true;
  }
  addCredits(t11) {
    let e10 = this, i10 = tg(true, this.options.credits, t11);
    i10.enabled && !this.credits && (this.credits = this.renderer.text(i10.text + (this.mapCredits || ""), 0, 0).addClass("highcharts-credits").on("click", function(t12) {
      J(e10, "creditsClick", t12, () => {
        i10.href && (i6.location.href = i10.href);
      });
    }).attr({ align: i10.position.align, zIndex: 8 }), i10.events?.click && z(e10, "creditsClick", i10.events.click), e10.styledMode || this.credits.css(i10.style), this.credits.add().align(i10.position), this.credits.update = function(t12) {
      e10.credits = e10.credits.destroy(), e10.addCredits(t12);
    });
  }
  destroy() {
    let t11, e10 = this, i10 = e10.axes, s10 = e10.series, o2 = e10.container, r2 = o2?.parentNode;
    for (J(e10, "destroy"), e10.renderer.forExport ? _(i1, e10) : i1[e10.index] = void 0, D.chartCount--, e10.renderTo.removeAttribute("data-highcharts-chart"), tM(e10), t11 = i10.length; t11--; ) i10[t11] = i10[t11].destroy();
    for (this.scroller?.destroy?.(), t11 = s10.length; t11--; ) s10[t11] = s10[t11].destroy();
    ["title", "subtitle", "chartBackground", "plotBackground", "plotBGImage", "plotBorder", "seriesGroup", "clipRect", "credits", "pointer", "rangeSelector", "legend", "resetZoomButton", "tooltip", "renderer"].forEach((t12) => {
      e10[t12] = e10[t12]?.destroy?.();
    }), o2 && (o2.innerHTML = t5.emptyHTML, tM(o2), r2 && U(o2)), tf(e10, function(t12, i11) {
      delete e10[i11];
    });
  }
  firstRender() {
    let t11 = this, e10 = t11.options;
    t11.getContainer(), t11.resetMargins(), t11.setChartSize(), t11.propFromSeries(), t11.createAxes();
    let i10 = td(e10.series) ? e10.series : [];
    e10.series = [], i10.forEach(function(e11) {
      t11.initSeries(e11);
    }), t11.linkSeries(), t11.setSortedData(), J(t11, "beforeRender"), t11.render(), t11.pointer?.getChartPosition(), t11.renderer.asyncCounter || t11.hasLoaded || t11.onload(), t11.temporaryDisplay(true);
  }
  onload() {
    this.callbacks.concat([this.callback]).forEach(function(t11) {
      t11 && void 0 !== this.index && t11.apply(this, [this]);
    }, this), J(this, "load"), J(this, "render"), $(this.index) && this.setReflow(), this.warnIfA11yModuleNotLoaded(), this.warnIfCSSNotLoaded(), this.hasLoaded = true;
  }
  warnIfA11yModuleNotLoaded() {
    let { options: t11, title: e10 } = this;
    t11 && !this.accessibility && (this.renderer.boxWrapper.attr({ role: "img", "aria-label": (e10?.element.textContent || "").replace(/</g, "&lt;") }), t11.accessibility && false === t11.accessibility.enabled || tO('Highcharts warning: Consider including the "accessibility.js" module to make your chart more usable for people with disabilities. Set the "accessibility.enabled" option to false to remove this warning. See https://www.highcharts.com/docs/accessibility/accessibility-module.', false, this));
  }
  warnIfCSSNotLoaded() {
    this.styledMode && "0" !== i6.getComputedStyle(this.container).zIndex && tO(35, false, this);
  }
  addSeries(t11, e10, i10) {
    let s10, o2 = this;
    return t11 && (e10 = ty(e10, true), J(o2, "addSeries", { options: t11 }, function() {
      s10 = o2.initSeries(t11), o2.isDirtyLegend = true, o2.linkSeries(), s10.enabledDataSorting && s10.setData(t11.data, false), J(o2, "afterAddSeries", { series: s10 }), e10 && o2.redraw(i10);
    })), s10;
  }
  addAxis(t11, e10, i10, s10) {
    return this.createAxis(e10 ? "xAxis" : "yAxis", { axis: t11, redraw: i10, animation: s10 });
  }
  addColorAxis(t11, e10, i10) {
    return this.createAxis("colorAxis", { axis: t11, redraw: e10, animation: i10 });
  }
  createAxis(t11, e10) {
    let i10 = new e1(this, e10.axis, t11);
    return ty(e10.redraw, true) && this.redraw(e10.animation), i10;
  }
  showLoading(t11) {
    let e10 = this, i10 = e10.options, s10 = i10.loading, o2 = s10?.style ?? {}, r2 = function() {
      a2 && j(a2, { left: o2.left ?? e10.plotLeft + "px", top: o2.top ?? e10.plotTop + "px", width: o2.width ?? e10.plotWidth + "px", height: o2.height ?? e10.plotHeight + "px" });
    }, a2 = e10.loadingDiv, n2 = e10.loadingSpan;
    a2 || (e10.loadingDiv = a2 = F("div", { className: "highcharts-loading highcharts-loading-hidden" }, null, e10.container)), n2 || (e10.loadingSpan = n2 = F("span", { className: "highcharts-loading-inner" }, null, a2), z(e10, "redraw", r2)), a2.className = "highcharts-loading", t5.setElementHTML(n2, ty(t11, i10.lang.loading, "")), !e10.styledMode && (j(a2, K(o2, { zIndex: 10 })), j(n2, s10?.labelStyle ?? {}), e10.loadingShown || (j(a2, { opacity: 0, display: "" }), i_(a2, { opacity: o2.opacity ?? 0.5 }, { duration: s10?.showDuration ?? 0 }))), e10.loadingShown = true, r2();
  }
  hideLoading() {
    let t11 = this.options, e10 = this.loadingDiv;
    e10 && (e10.className = "highcharts-loading highcharts-loading-hidden", this.styledMode || i_(e10, { opacity: 0 }, { duration: t11.loading?.hideDuration ?? 100, complete: function() {
      j(e10, { display: "none" });
    } })), this.loadingShown = false;
  }
  update(t11, e10, i10, s10) {
    let o2, r2, a2, n2 = this, h2 = { credits: "addCredits", title: "setTitle", subtitle: "setSubtitle", caption: "setCaption" }, l2 = t11.isResponsiveOptions, d2 = [];
    J(n2, "update", { options: t11 }), l2 || n2.setResponsive(false, true), t11 = Z(t11, n2.options), n2.userOptions = tg(n2.userOptions, t11);
    let c2 = t11.chart;
    c2 && (tg(true, n2.options.chart, c2), this.setZoomOptions(), "className" in c2 && n2.setClassName(c2.className), ("inverted" in c2 || "polar" in c2 || "type" in c2) && (n2.propFromSeries(), o2 = true), "alignTicks" in c2 && (o2 = true), "events" in c2 && i0(this, c2), tf(c2, function(t12, e11) {
      -1 !== n2.propsRequireUpdateSeries.indexOf("chart." + e11) && (r2 = true), -1 !== n2.propsRequireDirtyBox.indexOf(e11) && (n2.isDirtyBox = true), -1 !== n2.propsRequireReflow.indexOf(e11) && (n2.isDirtyBox = true, l2 || (a2 = true));
    }), !n2.styledMode && c2.style && n2.renderer.setStyle(n2.options.chart.style || {})), !n2.styledMode && t11.colors && (this.options.colors = t11.colors), tf(t11, function(e11, i11) {
      n2[i11] && "function" == typeof n2[i11].update ? n2[i11].update(e11, false) : "function" == typeof n2[h2[i11]] ? n2[h2[i11]](e11) : "colors" !== i11 && -1 === n2.collectionsWithUpdate.indexOf(i11) && tg(true, n2.options[i11], t11[i11]), "chart" !== i11 && -1 !== n2.propsRequireUpdateSeries.indexOf(i11) && (r2 = true);
    }), this.collectionsWithUpdate.forEach((e11) => {
      t11[e11] && (tS(t11[e11]).forEach((t12, s11) => {
        let o3;
        if (!t12) return;
        let r3 = $(t12.id);
        r3 && (o3 = n2.get(t12.id)), !o3 && n2[e11] && (o3 = n2[e11][ty(t12.index, s11)]) && (r3 && $(o3.options.id) || o3.options.isInternal) && (o3 = void 0), o3 && o3.coll === e11 && (o3.update(t12, false), i10 && (o3.touched = true)), !o3 && i10 && n2.collectionsWithInit[e11] && (n2.collectionsWithInit[e11][0].apply(n2, [t12].concat(n2.collectionsWithInit[e11][1] || []).concat([false])).touched = true);
      }), i10 && n2[e11].forEach((t12) => {
        t12.touched || t12.options.isInternal ? delete t12.touched : d2.push(t12);
      }));
    }), d2.forEach((t12) => {
      t12.chart && t12.remove && t12.remove(false);
    }), o2 && n2.axes.forEach(function(t12) {
      t12.update({}, false);
    }), r2 && n2.getSeriesOrderByLinks().forEach(function(t12) {
      t12.chart && t12.update({}, false);
    }, this);
    let p2 = c2?.width, g2 = c2 && (tl(c2.height) ? tk(c2.height, p2 || n2.chartWidth) : c2.height);
    a2 || th(p2) && p2 !== n2.chartWidth || th(g2) && g2 !== n2.chartHeight ? n2.setSize(p2, g2, s10) : ty(e10, true) && n2.redraw(s10), J(n2, "afterUpdate", { options: t11, redraw: e10, animation: s10 });
  }
  setSubtitle(t11, e10) {
    this.applyDescription("subtitle", t11), this.layOutTitles(e10);
  }
  setCaption(t11, e10) {
    this.applyDescription("caption", t11), this.layOutTitles(e10);
  }
  showResetZoom() {
    let t11 = this, e10 = iJ.lang, i10 = t11.zooming.resetButton, s10 = i10.theme, o2 = "chart" === i10.relativeTo || "spacingBox" === i10.relativeTo ? null : "plotBox";
    function r2() {
      t11.zoomOut();
    }
    J(this, "beforeShowResetZoom", null, function() {
      t11.resetZoomButton = t11.renderer.button(e10.resetZoom, null, null, r2, s10).attr({ align: i10.position.align, title: e10.resetZoomTitle }).addClass("highcharts-reset-zoom").add().align(i10.position, false, o2);
    }), J(this, "afterShowResetZoom");
  }
  zoomOut() {
    J(this, "selection", { resetSelection: true }, () => this.transform({ reset: true, trigger: "zoom" }));
  }
  pan(t11, e10) {
    let i10 = this, s10 = "object" == typeof e10 ? e10 : { enabled: e10, type: "x" }, o2 = s10.type, r2 = o2 && i10[{ x: "xAxis", xy: "axes", y: "yAxis" }[o2]].filter((t12) => t12.options.panningEnabled && !t12.options.isInternal), a2 = i10.options.chart;
    a2?.panning && (a2.panning = s10), J(this, "pan", { originalEvent: t11 }, () => {
      i10.transform({ axes: r2, event: t11, to: { x: t11.chartX - (i10.mouseDownX || 0), y: t11.chartY - (i10.mouseDownY || 0) }, trigger: "pan" }), j(i10.container, { cursor: "move" });
    });
  }
  transform(t11) {
    let { axes: e10 = this.axes, event: i10, from: s10 = {}, reset: o2, selection: r2, to: a2 = {}, trigger: n2, allowResetButton: h2 = true } = t11, { inverted: l2, time: d2 } = this;
    this.hoverPoints?.forEach((t12) => t12.setState()), J(this, "transform", t11);
    let c2 = t11.hasZoomed || false, p2, g2;
    for (let t12 of e10) {
      let { horiz: e11, len: u2, minPointOffset: f2 = 0, options: m2, reversed: x2 } = t12, y2 = e11 ? "width" : "height", b2 = e11 ? "x" : "y", v2 = ty(a2[y2], t12.len), k2 = ty(s10[y2], t12.len), w2 = 10 > Math.abs(v2) ? 1 : v2 / k2, M2 = (s10[b2] || 0) + k2 / 2 - t12.pos, S2 = M2 - ((a2[b2] ?? t12.pos) + v2 / 2 - t12.pos) / w2, T2 = x2 && !l2 || !x2 && l2 ? -1 : 1;
      if (!o2 && (M2 < 0 || M2 > t12.len)) continue;
      let C2 = t12.chart.polar || t12.isOrdinal ? 0 : f2 * T2 || 0, A2 = t12.toValue(S2, true), P2 = t12.toValue(S2 + u2 / w2, true), L2 = A2 + C2, O2 = P2 - C2, E2 = t12.allExtremes;
      if (r2 && r2[t12.coll].push({ axis: t12, min: Math.min(A2, P2), max: Math.max(A2, P2) }), L2 > O2 && ([L2, O2] = [O2, L2]), 1 === w2 && !o2 && "yAxis" === t12.coll && !E2) {
        for (let e12 of t12.series) {
          let t13 = e12.getExtremes(e12.getProcessedData(true).modified.getColumn(e12.pointValKey || "y") || [], true);
          E2 ?? (E2 = { dataMin: Number.MAX_VALUE, dataMax: -Number.MAX_VALUE }), th(t13.dataMin) && th(t13.dataMax) && (E2.dataMin = Math.min(t13.dataMin, E2.dataMin), E2.dataMax = Math.max(t13.dataMax, E2.dataMax));
        }
        t12.allExtremes = E2;
      }
      let { dataMin: I2, dataMax: D2, min: B2, max: N2 } = K(t12.getExtremes(), E2 || {}), z2 = d2.parse(m2.min), R2 = d2.parse(m2.max), W2 = I2 ?? z2, X2 = D2 ?? R2, G2 = O2 - L2, H2 = t12.categories ? 0 : Math.min(G2, X2 - W2), F2 = W2 - H2 * ($(z2) ? 0 : m2.minPadding), Y2 = X2 + H2 * ($(R2) ? 0 : m2.maxPadding), j2 = t12.allowZoomOutside || 1 === w2 || "zoom" !== n2 && w2 > 1, V2 = Math.min(z2 ?? F2, F2, j2 ? B2 : F2), U2 = Math.max(R2 ?? Y2, Y2, j2 ? N2 : Y2);
      (!t12.isOrdinal || 1 !== w2 || o2) && (L2 < V2 && (L2 = V2, w2 >= 1 && (O2 = L2 + G2)), O2 > U2 && (O2 = U2, w2 >= 1 && (L2 = O2 - G2)), (o2 || t12.series.length && (L2 !== B2 || O2 !== N2) && L2 >= V2 && O2 <= U2) && (r2 ? r2[t12.coll].push({ axis: t12, min: L2, max: O2 }) : (t12.isPanning = "zoom" !== n2, t12.isPanning && "mousewheel" !== n2 && (g2 = true), t12.setExtremes(o2 ? void 0 : L2, o2 ? void 0 : O2, false, false, { move: S2, trigger: n2, scale: w2 }), !o2 && (L2 > V2 || O2 < U2) && (p2 = h2)), c2 = true), this.hasCartesianSeries || o2 || (p2 = h2), i10 && (this[e11 ? "mouseDownX" : "mouseDownY"] = i10[e11 ? "chartX" : "chartY"]));
    }
    return c2 && (r2 ? J(this, "selection", r2, () => {
      delete t11.selection, t11.trigger = "zoom", this.transform(t11);
    }) : (!p2 || g2 || this.resetZoomButton ? !p2 && this.resetZoomButton && (this.resetZoomButton = this.resetZoomButton.destroy()) : this.showResetZoom(), this.redraw("zoom" === n2 && (this.options.chart.animation ?? this.pointCount < 100)))), c2;
  }
};
K(i4.prototype, { callbacks: [], collectionsWithInit: { xAxis: [i4.prototype.addAxis, [true]], yAxis: [i4.prototype.addAxis, [false]], series: [i4.prototype.addSeries] }, collectionsWithUpdate: ["xAxis", "yAxis", "series"], propsRequireDirtyBox: ["backgroundColor", "borderColor", "borderWidth", "borderRadius", "plotBackgroundColor", "plotBackgroundImage", "plotBorderColor", "plotBorderWidth", "plotShadow", "shadow"], propsRequireReflow: ["margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "spacing", "spacingTop", "spacingRight", "spacingBottom", "spacingLeft"], propsRequireUpdateSeries: ["chart.inverted", "chart.polar", "chart.ignoreHiddenSeries", "chart.type", "colors", "plotOptions", "time", "tooltip"] });
var { stop: i8 } = tJ;
var { composed: i7 } = D;
function st() {
  let t11 = this.scrollablePlotArea;
  (this.scrollablePixelsX || this.scrollablePixelsY) && !t11 && (this.scrollablePlotArea = t11 = new si(this)), t11?.applyFixed();
}
function se() {
  this.chart.scrollablePlotArea && (this.chart.scrollablePlotArea.isDirty = true);
}
var si = class _si {
  static compose(t11, e10, i10) {
    tv(i7, this.compose) && (z(t11, "afterInit", se), z(e10, "afterSetChartSize", (t12) => this.afterSetSize(t12.target, t12)), z(e10, "render", st), z(i10, "show", se));
  }
  static afterSetSize(t11, e10) {
    let i10, s10, o2, { minWidth: r2, minHeight: a2 } = t11.options.chart.scrollablePlotArea || {}, { clipBox: n2, plotBox: h2, inverted: l2, renderer: d2 } = t11;
    if (!d2.forExport) if (r2 ? (t11.scrollablePixelsX = i10 = Math.max(0, r2 - t11.chartWidth), i10 && (t11.scrollablePlotBox = tg(t11.plotBox), h2.width = t11.plotWidth += i10, n2[l2 ? "height" : "width"] += i10, o2 = true)) : a2 && (t11.scrollablePixelsY = s10 = Math.max(0, a2 - t11.chartHeight), $(s10) && (t11.scrollablePlotBox = tg(t11.plotBox), h2.height = t11.plotHeight += s10, n2[l2 ? "width" : "height"] += s10, o2 = false)), $(o2)) {
      if (!e10.skipAxes) for (let e11 of t11.axes) (e11.horiz === o2 || t11.hasParallelCoordinates && "yAxis" === e11.coll) && (e11.setAxisSize(), e11.setAxisTranslation());
    } else delete t11.scrollablePlotBox;
  }
  constructor(t11) {
    let e10, i10 = t11.options.chart, s10 = es.getRendererType(), o2 = i10.scrollablePlotArea || {}, r2 = this.moveFixedElements.bind(this), a2 = { WebkitOverflowScrolling: "touch", overflowX: "hidden", overflowY: "hidden" };
    t11.scrollablePixelsX && (a2.overflowX = "auto"), t11.scrollablePixelsY && (a2.overflowY = "auto"), this.chart = t11;
    let n2 = this.parentDiv = F("div", { className: "highcharts-scrolling-parent" }, { position: "relative" }, t11.renderTo), h2 = this.scrollingContainer = F("div", { className: "highcharts-scrolling" }, a2, n2), l2 = this.innerContainer = F("div", { className: "highcharts-inner-container" }, void 0, h2), d2 = this.fixedDiv = F("div", { className: "highcharts-fixed" }, { position: "absolute", overflow: "hidden", pointerEvents: "none", zIndex: (i10.style?.zIndex || 0) + 2, top: 0 }, void 0, true), c2 = this.fixedRenderer = new s10(d2, t11.chartWidth, t11.chartHeight, i10.style);
    this.mask = c2.path().attr({ fill: i10.backgroundColor || "#fff", "fill-opacity": o2.opacity ?? 0.85, zIndex: -1 }).addClass("highcharts-scrollable-mask").add(), h2.parentNode.insertBefore(d2, h2), j(t11.renderTo, { overflow: "visible" }), z(t11, "afterShowResetZoom", r2), z(t11, "afterApplyDrilldown", r2), z(t11, "afterLayOutTitles", r2), z(h2, "scroll", () => {
      let { pointer: i11, hoverPoint: s11 } = t11;
      i11 && (delete i11.chartPosition, s11 && (e10 = s11), i11.runPointActions(void 0, e10, true));
    }), l2.appendChild(t11.container);
  }
  applyFixed() {
    let { chart: t11, fixedRenderer: e10, isDirty: i10, scrollingContainer: s10 } = this, { axisOffset: o2, chartWidth: r2, chartHeight: a2, container: n2, plotHeight: h2, plotLeft: l2, plotTop: d2, plotWidth: c2, scrollablePixelsX: p2 = 0, scrollablePixelsY: g2 = 0 } = t11, { scrollPositionX: u2 = 0, scrollPositionY: f2 = 0 } = t11.options.chart.scrollablePlotArea || {}, m2 = r2 + p2, x2 = a2 + g2;
    e10.setSize(r2, a2), (i10 ?? true) && (this.isDirty = false, this.moveFixedElements()), i8(t11.container), j(n2, { width: `${m2}px`, height: `${x2}px` }), t11.renderer.boxWrapper.attr({ width: m2, height: x2, viewBox: ["0 0", m2, x2].join(" ") }), t11.chartBackground?.attr({ width: m2, height: x2 }), j(s10, { width: `${r2}px`, height: `${a2}px` }), $(i10) || (s10.scrollLeft = p2 * u2, s10.scrollTop = g2 * f2);
    let y2 = d2 - o2[0] - 1, b2 = l2 - o2[3] - 1, v2 = d2 + h2 + o2[2] + 1, k2 = l2 + c2 + o2[1] + 1, w2 = l2 + c2 - p2, M2 = d2 + h2 - g2, S2 = [["M", 0, 0]];
    p2 ? S2 = [["M", 0, y2], ["L", l2 - 1, y2], ["L", l2 - 1, v2], ["L", 0, v2], ["Z"], ["M", w2, y2], ["L", r2, y2], ["L", r2, v2], ["L", w2, v2], ["Z"]] : g2 && (S2 = [["M", b2, 0], ["L", b2, d2 - 1], ["L", k2, d2 - 1], ["L", k2, 0], ["Z"], ["M", b2, M2], ["L", b2, a2], ["L", k2, a2], ["L", k2, M2], ["Z"]]), "adjustHeight" !== t11.redrawTrigger && this.mask.attr({ d: S2 });
  }
  moveFixedElements() {
    let t11, { container: e10, inverted: i10, scrollablePixelsX: s10, scrollablePixelsY: o2 } = this.chart, r2 = this.fixedRenderer, a2 = _si.fixedSelectors.slice();
    if (s10 && !i10 ? t11 = ".highcharts-yaxis" : s10 && i10 || o2 && !i10 ? t11 = ".highcharts-xaxis" : o2 && i10 && (t11 = ".highcharts-yaxis"), t11 && !(this.chart.hasParallelCoordinates && ".highcharts-yaxis" === t11)) for (let e11 of [`${t11}:not(.highcharts-radial-axis)`, `${t11}-labels:not(.highcharts-radial-axis-labels)`]) tv(a2, e11);
    else for (let t12 of [".highcharts-xaxis", ".highcharts-yaxis"]) for (let e11 of [`${t12}:not(.highcharts-radial-axis)`, `${t12}-labels:not(.highcharts-radial-axis-labels)`]) _(a2, e11);
    for (let t12 of a2) [].forEach.call(e10.querySelectorAll(t12), (t13) => {
      (t13.namespaceURI === r2.SVG_NS ? r2.box : r2.box.parentNode).appendChild(t13), t13.style.pointerEvents = "auto";
    });
  }
};
si.fixedSelectors = [".highcharts-breadcrumbs-group", ".highcharts-contextbutton", ".highcharts-caption", ".highcharts-credits", ".highcharts-drillup-button", ".highcharts-legend", ".highcharts-legend-checkbox", ".highcharts-navigator-series", ".highcharts-navigator-xaxis", ".highcharts-navigator-yaxis", ".highcharts-navigator", ".highcharts-range-selector-group", ".highcharts-reset-zoom", ".highcharts-scrollbar", ".highcharts-subtitle", ".highcharts-title"];
var { format: ss } = ei;
var { series: so } = iL;
var sr = class {
  constructor(t11, e10, i10, s10, o2) {
    let r2 = t11.chart.inverted, a2 = t11.reversed;
    this.axis = t11;
    let n2 = this.isNegative = !!i10 != !!a2;
    this.options = e10 = e10 || {}, this.x = s10, this.total = null, this.cumulative = null, this.points = {}, this.hasValidPoints = false, this.stack = o2, this.leftCliff = 0, this.rightCliff = 0, this.alignOptions = { align: e10.align || (r2 ? n2 ? "left" : "right" : "center"), verticalAlign: e10.verticalAlign || (r2 ? "middle" : n2 ? "bottom" : "top"), y: e10.y, x: e10.x }, this.textAlign = e10.textAlign || (r2 ? n2 ? "right" : "left" : "center");
  }
  destroy() {
    V(this, this.axis);
  }
  render(t11) {
    let e10 = this.axis.chart, i10 = this.options, s10 = i10.format, o2 = (s10 ? ss(s10, this, e10) : i10.formatter?.call(this, this)) || "";
    if (this.label) this.label.attr({ text: o2, visibility: "hidden" });
    else {
      this.label = e10.renderer.label(o2, null, void 0, i10.shape, void 0, void 0, i10.useHTML, false, "stack-labels");
      let s11 = { r: i10.borderRadius || 0, text: o2, padding: ty(i10.padding, 5), visibility: "hidden" };
      e10.styledMode || (s11.fill = i10.backgroundColor, s11.stroke = i10.borderColor, s11["stroke-width"] = i10.borderWidth, this.label.css(i10.style || {})), this.label.attr(s11), this.label.added || this.label.add(t11);
    }
    this.label.labelrank = e10.plotSizeY, J(this, "afterRender");
  }
  setOffset(t11, e10, i10, s10, o2, r2) {
    let { alignOptions: a2, axis: n2, label: h2, options: l2, textAlign: d2 } = this, c2 = n2.chart, p2 = this.getStackBox({ xOffset: t11, width: e10, boxBottom: i10, boxTop: s10, defaultX: o2, xAxis: r2 }), { verticalAlign: g2 } = a2;
    if (h2 && p2) {
      let t12 = h2.getBBox(void 0, 0), e11 = h2.padding, i11 = "justify" === ty(l2.overflow, "justify"), s11;
      a2.x = l2.x || 0, a2.y = l2.y || 0;
      let { x: o3, y: r3 } = this.adjustStackPosition({ labelBox: t12, verticalAlign: g2, textAlign: d2 });
      p2.x -= o3, p2.y -= r3, h2.align(a2, false, p2), (s11 = c2.isInsidePlot(h2.alignAttr.x + a2.x + o3, h2.alignAttr.y + a2.y + r3)) || (i11 = false), i11 && so.prototype.justifyDataLabel.call(n2, h2, a2, h2.alignAttr, t12, p2), h2.attr({ x: h2.alignAttr.x, y: h2.alignAttr.y, rotation: l2.rotation, rotationOriginX: t12.width * Q(l2.textAlign || "center"), rotationOriginY: t12.height / 2 }), ty(!i11 && l2.crop, true) && (s11 = th(h2.x) && th(h2.y) && c2.isInsidePlot(h2.x - e11 + (h2.width || 0), h2.y) && c2.isInsidePlot(h2.x + e11, h2.y)), h2[s11 ? "show" : "hide"]();
    }
    J(this, "afterSetOffset", { xOffset: t11, width: e10 });
  }
  adjustStackPosition({ labelBox: t11, verticalAlign: e10, textAlign: i10 }) {
    return { x: t11.width / 2 + t11.width / 2 * (2 * Q(i10) - 1), y: t11.height / 2 * 2 * (1 - Q(e10)) };
  }
  getStackBox(t11) {
    let e10 = this.axis, i10 = e10.chart, { boxTop: s10, defaultX: o2, xOffset: r2, width: a2, boxBottom: n2 } = t11, h2 = e10.stacking.usePercentage ? 100 : ty(s10, this.total, 0), l2 = e10.toPixels(h2), d2 = t11.xAxis || i10.xAxis[0], c2 = ty(o2, d2.translate(this.x)) + r2, p2 = Math.abs(l2 - e10.toPixels(n2 || th(e10.min) && e10.logarithmic && e10.logarithmic.lin2log(e10.min) || 0)), g2 = i10.inverted, u2 = this.isNegative;
    return g2 ? { x: (u2 ? l2 : l2 - p2) - i10.plotLeft, y: d2.height - c2 - a2 + d2.top - i10.plotTop, width: p2, height: a2 } : { x: c2 + d2.transB - i10.plotLeft, y: (u2 ? l2 - p2 : l2) - i10.plotTop, width: a2, height: p2 };
  }
};
var { getDeferredAnimation: sa } = tJ;
var { series: { prototype: sn } } = iL;
function sh() {
  let t11 = this.inverted;
  this.axes.forEach((t12) => {
    t12.stacking?.stacks && t12.hasVisibleSeries && (t12.stacking.oldStacks = t12.stacking.stacks);
  }), this.series.forEach((e10) => {
    let i10 = e10.xAxis?.options || {};
    e10.options.stacking && e10.reserveSpace() && (e10.stackKey = [e10.type, ty(e10.options.stack, ""), t11 ? i10.top : i10.left, t11 ? i10.height : i10.width].join(","));
  });
}
function sl() {
  let t11 = this.stacking;
  if (t11) {
    let e10 = t11.stacks;
    tf(e10, (t12, i10) => {
      V(t12), delete e10[i10];
    }), t11.stackTotalGroup?.destroy();
  }
}
function sd() {
  this.stacking || (this.stacking = new sm(this));
}
function sc(t11, e10, i10, s10) {
  return !$(t11) || t11.x !== e10 || s10 && t11.stackKey !== s10 ? t11 = { x: e10, index: 0, key: s10, stackKey: s10 } : t11.index++, t11.key = [i10, e10, t11.index].join(","), t11;
}
function sp() {
  let t11, e10 = this, i10 = e10.yAxis, s10 = e10.stackKey || "", o2 = i10.stacking.stacks, r2 = e10.getColumn("x", true), a2 = e10.options.stacking, n2 = e10[a2 + "Stacker"];
  n2 && [s10, "-" + s10].forEach((i11) => {
    let s11 = r2.length, a3, h2, l2;
    for (; s11--; ) a3 = r2[s11], t11 = e10.getStackIndicator(t11, a3, e10.index, i11), h2 = o2[i11]?.[a3], (l2 = h2?.points[t11.key || ""]) && n2.call(e10, l2, h2, s11);
  });
}
function sg(t11, e10, i10) {
  let s10 = e10.total ? 100 / e10.total : 0;
  t11[0] = H(t11[0] * s10), t11[1] = H(t11[1] * s10), this.stackedYData[i10] = t11[1];
}
function su(t11) {
  (this.is("column") || this.is("columnrange")) && (this.options.centerInCategory && this.chart.series.length > 1 ? sn.setStackedPoints.call(this, t11, "group") : t11.stacking.resetStacks());
}
function sf(t11, e10) {
  let i10, s10, o2, r2, a2, n2, h2, l2 = e10 || this.options.stacking;
  if (!l2 || !this.reserveSpace() || ({ group: "xAxis" }[l2] || "yAxis") !== t11.coll) return;
  let d2 = this.getColumn("x", true), c2 = this.getColumn(this.pointValKey || "y", true), p2 = [], g2 = c2.length, u2 = this.options, f2 = u2.threshold || 0, m2 = u2.startFromThreshold ? f2 : 0, x2 = u2.stack, y2 = e10 ? `${this.type},${l2}` : this.stackKey || "", b2 = "-" + y2, v2 = this.negStacks, k2 = t11.stacking, w2 = k2.stacks, M2 = k2.oldStacks;
  for (k2.stacksTouched += 1, h2 = 0; h2 < g2; h2++) {
    let e11 = d2[h2] || 0, g3 = c2[h2], u3 = th(g3) && g3 || 0;
    n2 = (i10 = this.getStackIndicator(i10, e11, this.index)).key || "", w2[a2 = (s10 = v2 && u3 < (m2 ? 0 : f2)) ? b2 : y2] || (w2[a2] = {}), w2[a2][e11] || (M2[a2]?.[e11] ? (w2[a2][e11] = M2[a2][e11], w2[a2][e11].total = null) : w2[a2][e11] = new sr(t11, t11.options.stackLabels, !!s10, e11, x2)), o2 = w2[a2][e11], null !== g3 ? (o2.points[n2] = o2.points[this.index] = [ty(o2.cumulative, m2)], $(o2.cumulative) || (o2.base = n2), o2.touched = k2.stacksTouched, i10.index > 0 && false === this.singleStacks && (o2.points[n2][0] = o2.points[this.index + "," + e11 + ",0"][0])) : (delete o2.points[n2], delete o2.points[this.index]);
    let S2 = o2.total || 0;
    "percent" === l2 ? (r2 = s10 ? y2 : b2, S2 = v2 && w2[r2]?.[e11] ? (r2 = w2[r2][e11]).total = Math.max(r2.total || 0, S2) + Math.abs(u3) : H(S2 + Math.abs(u3))) : "group" === l2 ? th(g3) && S2++ : S2 = H(S2 + u3), "group" === l2 ? o2.cumulative = (S2 || 1) - 1 : o2.cumulative = H(ty(o2.cumulative, m2) + u3), o2.total = S2, null !== g3 && (o2.points[n2].push(o2.cumulative), p2[h2] = o2.cumulative, o2.hasValidPoints = true);
  }
  "percent" === l2 && (k2.usePercentage = true), "group" !== l2 && (this.stackedYData = p2), k2.oldStacks = {};
}
var sm = class {
  constructor(t11) {
    this.oldStacks = {}, this.stacks = {}, this.stacksTouched = 0, this.axis = t11;
  }
  buildStacks() {
    let t11, e10, i10 = this.axis, s10 = i10.series, o2 = "xAxis" === i10.coll, r2 = i10.options.reversedStacks, a2 = s10.length;
    for (this.resetStacks(), this.usePercentage = false, e10 = a2; e10--; ) t11 = s10[r2 ? e10 : a2 - e10 - 1], o2 && t11.setGroupedPoints(i10), t11.setStackedPoints(i10);
    if (!o2) for (e10 = 0; e10 < a2; e10++) s10[e10].modifyStacks();
    J(i10, "afterBuildStacks");
  }
  cleanStacks() {
    this.oldStacks && (this.stacks = this.oldStacks, tf(this.stacks, (t11) => {
      tf(t11, (t12) => {
        t12.cumulative = t12.total;
      });
    }));
  }
  resetStacks() {
    tf(this.stacks, (t11) => {
      tf(t11, (e10, i10) => {
        th(e10.touched) && e10.touched < this.stacksTouched ? (e10.destroy(), delete t11[i10]) : (e10.total = null, e10.cumulative = null);
      });
    });
  }
  renderStackTotals() {
    let t11 = this.axis, e10 = t11.chart, i10 = e10.renderer, s10 = this.stacks, o2 = sa(e10, t11.options.stackLabels?.animation || false), r2 = this.stackTotalGroup = this.stackTotalGroup || i10.g("stack-labels").attr({ zIndex: 6, opacity: 0 }).add();
    r2.translate(e10.plotLeft, e10.plotTop), tf(s10, (t12) => {
      tf(t12, (t13) => {
        t13.render(r2);
      });
    }), r2.animate({ opacity: 1 }, o2);
  }
};
(T || (T = {})).compose = function(t11, e10, i10) {
  let s10 = e10.prototype, o2 = i10.prototype;
  s10.getStacks || (z(t11, "init", sd), z(t11, "destroy", sl), s10.getStacks = sh, o2.getStackIndicator = sc, o2.modifyStacks = sp, o2.percentStacker = sg, o2.setGroupedPoints = su, o2.setStackedPoints = sf);
};
var sx = T;
var sy = class extends iX {
  drawGraph() {
    let t11 = this.options, e10 = (this.gappedPath || this.getGraphPath).call(this), i10 = this.chart.styledMode;
    [this, ...this.zones].forEach((s10, o2) => {
      let r2, a2 = s10.graph, n2 = a2 ? "animate" : "attr", h2 = s10.dashStyle || t11.dashStyle;
      if (a2 ? (a2.endX = this.preventGraphAnimation ? null : e10.xMap, a2.animate({ d: e10 })) : e10.length && (s10.graph = a2 = this.chart.renderer.path(e10).addClass("highcharts-graph" + (o2 ? ` highcharts-zone-graph-${o2 - 1} ` : " ") + (o2 && s10.className || "")).attr({ zIndex: 1 }).add(this.group)), a2 && !i10 && (r2 = { stroke: !o2 && t11.lineColor || s10.color || this.color || "#cccccc", "stroke-width": t11.lineWidth || 0, fill: this.fillGraph && this.color || "none" }, h2 ? r2.dashstyle = h2 : "square" !== t11.linecap && (r2["stroke-linecap"] = r2["stroke-linejoin"] = "round"), a2[n2](r2), t11.shadow)) {
        let e11 = this.chart.inverted, i11 = { filterUnits: "userSpaceOnUse" }, s11 = tp(t11.shadow) ? tg(e11 ? {} : i11, t11.shadow) : !!e11 || i11;
        a2.shadow(s11);
      }
      a2 && (a2.startX = e10.xMap, a2.isArea = e10.isArea);
    });
  }
  getGraphPath(t11, e10, i10) {
    let s10 = this, o2 = s10.options, r2 = [], a2 = [], n2, h2 = o2.step, l2 = (t11 = t11 || s10.points).reversed;
    return l2 && t11.reverse(), (h2 = { right: 1, center: 2 }[h2] || h2 && 3) && l2 && (h2 = 4 - h2), (t11 = this.getValidPoints(t11, false, o2.nullInteraction || !(o2.connectNulls && !e10 && !i10))).forEach(function(l3, d2) {
      let c2, p2 = l3.plotX, g2 = l3.plotY, u2 = t11[d2 - 1], f2 = l3.isNull || "number" != typeof g2;
      (l3.leftCliff || u2?.rightCliff) && !i10 && (n2 = true), f2 && !$(e10) && d2 > 0 ? n2 = !o2.connectNulls : f2 && !e10 ? n2 = true : (0 === d2 || n2 ? c2 = [["M", l3.plotX, l3.plotY]] : s10.getPointSpline ? c2 = [s10.getPointSpline(t11, l3, d2)] : h2 ? (c2 = 1 === h2 ? [["L", u2.plotX, g2]] : 2 === h2 ? [["L", (u2.plotX + p2) / 2, u2.plotY], ["L", (u2.plotX + p2) / 2, g2]] : [["L", p2, u2.plotY]]).push(["L", p2, g2]) : c2 = [["L", p2, g2]], a2.push(l3.x), h2 && (a2.push(l3.x), 2 === h2 && a2.push(l3.x)), r2.push.apply(r2, c2), n2 = false);
    }), r2.xMap = a2, s10.graphPath = r2, r2;
  }
};
sy.defaultOptions = tg(iX.defaultOptions, { legendSymbol: "lineMarker" }), iL.registerSeriesType("line", sy);
var { seriesTypes: { line: sb } } = iL;
var sv = class extends sb {
  drawGraph() {
    this.areaPath = [], super.drawGraph.apply(this);
    let { areaPath: t11, options: e10 } = this;
    [this, ...this.zones].forEach((i10, s10) => {
      let o2 = {}, r2 = i10.fillColor || e10.fillColor, a2 = i10.area, n2 = a2 ? "animate" : "attr";
      a2 ? (a2.endX = this.preventGraphAnimation ? null : t11.xMap, a2.animate({ d: t11 })) : (o2.zIndex = 0, (a2 = i10.area = this.chart.renderer.path(t11).addClass("highcharts-area" + (s10 ? ` highcharts-zone-area-${s10 - 1} ` : " ") + (s10 && i10.className || "")).add(this.group)).isArea = true), this.chart.styledMode || (o2.fill = r2 || i10.color || this.color, o2["fill-opacity"] = r2 ? 1 : e10.fillOpacity ?? 0.75, a2.css({ pointerEvents: this.stickyTracking ? "none" : "auto" })), a2[n2](o2), a2.startX = t11.xMap, a2.shiftUnit = e10.step ? 2 : 1;
    });
  }
  getGraphPath(t11) {
    let e10, i10, s10, o2 = sb.prototype.getGraphPath, r2 = this.options, a2 = r2.stacking, n2 = this.yAxis, h2 = [], l2 = [], d2 = this.index, c2 = n2.stacking.stacks[this.stackKey], p2 = r2.threshold, g2 = Math.round(n2.getThreshold(r2.threshold)), u2 = ty(r2.connectNulls, "percent" === a2), f2 = function(i11, s11, o3) {
      let r3 = t11[i11], u3 = t11[s11], f3 = a2 && c2[r3.x].points[d2], m3 = r3[o3 + "Null"] || 0, x3 = r3[o3 + "Cliff"] || 0, y3, b3, v3 = true;
      f3 && (x3 || m3) ? (y3 = (m3 ? f3[0] : f3[1]) + x3, b3 = f3[0] + x3, v3 = !!m3) : !a2 && u3 && (u3.isNull || !$(u3.plotY)) && (y3 = b3 = p2), void 0 !== y3 && (l2.push({ plotX: e10, plotY: null === y3 ? g2 : n2.getThreshold(y3), isNull: v3, isCliff: true }), h2.push({ plotX: e10, plotY: null === b3 ? g2 : n2.getThreshold(b3), doCurve: false }));
    };
    t11 = t11 || this.points, a2 && (t11 = this.getStackPoints(t11));
    for (let o3 = 0, r3 = t11.length; o3 < r3; ++o3) a2 || (t11[o3].leftCliff = t11[o3].rightCliff = t11[o3].leftNull = t11[o3].rightNull = void 0), i10 = t11[o3].isNull || !$(t11[o3].plotY), e10 = ty(t11[o3].rectPlotX, t11[o3].plotX), s10 = a2 ? ty(t11[o3].yBottom, g2) : g2, (!i10 || u2) && (u2 || f2(o3, o3 - 1, "left"), i10 && !a2 && u2 || (l2.push(t11[o3]), h2.push({ x: o3, plotX: e10, plotY: s10 })), u2 || f2(o3, o3 + 1, "right"));
    let m2 = o2.call(this, l2, true, true);
    h2.reversed = true;
    let x2 = o2.call(this, h2, true, true), y2 = x2[0];
    y2 && "M" === y2[0] && (x2[0] = ["L", y2[1], y2[2]]);
    let b2 = m2.concat(x2);
    b2.length && b2.push(["Z"]);
    let v2 = o2.call(this, l2, false, u2);
    return this.chart.series.length > 1 && a2 && l2.some((t12) => t12.isCliff) && (b2.hasStackedCliffs = v2.hasStackedCliffs = true), b2.xMap = m2.xMap, this.areaPath = b2, v2;
  }
  getStackPoints(t11) {
    let e10 = this, i10 = [], s10 = [], o2 = this.xAxis, r2 = this.yAxis, a2 = r2.stacking.stacks[this.stackKey], n2 = {}, h2 = r2.series, l2 = h2.length, d2 = r2.options.reversedStacks ? 1 : -1, c2 = h2.indexOf(e10), p2 = r2.getThreshold(e10.options.threshold || 0);
    if (t11 = t11 || this.points, this.options.stacking) {
      for (let e11 = 0; e11 < t11.length; e11++) t11[e11].leftNull = t11[e11].rightNull = void 0, n2[t11[e11].x] = t11[e11];
      tf(a2, function(t12, e11) {
        null !== t12.total && s10.push(e11);
      }), s10.sort(function(t12, e11) {
        return t12 - e11;
      });
      let g2 = h2.map((t12) => t12.visible);
      s10.forEach(function(t12, u2) {
        let f2 = 0, m2, x2;
        if (n2[t12] && !n2[t12].isNull) i10.push(n2[t12]), [-1, 1].forEach(function(i11) {
          let o3 = 1 === i11 ? "rightNull" : "leftNull", r3 = a2[s10[u2 + i11]], p3 = 0;
          if (r3) {
            let i12 = c2;
            for (; i12 >= 0 && i12 < l2; ) {
              let s11 = h2[i12].index;
              !(m2 = r3.points[s11]) && (s11 === e10.index ? n2[t12][o3] = true : g2[i12] && (x2 = a2[t12].points[s11]) && (p3 -= x2[1] - x2[0])), i12 += d2;
            }
          }
          n2[t12][1 === i11 ? "rightCliff" : "leftCliff"] = p3;
        });
        else {
          let e11 = c2;
          for (; e11 >= 0 && e11 < l2; ) {
            let i11 = h2[e11].index;
            if (m2 = a2[t12].points[i11]) {
              f2 = m2[1];
              break;
            }
            e11 += d2;
          }
          f2 || (f2 = 0);
          let s11 = r2.positiveValuesOnly && f2 <= 0 ? p2 : r2.translate(f2, false, true, false, true);
          i10.push({ isNull: true, plotX: o2.translate(t12, false, false, false, true), x: t12, plotY: s11, yBottom: s11 });
        }
      });
    }
    return i10;
  }
};
sv.defaultOptions = tg(sb.defaultOptions, { threshold: 0, legendSymbol: "areaMarker" }), K(sv.prototype, { singleStacks: false }), iL.registerSeriesType("area", sv);
var { line: sk } = iL.seriesTypes;
var sw = class extends sk {
  getPointSpline(t11, e10, i10) {
    let s10, o2, r2, a2, n2 = e10.plotX || 0, h2 = e10.plotY || 0, l2 = t11[i10 - 1], d2 = t11[i10 + 1];
    function c2(t12) {
      return t12 && !t12.isNull && false !== t12.doCurve && !e10.isCliff;
    }
    if (c2(l2) && c2(d2)) {
      let t12 = l2.plotX || 0, i11 = l2.plotY || 0, c3 = d2.plotX || 0, p3 = d2.plotY || 0, g2 = 0;
      s10 = (1.5 * n2 + t12) / 2.5, o2 = (1.5 * h2 + i11) / 2.5, r2 = (1.5 * n2 + c3) / 2.5, a2 = (1.5 * h2 + p3) / 2.5, r2 !== s10 && (g2 = (a2 - o2) * (r2 - n2) / (r2 - s10) + h2 - a2), o2 += g2, a2 += g2, o2 > i11 && o2 > h2 ? (o2 = Math.max(i11, h2), a2 = 2 * h2 - o2) : o2 < i11 && o2 < h2 && (o2 = Math.min(i11, h2), a2 = 2 * h2 - o2), a2 > p3 && a2 > h2 ? (a2 = Math.max(p3, h2), o2 = 2 * h2 - a2) : a2 < p3 && a2 < h2 && (a2 = Math.min(p3, h2), o2 = 2 * h2 - a2), e10.rightContX = r2, e10.rightContY = a2, e10.controlPoints = { low: [s10, o2], high: [r2, a2] };
    }
    let p2 = ["C", ty(l2.rightContX, l2.plotX, 0), ty(l2.rightContY, l2.plotY, 0), ty(s10, n2, 0), ty(o2, h2, 0), n2, h2];
    return l2.rightContX = l2.rightContY = void 0, p2;
  }
};
sw.defaultOptions = tg(sk.defaultOptions), iL.registerSeriesType("spline", sw);
var sM = sw;
var { area: sS, area: { prototype: sT } } = iL.seriesTypes;
var sC = class extends sM {
};
sC.defaultOptions = tg(sM.defaultOptions, sS.defaultOptions), K(sC.prototype, { getGraphPath: sT.getGraphPath, getStackPoints: sT.getStackPoints, drawGraph: sT.drawGraph }), iL.registerSeriesType("areaspline", sC);
var { animObject: sA } = tJ;
var { parse: sP } = tV;
var { noop: sL } = D;
var sO = class extends iX {
  animate(t11) {
    let e10, i10, s10 = this, o2 = this.yAxis, r2 = o2.pos, a2 = o2.reversed, n2 = s10.options, { clipOffset: h2, inverted: l2 } = this.chart, d2 = {}, c2 = l2 ? "translateX" : "translateY";
    t11 && h2 ? (d2.scaleY = 1e-3, i10 = G(o2.toPixels(n2.threshold || 0), r2, r2 + o2.len), l2 ? d2.translateX = (i10 += a2 ? -Math.floor(h2[0]) : Math.ceil(h2[2])) - o2.len : d2.translateY = i10 += a2 ? Math.ceil(h2[0]) : -Math.floor(h2[2]), s10.clipBox && s10.setClip(), s10.group.attr(d2)) : (e10 = Number(s10.group.attr(c2)), s10.group.animate({ scaleY: 1 }, K(sA(s10.options.animation), { step: function(t12, i11) {
      s10.group && (d2[c2] = e10 + i11.pos * (r2 - e10), s10.group.attr(d2));
    } })));
  }
  init(t11, e10) {
    super.init.apply(this, arguments);
    let i10 = this;
    (t11 = i10.chart).hasRendered && t11.series.forEach(function(t12) {
      t12.type === i10.type && (t12.isDirty = true);
    });
  }
  getColumnMetrics() {
    let t11 = this, e10 = t11.options, i10 = t11.xAxis, s10 = t11.yAxis, o2 = i10.options.reversedStacks, r2 = i10.reversed && !o2 || !i10.reversed && o2, a2 = {}, n2, h2 = 0;
    false === e10.grouping ? h2 = 1 : t11.chart.series.forEach(function(e11) {
      let i11, o3 = e11.yAxis, r3 = e11.options;
      e11.type === t11.type && e11.reserveSpace() && s10.len === o3.len && s10.pos === o3.pos && (r3.stacking && "group" !== r3.stacking ? (void 0 === a2[n2 = e11.stackKey] && (a2[n2] = h2++), i11 = a2[n2]) : false !== r3.grouping && (i11 = h2++), e11.columnIndex = i11);
    });
    let l2 = Math.min(Math.abs(i10.transA) * (!i10.brokenAxis?.hasBreaks && i10.ordinal?.slope || e10.pointRange || i10.closestPointRange || i10.tickInterval || 1), i10.len), d2 = l2 * e10.groupPadding, c2 = (l2 - 2 * d2) / (h2 || 1), p2 = Math.min(e10.maxPointWidth || i10.len, ty(e10.pointWidth, c2 * (1 - 2 * e10.pointPadding))), g2 = (t11.columnIndex || 0) + +!!r2;
    return t11.columnMetrics = { width: p2, offset: (c2 - p2) / 2 + (d2 + g2 * c2 - l2 / 2) * (r2 ? -1 : 1), paddedWidth: c2, columnCount: h2 }, t11.columnMetrics;
  }
  crispCol(t11, e10, i10, s10) {
    let o2 = this.borderWidth, r2 = this.chart.inverted;
    return s10 = Y(e10 + s10, o2, r2) - (e10 = Y(e10, o2, r2)), this.options.crisp && (i10 = Y(t11 + i10, o2) - (t11 = Y(t11, o2))), { x: t11, y: e10, width: i10, height: s10 };
  }
  adjustForMissingColumns(t11, e10, i10, s10) {
    if (!i10.isNull && s10.columnCount > 1) {
      let o2 = this.xAxis.series.filter((t12) => t12.visible).map((t12) => t12.index), r2 = 0, a2 = 0;
      tf(this.xAxis.stacking?.stacks, (t12) => {
        let e11 = "number" == typeof i10.x ? t12[i10.x.toString()]?.points : void 0, s11 = e11?.[this.index], n3 = {};
        if (e11 && td(s11)) {
          let t13 = this.index, i11 = Object.keys(e11).filter((t14) => !t14.match(",") && e11[t14] && e11[t14].length > 1).map(parseFloat).filter((t14) => -1 !== o2.indexOf(t14)).filter((e12) => {
            let i12 = this.chart.series[e12].options, s12 = i12.stacking && i12.stack;
            if ($(s12)) {
              if (th(n3[s12])) return t13 === e12 && (t13 = n3[s12]), false;
              n3[s12] = e12;
            }
            return true;
          }).sort((t14, e12) => e12 - t14);
          r2 = i11.indexOf(t13), a2 = i11.length;
        }
      }), r2 = this.xAxis.reversed ? a2 - 1 - r2 : r2;
      let n2 = (a2 - 1) * s10.paddedWidth + e10;
      t11 = (i10.plotX || 0) + n2 / 2 - e10 - r2 * s10.paddedWidth;
    }
    return t11;
  }
  translate() {
    let t11 = this, e10 = t11.chart, i10 = t11.options, s10 = t11.dense = t11.closestPointRange * t11.xAxis.transA < 2, o2 = t11.borderWidth = i10.borderWidth ?? +!s10, r2 = t11.xAxis, a2 = t11.yAxis, n2 = i10.threshold, h2 = i10.minPointLength ?? 5, l2 = t11.getColumnMetrics(), d2 = l2.width, c2 = t11.pointXOffset = l2.offset, p2 = t11.dataMin, g2 = t11.dataMax, u2 = t11.translatedThreshold = a2.getThreshold(n2), f2 = t11.barW = Math.max(d2, 1 + 2 * o2);
    i10.pointPadding && i10.crisp && (f2 = Math.ceil(f2)), iX.prototype.translate.apply(t11), t11.points.forEach(function(s11) {
      let o3 = s11.yBottom ?? u2, m2 = 999 + Math.abs(o3), x2 = s11.plotX || 0, y2 = G(s11.plotY, -m2, a2.len + m2), b2, v2 = Math.min(y2, o3), k2 = Math.max(y2, o3) - v2, w2 = d2, M2 = x2 + c2, S2 = f2;
      h2 && Math.abs(k2) < h2 && (k2 = h2, b2 = !a2.reversed && !s11.negative || a2.reversed && s11.negative, th(n2) && th(g2) && s11.y === n2 && g2 <= n2 && (a2.min || 0) < n2 && (p2 !== g2 || (a2.max || 0) <= n2) && (b2 = !b2, s11.negative = !s11.negative), v2 = Math.abs(v2 - u2) > h2 ? o3 - (b2 ? h2 : 0) : u2 - (b2 ? h2 : 0)), $(s11.options.pointWidth) && (M2 -= Math.round(((w2 = S2 = Math.ceil(s11.options.pointWidth)) - d2) / 2)), i10.centerInCategory && (M2 = t11.adjustForMissingColumns(M2, w2, s11, l2)), s11.barX = M2, s11.pointWidth = w2, s11.tooltipPos = e10.inverted ? [G(a2.len + a2.pos - e10.plotLeft - y2, a2.pos - e10.plotLeft, a2.len + a2.pos - e10.plotLeft), r2.len + r2.pos - e10.plotTop - M2 - S2 / 2, k2] : [r2.left - e10.plotLeft + M2 + S2 / 2, G(y2 + a2.pos - e10.plotTop, a2.pos - e10.plotTop, a2.len + a2.pos - e10.plotTop), k2], s11.shapeType = t11.pointClass.prototype.shapeType || "roundedRect", s11.shapeArgs = t11.crispCol(M2, v2, S2, s11.isNull ? 0 : k2);
    }), J(this, "afterColumnTranslate");
  }
  drawGraph() {
    this.group[this.dense ? "addClass" : "removeClass"]("highcharts-dense-data");
  }
  pointAttribs(t11, e10) {
    let i10 = this.options, s10 = this.pointAttrToOptions || {}, o2 = s10.stroke || "borderColor", r2 = s10["stroke-width"] || "borderWidth", a2, n2, h2, l2 = t11 && t11.color || this.color, d2 = t11 && t11[o2] || i10[o2] || l2, c2 = t11 && t11.options.dashStyle || i10.dashStyle, p2 = t11 && t11[r2] || i10[r2] || this[r2] || 0, g2 = t11?.isNull && i10.nullInteraction ? 0 : t11?.opacity ?? i10.opacity ?? 1;
    t11 && this.zones.length && (n2 = t11.getZone(), l2 = t11.options.color || n2 && (n2.color || t11.nonZonedColor) || this.color, n2 && (d2 = n2.borderColor || d2, c2 = n2.dashStyle || c2, p2 = n2.borderWidth || p2)), e10 && t11 && (h2 = (a2 = tg(i10.states[e10], t11.options.states?.[e10] || {})).brightness, l2 = a2.color || void 0 !== h2 && sP(l2).brighten(a2.brightness).get() || l2, d2 = a2[o2] || d2, p2 = a2[r2] || p2, c2 = a2.dashStyle || c2, g2 = ty(a2.opacity, g2));
    let u2 = { fill: l2, stroke: d2, "stroke-width": p2, opacity: g2 };
    return c2 && (u2.dashstyle = c2), u2;
  }
  drawPoints(t11 = this.points) {
    let e10, i10 = this, s10 = this.chart, o2 = i10.options, r2 = o2.nullInteraction, a2 = s10.renderer, n2 = o2.animationLimit || 250;
    t11.forEach(function(t12) {
      let h2 = t12.plotY, l2 = t12.graphic, d2 = !!l2, c2 = l2 && s10.pointCount < n2 ? "animate" : "attr";
      th(h2) && (null !== t12.y || r2) ? (e10 = t12.shapeArgs, l2 && t12.hasNewShapeType() && (l2 = l2.destroy()), i10.enabledDataSorting && (t12.startXPos = i10.xAxis.reversed ? -(e10 && e10.width || 0) : i10.xAxis.width), !l2 && (t12.graphic = l2 = a2[t12.shapeType](e10).add(t12.group || i10.group), l2 && i10.enabledDataSorting && s10.hasRendered && s10.pointCount < n2 && (l2.attr({ x: t12.startXPos }), d2 = true, c2 = "animate")), l2 && d2 && l2[c2](tg(e10)), s10.styledMode || l2[c2](i10.pointAttribs(t12, t12.selected && "select")).shadow(false !== t12.allowShadow && o2.shadow), l2 && (l2.addClass(t12.getClassName(), true), l2.attr({ visibility: t12.visible ? "inherit" : "hidden" }))) : l2 && (t12.graphic = l2.destroy());
    });
  }
  drawTracker(t11 = this.points) {
    let e10, i10 = this, s10 = i10.chart, o2 = s10.pointer, r2 = function(t12) {
      o2?.normalize(t12);
      let e11 = o2?.getPointFromEvent(t12);
      o2 && e11 && i10.options.enableMouseTracking && (s10.isInsidePlot(t12.chartX - s10.plotLeft, t12.chartY - s10.plotTop, { visiblePlotOnly: true }) || i10.allowOutsidePlotInteraction && o2?.inClass(t12.target, "highcharts-point") || o2?.inClass(t12.target, "highcharts-data-label")) && (o2.isDirectTouch = true, e11.onMouseOver(t12));
    };
    t11.forEach(function(t12) {
      e10 = td(t12.dataLabels) ? t12.dataLabels : t12.dataLabel ? [t12.dataLabel] : [], t12.graphic && (t12.graphic.element.point = t12), e10.forEach(function(e11) {
        (e11.div || e11.element).point = t12;
      });
    }), i10._hasTracking || (i10.trackerGroups?.reduce((t12, e11) => ("dataLabelsGroup" === e11 ? t12.push(...i10.dataLabelsGroups || []) : t12.push(i10[e11]), t12), []).forEach((t12) => {
      t12 && (t12.addClass("highcharts-tracker").on("mouseover", r2).on("mouseout", function(t13) {
        o2?.onTrackerMouseOut(t13);
      }).on("touchstart", r2), !s10.styledMode && i10.options.cursor && t12.css({ cursor: i10.options.cursor }));
    }), i10._hasTracking = true), J(this, "afterDrawTracker");
  }
  remove() {
    let t11 = this, e10 = t11.chart;
    e10.hasRendered && e10.series.forEach(function(e11) {
      e11.type === t11.type && (e11.isDirty = true);
    }), iX.prototype.remove.apply(t11, arguments);
  }
};
sO.defaultOptions = tg(iX.defaultOptions, { borderRadius: 3, centerInCategory: false, groupPadding: 0.2, marker: null, pointPadding: 0.1, minPointLength: 0, cropThreshold: 50, pointRange: null, states: { hover: { halo: false, brightness: 0.1 }, select: { color: "#cccccc", borderColor: "#000000" } }, dataLabels: { align: void 0, verticalAlign: void 0, y: void 0 }, startFromThreshold: true, stickyTracking: false, tooltip: { distance: 6 }, threshold: 0, borderColor: "#ffffff" }), K(sO.prototype, { directTouch: true, getSymbol: sL, negStacks: true, trackerGroups: ["group", "dataLabelsGroup"] }), iL.registerSeriesType("column", sO);
var sE = sO;
var { getDeferredAnimation: sI } = tJ;
var { format: sD } = ei;
!(function(t11) {
  function e10() {
    return h2(this).some((t12) => t12?.enabled);
  }
  function i10(t12, e11, i11, s11, o3) {
    let { chart: r3, enabledDataSorting: a3 } = this, n3 = this.isCartesian && r3.inverted, h3 = t12.plotX, l3 = t12.plotY, d2 = i11.rotation || 0, c2 = $(h3) && $(l3) && r3.isInsidePlot(h3, Math.round(l3), { inverted: n3, paneCoordinates: true, series: this }), p2 = 0 === d2 && "justify" === ty(i11.overflow, a3 ? "none" : "justify"), g2 = this.visible && false !== t12.visible && $(h3) && (t12.series.forceDL || a3 && !p2 || c2 || ty(i11.inside, !!this.options.stacking) && s11 && r3.isInsidePlot(h3, n3 ? s11.x + 1 : s11.y + s11.height - 1, { inverted: n3, paneCoordinates: true, series: this })), u2 = t12.pos();
    if (g2 && u2) {
      var f2;
      let h4 = e11.getBBox(), l4 = e11.getBBox(void 0, 0);
      if (s11 = K({ x: u2[0], y: Math.round(u2[1]), width: 0, height: 0 }, s11 || {}), "plotEdges" === i11.alignTo && this.isCartesian && (s11[n3 ? "x" : "y"] = 0, s11[n3 ? "width" : "height"] = this.yAxis?.len || 0), K(i11, { width: h4.width, height: h4.height }), f2 = s11, a3 && this.xAxis && !p2 && this.setDataLabelStartPos(t12, e11, o3, c2, f2), e11.align(tg(i11, { width: l4.width, height: l4.height }), false, s11, false), e11.alignAttr.x += Q(i11.align) * (l4.width - h4.width), e11.alignAttr.y += Q(i11.verticalAlign) * (l4.height - h4.height), e11[e11.placed ? "animate" : "attr"]({ "text-align": e11.alignAttr["text-align"] || "center", x: e11.alignAttr.x + (h4.width - l4.width) / 2, y: e11.alignAttr.y + (h4.height - l4.height) / 2, rotationOriginX: (e11.width || 0) / 2, rotationOriginY: (e11.height || 0) / 2 }), p2 && s11.height >= 0) this.justifyDataLabel(e11, i11, e11.alignAttr, h4, s11, o3);
      else if (ty(i11.crop, true)) {
        let { x: t13, y: i12 } = e11.alignAttr;
        g2 = r3.isInsidePlot(t13, i12, { paneCoordinates: true, series: this }) && r3.isInsidePlot(t13 + h4.width - 1, i12 + h4.height - 1, { paneCoordinates: true, series: this });
      }
      i11.shape && !d2 && e11[o3 ? "attr" : "animate"]({ anchorX: u2[0], anchorY: u2[1] });
    }
    o3 && a3 && (e11.placed = false), g2 || a3 && !p2 ? (e11.show(), e11.placed = true) : (e11.hide(), e11.placed = false);
  }
  function s10(t12, e11) {
    J(this, "initDataLabelsGroup", { index: t12, zIndex: e11?.zIndex ?? 6 }), this.dataLabelsGroup = this.dataLabelsGroups?.[t12];
    let i11 = this.plotGroup("dataLabelsGroup", "data-labels", this.hasRendered ? "inherit" : "hidden", e11?.zIndex ?? 6, this.dataLabelsParentGroups?.[t12]);
    return this.dataLabelsGroups || (this.dataLabelsGroups = []), this.dataLabelsGroups[t12] = i11, this.dataLabelsGroup = this.dataLabelsGroups[0], i11;
  }
  function o2(t12, e11, i11) {
    let s11 = !!this.hasRendered, o3 = this.initDataLabelsGroup(t12, i11).attr({ opacity: +s11 });
    return !s11 && o3 && (this.visible && o3.show(), this.options.animation ? o3.animate({ opacity: 1 }, e11) : o3.attr({ opacity: 1 })), o3;
  }
  function r2(t12) {
    let e11;
    t12 = t12 || this.points;
    let i11 = this, s11 = i11.chart, o3 = i11.options, r3 = s11.renderer, { backgroundColor: a3, plotBackgroundColor: l3 } = s11.options.chart, d2 = r3.getContrast(tl(l3) && l3 || tl(a3) && a3 || "#000000"), c2 = h2(i11), { animation: p2, defer: g2 } = c2[0], u2 = g2 ? sI(s11, p2, i11) : { defer: 0, duration: 0 };
    J(this, "drawDataLabels"), i11.hasDataLabels?.() && t12.forEach((t13) => {
      let a4 = t13.dataLabels || [], h3 = t13.color || i11.color;
      tS(n2(c2, t13.dlOptions || t13.options?.dataLabels)).forEach((n3, l5) => {
        e11 = this.initDataLabels(l5, u2, n3);
        let c3 = n3.enabled && (t13.visible || t13.dataLabelOnHidden) && (!t13.isNull || t13.dataLabelOnNull) && (function(t14, e12) {
          let i12 = e12.filter;
          if (i12) {
            let e13 = i12.operator, s12 = t14[i12.property], o4 = i12.value;
            return ">" === e13 && s12 > o4 || "<" === e13 && s12 < o4 || ">=" === e13 && s12 >= o4 || "<=" === e13 && s12 <= o4 || "==" === e13 && s12 == o4 || "===" === e13 && s12 === o4 || "!=" === e13 && s12 != o4 || "!==" === e13 && s12 !== o4 || false;
          }
          return true;
        })(t13, n3), { backgroundColor: p3, borderColor: g3, distance: f2, style: m2 = {} } = n3, x2, y2, b2, v2 = {}, k2 = a4[l5], w2 = !k2, M2;
        c3 && (y2 = $(x2 = ty(n3[t13.formatPrefix + "Format"], n3.format)) ? sD(x2, t13, s11) : (n3[t13.formatPrefix + "Formatter"] || n3.formatter).call(t13, n3, t13), b2 = n3.rotation, !s11.styledMode && (m2.color = ty(n3.color, m2.color, tl(i11.color) ? i11.color : void 0, "#000000"), "contrast" === m2.color ? ("none" !== p3 && (M2 = p3), t13.contrastColor = r3.getContrast("auto" !== M2 && tl(M2) && M2 || (tl(h3) ? h3 : "")), m2.color = M2 || !$(f2) && n3.inside || 0 > tb(f2 || 0) || o3.stacking ? t13.contrastColor : d2) : delete t13.contrastColor, o3.cursor && (m2.cursor = o3.cursor)), v2 = { r: n3.borderRadius || 0, rotation: b2, padding: n3.padding, zIndex: 1 }, s11.styledMode || (v2.fill = "auto" === p3 ? t13.color : p3, v2.stroke = "auto" === g3 ? t13.color : g3, v2["stroke-width"] = n3.borderWidth), tf(v2, (t14, e12) => {
          void 0 === t14 && delete v2[e12];
        })), !k2 || c3 && $(y2) && !!(k2.div || k2.text?.foreignObject) == !!n3.useHTML && (k2.rotation && n3.rotation || k2.rotation === n3.rotation) || (k2 = void 0, w2 = true), c3 && $(y2) && "" !== y2 && (k2 ? v2.text = y2 : (k2 = r3.label(y2, 0, 0, n3.shape, void 0, void 0, n3.useHTML, void 0, "data-label")).addClass(" highcharts-data-label-color-" + t13.colorIndex + " " + (n3.className || "") + (n3.useHTML ? " highcharts-tracker" : "")), k2 && (k2.options = n3, k2.attr(v2), s11.styledMode ? m2.width && k2.css({ width: m2.width, textOverflow: m2.textOverflow, whiteSpace: m2.whiteSpace }) : k2.css(m2).shadow(n3.shadow), J(k2, "beforeAddingDataLabel", { labelOptions: n3, point: t13 }), k2.added || k2.add(e11), i11.alignDataLabel(t13, k2, n3, void 0, w2), k2.isActive = true, a4[l5] && a4[l5] !== k2 && a4[l5].destroy(), a4[l5] = k2));
      });
      let l4 = a4.length;
      for (; l4--; ) a4[l4]?.isActive ? a4[l4].isActive = false : (a4[l4]?.destroy(), a4.splice(l4, 1));
      t13.dataLabel = a4[0], t13.dataLabels = a4;
    }), J(this, "afterDrawDataLabels");
  }
  function a2(t12, e11, i11, s11, o3, r3) {
    let a3 = this.chart, n3 = e11.align, h3 = e11.verticalAlign, l3 = t12.box ? 0 : t12.padding || 0, d2 = a3.inverted ? this.yAxis : this.xAxis, c2 = d2 ? d2.left - a3.plotLeft : 0, p2 = a3.inverted ? this.xAxis : this.yAxis, g2 = p2 ? p2.top - a3.plotTop : 0, { x: u2 = 0, y: f2 = 0 } = e11, m2, x2;
    return (m2 = (i11.x || 0) + l3 + c2) < 0 && ("right" === n3 && u2 >= 0 ? (e11.align = "left", e11.inside = true) : u2 -= m2, x2 = true), (m2 = (i11.x || 0) + s11.width - l3 + c2) > a3.plotWidth && ("left" === n3 && u2 <= 0 ? (e11.align = "right", e11.inside = true) : u2 += a3.plotWidth - m2, x2 = true), (m2 = i11.y + l3 + g2) < 0 && ("bottom" === h3 && f2 >= 0 ? (e11.verticalAlign = "top", e11.inside = true) : f2 -= m2, x2 = true), (m2 = (i11.y || 0) + s11.height - l3 + g2) > a3.plotHeight && ("top" === h3 && f2 <= 0 ? (e11.verticalAlign = "bottom", e11.inside = true) : f2 += a3.plotHeight - m2, x2 = true), x2 && (e11.x = u2, e11.y = f2, t12.placed = !r3, t12.align(e11, void 0, o3)), x2;
  }
  function n2(t12, e11) {
    let i11 = [], s11;
    if (td(t12) && !td(e11)) i11 = t12.map(function(t13) {
      return tg(t13, e11);
    });
    else if (td(e11) && !td(t12)) i11 = e11.map(function(e12) {
      return tg(t12, e12);
    });
    else if (td(t12) || td(e11)) {
      if (td(t12) && td(e11)) for (s11 = Math.max(t12.length, e11.length); s11--; ) i11[s11] = tg(t12[s11], e11[s11]);
    } else i11 = tg(t12, e11);
    return i11;
  }
  function h2(t12) {
    let e11 = t12.chart.options.plotOptions;
    return tS(n2(n2(e11?.series?.dataLabels, e11?.[t12.type]?.dataLabels), t12.options.dataLabels));
  }
  function l2(t12, e11, i11, s11, o3) {
    let r3 = this.chart, a3 = r3.inverted, n3 = this.xAxis, h3 = n3.reversed, l3 = ((a3 ? e11.height : e11.width) || 0) / 2, d2 = t12.pointWidth, c2 = d2 ? d2 / 2 : 0;
    e11.startXPos = a3 ? o3.x : h3 ? -l3 - c2 : n3.width - l3 + c2, e11.startYPos = a3 ? h3 ? this.yAxis.height - l3 + c2 : -l3 - c2 : o3.y, s11 ? "hidden" === e11.visibility && (e11.show(), e11.attr({ opacity: 0 }).animate({ opacity: 1 })) : e11.attr({ opacity: 1 }).animate({ opacity: 0 }, void 0, e11.hide), r3.hasRendered && (i11 && e11.attr({ x: e11.startXPos, y: e11.startYPos }), e11.placed = true);
  }
  t11.compose = function(t12) {
    let h3 = t12.prototype;
    h3.initDataLabels || (h3.initDataLabels = o2, h3.initDataLabelsGroup = s10, h3.alignDataLabel = i10, h3.drawDataLabels = r2, h3.justifyDataLabel = a2, h3.mergeArrays = n2, h3.setDataLabelStartPos = l2, h3.hasDataLabels = e10);
  };
})(C || (C = {}));
var sB = C;
var { composed: sN } = D;
var { series: sz } = iL;
function sR(t11, e10, i10, s10, o2) {
  let { chart: r2, options: a2 } = this, n2 = r2.inverted, h2 = this.xAxis?.len || r2.plotSizeX || 0, l2 = this.yAxis?.len || r2.plotSizeY || 0, d2 = t11.dlBox || t11.shapeArgs, c2 = t11.below ?? (t11.plotY || 0) > (this.translatedThreshold ?? l2), p2 = i10.inside ?? !!a2.stacking;
  if (d2) {
    if (s10 = tg(d2), "allow" !== i10.overflow || false !== i10.crop || false !== a2.clip) {
      s10.y < 0 && (s10.height += s10.y, s10.y = 0);
      let t12 = s10.y + s10.height - l2;
      t12 > 0 && t12 < s10.height - 1 && (s10.height -= t12);
    }
    n2 && (s10 = { x: l2 - s10.y - s10.height, y: h2 - s10.x - s10.width, width: s10.height, height: s10.width }), p2 || (n2 ? (s10.x += c2 ? 0 : s10.width, s10.width = 0) : (s10.y += c2 ? s10.height : 0, s10.height = 0));
  }
  i10.align ?? (i10.align = !n2 || p2 ? "center" : c2 ? "right" : "left"), i10.verticalAlign ?? (i10.verticalAlign = n2 || p2 ? "middle" : c2 ? "top" : "bottom"), sz.prototype.alignDataLabel.call(this, t11, e10, i10, s10, o2), i10.inside && t11.contrastColor && e10.css({ color: t11.contrastColor });
}
(A || (A = {})).compose = function(t11) {
  sB.compose(sz), tv(sN, "ColumnDataLabel") && (t11.prototype.alignDataLabel = sR);
};
var sW = A;
var sX = class extends sE {
};
sX.defaultOptions = tg(sE.defaultOptions, {}), K(sX.prototype, { inverted: true }), iL.registerSeriesType("bar", sX);
var { column: sG, line: sH } = iL.seriesTypes;
var sF = class extends sH {
  applyJitter() {
    let t11 = this, e10 = this.options.jitter, i10 = this.points.length;
    e10 && this.points.forEach(function(s10, o2) {
      ["x", "y"].forEach(function(r2, a2) {
        if (e10[r2] && !s10.isNull) {
          let n2 = `plot${r2.toUpperCase()}`, h2 = t11[`${r2}Axis`], l2 = e10[r2] * h2.transA;
          if (h2 && !h2.logarithmic) {
            let t12, e11 = Math.max(0, (s10[n2] || 0) - l2), d2 = Math.min(h2.len, (s10[n2] || 0) + l2);
            s10[n2] = e11 + (d2 - e11) * ((t12 = 1e4 * Math.sin(o2 + a2 * i10)) - Math.floor(t12)), "x" === r2 && (s10.clientX = s10.plotX);
          }
        }
      });
    });
  }
  drawGraph() {
    this.options.lineWidth ? super.drawGraph() : this.graph && (this.graph = this.graph.destroy());
  }
};
sF.defaultOptions = tg(sH.defaultOptions, { lineWidth: 0, findNearestPointBy: "xy", jitter: { x: 0, y: 0 }, marker: { enabled: true }, tooltip: { headerFormat: '<span style="color:{point.color}">●</span> <span style="font-size: 0.8em"> {series.name}</span><br/>', pointFormat: "x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>" } }), K(sF.prototype, { allowOutsidePlotInteraction: true, drawTracker: sG.prototype.drawTracker, sorted: false, requireSorting: false, noSharedTooltip: true, trackerGroups: ["group", "markerGroup", "dataLabelsGroup"] }), z(sF, "afterTranslate", function() {
  this.applyJitter();
}), iL.registerSeriesType("scatter", sF);
var { deg2rad: sY } = D;
(p = P || (P = {})).getCenter = function() {
  let t11 = this.options, e10 = this.chart, i10 = 2 * (t11.slicedOffset || 0), s10 = e10.plotWidth - 2 * i10, o2 = e10.plotHeight - 2 * i10, r2 = t11.center, a2 = Math.min(s10, o2), n2 = t11.thickness, h2, l2 = t11.size, d2 = t11.innerSize || 0, c2, p2;
  "string" == typeof l2 && (l2 = parseFloat(l2)), "string" == typeof d2 && (d2 = parseFloat(d2));
  let g2 = [ty(r2?.[0], "50%"), ty(r2?.[1], "50%"), ty(l2 && l2 < 0 ? void 0 : t11.size, "100%"), ty(d2 && d2 < 0 ? void 0 : t11.innerSize || 0, "0%")];
  for (!e10.angular || this instanceof iX || (g2[3] = 0), c2 = 0; c2 < 4; ++c2) p2 = g2[c2], h2 = c2 < 2 || 2 === c2 && /%$/.test(p2), g2[c2] = tk(p2, [s10, o2, a2, g2[2]][c2]) + (h2 ? i10 : 0);
  return g2[3] > g2[2] && (g2[3] = g2[2]), th(n2) && 2 * n2 < g2[2] && n2 > 0 && (g2[3] = g2[2] - 2 * n2), J(this, "afterGetCenter", { positions: g2 }), g2;
}, p.getStartAndEndRadians = function(t11, e10) {
  let i10 = th(t11) ? t11 : 0, s10 = th(e10) && e10 > i10 && e10 - i10 < 360 ? e10 : i10 + 360;
  return { start: sY * (i10 + -90), end: sY * (s10 + -90) };
};
var sj = P;
var { setAnimation: s$ } = tJ;
var sV = class extends ic {
  getConnectorPath(t11) {
    let e10 = t11.dataLabelPosition, i10 = t11.options || {}, s10 = i10.connectorShape, o2 = this.connectorShapes[s10] || s10;
    return e10 && o2.call(this, __spreadProps(__spreadValues({}, e10.computed), { alignment: e10.alignment }), e10.connectorPosition, i10) || [];
  }
  getTranslate() {
    return this.sliced && this.slicedTranslation || { translateX: 0, translateY: 0 };
  }
  haloPath(t11) {
    let e10 = this.shapeArgs;
    return this.sliced || !this.visible ? [] : this.series.chart.renderer.symbols.arc(e10.x, e10.y, e10.r + t11, e10.r + t11, { innerR: e10.r - 1, start: e10.start, end: e10.end, borderRadius: e10.borderRadius });
  }
  constructor(t11, e10, i10) {
    super(t11, e10, i10), this.half = 0, this.name ?? (this.name = t11.chart.options.lang.pieSliceName);
    let s10 = (t12) => {
      this.slice("select" === t12.type);
    };
    z(this, "select", s10), z(this, "unselect", s10);
  }
  isValid() {
    return th(this.y) && this.y >= 0;
  }
  setVisible(t11, e10 = true) {
    t11 !== this.visible && this.update({ visible: t11 ?? !this.visible }, e10, void 0, false);
  }
  slice(t11, e10, i10) {
    let s10 = this.series;
    s$(i10, s10.chart), e10 = ty(e10, true), this.sliced = this.options.sliced = t11 = $(t11) ? t11 : !this.sliced, s10.options.data[s10.data.indexOf(this)] = this.options, this.graphic && this.graphic.animate(this.getTranslate());
  }
};
K(sV.prototype, { connectorShapes: { fixedOffset: function(t11, e10, i10) {
  let s10 = e10.breakAt, o2 = e10.touchingSliceAt, r2 = i10.softConnector ? ["C", t11.x + ("left" === t11.alignment ? -5 : 5), t11.y, 2 * s10.x - o2.x, 2 * s10.y - o2.y, s10.x, s10.y] : ["L", s10.x, s10.y];
  return [["M", t11.x, t11.y], r2, ["L", o2.x, o2.y]];
}, straight: function(t11, e10) {
  let i10 = e10.touchingSliceAt;
  return [["M", t11.x, t11.y], ["L", i10.x, i10.y]];
}, crookedLine: function(t11, e10, i10) {
  let { angle: s10 = this.angle || 0, breakAt: o2, touchingSliceAt: r2 } = e10, { series: a2 } = this, [n2, h2, l2] = a2.center, d2 = l2 / 2, { plotLeft: c2, plotWidth: p2 } = a2.chart, g2 = "left" === t11.alignment, { x: u2, y: f2 } = t11, m2 = o2.x;
  if (i10.crookDistance) {
    let t12 = tk(i10.crookDistance, 1);
    m2 = g2 ? n2 + d2 + (p2 + c2 - n2 - d2) * (1 - t12) : c2 + (n2 - d2) * t12;
  } else m2 = n2 + (h2 - f2) * Math.tan(s10 - Math.PI / 2);
  let x2 = [["M", u2, f2]];
  return (g2 ? m2 <= u2 && m2 >= o2.x : m2 >= u2 && m2 <= o2.x) && x2.push(["L", m2, f2]), x2.push(["L", o2.x, o2.y], ["L", r2.x, r2.y]), x2;
} } });
var { getStartAndEndRadians: sU } = sj;
var { noop: sZ } = D;
var s_ = class extends iX {
  animate(t11) {
    let e10 = this, i10 = e10.points, s10 = e10.startAngleRad;
    t11 || i10.forEach(function(t12) {
      let i11 = t12.graphic, o2 = t12.shapeArgs;
      i11 && o2 && (i11.attr({ r: ty(t12.startR, e10.center && e10.center[3] / 2), start: s10, end: s10 }), i11.animate({ r: o2.r, start: o2.start, end: o2.end }, e10.options.animation));
    });
  }
  drawEmpty() {
    let t11, e10, i10 = this.startAngleRad, s10 = this.endAngleRad, o2 = this.options;
    0 === this.total && this.center ? (t11 = this.center[0], e10 = this.center[1], this.graph || (this.graph = this.chart.renderer.arc(t11, e10, this.center[1] / 2, 0, i10, s10).addClass("highcharts-empty-series").add(this.group)), this.graph.attr({ d: ev.arc(t11, e10, this.center[2] / 2, 0, { start: i10, end: s10, innerR: this.center[3] / 2 }) }), this.chart.styledMode || this.graph.attr({ "stroke-width": o2.borderWidth, fill: o2.fillColor || "none", stroke: o2.color || "#cccccc" })) : this.graph && (this.graph = this.graph.destroy());
  }
  drawPoints() {
    let t11 = this.chart.renderer;
    this.points.forEach(function(e10) {
      e10.graphic && e10.hasNewShapeType() && (e10.graphic = e10.graphic.destroy()), e10.graphic || (e10.graphic = t11[e10.shapeType](e10.shapeArgs).add(e10.series.group), e10.delayedRendering = true);
    });
  }
  generatePoints() {
    super.generatePoints(), this.updateTotals();
  }
  getX(t11, e10, i10, s10) {
    let o2 = this.center, r2 = this.radii ? this.radii[i10.index] || 0 : o2[2] / 2, a2 = s10.dataLabelPosition, n2 = a2?.distance || 0, h2 = Math.asin(G((t11 - o2[1]) / (r2 + n2), -1, 1));
    return o2[0] + Math.cos(h2) * (r2 + n2) * (e10 ? -1 : 1) + (n2 > 0 ? (e10 ? -1 : 1) * (s10.padding || 0) : 0);
  }
  hasData() {
    return this.points.some((t11) => t11.visible);
  }
  redrawPoints() {
    let t11, e10, i10, s10, o2 = this, r2 = o2.chart;
    this.drawEmpty(), o2.group && !r2.styledMode && o2.group.shadow(o2.options.shadow), o2.points.forEach(function(a2) {
      let n2 = {};
      e10 = a2.graphic, !a2.isNull && e10 ? (s10 = a2.shapeArgs, t11 = a2.getTranslate(), r2.styledMode || (i10 = o2.pointAttribs(a2, a2.selected && "select")), a2.delayedRendering ? (e10.setRadialReference(o2.center).attr(s10).attr(t11), r2.styledMode || e10.attr(i10).attr({ "stroke-linejoin": "round" }), a2.delayedRendering = false) : (e10.setRadialReference(o2.center), r2.styledMode || tg(true, n2, i10), tg(true, n2, s10, t11), e10.animate(n2)), e10.attr({ visibility: a2.visible ? "inherit" : "hidden" }), e10.addClass(a2.getClassName(), true)) : e10 && (a2.graphic = e10.destroy());
    });
  }
  sortByAngle(t11, e10) {
    t11.sort(function(t12, i10) {
      return void 0 !== t12.angle && (i10.angle - t12.angle) * e10;
    });
  }
  translate(t11) {
    J(this, "translate"), this.generatePoints();
    let e10 = this.options, i10 = e10.slicedOffset, s10 = sU(e10.startAngle, e10.endAngle), o2 = this.startAngleRad = s10.start, r2 = (this.endAngleRad = s10.end) - o2, a2 = this.points, n2 = e10.ignoreHiddenPoint, h2 = a2.length, l2, d2, c2, p2, g2, u2, f2, m2 = 0;
    for (t11 || (this.center = t11 = this.getCenter()), u2 = 0; u2 < h2; u2++) {
      f2 = a2[u2], l2 = o2 + m2 * r2, f2.isValid() && (!n2 || f2.visible) && (m2 += f2.percentage / 100), d2 = o2 + m2 * r2;
      let e11 = { x: t11[0], y: t11[1], r: t11[2] / 2, innerR: t11[3] / 2, start: l2, end: d2 };
      f2.shapeType = "arc", f2.shapeArgs = e11, (c2 = (d2 + l2) / 2) > 1.5 * Math.PI ? c2 -= 2 * Math.PI : c2 < -Math.PI / 2 && (c2 += 2 * Math.PI), f2.slicedTranslation = { translateX: Math.round(Math.cos(c2) * i10), translateY: Math.round(Math.sin(c2) * i10) }, p2 = Math.cos(c2) * t11[2] / 2, g2 = Math.sin(c2) * t11[2] / 2, f2.tooltipPos = [t11[0] + 0.7 * p2, t11[1] + 0.7 * g2], f2.half = +(c2 < -Math.PI / 2 || c2 > Math.PI / 2), f2.angle = c2;
    }
    J(this, "afterTranslate");
  }
  updateTotals() {
    let t11 = this.points, e10 = t11.length, i10 = this.options.ignoreHiddenPoint, s10, o2, r2 = 0;
    for (s10 = 0; s10 < e10; s10++) (o2 = t11[s10]).isValid() && (!i10 || o2.visible) && (r2 += o2.y);
    for (s10 = 0, this.total = r2; s10 < e10; s10++) (o2 = t11[s10]).percentage = r2 > 0 && (o2.visible || !i10) ? o2.y / r2 * 100 : 0, o2.total = r2;
  }
};
s_.defaultOptions = tg(iX.defaultOptions, { borderRadius: 3, center: [null, null], clip: false, colorByPoint: true, dataLabels: { connectorPadding: 5, connectorShape: "crookedLine", crookDistance: void 0, distance: 30, enabled: true, formatter: function() {
  return this.isNull ? void 0 : this.name;
}, softConnector: true, x: 0 }, fillColor: void 0, ignoreHiddenPoint: true, inactiveOtherPoints: true, legendType: "point", marker: null, size: null, showInLegend: false, slicedOffset: 10, stickyTracking: false, tooltip: { followPointer: true }, borderColor: "#ffffff", borderWidth: 1, lineWidth: void 0, states: { hover: { brightness: 0.1 } } }), K(s_.prototype, { axisTypes: [], directTouch: true, drawGraph: void 0, drawTracker: sE.prototype.drawTracker, getCenter: sj.getCenter, getSymbol: sZ, invertible: false, isCartesian: false, noSharedTooltip: true, pointAttribs: sE.prototype.pointAttribs, pointClass: sV, requireSorting: false, searchPoint: sZ, trackerGroups: ["group", "dataLabelsGroup"] }), iL.registerSeriesType("pie", s_);
var { composed: sK, noop: sq } = D;
var { distribute: sJ } = eo;
var { series: sQ } = iL;
!(function(t11) {
  let e10 = { radialDistributionY: function(t12, e11) {
    return (e11.dataLabelPosition?.top || 0) + t12.distributeBox.pos;
  }, radialDistributionX: function(t12, e11, i11, s11, o3) {
    let r3 = o3.dataLabelPosition;
    return t12.getX(i11 < (r3?.top || 0) + 2 || i11 > (r3?.bottom || 0) - 2 ? s11 : i11, e11.half, e11, o3);
  }, justify: function(t12, e11, i11, s11) {
    return s11[0] + (t12.half ? -1 : 1) * (i11 + (e11.dataLabelPosition?.distance || 0));
  }, alignToPlotEdges: function(t12, e11, i11, s11) {
    let o3 = t12.getBBox().width;
    return e11 ? o3 + s11 : i11 - o3 - s11;
  }, alignToConnectors: function(t12, e11, i11, s11) {
    let o3 = 0, r3;
    return t12.forEach(function(t13) {
      (r3 = t13.dataLabel.getBBox().width) > o3 && (o3 = r3);
    }), e11 ? o3 + s11 : i11 - o3 - s11;
  } };
  function i10(t12, e11) {
    let i11 = Math.PI / 2, { start: s11 = 0, end: o3 = 0 } = t12.shapeArgs || {}, r3 = t12.angle || 0;
    e11 > 0 && s11 < i11 && o3 > i11 && r3 > i11 / 2 && r3 < 1.5 * i11 && (r3 = r3 <= i11 ? Math.max(i11 / 2, (s11 + i11) / 2) : Math.min(1.5 * i11, (i11 + o3) / 2));
    let { center: a2, options: n2 } = this, h2 = a2[2] / 2, l2 = Math.cos(r3), d2 = Math.sin(r3), c2 = a2[0] + l2 * h2, p2 = a2[1] + d2 * h2, g2 = Math.min((n2.slicedOffset || 0) + (n2.borderWidth || 0), e11 / 5);
    return { natural: { x: c2 + l2 * e11, y: p2 + d2 * e11 }, computed: {}, alignment: e11 < 0 ? "center" : t12.half ? "right" : "left", connectorPosition: { angle: r3, breakAt: { x: c2 + l2 * g2, y: p2 + d2 * g2 }, touchingSliceAt: { x: c2, y: p2 } }, distance: e11 };
  }
  function s10() {
    let t12 = this, e11 = t12.points, i11 = t12.chart, s11 = i11.plotWidth, o3 = i11.plotHeight, r3 = i11.plotLeft, a2 = Math.round(i11.chartWidth / 3), n2 = t12.center, h2 = n2[2] / 2, l2 = n2[1], d2 = [[], []], c2 = [0, 0, 0, 0], p2 = t12.dataLabelPositioners, g2, u2, f2, m2 = 0;
    t12.visible && t12.hasDataLabels?.() && (e11.forEach((t13) => {
      (t13.dataLabels || []).forEach((t14) => {
        t14.shortened && (t14.attr({ width: "auto" }).css({ width: "auto", textOverflow: "clip" }), t14.shortened = false);
      });
    }), sQ.prototype.drawDataLabels.apply(t12), e11.forEach((t13) => {
      (t13.dataLabels || []).forEach((e12, i12) => {
        let s12 = n2[2] / 2, o4 = e12.options, r4 = tk(o4?.distance || 0, s12);
        0 === i12 && d2[t13.half].push(t13), !$(o4?.style?.width) && e12.getBBox().width > a2 && (e12.css({ width: Math.round(0.7 * a2) + "px" }), e12.shortened = true), e12.dataLabelPosition = this.getDataLabelPosition(t13, r4), m2 = Math.max(m2, r4);
      });
    }), d2.forEach((e12, a3) => {
      let d3 = e12.length, g3 = [], x2, y2, b2 = 0, v2;
      d3 && (t12.sortByAngle(e12, a3 - 0.5), m2 > 0 && (x2 = Math.max(0, l2 - h2 - m2), y2 = Math.min(l2 + h2 + m2, i11.plotHeight), e12.forEach((t13) => {
        (t13.dataLabels || []).forEach((e13) => {
          let s12 = e13.dataLabelPosition;
          s12 && s12.distance > 0 && (s12.top = Math.max(0, l2 - h2 - s12.distance), s12.bottom = Math.min(l2 + h2 + s12.distance, i11.plotHeight), b2 = e13.getBBox().height || 21, e13.lineHeight = i11.renderer.fontMetrics(e13.text || e13).h + 2 * e13.padding, t13.distributeBox = { target: (e13.dataLabelPosition?.natural.y || 0) - s12.top + e13.lineHeight / 2, size: b2, rank: t13.y }, g3.push(t13.distributeBox));
        });
      }), sJ(g3, v2 = y2 + b2 - x2, v2 / 5)), e12.forEach((i12) => {
        (i12.dataLabels || []).forEach((l3) => {
          let d4 = l3.options || {}, m3 = i12.distributeBox, x3 = l3.dataLabelPosition, y3 = x3?.natural.y || 0, b3 = d4.connectorPadding || 0, v3 = l3.lineHeight || 21, k2 = (v3 - l3.getBBox().height) / 2, w2 = 0, M2 = y3, S2 = "inherit";
          if (x3) {
            if (g3 && $(m3) && x3.distance > 0 && (void 0 === m3.pos ? S2 = "hidden" : (f2 = m3.size, M2 = p2.radialDistributionY(i12, l3))), d4.justify) w2 = p2.justify(i12, l3, h2, n2);
            else switch (d4.alignTo) {
              case "connectors":
                w2 = p2.alignToConnectors(e12, a3, s11, r3);
                break;
              case "plotEdges":
                w2 = p2.alignToPlotEdges(l3, a3, s11, r3);
                break;
              default:
                w2 = p2.radialDistributionX(t12, i12, M2 - k2, y3, l3);
            }
            if (x3.attribs = { visibility: S2, align: x3.alignment }, x3.posAttribs = { x: w2 + (d4.x || 0) + ({ left: b3, right: -b3 }[x3.alignment] || 0), y: M2 + (d4.y || 0) - v3 / 2 }, x3.computed.x = w2, x3.computed.y = M2 - k2, ty(d4.crop, true)) {
              let t13;
              w2 - (u2 = l3.getBBox().width) < b3 && 1 === a3 ? (t13 = Math.round(u2 - w2 + b3), c2[3] = Math.max(t13, c2[3])) : w2 + u2 > s11 - b3 && 0 === a3 && (t13 = Math.round(w2 + u2 - s11 + b3), c2[1] = Math.max(t13, c2[1])), M2 - f2 / 2 < 0 ? c2[0] = Math.max(Math.round(-M2 + f2 / 2), c2[0]) : M2 + f2 / 2 > o3 && (c2[2] = Math.max(Math.round(M2 + f2 / 2 - o3), c2[2])), x3.sideOverflow = t13;
            }
          }
        });
      }));
    }), (0 === W(c2) || this.verifyDataLabelOverflow(c2)) && (this.placeDataLabels(), this.points.forEach((e12) => {
      e12.dataLabels?.forEach((s12, o4) => {
        let { connectorColor: r4, connectorWidth: a3 = 1 } = s12.options || {}, n3 = s12.dataLabelPosition;
        if (th(a3)) {
          let h3;
          g2 = s12.connector, n3 && n3.distance > 0 ? (h3 = !g2, g2 || (s12.connector = g2 = i11.renderer.path().addClass("highcharts-data-label-connector  highcharts-color-" + e12.colorIndex + (e12.className ? " " + e12.className : "")).add(t12.dataLabelsGroups?.[o4])), i11.styledMode || g2.attr({ "stroke-width": a3, stroke: r4 || e12.color || "#666666" }), g2[h3 ? "attr" : "animate"]({ d: e12.getConnectorPath(s12) }), g2.attr({ visibility: n3.attribs?.visibility })) : g2 && (s12.connector = g2.destroy());
        }
      });
    })));
  }
  function o2() {
    this.points.forEach((t12) => {
      (t12.dataLabels || []).forEach((t13) => {
        let e11 = t13.dataLabelPosition;
        e11 ? (e11.sideOverflow && (t13.css({ width: Math.max(t13.getBBox().width - e11.sideOverflow, 0) + "px", textOverflow: t13.options?.style?.textOverflow || "ellipsis" }), t13.shortened = true), t13.attr(e11.attribs), t13[t13.moved ? "animate" : "attr"](e11.posAttribs), t13.moved = true) : t13 && t13.attr({ y: -9999 });
      }), delete t12.distributeBox;
    }, this);
  }
  function r2(t12) {
    let e11 = this.center, i11 = this.options, s11 = i11.center, o3 = i11.minSize || 80, r3 = o3, a2 = null !== i11.size;
    return !a2 && (null !== s11[0] ? r3 = Math.max(e11[2] - Math.max(t12[1], t12[3]), o3) : (r3 = Math.max(e11[2] - t12[1] - t12[3], o3), e11[0] += (t12[3] - t12[1]) / 2), null !== s11[1] ? r3 = G(r3, o3, e11[2] - Math.max(t12[0], t12[2])) : (r3 = G(r3, o3, e11[2] - t12[0] - t12[2]), e11[1] += (t12[0] - t12[2]) / 2), r3 < e11[2] ? (e11[2] = r3, e11[3] = Math.min(i11.thickness ? Math.max(0, r3 - 2 * i11.thickness) : Math.max(0, tk(i11.innerSize || 0, r3)), r3), this.translate(e11), this.drawDataLabels && this.drawDataLabels()) : a2 = true), a2;
  }
  t11.compose = function(t12) {
    if (sB.compose(sQ), tv(sK, "PieDataLabel")) {
      let a2 = t12.prototype;
      a2.dataLabelPositioners = e10, a2.alignDataLabel = sq, a2.drawDataLabels = s10, a2.getDataLabelPosition = i10, a2.placeDataLabels = o2, a2.verifyDataLabelOverflow = r2;
    }
  };
})(L || (L = {}));
var s0 = L;
(g = O || (O = {})).getCenterOfPoints = function(t11) {
  let e10 = t11.reduce((t12, e11) => (t12.x += e11.x, t12.y += e11.y, t12), { x: 0, y: 0 });
  return { x: e10.x / t11.length, y: e10.y / t11.length };
}, g.getDistanceBetweenPoints = function(t11, e10) {
  return Math.sqrt(Math.pow(e10.x - t11.x, 2) + Math.pow(e10.y - t11.y, 2));
}, g.getAngleBetweenPoints = function(t11, e10) {
  return Math.atan2(e10.x - t11.x, e10.y - t11.y);
}, g.pointInPolygon = function({ x: t11, y: e10 }, i10) {
  let s10 = i10.length, o2, r2, a2 = false;
  for (o2 = 0, r2 = s10 - 1; o2 < s10; r2 = o2++) {
    let [s11, n2] = i10[o2], [h2, l2] = i10[r2];
    n2 > e10 != l2 > e10 && t11 < (h2 - s11) * (e10 - n2) / (l2 - n2) + s11 && (a2 = !a2);
  }
  return a2;
};
var { pointInPolygon: s1 } = O;
function s2(t11, e10) {
  let i10, s10 = false;
  return t11 && (i10 = t11.newOpacity, t11.oldOpacity !== i10 && (t11.hasClass("highcharts-data-label") ? (t11[i10 ? "removeClass" : "addClass"]("highcharts-data-label-hidden"), s10 = true, t11[t11.isOld ? "animate" : "attr"]({ opacity: i10 }, void 0, function() {
    e10.styledMode || t11.css({ pointerEvents: i10 ? "auto" : "none" });
  }), J(e10, "afterHideOverlappingLabel")) : t11.attr({ opacity: i10 })), t11.isOld = true), s10;
}
var { defaultOptions: s3 } = tF;
var { noop: s5 } = D;
var s6 = { radius: 0, scope: "stack", where: void 0 };
var s9 = s5;
var s4 = s5;
function s8(t11, e10, i10, s10, o2 = {}) {
  let r2 = s9(t11, e10, i10, s10, o2), { brStart: a2 = true, brEnd: n2 = true, innerR: h2 = 0, r: l2 = i10, start: d2 = 0, end: c2 = 0 } = o2;
  if (o2.open || !o2.borderRadius) return r2;
  let p2 = c2 - d2, g2 = Math.sin(p2 / 2), u2 = Math.max(Math.min(tk(o2.borderRadius || 0, l2 - h2), (l2 - h2) / 2, l2 * g2 / (1 + g2)), 0), f2 = Math.min(u2, p2 / Math.PI * 2 * h2), m2 = r2.length - 1;
  for (; m2--; ) (a2 || 0 !== m2 && 3 !== m2) && (n2 || 1 !== m2 && 2 !== m2) && !(function(t12, e11, i11) {
    let s11, o3, r3, a3 = t12[e11], n3 = t12[e11 + 1];
    if ("Z" === n3[0] && (n3 = t12[0]), ("M" === a3[0] || "L" === a3[0]) && "A" === n3[0] ? (s11 = a3, o3 = n3, r3 = true) : "A" === a3[0] && ("M" === n3[0] || "L" === n3[0]) && (s11 = n3, o3 = a3), s11 && o3 && o3.params) {
      let a4 = o3[1], n4 = o3[5], h3 = o3.params, { start: l3, end: d3, cx: c3, cy: p3 } = h3, g3 = n4 ? a4 - i11 : a4 + i11, u3 = g3 ? Math.asin(i11 / g3) : 0, f3 = n4 ? u3 : -u3, m3 = Math.cos(u3) * g3;
      r3 ? (h3.start = l3 + f3, s11[1] = c3 + m3 * Math.cos(l3), s11[2] = p3 + m3 * Math.sin(l3), t12.splice(e11 + 1, 0, ["A", i11, i11, 0, 0, 1, c3 + a4 * Math.cos(h3.start), p3 + a4 * Math.sin(h3.start)])) : (h3.end = d3 - f3, o3[6] = c3 + a4 * Math.cos(h3.end), o3[7] = p3 + a4 * Math.sin(h3.end), t12.splice(e11 + 1, 0, ["A", i11, i11, 0, 0, 1, c3 + m3 * Math.cos(d3), p3 + m3 * Math.sin(d3)])), o3[4] = Math.abs(h3.end - h3.start) < Math.PI ? 0 : 1;
    }
  })(r2, m2, m2 > 1 ? f2 : u2);
  return r2;
}
function s7() {
  if (this.options.borderRadius && !(this.chart.is3d && this.chart.is3d())) {
    let { options: t11, yAxis: e10 } = this, i10 = "percent" === t11.stacking, s10 = s3.plotOptions?.[this.type]?.borderRadius, o2 = ot(t11.borderRadius, tp(s10) ? s10 : {}), r2 = e10.options.reversed;
    for (let s11 of this.points) {
      let { shapeArgs: a2 } = s11;
      if ("roundedRect" === s11.shapeType && a2) {
        let { width: n2 = 0, height: h2 = 0, y: l2 = 0 } = a2, d2 = l2, c2 = h2;
        if ("stack" === o2.scope && s11.stackTotal) {
          let o3 = e10.translate(i10 ? 100 : s11.stackTotal, false, true, false, true), r3 = e10.translate(t11.threshold || 0, false, true, false, true), a3 = this.crispCol(0, Math.min(o3, r3), 0, Math.abs(o3 - r3));
          d2 = a3.y, c2 = a3.height;
        }
        let p2 = (s11.negative ? -1 : 1) * (r2 ? -1 : 1) == -1, g2 = o2.where;
        !g2 && this.is("waterfall") && Math.abs((s11.yBottom || 0) - (this.translatedThreshold || 0)) > this.borderWidth && (g2 = "all"), g2 || (g2 = "end");
        let u2 = Math.min(tk(o2.radius, n2), n2 / 2, "all" === g2 ? c2 / 2 : 1 / 0) || 0;
        "end" === g2 && (p2 && (d2 -= u2), c2 += u2), K(a2, { brBoxHeight: c2, brBoxY: d2, r: u2 });
      }
    }
  }
}
function ot(t11, e10) {
  return tp(t11) || (t11 = { radius: t11 || 0 }), tg(s6, e10, t11);
}
function oe() {
  let t11 = ot(this.options.borderRadius);
  for (let e10 of this.points) {
    let i10 = e10.shapeArgs;
    i10 && (i10.borderRadius = tk(t11.radius, (i10.r || 0) - (i10.innerR || 0)));
  }
}
function oi(t11, e10, i10, s10, o2 = {}) {
  let r2 = s4(t11, e10, i10, s10, o2), { r: a2 = 0, brBoxHeight: n2 = s10, brBoxY: h2 = e10 } = o2, l2 = e10 - h2, d2 = h2 + n2 - (e10 + s10), c2 = l2 - a2 > -0.1 ? 0 : a2, p2 = d2 - a2 > -0.1 ? 0 : a2, g2 = Math.max(c2 && l2, 0), u2 = Math.max(p2 && d2, 0), f2 = [t11 + c2, e10], m2 = [t11 + i10 - c2, e10], x2 = [t11 + i10, e10 + c2], y2 = [t11 + i10, e10 + s10 - p2], b2 = [t11 + i10 - p2, e10 + s10], v2 = [t11 + p2, e10 + s10], k2 = [t11, e10 + s10 - p2], w2 = [t11, e10 + c2], M2 = (t12, e11) => Math.sqrt(Math.pow(t12, 2) - Math.pow(e11, 2));
  if (g2) {
    let t12 = M2(c2, c2 - g2);
    f2[0] -= t12, m2[0] += t12, x2[1] = w2[1] = e10 + c2 - g2;
  }
  if (s10 < c2 - g2) {
    let o3 = M2(c2, c2 - g2 - s10);
    x2[0] = y2[0] = t11 + i10 - c2 + o3, b2[0] = Math.min(x2[0], b2[0]), v2[0] = Math.max(y2[0], v2[0]), k2[0] = w2[0] = t11 + c2 - o3, x2[1] = w2[1] = e10 + s10;
  }
  if (u2) {
    let t12 = M2(p2, p2 - u2);
    b2[0] += t12, v2[0] -= t12, y2[1] = k2[1] = e10 + s10 - p2 + u2;
  }
  if (s10 < p2 - u2) {
    let o3 = M2(p2, p2 - u2 - s10);
    x2[0] = y2[0] = t11 + i10 - p2 + o3, m2[0] = Math.min(x2[0], m2[0]), f2[0] = Math.max(y2[0], f2[0]), k2[0] = w2[0] = t11 + p2 - o3, y2[1] = k2[1] = e10;
  }
  return r2.length = 0, r2.push(["M", ...f2], ["L", ...m2], ["A", c2, c2, 0, 0, 1, ...x2], ["L", ...y2], ["A", p2, p2, 0, 0, 1, ...b2], ["L", ...v2], ["A", p2, p2, 0, 0, 1, ...k2], ["L", ...w2], ["A", c2, c2, 0, 0, 1, ...f2], ["Z"]), r2;
}
function os(t11, e10) {
  let i10 = t11.condition;
  (i10.callback || function() {
    return this.chartWidth <= ty(i10.maxWidth, Number.MAX_VALUE) && this.chartHeight <= ty(i10.maxHeight, Number.MAX_VALUE) && this.chartWidth >= ty(i10.minWidth, 0) && this.chartHeight >= ty(i10.minHeight, 0);
  }).call(this, this) && e10.push(t11._id);
}
function oo(t11, e10) {
  let i10 = this.options.responsive, s10 = this.currentResponsive, o2 = [], r2;
  !e10 && i10 && i10.rules && i10.rules.forEach((t12) => {
    void 0 === t12._id && (t12._id = tD()), this.matchResponsiveRule(t12, o2);
  }, this);
  let a2 = tg(...o2.map((t12) => to(i10?.rules || [], (e11) => e11._id === t12)).map((t12) => t12?.chartOptions));
  a2.isResponsiveOptions = true, o2 = o2.toString() || void 0;
  let n2 = s10?.ruleIds;
  o2 !== n2 && (s10 && (this.currentResponsive = void 0, this.updatingResponsive = true, this.update(s10.undoOptions, t11, true), this.updatingResponsive = false), o2 ? ((r2 = Z(a2, this.options, true, this.collectionsWithUpdate)).isResponsiveOptions = true, this.currentResponsive = { ruleIds: o2, mergedOptions: a2, undoOptions: r2 }, this.updatingResponsive || this.update(a2, t11, true)) : this.currentResponsive = void 0);
}
(E || (E = {})).compose = function(t11) {
  let e10 = t11.prototype;
  return e10.matchResponsiveRule || K(e10, { matchResponsiveRule: os, setResponsive: oo }), t11;
};
var or = E;
D.AST = t5, D.Axis = e1, D.Chart = i4, D.Color = tV, D.DataLabel = sB, D.DataTableCore = iw, D.Fx = t_, D.HTMLElement = eF, D.Legend = iZ, D.LegendSymbol = iT, D.PlotLineOrBand = e6, D.Point = ic, D.Pointer = ib, D.RendererRegistry = es, D.Series = iX, D.SeriesRegistry = iL, D.StackItem = sr, D.SVGElement = ef, D.SVGRenderer = eR, D.Templating = ei, D.Tick = eU, D.Time = tW, D.Tooltip = ir, D.addEvent = z, D.animObject = tJ.animObject, D.animate = tJ.animate, D.arrayMax = W, D.arrayMin = R, D.attr = X, D.chart = i4.chart, D.clamp = G, D.color = tV.parse, D.correctFloat = H, D.createElement = F, D.css = j, D.dateFormat = ei.dateFormat, D.defaultOptions = tF.defaultOptions, D.defined = $, D.destroyObjectProperties = V, D.diffObjects = Z, D.discardElement = U, D.distribute = eo.distribute, D.erase = _, D.error = tO, D.extend = K, D.extendClass = q, D.find = to, D.fireEvent = J, D.format = ei.format, D.getDeferredAnimation = tJ.getDeferredAnimation, D.getMagnitude = te, D.getOptions = tF.getOptions, D.getStyle = ts, D.insertItem = tE, D.isArray = td, D.isClass = tn, D.isDOMElement = ta, D.isFunction = tc, D.isNumber = th, D.isObject = tp, D.isString = tl, D.merge = tg, D.normalizeTickInterval = tu, D.numberFormat = ei.numberFormat, D.objectEach = tf, D.offset = tm, D.pad = tx, D.pick = ty, D.pInt = tb, D.relativeLength = tk, D.removeEvent = tM, D.seriesType = iL.seriesType, D.setAnimation = tJ.setAnimation, D.setOptions = tF.setOptions, D.splat = tS, D.stableSort = tT, D.stop = tJ.stop, D.syncTimeout = tC, D.time = tF.defaultTime, D.timers = t_.timers, D.timeUnits = tI, D.uniqueKey = tD, D.useSerialIds = function(e10) {
  return t = ty(e10, t);
}, D.wrap = function(t11, e10, i10) {
  let s10 = t11[e10];
  t11[e10] = function() {
    let t12 = arguments, e11 = this;
    return i10.apply(this, [function() {
      return s10.apply(e11, arguments.length ? arguments : t12);
    }].concat([].slice.call(arguments)));
  };
}, { compose: function(t11, e10, i10) {
  let s10 = t11.types.pie;
  if (!e10.symbolCustomAttribs.includes("borderRadius")) {
    let o2 = i10.prototype.symbols;
    z(t11, "afterColumnTranslate", s7, { order: 9 }), z(s10, "afterTranslate", oe), e10.symbolCustomAttribs.push("borderRadius", "brBoxHeight", "brBoxY", "brEnd", "brStart"), s9 = o2.arc, s4 = o2.roundedRect, o2.arc = s8, o2.roundedRect = oi;
  }
}, optionsToObject: ot }.compose(D.Series, D.SVGElement, D.SVGRenderer), sW.compose(D.Series.types.column), sB.compose(D.Series), e2.compose(D.Axis), eF.compose(D.SVGRenderer), iZ.compose(D.Chart), e3.compose(D.Axis), (r = (u = D.Chart).prototype).hideOverlappingLabels || (r.hideOverlappingLabels = function(t11) {
  let e10 = t11.length, i10 = (t12, e11) => !(e11.x >= t12.x + t12.width || e11.x + e11.width <= t12.x || e11.y >= t12.y + t12.height || e11.y + e11.height <= t12.y), s10 = (t12, e11) => {
    for (let i11 of t12) if (s1({ x: i11[0], y: i11[1] }, e11)) return true;
    return false;
  }, o2, r2, a2, n2, h2, l2 = false;
  for (let i11 = 0; i11 < e10; i11++) (o2 = t11[i11]) && (o2.oldOpacity = o2.opacity, o2.newOpacity = 1, o2.absoluteBox = (function(t12) {
    if (t12 && (!t12.alignAttr || t12.placed)) {
      let e11 = t12.box ? 0 : t12.padding || 0, i12 = t12.alignAttr || { x: t12.attr("x"), y: t12.attr("y") }, { height: s11, polygon: o3, width: r3 } = t12.getBBox(), a3 = Q(t12.alignValue) * r3;
      return t12.width = r3, t12.height = s11, { x: i12.x + (t12.parentGroup?.translateX || 0) + e11 - a3, y: i12.y + (t12.parentGroup?.translateY || 0) + e11, width: r3 - 2 * e11, height: s11 - 2 * e11, polygon: o3 };
    }
  })(o2));
  t11.sort((t12, e11) => (e11?.labelrank || 0) - (t12?.labelrank || 0));
  for (let o3 = 0; o3 < e10; ++o3) {
    n2 = (r2 = t11[o3]) && r2.absoluteBox;
    let l3 = n2?.polygon;
    for (let d2 = o3 + 1; d2 < e10; ++d2) {
      h2 = (a2 = t11[d2]) && a2.absoluteBox;
      let e11 = false;
      if (n2 && h2 && r2 !== a2 && r2?.newOpacity !== 0 && a2?.newOpacity !== 0 && r2?.visibility !== "hidden" && a2?.visibility !== "hidden") {
        let t12 = h2.polygon;
        if (l3 && t12 && l3 !== t12 ? s10(l3, t12) && (e11 = true) : i10(n2, h2) && (e11 = true), e11) {
          let t13 = r2?.labelrank < a2?.labelrank ? r2 : a2, e12 = t13?.text;
          t13 && (t13.newOpacity = 0), e12?.element.querySelector("textPath") && e12.hide();
        }
      }
    }
  }
  for (let e11 of t11) e11 && s2(e11, this) && (l2 = true);
  l2 && J(this, "afterHideAllOverlappingLabels");
}, z(u, "render", function() {
  let t11 = this, e10 = [];
  for (let i10 of t11.labelCollectors || []) e10 = e10.concat(i10());
  for (let i10 of t11.yAxis || []) i10.stacking && i10.options.stackLabels && !i10.options.stackLabels.allowOverlap && tf(i10.stacking.stacks, (t12) => {
    tf(t12, (t13) => {
      t13.label && e10.push(t13.label);
    });
  });
  for (let i10 of t11.series || []) if (i10.visible && i10.hasDataLabels?.()) {
    let s10 = (i11) => {
      for (let s11 of i11) s11.visible && (s11.dataLabels || []).forEach((i12) => {
        let o2 = i12.options || {};
        i12.labelrank = ty(o2.labelrank, s11.labelrank, s11.shapeArgs?.height), o2.allowOverlap ?? Number(o2.distance) > 0 ? (i12.oldOpacity = i12.opacity, i12.newOpacity = 1, s2(i12, t11)) : e10.push(i12);
      });
    };
    s10(i10.nodes || []), s10(i10.points);
  }
  this.hideOverlappingLabels(e10);
})), s0.compose(D.Series.types.pie), e6.compose(D.Chart, D.Axis), ib.compose(D.Chart), or.compose(D.Chart), si.compose(D.Axis, D.Chart, D.Series), sx.compose(D.Axis, D.Chart, D.Series), ir.compose(D.Pointer);
var oa = D;

export {
  oa
};
//# sourceMappingURL=chunk-YA62JV3C.js.map
