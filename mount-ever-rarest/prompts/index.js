/* The prompt bank, gathered from one file per category. */

import geography from "./geography.js";
import food from "./food.js";
import animals from "./animals.js";
import science from "./science.js";
import history from "./history.js";
import culture from "./culture.js";
import sport from "./sport.js";
import words from "./words.js";
import everyday from "./everyday.js";

const CATEGORIES = [
  ["geography", "Geography", geography],
  ["food", "Food and drink", food],
  ["animals", "Animals", animals],
  ["science", "Science", science],
  ["history", "History", history],
  ["culture", "Pop culture", culture],
  ["sport", "Sport", sport],
  ["words", "Words", words],
  ["everyday", "Everyday life", everyday],
];

export const PROMPTS = CATEGORIES.flatMap(([id, label, list]) =>
  list.map(p => ({ ...p, category: id, categoryLabel: label })));
