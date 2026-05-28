<template>
  <main class="search-page">
    <section class="search-header">
      <ElInput v-model="keyword" placeholder="继续搜索商品" class="search-input" @keyup.enter="handleSearch" autofocus>
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #append>
          <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        </template>
      </ElInput>
    </section>

    <section class="search-results">
      <div class="result-toolbar" v-if="isSearched">
        <div>
          <h1>搜索「{{ keyword }}」</h1>
          <p v-if="isLoaded">找到 {{ total }} 件相关商品</p>
        </div>
      </div>

      <div class="product-grid" v-if="productList.length > 0">
        <ProductCard
          v-for="product in productList"
          :key="product.id"
          :product="product"
          @select="goToDetail"
        />
      </div>

      <div class="empty-tip" v-if="productList.length === 0 && isLoaded && isSearched">
        <h3>没有找到相关商品</h3>
        <p>可以减少关键词，或返回首页按分类继续浏览。</p>
        <ElButton @click="router.push('/home')">返回首页</ElButton>
      </div>

      <div class="empty-tip" v-if="!isSearched">
        <h3>输入关键词开始搜索</h3>
        <p>建议使用商品名称、品牌、分类或商家名称。</p>
      </div>

      <div class="pagination-container" v-if="total > 0 && isLoaded">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          :hide-on-single-page="false"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElInput, ElPagination } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import ProductCard from '@/components/ProductCard.vue';
import { getProductsApi } from '@/api/product';

const route = useRoute();
const router = useRouter();
const keyword = ref(route.query.keyword || '');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const productList = ref([]);
const isLoaded = ref(false);
const isSearched = ref(!!keyword.value);

onMounted(async () => {
  if (keyword.value) {
    await fetchProducts();
  }
});

watch(keyword, (newVal) => {
  if (!newVal && isSearched.value) {
    productList.value = [];
    total.value = 0;
  }
});

watch([page, pageSize], async () => {
  if (isSearched.value) {
    await fetchProducts();
  }
});

const handleSearch = async () => {
  const value = keyword.value.trim();
  if (!value) return;

  router.push({
    path: '/search',
    query: { keyword: value }
  });

  page.value = 1;
  isSearched.value = true;
  await fetchProducts();
};

const fetchProducts = async () => {
  isLoaded.value = false;
  try {
    const res = await getProductsApi({
      keyword: keyword.value.trim(),
      isActive: 1,
      page: page.value,
      pageSize: pageSize.value
    });

    if (res.code === 1) {
      productList.value = res.data.rows;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error('搜索商品失败:', error);
  } finally {
    isLoaded.value = true;
  }
};

const handleSizeChange = (newSize) => {
  pageSize.value = newSize;
};

const handleCurrentChange = (newPage) => {
  page.value = newPage;
};

const goToDetail = (productId) => {
  router.push(`/product/${productId}`);
};
</script>

<style scoped>
.search-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.search-header,
.search-results {
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  box-shadow: var(--mall-shadow);
}

.search-header {
  padding: 18px;
}

.search-input {
  max-width: 760px;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 44px;
}

.search-results {
  margin-top: 20px;
  padding: 18px;
}

.result-toolbar {
  margin-bottom: 16px;
}

.result-toolbar h1 {
  margin: 0;
  color: var(--mall-text);
  font-size: 20px;
  font-weight: 700;
}

.result-toolbar p {
  margin: 4px 0 0;
  color: var(--mall-text-muted);
  font-size: 13px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.empty-tip {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 56px 20px;
  color: var(--mall-text-muted);
  text-align: center;
}

.empty-tip h3 {
  margin: 0;
  color: var(--mall-text);
  font-size: 18px;
  font-weight: 700;
}

.empty-tip p {
  margin: 0 0 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--mall-border);
}

@media (max-width: 520px) {
  .search-page {
    padding: 16px 12px 32px;
  }

  .search-header,
  .search-results {
    padding: 14px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
