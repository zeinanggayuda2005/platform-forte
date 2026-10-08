const CATEGORIES = [
  { key: "paham", label: "Paham Konsep" },
  { key: "kurang", label: "Kurang Yakin" },
  { key: "miskonsepsi", label: "Miskonsepsi" },
  { key: "tidak", label: "Tidak Paham" }
];
function categoryLabel(key) { return CATEGORIES.find((c) => c.key === key).label; }
function classify(answerOK, reasonOK, c1, c2) {
  const sure = c1 && c2;
  if (answerOK && reasonOK) return sure ? "paham" : "kurang";
  return sure ? "miskonsepsi" : "tidak";
}