<template>
  <main class="home-page">
    <!-- 搜索区：紧凑、全宽 -->
    <section class="home-search">
      <div class="search-row">
        <h1 class="search-title">发现合适的商品</h1>
        <div class="search-box">
          <ElInput v-model="keyword" placeholder="搜索商品名称、分类或商家" class="search-input" @keyup.enter="comeToSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <ElButton type="primary" @click="comeToSearch">搜索</ElButton>
            </template>
          </ElInput>
        </div>
      </div>
    </section>

    <section class="browse-layout">
      <!-- 分类侧边栏 -->
      <aside class="category-panel">
        <div class="panel-header">
          <span>商品分类</span>
          <button v-if="!isAll" class="clear-button" type="button" @click="handleAllClick">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            清除
          </button>
        </div>

        <button class="category-all" :class="{ active: isAll }" type="button" @click="handleAllClick">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          全部商品
        </button>

        <div class="category-group">
          <button
            v-for="level1 in level1Categories"
            :key="level1.id"
            class="category-item"
            :class="{ active: selectedLevel1Id === level1.id && !isAll }"
            type="button"
            @click="handleLevel1Click(level1)"
          >
            <img :src="level1.icon" alt="" v-if="level1.icon">
            <span class="cat-dot" v-else></span>
            <span>{{ level1.name }}</span>
          </button>
        </div>

        <div class="sub-category" v-if="selectedLevel1Id && !isAll">
          <div class="sub-title">细分类目</div>
          <div class="sub-list">
            <button
              v-for="level2 in level2Categories"
              :key="level2.id"
              class="sub-item"
              :class="{ active: selectedLevel2Id === level2.id }"
              type="button"
              @click="handleLevel2Click(level2)"
            >
              {{ level2.name }}
            </button>
          </div>
        </div>

        <div class="sub-category" v-if="selectedLevel2Id && !isAll">
          <div class="sub-title">更多筛选</div>
          <div class="tag-list">
            <button
              v-for="level3 in level3Categories"
              :key="level3.id"
              class="tag-item"
              :class="{ active: selectedLevel3Id === level3.id }"
              type="button"
              @click="handleLevel3Click(level3)"
            >
              {{ level3.name }}
            </button>
          </div>
        </div>
      </aside>

      <!-- 商品区域 -->
      <section class="product-section">
        <div class="result-toolbar">
          <div>
            <h2>{{ isAll ? '全部商品' : '筛选结果' }}</h2>
            <p v-if="isLoaded">共 {{ total }} 件商品</p>
          </div>
          <ElPagination
            class="toolbar-pagination"
            v-if="total > pageSize && isLoaded"
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            :hide-on-single-page="true"
            @current-change="handleCurrentChange"
          />
        </div>

        <div class="product-grid" v-if="productList.length > 0">
          <ProductCard
            v-for="product in productList"
            :key="product.id"
            :product="product"
            @select="goToDetail"
          />
        </div>

        <div class="empty-tip" v-if="productList.length === 0 && isLoaded">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--mall-text-subtle)" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <h3>暂时没有匹配的商品</h3>
          <p>可以清除分类，或尝试换一个关键词搜索。</p>
          <ElButton v-if="!isAll" @click="handleAllClick">查看全部商品</ElButton>
        </div>

        <div class="pagination-container" v-if="total > 0 && isLoaded">
          <ElPagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :page-sizes="[12, 24, 36]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            :hide-on-single-page="false"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElInput, ElPagination } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import ProductCard from '@/components/ProductCard.vue';
import { getProductsApi } from '@/api/product';
import { getCategoriesApi } from '@/api/category';

const router = useRouter();

const keyword = ref('');
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const level1Categories = ref([]);
const level2Categories = ref([]);
const level3Categories = ref([]);
const productList = ref([]);
const isLoaded = ref(false);
const selectedLevel1Id = ref(null);
const selectedLevel2Id = ref(null);
const selectedLevel3Id = ref(null);
const isAll = ref(true);

const comeToSearch = () => {
  const value = keyword.value.trim();
  if (!value) return;
  router.push({
    path: '/search',
    query: { keyword: value }
  });
};

onMounted(async () => {
  const level1Res = await getCategoriesApi({ level: 1 });
  if (level1Res.code === 1) {
    level1Categories.value = level1Res.data;
  }
  await fetchProducts();
});

watch([selectedLevel1Id, selectedLevel2Id, selectedLevel3Id, isAll, page, pageSize], async () => {
  await fetchProducts();
}, { immediate: false });

const fetchProducts = async () => {
  isLoaded.value = false;
  let categoryId = null;

  if (!isAll.value) {
    categoryId = selectedLevel3Id.value || selectedLevel2Id.value || selectedLevel1Id.value;
  }

  const productRes = await getProductsApi({
    categoryId,
    isActive: 1,
    page: page.value,
    pageSize: pageSize.value
  });

  if (productRes.code === 1) {
    productList.value = productRes.data.rows;
    total.value = productRes.data.total;
  }
  isLoaded.value = true;
};

const handleLevel1Click = async (level1) => {
  isAll.value = false;
  selectedLevel1Id.value = level1.id;
  selectedLevel2Id.value = null;
  selectedLevel3Id.value = null;
  page.value = 1;

  const level2Res = await getCategoriesApi({ parentId: level1.id, level: 2 });
  level2Categories.value = level2Res.code === 1 ? level2Res.data : [];
};

const handleLevel2Click = async (level2) => {
  selectedLevel2Id.value = level2.id;
  selectedLevel3Id.value = null;
  page.value = 1;

  const level3Res = await getCategoriesApi({ parentId: level2.id, level: 3 });
  level3Categories.value = level3Res.code === 1 ? level3Res.data : [];
};

