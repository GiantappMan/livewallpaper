// 校验 9 个语言词典：key 完全对齐、无空值、合法 JSON
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "src", "dictionaries");
const langs = ["zh", "en", "ru", "es", "zh-Hant", "ja", "de", "fr", "pt-BR"];

const flatSet = (o) => {
  const r = new Set();
  (function rec(o, p) {
    for (const k in o) {
      const v = o[k];
      if (v && typeof v === "object" && !Array.isArray(v)) rec(v, p + k + ".");
      else r.add(p + k);
    }
  })(o, "");
  return r;
};

const dicts = {};
for (const l of langs) dicts[l] = JSON.parse(fs.readFileSync(path.join(dir, l + ".json"), "utf8"));
const flats = {};
for (const l of langs) flats[l] = flatSet(dicts[l]);

const all = new Set();
for (const l of langs) for (const k of flats[l]) all.add(k);

console.log("unique keys:", all.size);
let ok = true;
for (const l of langs) {
  const miss = [...all].filter((k) => !flats[l].has(k));
  if (miss.length) { ok = false; console.log(l, "MISSING:", JSON.stringify(miss)); }
  else console.log(l, "OK", flats[l].size, "keys");
}
// 空值检查
const get = (o, p) => p.split(".").reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), o);
for (const l of langs) {
  const empt = [...flats[l]].filter((k) => { const v = get(dicts[l], k); return v === "" || v == null; });
  if (empt.length) { ok = false; console.log(l, "EMPTY VALUES:", JSON.stringify(empt)); }
}
// 与 zh 的 key 集合 diff（多/少 key）
for (const l of langs) {
  const extra = [...flats[l]].filter((k) => !flats.zh.has(k));
  if (extra.length) { ok = false; console.log(l, "EXTRA (not in zh):", JSON.stringify(extra)); }
}
console.log(ok ? "ALL 9 DICTIONARIES ALIGNED" : "MISMATCH FOUND");
process.exit(ok ? 0 : 1);
