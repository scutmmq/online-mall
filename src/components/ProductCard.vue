<template>
  <article class="product-card" tabindex="0" @click="$emit('select', product.id)" @keyup.enter="$emit('select', product.id)">
    <div class="product-media">
      <img :src="product.imageUrl" :alt="product.name || '商品图片'" class="product-image">
      <span class="rating-badge" v-if="hasRating">
        <el-icon><StarFilled /></el-icon>
        {{ formatRating(product.rating) }}
      </span>
    </div>
    <div class="product-body">
      <h3 class="product-name">{{ product.name }}</h3>
      <div class="product-merchant">
        <el-icon><Shop /></el-icon>
        <span>{{ product.merchantName || '未知商家' }}</span>
      </div>
      <div class="product-footer">
        <div class="product-price">
          <span class="price-symbol">¥</span>
          <span class="price-integer">{{ priceInteger }}</span>
          <span class="price-decimal">.{{ priceDecimal }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { Shop, StarFilled } from '@element-plus/icons-vue';

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

defineEmits(['select']);

const hasRating = computed(() => props.product.rating !== undefined && props.product.rating !== null);

const formatRating = (rating) => Number(rating || 0).toFixed(1);

const priceInteger = computed(() => {
  const num = Number(props.product.price || 0);
  return Math.floor(num).toString();
});

const priceDecimal = computed(() => {
  const num = Number(props.product.price || 0);
  return (num % 1).toFixed(2).substring(2);
});
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  cursor: pointer;
  box-shadow: var(--mall-shadow);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  will-change: transform;
}

.product-card:hover,
.product-card:focus-visible {
  transform: translateY(-4px);
  border-color: var(--mall-border-strong);
  box-shadow: var(--mall-shadow-hover);
  outline: none;
}

/* ── 图片区 ── */
.product-media {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #f5f5f5;
}

.product-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.38s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

/* 评分角标 */
.rating-badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.48);
  color: #ffd700;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.rating-badge .el-icon {
  font-size: 11px;
}

/* ── 文字区 ── */
.product-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 14px 14px;
  flex: 1;
}

.product-name {
  margin: 0;
  color: var(--mall-text);
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.52;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-height: 42px;
}

.product-merchant {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--mall-text-subtle, #9ca3af);
  font-size: 12px;
  overflow: hidden;
}

.product-merchant .el-icon {
  flex-shrink: 0;
  font-size: 12px;
}

.product-merchant span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 价格区 ── */
.product-footer {
  margin-top: auto;
  padding-top: 8px;
}

.product-price {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  color: #e4232b;
}

.price-symbol {
  font-size: 14px;
  font-weight: 700;
}

.price-integer {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.5px;
}

.price-decimal {
  font-size: 13px;
  font-weight: 600;
}

/* ── 响应式 ── */
@media (max-width: 520px) {
  .product-body {
    padding: 10px 12px 12px;
  }

  .price-integer {
    font-size: 19px;
  }
}
</style>
