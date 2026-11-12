const CATEGORIES = [
  { key: "paham", label: "Paham Konsep" },
  { key: "sebagian", label: "Paham Sebagian" },
  { key: "miskonsepsi", label: "Miskonsepsi" },
  { key: "tidak", label: "Tidak Paham" }
];

function categoryLabel(key) {
  const category = CATEGORIES.find((item) => item.key === key);
  return category ? category.label : "—";
}

function classify(answerCorrect, reasonCorrect, answerSure, reasonSure) {
  const confident = answerSure === true && reasonSure === true;
  let category;

  if (answerCorrect && reasonCorrect) {
    if (confident) {
      category = "paham";
    } else {
      category = "sebagian";
    }
  } else {
    if (confident) {
      category = "miskonsepsi";
    } else {
      category = "tidak";
    }
  }

  return category;
}
