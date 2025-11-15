// Global variables
let QUESTIONS = [];
let currentFilter = "all";
let currentSearch = "";

// DOM elements
const container = document.getElementById("questions-container");
const searchEl = document.getElementById("search");
const mobileSearchEl = document.getElementById("mobile-search");
const themeToggle = document.getElementById("theme-toggle");
const counts = { all: 0, beginner: 0, intermediate: 0, advanced: 0 };

// Initialize the application
async function init() {
  try {
    showLoading();
    await loadQuestions();
    setupEventListeners();
    renderList(QUESTIONS);
    updateCounts();
  } catch (error) {
    showError("Failed to load questions. Please try refreshing the page.");
    console.error("Error initializing app:", error);
  }
}

// Load questions from JSON file
async function loadQuestions() {
  try {
    const response = await fetch("questions.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    QUESTIONS = await response.json();
  } catch (error) {
    console.error("Error loading questions:", error);
    throw error;
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Search functionality
  searchEl.addEventListener("input", handleSearch);
  mobileSearchEl.addEventListener("input", handleSearch);

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Filter buttons
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("toggle-btn")) {
      toggleAnswer(e.target.dataset.id);
    }

    if (e.target.classList.contains("filter-btn")) {
      handleFilter(e.target.dataset.filter);
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchEl.focus();
    }
  });
}

// Search handler with debouncing
let searchTimeout;
function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  if (query === currentSearch) return;

  currentSearch = query;

  // Debounce search to improve performance
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
}

// Perform search with fuzzy matching
function performSearch(query) {
  let results;

  if (query === "") {
    results = QUESTIONS;
  } else {
    // Support searching by number
    const num = Number(query);
    if (!Number.isNaN(num) && Number.isInteger(num)) {
      results = QUESTIONS.filter((item) => item.id === num);
    } else {
      // Use fuzzy search
      results = QUESTIONS.filter(
        (item) =>
          fuzzySearch(query, item.q) ||
          fuzzySearch(query, item.a) ||
          fuzzySearch(query, item.category) ||
          fuzzySearch(query, item.level)
      );
    }
  }

  // Apply current filter to search results
  if (currentFilter !== "all") {
    results = results.filter((item) => item.level === currentFilter);
  }

  renderList(results);
}

// Simple fuzzy search implementation
function fuzzySearch(query, text) {
  if (!text) return false;

  query = query.toLowerCase();
  text = text.toLowerCase();

  let queryIndex = 0;
  let textIndex = 0;

  while (textIndex < text.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
      if (queryIndex === query.length) return true;
    }
    textIndex++;
  }

  return false;
}

// Filter handler
function handleFilter(filter) {
  currentFilter = filter;

  // Update active filter button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle("bg-sky-50", isActive);
    btn.classList.toggle("dark:bg-sky-900/30", isActive);
    btn.classList.toggle("border-sky-100", isActive);
    btn.classList.toggle("dark:border-sky-800", isActive);
    btn.classList.toggle("hover:bg-slate-50", !isActive);
    btn.classList.toggle("dark:hover:bg-slate-700", !isActive);
  });

  // Apply filter to current search results
  let results = QUESTIONS;

  if (currentSearch) {
    results = QUESTIONS.filter(
      (item) =>
        fuzzySearch(currentSearch, item.q) ||
        fuzzySearch(currentSearch, item.a) ||
        fuzzySearch(currentSearch, item.category) ||
        fuzzySearch(currentSearch, item.level)
    );
  }

  if (filter !== "all") {
    results = results.filter((item) => item.level === filter);
  }

  renderList(results);
}

// Render question list
function renderList(list) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `
      <div class="p-8 bg-white dark:bg-slate-800 border rounded-lg text-center fade-in">
        <i class="fas fa-search text-4xl text-slate-300 dark:text-slate-600 mb-4"></i>
        <h3 class="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No questions found</h3>
        <p class="text-slate-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
      </div>
    `;
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((item) => {
    const card = document.createElement("article");
    card.className =
      "question-card bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm overflow-hidden fade-in";

    card.innerHTML = `
      <header class="p-4 flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="level-badge level-${item.level}">${item.level}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">#${
              item.id
            }</span>
          </div>
          <h3 class="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">${escapeHtml(
            item.q
          )}</h3>
        </div>
        <div class="pl-4">
          <button data-id="${
            item.id
          }" class="toggle-btn px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus-ring">
            Show
          </button>
        </div>
      </header>
      <div class="p-4 border-t dark:border-slate-700 hidden answer bg-slate-50 dark:bg-slate-700/50" id="a-${
        item.id
      }">
        <div class="text-slate-700 dark:text-slate-300 leading-relaxed">${escapeHtml(
          item.a
        )}</div>
      </div>
    `;

    frag.appendChild(card);
  });

  container.appendChild(frag);
}

// Toggle answer visibility
function toggleAnswer(id) {
  const ans = document.getElementById(`a-${id}`);
  const btn = document.querySelector(`[data-id="${id}"]`);

  if (ans.classList.contains("hidden")) {
    ans.classList.remove("hidden");
    btn.textContent = "Hide";
    btn.classList.add(
      "bg-sky-100",
      "dark:bg-sky-900/30",
      "border-sky-300",
      "dark:border-sky-700"
    );
  } else {
    ans.classList.add("hidden");
    btn.textContent = "Show";
    btn.classList.remove(
      "bg-sky-100",
      "dark:bg-sky-900/30",
      "border-sky-300",
      "dark:border-sky-700"
    );
  }
}

// Theme toggle functionality
function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");

  if (isDark) {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  }
}

// Update question counts
function updateCounts() {
  QUESTIONS.forEach((q) => {
    counts.all++;
    counts[q.level]++;
  });

  document.getElementById("count-all").textContent = counts.all;
  document.getElementById("count-beginner").textContent = counts.beginner;
  document.getElementById("count-intermediate").textContent =
    counts.intermediate;
  document.getElementById("count-advanced").textContent = counts.advanced;
}

// Utility functions
function escapeHtml(s) {
  if (typeof s !== "string") return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function showLoading() {
  container.innerHTML = `
    <div class="flex justify-center items-center p-8">
      <div class="loading-spinner"></div>
      <span class="ml-3 text-slate-600 dark:text-slate-400">Loading questions...</span>
    </div>
  `;
}

function showError(message) {
  container.innerHTML = `
    <div class="p-8 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg text-center fade-in">
      <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
      <h3 class="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Something went wrong</h3>
      <p class="text-slate-500 dark:text-slate-400 mb-4">${message}</p>
      <button onclick="init()" class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors">
        Try Again
      </button>
    </div>
  `;
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
