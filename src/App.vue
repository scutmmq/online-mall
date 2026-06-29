<script setup>
import { onMounted, ref, computed, provide } from "vue";
import router from "./router/router";
import { ElMessage, ElNotification } from "element-plus";
import { getUserApi, logoutApi } from "./api/user";
import { getMerchantOfMe } from "./api/merchant";
import { signInApi, getSignDetailsApi, getSignDetailsByMonthApi } from "./api/sign";
import AiAssistantDrawer from "./components/AiAssistantDrawer.vue";
import AiFloatingButton from "./components/AiFloatingButton.vue";

const nickName = ref('');
const username = ref('');
const images = ref('');
const isLogin = ref(false)
const loading = ref(false)
const ifMerchant = ref(false)
const merchant = ref({})

// 提供全局访问的用户和商家信息
provide('userInfo', {
  nickName,
  username,
  images,
  isLogin
});

provide('merchantInfo', {
  merchant,
  ifMerchant
});

// 签到日历相关
const showCalendarDialog = ref(false)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const signedDates = ref([]) // 已签到的日期列表，格式：['2025-12-01', '2025-12-02']
const totalSignDays = ref(0) // 累计签到天数（始终是当前月）
const continuousSignDays = ref(0) // 连续签到天数（始终是当前月）
const todaySigned = ref(false) // 今天是否已签到

// 边栏展开/收起状态
const sidebarExpanded = ref(false)

// AI 助手抽屉显示
const aiDrawerVisible = ref(false)
const openAiDrawer = () => {
  if (!isLogin.value) {
    ElMessage({ message: "请先登录后再使用 AI 助手", type: "warning" })
    location.href = "/login"
    return
  }
  aiDrawerVisible.value = !aiDrawerVisible.value
}

// WebSocket 连接（实时消息通知）
const notifySocket = ref(null)

// 添加一个标志来跟踪是否已经初始化过
const isInitialized = ref(false)

onMounted(async () => {
  // 只在第一次加载时获取用户和商家信息
  if (!isInitialized.value) {
    console.log("location:", location.href)
    if (location.href.includes("login") || location.href.includes("regist") && !location.href.includes("/merchant/register")) {
      isInitialized.value = true;
      return;
    }
    await fetchUserInfo();
    await fetchMerchantInfo();
    isInitialized.value = true;

    // 建立 WebSocket 连接接收实时通知
    if (isLogin.value) {
      connectNotify()
    }
  }
})

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const result = await getUserApi();
    console.log("获取用户信息", result)
    if (result.code == 1) {
      nickName.value = result.data.nickName
      username.value = result.data.username
      images.value = result.data.image
      isLogin.value = true
    } else {
      isLogin.value = false;
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
    isLogin.value = false;
  }
}

// 获取商家信息
const fetchMerchantInfo = async () => {
  try {
    const result1 = await getMerchantOfMe();
    if (result1.data == null) {
      ifMerchant.value = false;
    } else {
      merchant.value = result1.data;
      ifMerchant.value = true;
    }
  } catch (error) {
    console.error("获取商家信息失败:", error);
    ifMerchant.value = false;
  }
}

const goUserHomePage = () => {
  location.href = "/user"
}

const goHomePage = () => {
  location.href = "/home"
}

// 处理菜单选择
const handleMenuSelect = (index) => {
  if (index !== 'calendar') {
    location.href = index
  }
}

const logout = async () => {
  loading.value = true
  const result = await logoutApi();
  console.log("退出登录：", result)
  if (result.code == 1) {
    ElMessage({
      message: "成功退出登录！",
      type: "success"
    })
    localStorage.removeItem('token')
    localStorage.removeItem('userData')
    loading.value = false
    // 重置用户和商家信息
    nickName.value = ''
    username.value = ''
    images.value = ''
    isLogin.value = false
    ifMerchant.value = false
    merchant.value = {}
    isInitialized.value = false; // 重置初始化状态
    await router.push("/login")
  } else {
    ElMessage({
      message: result.msg,
      type: "error"
    })
  }
}

// 打开签到日历对话框
const openCalendarDialog = () => {
  // 重置为当前月份
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth() + 1

  showCalendarDialog.value = true
  loadSignData()
}

