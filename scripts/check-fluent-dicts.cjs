// 校验 fluent 皮肤 DICTS：key 对齐、无空值、无残留 contribute/langHint key
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "examples", "skin-fluent", "assets", "core.js");
const src = fs.readFileSync(file, "utf8");

const start = src.indexOf("const DICTS = {");
if (start < 0) { console.error("DICTS not found"); process.exit(1); }
const open = src.indexOf("{", start);
let depth = 0, end = -1, inStr = null, esc = false;
for (let i = open; i < src.length; i++) {
  const c = src[i];
  if (esc) { esc = false; continue; }
  if (inStr) {
    if (c === "\\") esc = true;
    else if (c === inStr) inStr = null;
    continue;
  }
  if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
  if (c === "{") depth++;
  else if (c === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
const DICTS = eval("(" + src.slice(open, end) + ")");
const langs = Object.keys(DICTS);
console.log("DICTS languages:", langs.join(","));
const keysets = {};
for (const l of langs) keysets[l] = new Set(Object.keys(DICTS[l]));
const all = new Set();
for (const l of langs) for (const k of keysets[l]) all.add(k);
console.log("unique keys:", all.size);
let ok = true;
for (const l of langs) {
  const miss = [...all].filter((k) => !keysets[l].has(k));
  if (miss.length) { ok = false; console.log(l, "MISSING", miss.length, ":", JSON.stringify(miss)); }
  else console.log(l, "OK", keysets[l].size);
}
const empt = [];
for (const l of langs) for (const k of keysets[l]) { const v = DICTS[l][k]; if (typeof v !== "string" || !v.trim()) empt.push(l + ":" + k); }
if (empt.length) { ok = false; console.log("EMPTY:", JSON.stringify(empt)); }
for (const l of langs) {
  if ("cfg.contribute" in DICTS[l] || "cfg.langHint" in DICTS[l]) { ok = false; console.log(l, "still has contribute/langHint"); }
}
// 残留引用检查
const appjs = fs.readFileSync(path.join(__dirname, "..", "examples", "skin-fluent", "assets", "app.js"), "utf8");
if (/cfg\.contribute|cfg\.langHint/.test(appjs)) { ok = false; console.log("app.js still references cfg.contribute/cfg.langHint"); }
console.log(ok ? "FLUENT DICTS ALIGNED" : "MISMATCH");
process.exit(ok ? 0 : 1);
