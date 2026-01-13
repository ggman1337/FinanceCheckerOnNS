import { getString, setString } from "@nativescript/core/application-settings";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export interface Entry {
  id: string;
  type: CategoryType;
  categoryId: string;
  amount: number;
  date: string;
  note: string;
}

interface FinanceData {
  categories: Category[];
  entries: Entry[];
}

const DATA_KEY = "financeData";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function buildDefaultCategories(): Category[] {
  return [
    { id: createId("cat"), name: "Зарплата", type: "income" },
    { id: createId("cat"), name: "Еда", type: "expense" },
  ];
}

function normalizeData(raw: any): FinanceData {
  const categories = Array.isArray(raw?.categories) ? raw.categories : [];
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  const sanitizedCategories = categories.filter(
    (item: any) =>
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      (item.type === "income" || item.type === "expense"),
  ) as Category[];
  const sanitizedEntries = entries.filter(
    (item: any) =>
      item &&
      typeof item.id === "string" &&
      typeof item.categoryId === "string" &&
      typeof item.amount === "number" &&
      typeof item.date === "string" &&
      (item.type === "income" || item.type === "expense"),
  ) as Entry[];

  const hasIncome = sanitizedCategories.some((cat) => cat.type === "income");
  const hasExpense = sanitizedCategories.some((cat) => cat.type === "expense");

  if (!hasIncome || !hasExpense) {
    const defaults = buildDefaultCategories();
    if (!hasIncome) {
      sanitizedCategories.push(defaults.find((cat) => cat.type === "income")!);
    }
    if (!hasExpense) {
      sanitizedCategories.push(defaults.find((cat) => cat.type === "expense")!);
    }
  }

  return {
    categories: sanitizedCategories,
    entries: sanitizedEntries,
  };
}

function saveData(data: FinanceData) {
  setString(DATA_KEY, JSON.stringify(data));
}

export function loadFinanceData(): FinanceData {
  const raw = getString(DATA_KEY, "");
  if (!raw) {
    const data = { categories: buildDefaultCategories(), entries: [] };
    saveData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(raw);
    const data = normalizeData(parsed);
    saveData(data);
    return data;
  } catch {
    const data = { categories: buildDefaultCategories(), entries: [] };
    saveData(data);
    return data;
  }
}

export function addCategory(name: string, type: CategoryType): FinanceData {
  const data = loadFinanceData();
  const trimmed = name.trim();
  if (!trimmed) {
    return data;
  }
  const newCategory: Category = {
    id: createId("cat"),
    name: trimmed,
    type,
  };
  data.categories.push(newCategory);
  saveData(data);
  return data;
}

export function addEntry(input: Omit<Entry, "id">): FinanceData {
  const data = loadFinanceData();
  const categoryExists = data.categories.some((cat) => cat.id === input.categoryId);
  if (!categoryExists) {
    return data;
  }
  const entry: Entry = {
    ...input,
    id: createId("entry"),
    note: input.note ?? "",
  };
  data.entries.unshift(entry);
  saveData(data);
  return data;
}

export function updateCategory(
  id: string,
  name: string,
  type: CategoryType,
): { data: FinanceData; error?: string } {
  const data = loadFinanceData();
  const trimmed = name.trim();
  if (!trimmed) {
    return { data, error: "Введите название категории." };
  }
  const category = data.categories.find((cat) => cat.id === id);
  if (!category) {
    return { data, error: "Категория не найдена." };
  }
  if (category.type !== type) {
    const sameTypeCount = data.categories.filter((cat) => cat.type === category.type)
      .length;
    if (sameTypeCount <= 1) {
      return { data, error: "Нужна хотя бы одна категория каждого типа." };
    }
  }
  category.name = trimmed;
  category.type = type;
  saveData(data);
  return { data };
}

export function deleteCategory(id: string): { data: FinanceData; error?: string } {
  const data = loadFinanceData();
  const category = data.categories.find((cat) => cat.id === id);
  if (!category) {
    return { data, error: "Категория не найдена." };
  }
  const used = data.entries.some((entry) => entry.categoryId === id);
  if (used) {
    return { data, error: "Категория используется в записях." };
  }
  const sameTypeCount = data.categories.filter((cat) => cat.type === category.type)
    .length;
  if (sameTypeCount <= 1) {
    return { data, error: "Нужна хотя бы одна категория каждого типа." };
  }
  data.categories = data.categories.filter((cat) => cat.id !== id);
  saveData(data);
  return { data };
}

export function updateEntry(
  id: string,
  input: Omit<Entry, "id">,
): { data: FinanceData; error?: string } {
  const data = loadFinanceData();
  const entry = data.entries.find((item) => item.id === id);
  if (!entry) {
    return { data, error: "Запись не найдена." };
  }
  const categoryExists = data.categories.some((cat) => cat.id === input.categoryId);
  if (!categoryExists) {
    return { data, error: "Категория не найдена." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { data, error: "Введите сумму больше 0." };
  }
  entry.type = input.type;
  entry.categoryId = input.categoryId;
  entry.amount = input.amount;
  entry.date = input.date;
  entry.note = input.note ?? "";
  saveData(data);
  return { data };
}

export function deleteEntry(id: string): FinanceData {
  const data = loadFinanceData();
  data.entries = data.entries.filter((entry) => entry.id !== id);
  saveData(data);
  return data;
}