// 加载签到数据（根据当前选中的年月）
const loadSignData = async () => {
  try {
    const now = new Date()
    const realYear = now.getFullYear()
    const realMonth = now.getMonth() + 1
    const isCurrentMonth = currentYear.value === realYear && currentMonth.value === realMonth

    let result
    if (isCurrentMonth) {
      // 当前月：获取完整数据（包含累计、连续、签到日期）
      result = await getSignDetailsApi()
      if (result.code === 1 && result.data) {
        const { signTotal, signContinue, signedDays } = result.data
        totalSignDays.value = signTotal
        continuousSignDays.value = signContinue

        // 将日期号数转换为完整日期字符串
        const year = currentYear.value
        const month = currentMonth.value
        signedDates.value = signedDays.map(day =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )

        const today = new Date()
        const todayStr = formatDate(today)
        todaySigned.value = signedDates.value.includes(todayStr)
      }
    } else {
      // 非当前月：只获取签到日期列表
      result = await getSignDetailsByMonthApi(currentYear.value, currentMonth.value)
      if (result.code === 1 && result.data) {
        // 后端返回的是数组，直接是签到日期列表
        const signedDays = result.data
        const year = currentYear.value
        const month = currentMonth.value
        signedDates.value = signedDays.map(day =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )
        // 非当前月不更新累计和连续签到，保持原有值
      }
    }
  } catch (error) {
    console.error('加载签到数据失败:', error)
    ElMessage({
      message: "加载签到数据失败",
      type: "error"
    })
  }
}

// 签到功能
const handleSign = async () => {
  const today = new Date()
  const todayStr = formatDate(today)

  if (todaySigned.value) {
    ElMessage({
      message: "今天已经签到过了！",
      type: "warning"
    })
    return
  }

  try {
    const result = await signInApi()
    if (result.code === 1) {
      // 签到成功后重新加载签到数据
      await loadSignData()

      ElMessage({
        message: "签到成功！",
        type: "success"
      })
    } else {
      ElMessage({
        message: result.msg || "签到失败",
        type: "error"
      })
    }
  } catch (error) {
    console.error('签到失败:', error)
    ElMessage({
      message: "签到失败，请稍后重试",
      type: "error"
    })
  }
}

// 格式化日期为 YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 生成日历数据
const calendarData = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const firstDayWeek = firstDay.getDay() // 0是周日

  const days = []

  // 填充上个月的日期
  for (let i = 0; i < firstDayWeek; i++) {
    days.push({ day: '', isCurrent: false, date: '' })
  }

  // 填充当月日期
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const isSigned = signedDates.value.includes(dateStr)
    const isToday = dateStr === formatDate(new Date())
    days.push({
      day: i,
      isCurrent: true,
      date: dateStr,
      isSigned,
      isToday
    })
  }

  return days
})

// 切换月份
const changeMonth = (offset) => {
  currentMonth.value += offset
  if (currentMonth.value > 12) {
    currentMonth.value = 1
    currentYear.value++
  } else if (currentMonth.value < 1) {
    currentMonth.value = 12
    currentYear.value--
  }
  // 切换月份后重新加载签到数据
  loadSignData()
}

// 当月份显示文本
const currentMonthText = computed(() => {
  return `${currentYear.value}年${currentMonth.value}月`
})

// 切换边栏展开/收起
const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