const handleLevel3Click = (level3) => {
  selectedLevel3Id.value = level3.id;
  page.value = 1;
};

const handleAllClick = () => {
  isAll.value = true;
  selectedLevel1Id.value = null;
  selectedLevel2Id.value = null;
  selectedLevel3Id.value = null;
  level2Categories.value = [];
  level3Categories.value = [];
  page.value = 1;
};

const handleSizeChange = (newSize) => {
  pageSize.value = newSize;
  page.value = 1;
};

const handleCurrentChange = (newPage) => {
  page.value = newPage;
};

const goToDetail = (productId) => {
  router.push(`/product/${productId}`);
};
</script>

<style scoped>
/* ── 页面容器 ─────────────────────────────────────────────────────────── */
.home-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 24px 56px;
}

/* ── 搜索区域：标题 + 搜索框横排 ──────────────────────────────────────── */
.home-search {
  padding: 0 0 20px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  box-shadow: var(--mall-shadow);
}

.search-title {
  margin: 0;
  color: var(--mall-text);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-input {
  display: block;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 6px 0 0 6px;
  font-size: 14px;
  box-shadow: 0 0 0 1px var(--mall-border) inset;
}

.search-input :deep(.el-input-group__append) {
  border-color: var(--mall-primary);
  background: var(--mall-primary);
  box-shadow: none;
}

.search-input :deep(.el-input-group__append .el-button) {
  min-width: 72px;
  height: 44px;
  border: 0;
  background: var(--mall-primary);
  color: #fff;
  box-shadow: none;
  font-size: 14px;
}

/* ── 主体两栏 ─────────────────────────────────────────────────────────── */
.browse-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: start;
  gap: 20px;
}

/* ── 分类面板 ─────────────────────────────────────────────────────────── */
.category-panel {
  position: sticky;
  top: 84px;
  padding: 14px;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  box-shadow: var(--mall-shadow);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0 2px;
  color: var(--mall-text);
  font-size: 14px;
  font-weight: 700;
}

.clear-button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: var(--mall-text-muted);
  cursor: pointer;
  font-size: 12px;
  transition: color 0.15s ease;
}
.clear-button:hover {
  color: var(--mall-primary);
}

/* 分类按钮通用 */
.category-all,
.category-item,
.sub-item,
.tag-item {
  border: 1px solid transparent;
  background: transparent;
  color: var(--mall-text);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.category-all {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 4px;
  padding: 9px 10px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13.5px;
}

.category-all svg {
  flex-shrink: 0;
  color: var(--mall-text-muted);
}

.category-group {
  display: grid;
  gap: 2px;
}

.category-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13.5px;
}

.category-item img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 3px;
}

/* 没有图标时的圆点占位 */
.cat-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mall-border-strong);
  flex-shrink: 0;
  margin: 0 5px 0 1px;
  transition: background 0.15s ease;
}

.category-item.active .cat-dot {
  background: var(--mall-primary);
}

/* hover & active */
.category-all:hover,
.category-item:hover,
.sub-item:hover,
.tag-item:hover {
  background: var(--mall-surface-muted);
}

.category-all.active,
.category-item.active,
.sub-item.active,
.tag-item.active {
  border-color: #bcd4ff;
  background: #eef5ff;
  color: var(--mall-primary);
  font-weight: 600;
}

.category-all.active svg {
  color: var(--mall-primary);
}

/* 子分类区域 */
.sub-category {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--mall-border);
}

.sub-title {
  margin-bottom: 6px;
  padding-left: 2px;
  color: var(--mall-text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sub-list,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-item,
.tag-item {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12.5px;
}

/* ── 商品区域 ─────────────────────────────────────────────────────────── */
.product-section {
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  box-shadow: var(--mall-shadow);
  padding: 20px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 72px;
  z-index: 8;
  margin: -20px -20px 16px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--mall-border);
  background: var(--mall-surface);
  border-radius: var(--mall-radius) var(--mall-radius) 0 0;
}

.result-toolbar h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.result-toolbar p {
  margin: 2px 0 0;
  color: var(--mall-text-muted);
  font-size: 12.5px;
}

.toolbar-pagination {
  flex: 0 0 auto;
}

.toolbar-pagination :deep(.el-pager li),
.toolbar-pagination :deep(.btn-prev),
.toolbar-pagination :deep(.btn-next) {
  min-width: 30px;
  height: 30px;
  border-radius: 6px;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

/* 空状态 */
.empty-tip {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 48px 20px;
  color: var(--mall-text-muted);
  text-align: center;
}

.empty-tip h3 {
  margin: 0;
  color: var(--mall-text);
  font-size: 16px;
  font-weight: 700;
}

.empty-tip p {
  margin: 0 0 8px;
  font-size: 13px;
}

/* 底部分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--mall-border);
}

/* ── 响应式 ───────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .browse-layout {
    grid-template-columns: 1fr;
  }

  .category-panel {
    position: static;
  }

  .result-toolbar {
    top: 60px;
  }
}

@media (max-width: 680px) {
  .home-page {
    padding: 16px 12px 32px;
  }

  .search-row {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .search-title {
    font-size: 18px;
    text-align: center;
  }

  .category-panel,
  .product-section {
    padding: 12px;
  }

  .result-toolbar {
    align-items: flex-start;
    flex-direction: column;
    margin: -12px -12px 14px;
    padding: 14px 12px 10px;
  }

  .toolbar-pagination {
    width: 100%;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
