<script lang="ts" setup>
import { ref, computed, onMounted } from "nativescript-vue";
import { confirm } from "@nativescript/core";
import {
    loadFinanceData,
    addCategory,
    updateCategory,
    deleteCategory,
    type Category,
    type CategoryType,
} from "../services/financeService";

const props = defineProps<{ categoryId?: string }>();

const categories = ref<Category[]>([]);
const categoryTypeIndex = ref(0);
const categoryName = ref("");
const categoryError = ref("");
const editingCategoryId = ref<string | null>(null);
const editingCategory = computed(() =>
    categories.value.find((cat) => cat.id === editingCategoryId.value) || null,
);

const categoryType = computed<CategoryType>(() =>
    categoryTypeIndex.value === 0 ? "income" : "expense",
);

const filteredCategories = computed(() =>
    categories.value.filter((cat) => cat.type === categoryType.value),
);

function refreshData() {
    const data = loadFinanceData();
    categories.value = data.categories;

    if (props.categoryId && !editingCategoryId.value) {
        const target = data.categories.find((cat) => cat.id === props.categoryId);
        if (target) {
            startEdit(target);
        }
    }
}

function startEdit(category: Category) {
    editingCategoryId.value = category.id;
    categoryName.value = category.name;
    categoryTypeIndex.value = category.type === "income" ? 0 : 1;
}

function resetForm() {
    editingCategoryId.value = null;
    categoryName.value = "";
    categoryTypeIndex.value = 0;
    categoryError.value = "";
}

function saveCategory() {
    categoryError.value = "";
    const name = categoryName.value.trim();
    if (!name) {
        categoryError.value = "Введите название категории.";
        return;
    }

    if (editingCategoryId.value) {
        const result = updateCategory(editingCategoryId.value, name, categoryType.value);
        if (result.error) {
            categoryError.value = result.error;
            return;
        }
        resetForm();
        refreshData();
        return;
    }

    addCategory(name, categoryType.value);
    categoryName.value = "";
    refreshData();
}

async function removeCategory(category: Category) {
    const ok = await confirm({
        title: "Удалить категорию",
        message: "Удалить выбранную категорию?",
        okButtonText: "Удалить",
        cancelButtonText: "Отмена",
    });
    if (!ok) return;
    const result = deleteCategory(category.id);
    if (result.error) {
        categoryError.value = result.error;
        return;
    }
    if (editingCategoryId.value === category.id) {
        resetForm();
    }
    refreshData();
}

function removeEditingCategory() {
    if (!editingCategory.value) return;
    removeCategory(editingCategory.value);
}

onMounted(() => {
    refreshData();
});
</script>

<template>
    <Page android:fitsSystemWindows="true">
        <ActionBar title="Категории" />

        <ScrollView>
            <StackLayout class="page">
                <StackLayout class="card">
                    <Label text="Список категорий" class="section-title" />
                    <Label
                        :text="categoryTypeIndex === 0 ? 'Доходы' : 'Расходы'"
                        class="field-label"
                    />
                    <GridLayout
                        v-for="cat in filteredCategories"
                        :key="cat.id"
                        columns="*, auto"
                        class="chip-row"
                    >
                        <Label :text="cat.name" class="chip-text" col="0" />
                        <GridLayout columns="auto" col="1">
                            <Label
                                col="0"
                                text="✎"
                                class="icon-button icon-edit"
                                @tap="() => startEdit(cat)"
                            />
                        </GridLayout>
                    </GridLayout>
                    <Label
                        v-if="!filteredCategories.length"
                        text="Нет категорий выбранного типа."
                        class="subtle mt-1"
                    />
                </StackLayout>

                <StackLayout class="card">
                    <Label
                        :text="editingCategoryId ? 'Редактировать категорию' : 'Новая категория'"
                        class="section-title"
                    />
                    <GridLayout columns="*, *" class="toggle-row">
                        <Button
                            col="0"
                            text="Доход"
                            :class="categoryTypeIndex === 0 ? 'toggle-button active' : 'toggle-button'"
                            @tap="categoryTypeIndex = 0"
                        />
                        <Button
                            col="1"
                            text="Расход"
                            :class="categoryTypeIndex === 1 ? 'toggle-button active' : 'toggle-button'"
                            @tap="categoryTypeIndex = 1"
                        />
                    </GridLayout>

                    <TextField
                        v-model="categoryName"
                        hint="Название категории"
                        class="text-field mt-2"
                    />
                    <Button
                        :text="editingCategoryId ? 'Сохранить' : 'Добавить категорию'"
                        class="primary-button mt-2"
                        @tap="saveCategory"
                    />
                    <Button
                        v-if="editingCategory"
                        text="Удалить категорию"
                        class="danger-button mt-1"
                        @tap="removeEditingCategory"
                    />
                    <Button
                        v-if="editingCategoryId"
                        text="Отмена"
                        class="ghost-button mt-1"
                        @tap="resetForm"
                    />
                    <Label
                        v-if="categoryError"
                        :text="categoryError"
                        class="error mt-1"
                    />
                </StackLayout>
            </StackLayout>
        </ScrollView>
    </Page>
</template>