// 建立 WebSocket 连接接收实时消息通知
const connectNotify = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    console.warn('Token 不存在，无法建立 WebSocket 连接')
    return
  }

  // 使用后端服务器地址，而不是前端地址
  const backendHost = '47.97.85.174:8080'
  const wsProtocol = 'ws' // 开发环境使用 ws
  const url = `${wsProtocol}://${backendHost}/ws/notify?token=${encodeURIComponent(token)}`

  console.log('正在建立 WebSocket 连接...')
  console.log('WebSocket URL:', url)

  try {
    const ws = new WebSocket(url)
    notifySocket.value = ws

    ws.onopen = () => {
      console.log('✅ WebSocket 连接成功!')
    }

    ws.onmessage = (ev) => {
      console.log('📨 收到消息:', ev.data)
      try {
        const msg = JSON.parse(ev.data)
        ElNotification({
          title: '新消息',
          message: msg.content || ev.data,
          type: 'success',
          position: 'top-right',
          duration: 5000,
          dangerouslyUseHTMLString: true,
          customClass: 'custom-notification'
        })
      } catch (e) {
        console.error('解析消息失败:', e)
        ElNotification({
          title: '系统通知',
          message: ev.data,
          type: 'info',
          position: 'top-right',
          duration: 5000,
          dangerouslyUseHTMLString: true,
          customClass: 'custom-notification'
        })
      }
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket 已断开')
    }

    ws.onerror = (err) => {
      console.error('❌ WebSocket 错误:', err)
    }
  } catch (error) {
    console.error('建立 WebSocket 连接失败:', error)
  }
}

</script>


