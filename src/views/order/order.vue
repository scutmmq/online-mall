<template>
  <div class="order-detail-container">

    <!-- 加载 / 错误（保留原逻辑）-->
    <div class="state-block" v-if="isLoading">订单加载中…</div>
    <div class="state-block error" v-if="isError">
      订单加载失败，请稍后重试
      <ElButton type="primary" link @click="fetchOrderDetail">刷新</ElButton>
    </div>

    <div class="order-content" v-if="orderItems.length > 0 && !isLoading && !isError">

      <a class="back" @click="goBack">
        <ElIcon><ArrowLeft /></ElIcon>返回我的订单
      </a>

      <!-- ─── 1. 状态横幅 + 进度时间线 ─────────────────────────────── -->
      <section class="card status-hero">
        <div class="status-hero-top">
          <div class="status-left">
            <div class="status-icon"><ElIcon size="26"><Clock /></ElIcon></div>
            <div class="status-text">
              <h1>等待买家付款</h1>
              <p class="sub">请尽快完成支付，过期订单将自动取消</p>
            </div>
          </div>
          <div class="status-right">
            <div class="lab">实付款</div>
            <div class="amt"><span class="sym">¥</span>{{ formatAmount(totalAmount) }}</div>
          </div>
        </div>

        <div class="timeline">
          <div class="tl-step done">
            <div class="tl-node"><ElIcon><Check /></ElIcon></div>
            <div class="tl-lab">提交订单</div>
          </div>
          <div class="tl-step current">
            <div class="tl-node">2</div>
            <div class="tl-lab">完成支付</div>
            <div class="tl-time">待支付</div>
          </div>
          <div class="tl-step">
            <div class="tl-node">3</div><div class="tl-lab">商家发货</div>
          </div>
          <div class="tl-step">
            <div class="tl-node">4</div><div class="tl-lab">确认收货</div>
          </div>
          <div class="tl-step">
            <div class="tl-node">5</div><div class="tl-lab">交易完成</div>
          </div>
        </div>
      </section>

      <div class="body-grid">

        <!-- ─── 左列 ─────────────────────────────────────────────── -->
        <div class="col">

          <!-- 商品清单 -->
          <section class="card">
            <div class="card-head"><h3>商品清单</h3>
              <span class="more">共 {{ orderItems.length }} 件商品</span>
            </div>
            <div class="pl-head">
              <span>商品</span><span></span>
              <span>单价</span><span>数量</span><span>小计</span>
            </div>
            <div class="pl-row" v-for="item in orderItems" :key="item.id">
              <div class="pl-thumb">
                <img v-if="item.imageUrl" :src="item.imageUrl" alt="商品图片" />
              </div>
              <div class="pl-info">
                <p class="pl-name">{{ item.productName }}</p>
                <span class="pl-merchant">商家 ID：{{ item.merchantId }}</span>
              </div>
              <div class="pl-price">¥{{ formatAmount(item.productPrice) }}</div>
              <div class="pl-qty">×{{ item.quantity }}</div>
              <div class="pl-sub">¥{{ formatAmount(item.subtotal) }}</div>
            </div>
          </section>

          <!-- 支付方式 -->
          <section class="card">
            <div class="card-head"><h3>选择支付方式</h3></div>
            <div class="pay-grid">
              <div
                v-for="method in paymentMethods"
                :key="method.value"
                class="pay-opt"
                :class="{ active: selectedPaymentMethod === method.value }"
                @click="selectedPaymentMethod = method.value"
              >
                <div class="pi" :class="method.value === 0 ? 'alipay' : 'wechat'">
                  {{ method.value === 0 ? '支' : '微' }}
                </div>
                <div>
                  <div class="pt">{{ method.label }}</div>
                  <div class="ps">
                    {{ method.value === 0 ? '推荐 · 余额、花呗、银行卡' : '微信钱包、零钱、银行卡' }}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ─── 右列 ─────────────────────────────────────────────── -->
        <div class="col">

          <!-- 收货信息 -->
          <section class="card">
            <div class="card-head">
              <h3>收货信息</h3>
              <ElIcon class="more"><Location /></ElIcon>
            </div>
            <div class="addr-body">
              <div v-if="isAddressLoading" class="state-block">地址加载中…</div>
              <template v-else-if="receiptAddress">
                <div>
                  <span class="addr-name">{{ receiptAddress.recipient }}</span>
                  <span class="addr-phone">{{ receiptAddress.phone }}</span>
                </div>
                <div class="addr-detail">
                  {{ receiptAddress.province }}{{ receiptAddress.city }}{{ receiptAddress.district }}{{ receiptAddress.detail }}
                  <span v-if="receiptAddress.postalCode" class="post">邮编 {{ receiptAddress.postalCode }}</span>
                </div>
              </template>
              <div v-else class="state-block error">
                收货地址获取失败
                <ElButton type="primary" link size="small" @click="fetchReceiptAddress">重试</ElButton>
              </div>
            </div>
          </section>

          <!-- 订单信息 -->
          <section class="card">
            <div class="card-head"><h3>订单信息</h3></div>
            <dl class="kv">
              <dt>订单编号</dt><dd class="num">{{ orderNumber }}</dd>
              <dt>支付方式</dt>
              <dd>{{ paymentMethods.find(m => m.value === selectedPaymentMethod)?.label || '未选择' }}</dd>
            </dl>
          </section>

          <!-- 金额明细 -->
          <section class="card">
            <div class="card-head"><h3>金额明细</h3></div>
            <div class="sum-row"><span class="k">商品总额</span><span class="v">¥{{ formatAmount(totalAmount) }}</span></div>
            <div class="sum-row"><span class="k">运费</span><span class="v">¥0.00</span></div>
            <div class="sum-row discount"><span class="k">优惠</span><span class="v">−¥0.00</span></div>
            <div class="sum-row total"><span class="k">实付款</span><span class="v">¥{{ formatAmount(totalAmount) }}</span></div>
          </section>
        </div>
      </div>
    </div>

    <!-- ─── 粘性底部操作栏 ─────────────────────────────────────── -->
    <footer v-if="orderItems.length > 0 && !isLoading && !isError" class="bar">
      <div class="bar-inner">
        <div class="bar-tip">
          <ElIcon><WarningFilled /></ElIcon>请尽快完成支付
        </div>
        <div class="bar-amt">实付款<b>¥{{ formatAmount(totalAmount) }}</b></div>
        <ElButton size="large" @click="goBack">取消支付</ElButton>
        <ElButton
          size="large"
          type="primary"
          :loading="isPaying"
          :disabled="selectedPaymentMethod === undefined || !isValidAmount(totalAmount)"
          @click="showPayConfirm"
        >立即支付</ElButton>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElMessage, ElMessageBox, ElIcon } from 'element-plus';
