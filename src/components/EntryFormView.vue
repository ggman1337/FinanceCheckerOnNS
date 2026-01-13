<script lang="ts" setup>
import { ref, computed, onMounted, watch } from "nativescript-vue";
import { confirm } from "@nativescript/core";
import { $navigateBack } from "nativescript-vue";
import {
    loadFinanceData,
    addEntry,
    updateEntry,
    deleteEntry,
    type Category,
    type Entry,
    type CategoryType,
} from "../services/financeService";

const props = defineProps<{ entryId?: string }>();

const categories = ref<Category[]>([]);
const currentEntry = ref<Entry | null>(null);

const entryTypeIndex = ref(0);
const entryCategoryIndex = ref(0);
const entryAmount = ref("");
const entryNote = ref("");
const entryDate = ref(new Date());
const entryError = ref("");

const entryType = computed<CategoryType>(() =>
    entryTypeIndex.value === 0 ? "income" : "expense",
);

const entryCategories = computed(() =>
    categories.value.filter((cat) => cat.type === entryType.value),
);

const entryCategoryNames = computed(() =>
    entryCategories.value.map((cat) => cat.name),
);

watch(entryCategories, () => {
    if (entryCategoryIndex.value >= entryCategories.value.length) {
        entryCategoryIndex.value = 0;
    }
});

function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function refreshData() {
    const data = loadFinanceData();
    categories.value = data.categories;

    if (props.entryId) {
        const entry = data.entries.find((item) => item.id === props.entryId) || null;
        currentEntry.value = entry;
        if (entry) {
            entryTypeIndex.value = entry.type === "income" ? 0 : 1;
            entryAmount.value = String(entry.amount);
            entryNote.value = entry.note ?? "";
            const [year, month, day] = entry.date.split("-").map(Number);
            entryDate.value = new Date(year, (month || 1) - 1, day || 1);
            const idx = entryCategories.value.findIndex(
                (cat) => cat.id === entry.categoryId,
            );
            if (idx >= 0) {
                entryCategoryIndex.value = idx;
            }
        }
    }
}

function onEntryTypeChange(nextIndex: number) {
    entryTypeIndex.value = nextIndex;
    entryCategoryIndex.value = 0;
}

function onEntryCategoryChange(args: any) {
    entryCategoryIndex.value = args.object.selectedIndex;
}

function onEntryDateChange(args: any) {
    entryDate.value = args.object.date;
}

function saveEntry() {
    entryError.value = "";
    const amount = Number(entryAmount.value.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
        entryError.value = "Введите сумму больше 0.";
        return;
    }
    const category = entryCategories.value[entryCategoryIndex.value];
    if (!category) {
        entryError.value = "Добавьте категорию перед созданием записи.";
        return;
    }

    if (currentEntry.value) {
        const result = updateEntry(currentEntry.value.id, {
            type: entryType.value,
            categoryId: category.id,
            amount,
            date: toDateKey(entryDate.value),
            note: entryNote.value.trim(),
        });
        if (result.error) {
            entryError.value = result.error;
            return;
        }
    } else {
        addEntry({
            type: entryType.value,
            categoryId: category.id,
            amount,
            date: toDateKey(entryDate.value),
            note: entryNote.value.trim(),
        });
    }

    $navigateBack();
}

async function removeEntry() {
    if (!currentEntry.value) return;
    const ok = await confirm({
        title: "Удалить запись",
        message: "Удалить выбранную запись?",
        okButtonText: "Удалить",
        cancelButtonText: "Отмена",
    });
    if (!ok) return;
    deleteEntry(currentEntry.value.id);
    $navigateBack();
}

onMounted(() => {
    refreshData();
});
</script>

<template>
    <Page android:fitsSystemWindows="true">
        <ActionBar :title="currentEntry ? 'Редактировать запись' : 'Новая запись'" />

        <ScrollView>
            <StackLayout class="page">
                <StackLayout class="card">
                    <Label text="Тип записи" class="section-title" />
                    <GridLayout columns="*, *" class="toggle-row">
                        <Button
                            col="0"
                            text="Доход"
                            :class="entryTypeIndex === 0 ? 'toggle-button active' : 'toggle-button'"
                            @tap="() => onEntryTypeChange(0)"
                        />
                        <Button
                            col="1"
                            text="Расход"
                            :class="entryTypeIndex === 1 ? 'toggle-button active' : 'toggle-button'"
                            @tap="() => onEntryTypeChange(1)"
                        />
                    </GridLayout>

                    <Label text="Категория" class="field-label" />
                    <ListPicker
                        :items="entryCategoryNames"
                        :selectedIndex="entryCategoryIndex"
                        @selectedIndexChange="onEntryCategoryChange"
                    />

                    <Label text="Сумма" class="field-label" />
                    <TextField
                        v-model="entryAmount"
                        hint="Например, 1200"
                        keyboardType="number"
                        class="text-field"
                    />

                    <Label text="Комментарий" class="field-label" />
                    <TextField
                        v-model="entryNote"
                        hint="Необязательно"
                        class="text-field"
                    />

                    <Label text="Дата" class="field-label" />
                    <DatePicker :date="entryDate" @dateChange="onEntryDateChange" />

                    <Button
                        :text="currentEntry ? 'Сохранить' : 'Добавить запись'"
                        class="primary-button mt-2"
                        @tap="saveEntry"
                    />
                    <Button
                        v-if="currentEntry"
                        text="Удалить запись"
                        class="danger-button mt-1"
                        @tap="removeEntry"
                    />
                    <Label v-if="entryError" :text="entryError" class="error mt-1" />
                </StackLayout>
            </StackLayout>
        </ScrollView>
    </Page>
</template>