<template>

  <!-- 固定头部 -->
  <div class="common-layout">
    <el-container>
      <el-header class="app-header">
        <!-- 左侧内容：使用Flex确保内部元素横向对齐并添加间距 -->
        <div class="header-left">
          <div class="mall-logo" v-if="router.currentRoute.value.path !== '/home'" @click="goHomePage()"
            style="cursor: pointer;">
            <el-icon>
              <HomeFilled />
            </el-icon><span>返回主页</span>
          </div>
          <!-- 商城图标+名称区域 -->
          <div class=" mall-logo">
            <el-icon>
              <Shop />
            </el-icon>
            <span>荒天享物</span>
          </div>

          <el-popover v-if="username !== ''" trigger="hover" placement="bottom-start" :width="220" popper-class="account-popover">
            <!-- 弹出卡片内容 -->
            <div class="user-card">
              <!-- 头像区域 -->
              <div class="avatar-container">
                <el-avatar :size="60" class="avatar" @click="goUserHomePage()">
                  <img v-if="images !== ''" style="cursor: pointer;" :src="images"></img>
                  <img v-else style="cursor: pointer;"
                    src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png"></img>
                </el-avatar>
                <div class="user-info">
                  <div class="nickname">{{ nickName }}</div>
                  <div class="username">{{ username }}</div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="action-buttons">
                <el-button type="text" class="action-btn" @click="">
                  切换账号
                </el-button>
                <el-button type="text" class="action-btn logout-btn" @click="logout">
                  退出登录
                </el-button>
              </div>
            </div>
            <!-- 触发元素：用户名+箭头 -->
            <template #reference>
              <div class="username-trigger">
                <ElButton style="border: none;" @click="goUserHomePage()"><el-icon>
                    <User />
                  </el-icon>{{ username }} <el-icon class="arrow-icon">
                    <ArrowDown />
                  </el-icon></ElButton>
              </div>
            </template>
          </el-popover>
        </div>

        <!-- 右侧登录/退出区域 -->
        <div class="header-right">
          <el-link class="header-link" v-if="ifMerchant" href="/Merchant">我的店铺</el-link>
          <el-link class="header-link" v-if="!ifMerchant" href="/merchant/register">注册店铺</el-link>
          <el-link class="header-link" href="/user/orders">我的订单</el-link>
          <el-link class="header-link">
            <el-icon>
              <ShoppingCart />
            </el-icon>
            <el-link class="header-link" href="/cart">购物车</el-link>
          </el-link>
          <el-link class="header-link" href="/regist" v-if="!isLogin">注册</el-link>
          <el-link class="header-link" href="/login" v-if="!isLogin">登录</el-link>
          <el-link class="header-link" v-if="isLogin" @click="logout" v-loading.fullscreen.lock="loading">退出登录【{{
            nickName
            }}】</el-link>
        </div>
      </el-header>
    </el-container>
  </div>

  <div class="global-bg"></div>

  <!-- 侧边栏遮罩层 -->
  <div class="sidebar-overlay" v-show="sidebarExpanded && isLogin" @click="toggleSidebar"></div>

  <!-- 右侧边栏 -->
  <div class="sidebar" :class="{ 'expanded': sidebarExpanded }" v-if="isLogin">
    <!-- 折叠/展开按钮 -->
    <div class="sidebar-toggle" @click="toggleSidebar">
      <el-icon v-if="!sidebarExpanded">
        <ArrowLeft />
      </el-icon>
      <el-icon v-else>
        <ArrowRight />
      </el-icon>
    </div>

    <!-- 菜单内容 -->
    <div class="sidebar-content">
      <el-menu class="sidebar-menu" :default-active="router.currentRoute.value.path" @select="handleMenuSelect">
        <el-menu-item index="/user">
          <el-icon>
            <User />
          </el-icon>
          <span>我的主页</span>
        </el-menu-item>
        <el-menu-item index="/user/orders">
          <el-icon>
            <Tickets />
          </el-icon>
          <span>我的订单</span>
        </el-menu-item>
        <el-menu-item index="/cart">
          <el-icon>
            <ShoppingCart />
          </el-icon>
          <span>购物车</span>
        </el-menu-item>
        <el-menu-item index="calendar" @click="openCalendarDialog">
          <el-icon>
            <Calendar />
          </el-icon>
          <span>签到日历</span>
        </el-menu-item>
      </el-menu>
    </div>
  </div>

  <div class="page-content">
    <router-view></router-view>
  </div>

  <!-- AI 悬浮按钮 + 抽屉 -->
  <AiFloatingButton v-if="isLogin" @click="openAiDrawer" />
  <AiAssistantDrawer v-model="aiDrawerVisible" />

  <!-- 签到日历对话框 -->
  <el-dialog v-model="showCalendarDialog" class="sign-calendar-dialog" title="签到日历" width="600px" center>
    <div class="calendar-container">
      <!-- 签到统计 -->
      <div class="sign-stats">
        <div class="stat-item">
          <div class="stat-value">{{ totalSignDays }}</div>
          <div class="stat-label">累计签到</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ continuousSignDays }}</div>
          <div class="stat-label">连续签到</div>
        </div>
        <div class="stat-item">
          <el-button type="primary" :disabled="todaySigned" @click="handleSign">
            {{ todaySigned ? '已签到' : '立即签到' }}
          </el-button>
        </div>
      </div>

      <!-- 日历头部 -->
      <div class="calendar-header">
        <el-button :icon="'ArrowLeft'" circle size="small" @click="changeMonth(-1)" />
        <span class="month-text">{{ currentMonthText }}</span>
        <el-button :icon="'ArrowRight'" circle size="small" @click="changeMonth(1)" />
      </div>

      <!-- 星期标题 -->
      <div class="calendar-weekdays">
        <div class="weekday">日</div>
        <div class="weekday">一</div>
        <div class="weekday">二</div>
        <div class="weekday">三</div>
        <div class="weekday">四</div>
        <div class="weekday">五</div>
        <div class="weekday">六</div>
      </div>

      <!-- 日历主体 -->
      <div class="calendar-days">
        <div v-for="(item, index) in calendarData" :key="index" class="calendar-day" :class="{
          'is-today': item.isToday,
          'is-signed': item.isSigned,
          'is-empty': !item.isCurrent
        }">
          <span v-if="item.isCurrent">{{ item.day }}</span>
          <el-icon v-if="item.isSigned" class="sign-icon">
            <Check />
          </el-icon>
        </div>
      </div>
    </div>
  </el-dialog>
</template>


<style>
/* ============================================================================
   App shell · 荒天享物商城 —— 统一 clean blue-on-white 设计系统
   依赖 src/assets/main.css 的 --mall-* 令牌；全局 mall-clean.css 兜底覆盖。
   ============================================================================ */

/* 旧的彩虹渐变底层占位 —— 直接隐藏（页面各自铺浅灰底） */
.global-bg { display: none; }

/* ── 顶部固定头部 ───────────────────────────────────────────────────────── */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--mall-surface);
  border-bottom: 1px solid var(--mall-border);
  box-shadow: var(--mall-shadow);
  color: var(--mall-text);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  overflow: hidden;
}

/* 品牌 / 返回主页 */
.mall-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.3px;
  color: var(--mall-text);
  cursor: pointer;
  transition: color 0.15s ease;
}

