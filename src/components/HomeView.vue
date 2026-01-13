<script lang="ts" setup>
import { ref, computed, onMounted } from "nativescript-vue";
import { action } from "@nativescript/core";
import { $navigateTo } from "nativescript-vue";
import { loadFinanceData, type Category, type Entry } from "../services/financeService";
import EntryFormView from "./EntryFormView.vue";
import CategoryFormView from "./CategoryFormView.vue";

const categories = ref<Category[]>([]);
const entries = ref<Entry[]>([]);
const showFilters = ref(false);

const periodOptions = ref(["День", "Неделя", "Месяц", "Период"]);
const periodIndex = ref(0);
const periodDate = ref(new Date());
const rangeStart = ref(new Date());
const rangeEnd = ref(new Date());

function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(dateKey: string): string {
    const [year, month, day] = dateKey.split("-");
    if (!year || !month || !day) return dateKey;
    return `${day}.${month}.${year}`;
}

function startOfWeek(date: Date): Date {
    const weekday = (date.getDay() + 6) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - weekday);
    start.setHours(0, 0, 0, 0);
    return start;
}

function endOfWeek(date: Date): Date {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function refreshData() {
    const data = loadFinanceData();
    categories.value = data.categories;
    entries.value = data.entries;
}

const categoryMap = computed(
    () => new Map(categories.value.map((cat) => [cat.id, cat])),
);

const periodRange = computed(() => {
    if (periodIndex.value === 0) {
        const key = toDateKey(periodDate.value);
        return { startKey: key, endKey: key };
    }
    if (periodIndex.value === 1) {
        const start = startOfWeek(periodDate.value);
        const end = endOfWeek(periodDate.value);
        return { startKey: toDateKey(start), endKey: toDateKey(end) };
    }
    if (periodIndex.value === 2) {
        const start = startOfMonth(periodDate.value);
        const end = endOfMonth(periodDate.value);
        return { startKey: toDateKey(start), endKey: toDateKey(end) };
    }
    const startKey = toDateKey(rangeStart.value);
    const endKey = toDateKey(rangeEnd.value);
    return startKey <= endKey
        ? { startKey, endKey }
        : { startKey: endKey, endKey: startKey };
});

const periodLabel = computed(() => {
    const { startKey, endKey } = periodRange.value;
    if (startKey === endKey) {
        return `Период: ${formatDate(startKey)}`;
    }
    return `Период: ${formatDate(startKey)} - ${formatDate(endKey)}`;
});

const filteredEntries = computed(() => {
    const { startKey, endKey } = periodRange.value;
    return entries.value
        .filter((entry) => entry.date >= startKey && entry.date <= endKey)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date));
});

const totals = computed(() => {
    return filteredEntries.value.reduce(
        (acc, entry) => {
            if (entry.type === "income") {
                acc.income += entry.amount;
            } else {
                acc.expense += entry.amount;
            }
            acc.balance = acc.income - acc.expense;
            return acc;
        },
        { income: 0, expense: 0, balance: 0 },
    );
});

function formatMoney(amount: number): string {
    return amount.toFixed(2);
}

function getCategoryName(categoryId: string): string {
    return categoryMap.value.get(categoryId)?.name ?? "Категория";
}

function formatEntryAmount(entry: Entry): string {
    const sign = entry.type === "income" ? "+" : "-";
    return `${sign}${formatMoney(entry.amount)}`;
}

function formatEntryMeta(entry: Entry): string {
    const note = entry.note?.trim();
    const parts = [formatDate(entry.date), getCategoryName(entry.categoryId)];
    if (note) {
        parts.push(note);
    }
    return parts.join(" - ");
}

function onPeriodChange(args: any) {
    periodIndex.value = args.object.selectedIndex;
}

function onPeriodDateChange(args: any) {
    periodDate.value = args.object.date;
}

function onRangeStartChange(args: any) {
    rangeStart.value = args.object.date;
}

function onRangeEndChange(args: any) {
    rangeEnd.value = args.object.date;
}

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

