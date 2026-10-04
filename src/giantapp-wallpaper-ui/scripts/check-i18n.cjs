// 扫描 UI 源码中使用的词典 key，与四个语言词典对比
const fs = require("fs");
const path = require("path");
const base = path.resolve(__dirname, "..", "src");
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(f)) files.push(p);
  }
})(base);

const used = new Set();
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  // dictionary['settings'].foo / dictionary["settings"].foo
  const re1 = /\[[\'"]([a-zA-Z0-9_]+)[\'"]\]\s*\.\s*([a-zA-Z0-9_]+)/g;
  // dictionary.settings.foo / dict?.settings?.foo
  const re2 = /\b(?:dictionary|dict|t)\??\.([a-zA-Z0-9_]+)\??\.([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = re1.exec(t))) used.add(m[1] + "." + m[2]);
  while ((m = re2.exec(t))) used.add(m[1] + "." + m[2]);
}
console.log("used keys:", used.size);

const dicts = {};
for (const l of ["zh", "en", "ru", "es"]) dicts[l] = require(path.join(base, "dictionaries", l + ".json"));
const flat = (o) => { const r = new Set(); (function rec(o, p) { for (const k in o) { const v = o[k]; if (v && typeof v === "object" && !Array.isArray(v)) rec(v, p + k + "."); else r.add(p + k); } })(o, ""); return r; };
const have = { zh: flat(dicts.zh), en: flat(dicts.en), ru: flat(dicts.ru), es: flat(dicts.es) };

const missingUsed = [...used].filter((k) => !have.zh.has(k));
console.log("used but not in zh.json:", JSON.stringify(missingUsed, null, 1));
for (const l of ["en", "ru", "es"]) {
  const miss = [...used].filter((k) => have.zh.has(k) && !have[l].has(k));
  if (miss.length) console.log(`used, in zh but missing in ${l}:`, JSON.stringify(miss));
}
// 词典中存在但源码未引用的 key（供人工参考，不自动删）
const allUsedSections = new Set([...used].map((k) => k.split(".")[0]));
const dictSections = Object.keys(dicts.zh);
console.log("zh sections:", dictSections.join(","));
console.log("used sections:", [...allUsedSections].join(","));
const unused = [...have.zh].filter((k) => {
  const sec = k.split(".")[0];
  return !allUsedSections.has(sec) || (used.size && !used.has(k) && ![...used].some((u) => k.startsWith(u)));
});
console.log("possibly unused keys in zh.json:", unused.length);