.mall-logo:hover {
  color: var(--mall-primary);
}

.mall-logo .el-icon {
  font-size: 22px;
  color: var(--mall-primary);
}

/* 右侧导航链接 */
.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-right .el-link,
.header-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--mall-radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--mall-text-muted) !important;
  text-decoration: none;
  background: transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.header-right .el-link:hover,
.header-link:hover {
  background: var(--mall-surface-muted);
  color: var(--mall-primary) !important;
}

.header-right .el-icon {
  font-size: 16px;
  color: inherit;
}

/* 消息徽章（红点用语义危险红，不与价格红混用） */
.el-badge.item {
  vertical-align: middle;
}

.el-badge__content {
  background-color: var(--mall-danger) !important;
  border: 1px solid #fff;
}

/* 用户名触发按钮 */
.username-trigger {
  white-space: nowrap;
}

.username-trigger .el-button {
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--mall-text);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-sm);
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.username-trigger .el-button:hover {
  background: var(--mall-surface-muted);
  border-color: var(--mall-border-strong);
}

.username-trigger .arrow-icon {
  margin-left: 2px;
}

/* 用户信息弹窗 */
.user-card {
  padding: 14px;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  box-shadow: var(--mall-shadow-hover);
}

.avatar-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.avatar {
  cursor: pointer;
  border: 1px solid var(--mall-border);
  transition: transform 0.15s ease;
}

.avatar:hover {
  transform: scale(1.04);
}

.user-info {
  flex: 1;
}

.nickname {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: var(--mall-text);
}

.username {
  font-size: 13px;
  color: var(--mall-text-muted);
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
  border-top: 1px solid var(--mall-border);
}

.action-btn {
  font-size: 14px;
  color: var(--mall-text-muted);
  padding: 6px 12px;
  border-radius: var(--mall-radius-sm);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.action-btn:hover {
  background-color: var(--mall-surface-muted);
  color: var(--mall-text);
}

.logout-btn {
  color: var(--mall-danger);
  font-weight: 500;
}

.logout-btn:hover {
  color: var(--mall-danger);
  background-color: #fef2f2;
}

/* 内容区让出固定头部高度 */
.page-content {
  padding-top: 60px;
}

/* 子布局主区（商家/用户中心 el-main）顶部偏移 */
.main {
  margin-top: 60px;
  padding: 0;
}

/* 移动端点击高亮 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* ── 实时通知卡片 ───────────────────────────────────────────────────────── */
.custom-notification {
  border-left: 4px solid var(--mall-primary) !important;
  background: var(--mall-surface) !important;
  border-radius: var(--mall-radius) !important;
  box-shadow: var(--mall-shadow-hover) !important;
}

.custom-notification .el-notification__title {
  font-weight: 600;
  color: var(--mall-text);
  font-size: 16px;
}

.custom-notification .el-notification__content {
  color: var(--mall-text-muted);
  font-size: 14px;
  margin-top: 8px;
}

.custom-notification.success {
  border-left-color: var(--mall-success) !important;
}

.custom-notification.info {
  border-left-color: var(--mall-primary) !important;
}

.custom-notification.warning {
  border-left-color: var(--mall-warning) !important;
}

.custom-notification.error {
  border-left-color: var(--mall-danger) !important;
}

/* ── 右侧抽屉边栏 ───────────────────────────────────────────────────────── */
.sidebar {
  position: fixed;
  right: -180px;
  top: 50%;
  transform: translateY(-50%);
  width: 180px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-right: none;
  border-radius: 8px 0 0 8px;
  box-shadow: var(--mall-shadow-hover);
  z-index: 100;
  overflow: visible;
  transition: right 0.3s ease;
}

.sidebar.expanded {
  right: 0;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  z-index: 99;
  cursor: pointer;
}

.sidebar-toggle {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 64px;
  border: 1px solid var(--mall-border);
  border-right: none;
  background: var(--mall-surface);
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 8px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
  z-index: 101;
}

.sidebar-toggle:hover {
  background: var(--mall-surface-muted);
  border-color: var(--mall-border-strong);
}

.sidebar-toggle .el-icon {
  font-size: 18px;
  color: var(--mall-text-muted);
}

.sidebar-content {
  padding: 10px 0;
}

.sidebar-menu {
  border: none;
}

.sidebar-menu .el-menu-item {
  padding-left: 20px !important;
}

.sidebar-menu .el-menu-item .el-icon {
  margin-right: 8px;
}

/* ── 签到日历对话框 ─────────────────────────────────────────────────────── */
.sign-calendar-dialog {
  border-radius: var(--mall-radius);
}

.sign-calendar-dialog .el-dialog__header {
  margin: 0;
  padding: 18px 20px;
  border-bottom: 1px solid var(--mall-border);
}

.sign-calendar-dialog .el-dialog__title {
  color: var(--mall-text);
  font-size: 18px;
  font-weight: 700;
}

.sign-calendar-dialog .el-dialog__body {
  padding: 0;
}

.calendar-container {
  padding: 20px;
  background: var(--mall-surface);
}

.sign-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  color: var(--mall-text);
}