import { ArrowLeft, Clock, Check, Location, WarningFilled } from '@element-plus/icons-vue';
import { getOrderItemsByOrderId } from '@/api/order';
import { payOrder } from '@/api/pay';
import { getAddressByI as getAddressById } from '@/api/address';

const route = useRoute();
const router = useRouter();

const orderId = ref('');
const orderItems = ref([]);
const orderNumber = ref('');
const totalAmount = ref(0);
const isLoading = ref(true);
const isError = ref(false);
const isPaying = ref(false);
const selectedPaymentMethod = ref(0);  // 默认选中支付宝（提升完成率）
const paymentMethods = ref([
  { value: 0, label: '支付宝支付' },
  { value: 1, label: '微信支付' }
]);

const receiptAddress = ref(null);
const isAddressLoading = ref(false);

const formatAmount = (amount) => {
  const num = Number(amount);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const isValidAmount = (amount) => {
  const num = Number(amount);
  return !isNaN(num) && num > 0;
};

const fetchReceiptAddress = async (addressId) => {
  if (!addressId) return;
  isAddressLoading.value = true;
  try {
    const res = await getAddressById(addressId);
    if (res.code === 1 && res.data) {
      receiptAddress.value = res.data;
    } else {
      receiptAddress.value = null;
      ElMessage.warning('收货地址获取失败');
    }
  } catch (err) {
    console.error('获取收货地址异常：', err);
    receiptAddress.value = null;
    ElMessage.error('网络错误，地址加载失败');
  } finally {
    isAddressLoading.value = false;
  }
};

const fetchOrderDetail = async () => {
  try {
    isLoading.value = true;
    const res = await getOrderItemsByOrderId(orderId.value);
    if (res.code === 1 && res.data?.code === 1) {
      orderItems.value = res.data.data || [];
      if (orderItems.value.length > 0) {
        orderNumber.value = orderItems.value[0].orderNumber || '未知订单号';
        totalAmount.value = orderItems.value.reduce((sum, item) => {
          return sum + (Number(item.subtotal) || 0);
        }, 0);
        const shippingAddressId = orderItems.value[0].shippingAddressId;
        if (shippingAddressId) {
          await fetchReceiptAddress(shippingAddressId);
        } else {
          receiptAddress.value = null;
          ElMessage.warning('该订单未关联收货地址');
        }
      } else {
        totalAmount.value = 0;
        receiptAddress.value = null;
      }
    } else {
      isError.value = true;
      ElMessage.error(res.data?.msg || res.msg || '订单详情获取失败');
      totalAmount.value = 0;
      receiptAddress.value = null;
    }
  } catch (err) {
    console.error('获取订单详情失败：', err);
    isError.value = true;
    ElMessage.error('网络错误，订单详情获取失败');
    totalAmount.value = 0;
    receiptAddress.value = null;
  } finally {
    isLoading.value = false;
  }
};

const showPayConfirm = () => {
  if (!isValidAmount(totalAmount.value)) {
    ElMessage.warning('支付金额无效，请刷新页面重试'); return;
  }
  const selectedMethod = paymentMethods.value.find(m => m.value === selectedPaymentMethod.value)?.label || '选中的支付方式';
  ElMessageBox.confirm(
    `确认使用${selectedMethod}支付 ¥${formatAmount(totalAmount.value)}吗？`,
    '支付确认',
    { confirmButtonText: '确认支付', cancelButtonText: '取消', type: 'info' }
  ).then(() => submitPayment()).catch(() => ElMessage.info('已取消支付'));
};

const submitPayment = async () => {
  isPaying.value = true;
  try {
    const payDTO = {
      paymentMethod: selectedPaymentMethod.value,
      orderId: orderId.value,
      amount: Number(totalAmount.value) || 0
    };
    const res = await payOrder(payDTO);
    if (res.code === 1) {
      ElMessage.success('支付成功！');
      setTimeout(() => router.back(), 1000);
    } else {
      ElMessage.error(res.msg || '支付请求失败');
    }
  } catch (err) {
    console.error('支付失败：', err);
    ElMessage.error('网络错误，支付失败');
  } finally {
    isPaying.value = false;
  }
};

const goBack = () => router.back();

onMounted(() => {
  orderId.value = route.params.orderId || '';
  fetchOrderDetail();
});
</script>

<style scoped>
.order-detail-container { max-width: 1320px; margin: 0 auto; padding: 20px 24px 100px; }
.state-block { text-align: center; padding: 60px 20px; font-size: 14px; color: var(--mall-text-muted); }
.state-block.error { color: var(--mall-danger); }
.back { display: inline-flex; align-items: center; gap: 6px; color: var(--mall-text-muted); font-size: 13.5px; margin-bottom: 14px; cursor: pointer; }
.back:hover { color: var(--mall-primary); }

.card { background: var(--mall-surface); border: 1px solid var(--mall-border); border-radius: var(--mall-radius); box-shadow: var(--mall-shadow); }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--mall-border); }
.card-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--mall-text); }
.card-head .more { color: var(--mall-text-muted); font-size: 12.5px; }