async function openCreateMenu() {
    const result = await action({
        title: "Создать",
        message: "Выберите тип",
        cancelButtonText: "Отмена",
        actions: ["Запись", "Категория"],
    });
    if (result === "Запись") {
        $navigateTo(EntryFormView);
    }
    if (result === "Категория") {
        $navigateTo(CategoryFormView);
    }
}

function editEntry(item: Entry) {
    $navigateTo(EntryFormView, { props: { entryId: item.id } });
}

onMounted(() => {
    refreshData();
});
</script>

<template>
    <Page @navigatedTo="refreshData" android:fitsSystemWindows="true">
        <ActionBar title="Финансовый журнал">
            <ActionItem
                text="+"
                class="plus-button"
                android.position="actionBar"
                @tap="openCreateMenu"
            />
        </ActionBar>

        <ScrollView>
            <StackLayout class="page">
                <StackLayout class="card">
                    <GridLayout columns="*, auto">
                        <Label :text="periodLabel" class="section-title period-title" />
                        <Button
                            col="1"
                            :text="showFilters ? 'Скрыть' : 'Фильтры'"
                            class="ghost-button filter-button"
                            @tap="toggleFilters"
                        />
                    </GridLayout>

                    <StackLayout v-if="showFilters" class="mt-1">
                        <Label text="Период" class="field-label" />
                        <ListPicker
                            :items="periodOptions"
                            :selectedIndex="periodIndex"
                            @selectedIndexChange="onPeriodChange"
                        />

                        <DatePicker
                            v-if="periodIndex < 3"
                            :date="periodDate"
                            @dateChange="onPeriodDateChange"
                        />

                        <GridLayout
                            v-if="periodIndex === 3"
                            columns="*, *"
                            class="mt-1"
                        >
                            <DatePicker
                                col="0"
                                :date="rangeStart"
                                @dateChange="onRangeStartChange"
                            />
                            <DatePicker
                                col="1"
                                :date="rangeEnd"
                                @dateChange="onRangeEndChange"
                            />
                        </GridLayout>
                    </StackLayout>
                </StackLayout>

                <StackLayout class="card">
                    <Label text="Сводка" class="section-title" />
                    <GridLayout columns="*,*,*" class="summary-row">
                        <StackLayout col="0">
                            <Label text="Доход" class="summary-label" />
                            <Label
                                :text="formatMoney(totals.income)"
                                class="summary-income"
                            />
                        </StackLayout>
                        <StackLayout col="1">
                            <Label text="Расход" class="summary-label" />
                            <Label
                                :text="formatMoney(totals.expense)"
                                class="summary-expense"
                            />
                        </StackLayout>
                        <StackLayout col="2">
                            <Label text="Баланс" class="summary-label" />
                            <Label
                                :text="formatMoney(totals.balance)"
                                class="summary-balance"
                            />
                        </StackLayout>
                    </GridLayout>
                </StackLayout>

                <StackLayout class="card">
                    <Label text="Записи" class="section-title" />
                    <Label
                        v-if="!filteredEntries.length"
                        text="Нет записей за выбранный период."
                        class="subtle mt-1"
                    />
                    <StackLayout v-else class="entry-list">
                        <GridLayout
                            v-for="item in filteredEntries"
                            :key="item.id"
                            columns="*, auto, auto"
                            class="entry-item"
                        >
                            <StackLayout col="0">
                                <Label
                                    :text="getCategoryName(item.categoryId)"
                                    class="entry-title"
                                />
                                <Label
                                    :text="formatEntryMeta(item)"
                                    class="entry-meta"
                                />
                            </StackLayout>
                            <Label
                                col="1"
                                :text="formatEntryAmount(item)"
                                :class="item.type === 'income' ? 'entry-amount income' : 'entry-amount expense'"
                                verticalAlignment="center"
                            />
                            <Label
                                col="2"
                                text="✎"
                                class="icon-button icon-edit"
                                verticalAlignment="center"
                                @tap="() => editEntry(item)"
                            />
                        </GridLayout>
                    </StackLayout>
                </StackLayout>
            </StackLayout>
        </ScrollView>
    </Page>
</template>