.stat-item {
  min-height: 78px;
  padding: 14px;
  text-align: center;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface-muted);
}

.stat-value {
  margin-bottom: 4px;
  color: var(--mall-primary);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  color: var(--mall-text-muted);
  font-size: 14px;
}

.stat-item .el-button {
  margin-top: 8px;
  box-shadow: none;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.calendar-header .el-button {
  border-color: var(--mall-border);
  background: var(--mall-surface);
  color: var(--mall-text-muted);
  box-shadow: none;
}

.calendar-header .el-button:hover {
  border-color: var(--mall-border-strong);
  background: var(--mall-surface-muted);
  color: var(--mall-text);
}

.month-text {
  color: var(--mall-text);
  font-size: 16px;
  font-weight: 700;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--mall-border);
}

.weekday {
  text-align: center;
  font-size: 14px;
  color: var(--mall-text-muted);
  font-weight: 600;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  color: var(--mall-text);
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.calendar-day.is-empty {
  cursor: default;
}

.calendar-day:hover:not(.is-empty) {
  border-color: var(--mall-border);
  background: var(--mall-surface-muted);
}

.calendar-day.is-today {
  border: 1px solid var(--mall-accent-border);
  background: var(--mall-accent-bg);
  color: var(--mall-primary);
  font-weight: 700;
}

.calendar-day.is-today::before {
  content: '今';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  background: var(--mall-primary);
  color: #fff;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: bold;
}

.calendar-day.is-signed,
.calendar-day.is-today.is-signed {
  border: 1px solid #b7e4c7;
  background: #f0fdf4;
  color: var(--mall-success);
  font-weight: 700;
}

.calendar-day.is-today.is-signed::before {
  content: '今';
  background: var(--mall-success);
  color: #fff;
}

.sign-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 12px;
  color: var(--mall-success);
}

/* ── 响应式 ─────────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .sidebar {
    width: 60px;
    right: -60px;
  }

  .sidebar.expanded {
    right: 0;
  }

  .sidebar-menu .el-menu-item span {
    display: none;
  }

  .sidebar-menu .el-menu-item {
    padding-left: 0 !important;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .app-header {
    height: 56px;
    padding: 0 12px;
  }

  .page-content {
    padding-top: 56px;
  }

  .main {
    margin-top: 56px;
  }

  .header-left {
    gap: 10px;
  }

  .header-right {
    gap: 4px;
  }

  .header-right .el-link span:not(.el-badge__content),
  .header-link span:not(.el-badge__content) {
    display: none;
  }

  .mall-logo span {
    font-size: 16px;
  }

  .sidebar {
    top: auto;
    bottom: 20px;
    right: -160px;
    width: 160px;
    transform: translateY(0);
  }

  .sidebar.expanded {
    right: 0;
  }

  .sidebar-toggle {
    left: -28px;
    width: 28px;
    height: 52px;
  }

  .avatar-container {
    flex-direction: column;
    text-align: center;
  }

  .user-info {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .mall-logo:first-child span {
    display: none;
  }

  .username-trigger .el-button span:first-child {
    display: none;
  }
}
</style>