/* ── Status hero ─────────────────────────────────────────────────────── */
.status-hero { margin-bottom: 18px; overflow: hidden; }
.status-hero-top { display: grid; grid-template-columns: 1fr auto; gap: 24px; padding: 24px 28px; align-items: center; }
.status-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
.status-icon { width: 52px; height: 52px; border-radius: 50%; background: #fdf3e3; color: var(--mall-warning); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.status-text h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: var(--mall-text); }
.status-text .sub { margin: 0; color: var(--mall-text-muted); font-size: 13.5px; }
.status-right { text-align: right; }
.status-right .lab { color: var(--mall-text-muted); font-size: 13px; }
.status-right .amt { font-size: 30px; font-weight: 800; color: var(--mall-price); letter-spacing: -.5px; }
.status-right .amt .sym { font-size: 18px; margin-right: 1px; }

/* timeline */
.timeline { display: grid; grid-template-columns: repeat(5, 1fr); padding: 0 24px 22px; }
.tl-step { position: relative; text-align: center; }
.tl-step::before { content: ''; position: absolute; left: 50%; top: 14px; width: 100%; height: 2px; background: var(--mall-border); }
.tl-step:last-child::before { display: none; }
.tl-step.done::before { background: var(--mall-primary); }
.tl-node { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; background: var(--mall-surface); border: 2px solid var(--mall-border-strong); color: var(--mall-text-subtle); font-size: 13px; font-weight: 700; }
.tl-step.done .tl-node { background: var(--mall-primary); border-color: var(--mall-primary); color: #fff; }
.tl-step.current .tl-node { background: #fff; border-color: var(--mall-warning); color: var(--mall-warning); box-shadow: 0 0 0 4px rgba(183,121,31,.16); }
.tl-step.current .tl-node::after { content: ''; position: absolute; inset: -7px; border-radius: 50%; border: 2px solid rgba(183,121,31,.32); animation: tl-pulse 1.6s ease-out infinite; }
@keyframes tl-pulse { 0% { transform: scale(.85); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
.tl-lab { font-size: 13px; font-weight: 600; color: var(--mall-text); }
.tl-time { font-size: 11.5px; color: var(--mall-text-subtle); margin-top: 2px; }
.tl-step:not(.done):not(.current) .tl-lab { color: var(--mall-text-muted); font-weight: 500; }

/* ── Body grid ───────────────────────────────────────────────────────── */
.body-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(0,1fr); gap: 18px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

/* product list */
.pl-head { display: grid; grid-template-columns: 80px minmax(0,1fr) 100px 60px 110px; gap: 16px; padding: 11px 20px; background: var(--mall-surface-muted); border-bottom: 1px solid var(--mall-border); color: var(--mall-text-muted); font-size: 12.5px; }
.pl-head > span:nth-child(n+3) { text-align: right; }
.pl-row { display: grid; grid-template-columns: 80px minmax(0,1fr) 100px 60px 110px; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--mall-border); }
.pl-row:last-child { border-bottom: 0; }
.pl-thumb { width: 80px; height: 80px; border-radius: var(--mall-radius-sm); border: 1px solid var(--mall-border); background: var(--mall-surface-muted); overflow: hidden; }
.pl-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pl-info { min-width: 0; }
.pl-name { font-size: 14px; line-height: 1.5; color: var(--mall-text); margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pl-merchant { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; background: var(--mall-surface-muted); color: var(--mall-text-muted); font-size: 12px; }
.pl-price, .pl-qty, .pl-sub { text-align: right; }
.pl-price { color: var(--mall-text); font-size: 14px; }
.pl-qty { color: var(--mall-text-muted); font-size: 14px; }
.pl-sub { color: var(--mall-price); font-weight: 700; font-size: 15px; }

/* payment */
.pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 20px; }
.pay-opt { display: flex; align-items: center; gap: 14px; padding: 16px; border: 2px solid var(--mall-border); border-radius: var(--mall-radius); background: var(--mall-surface); cursor: pointer; transition: border-color .18s ease, background .18s ease; position: relative; }
.pay-opt:hover { border-color: var(--mall-border-strong); }
.pay-opt.active { border-color: var(--mall-primary); background: var(--mall-accent-bg); }
.pay-opt.active::after { content: '✓'; position: absolute; right: 12px; top: 10px; width: 20px; height: 20px; border-radius: 50%; background: var(--mall-primary); color: #fff; font-size: 13px; line-height: 20px; text-align: center; }
.pay-opt .pi { width: 38px; height: 38px; border-radius: var(--mall-radius-sm); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 16px; flex-shrink: 0; }
.pay-opt .pi.alipay { background: #1677ff; }
.pay-opt .pi.wechat { background: #07c160; }
.pay-opt .pt { font-size: 14px; font-weight: 600; color: var(--mall-text); }
.pay-opt .ps { font-size: 12px; color: var(--mall-text-muted); }

/* right column */
.addr-body { padding: 16px 20px 18px; }
.addr-name { font-size: 16px; font-weight: 700; }
.addr-phone { margin-left: 10px; color: var(--mall-text-muted); font-size: 13px; }
.addr-detail { margin-top: 8px; color: var(--mall-text-muted); font-size: 13.5px; line-height: 1.6; word-break: break-all; }
.addr-detail .post { display: inline-block; margin-top: 6px; padding: 1px 8px; border-radius: 999px; background: var(--mall-surface-muted); color: var(--mall-text-subtle); font-size: 12px; }

.kv { display: grid; grid-template-columns: 88px 1fr; gap: 8px 14px; padding: 16px 20px; font-size: 13.5px; margin: 0; }
.kv dt { color: var(--mall-text-muted); }
.kv dd { margin: 0; color: var(--mall-text); word-break: break-all; }
.kv dd.num { letter-spacing: .2px; }

.sum-row { display: flex; align-items: baseline; justify-content: space-between; padding: 10px 20px; font-size: 13.5px; }
.sum-row + .sum-row { border-top: 1px dashed var(--mall-border); }
.sum-row .k { color: var(--mall-text-muted); }
.sum-row .v { color: var(--mall-text); }
.sum-row.discount .v { color: var(--mall-success); }
.sum-row.total { padding: 16px 20px; border-top: 1px solid var(--mall-border); background: var(--mall-surface-muted); border-radius: 0 0 var(--mall-radius) var(--mall-radius); }
.sum-row.total .k { color: var(--mall-text); font-weight: 600; }
.sum-row.total .v { font-size: 22px; font-weight: 800; color: var(--mall-price); }

/* sticky bottom bar */
.bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: var(--mall-surface); border-top: 1px solid var(--mall-border); box-shadow: 0 -2px 12px rgba(15,23,42,.04); }
.bar-inner { max-width: 1320px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; gap: 16px; justify-content: flex-end; }
.bar-tip { margin-right: auto; display: inline-flex; align-items: center; gap: 8px; color: var(--mall-warning); font-size: 13px; font-weight: 600; }
.bar-amt { font-size: 14px; color: var(--mall-text-muted); }
.bar-amt b { margin-left: 6px; font-size: 22px; font-weight: 800; color: var(--mall-price); }

@media (max-width: 1000px) {
  .body-grid { grid-template-columns: 1fr; }
  .pay-grid { grid-template-columns: 1fr; }
  .status-hero-top { grid-template-columns: 1fr; }
  .status-right { text-align: left; }
}
</style>
