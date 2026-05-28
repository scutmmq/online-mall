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
  aiDrawerVisible.value = true
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
          <!--          <el-link class="header-link">-->
          <!--            <el-badge :value="200" :max="99" class="item">-->
          <!--              <el-icon>-->
          <!--                <ChatDotSquare />-->
          <!--              </el-icon><span>消息</span>-->
          <!--            </el-badge>-->
          <!--          </el-link>-->
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

  <router-view></router-view>

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
/* 全局背景图：从头部下方开始显示 */
.global-bg {
  position: fixed;
  top: 50px;
  /* 与头部高度保持一致 */
  left: 0;
  width: 100vw;
  height: calc(100vh - 50px);
  /* 高度 = 屏幕高度 - 头部高度 */
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  z-index: -999;
  opacity: 0.2;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

/* 头部样式：核心响应式布局基础 */
.app-header {
  border-bottom: 1px solid #e5e7eb;
  padding: 0 20px;
  height: 60px;
  /* 适中高度，兼顾触控体验 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  /* 修改为fixed定位 */
  top: 0;
  /* 固定在顶部 */
  left: 0;
  right: 0;
  z-index: 1000;
  /* 提高z-index确保在最上层 */
  /* 确保在内容上方 */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  /* 更明显的阴影提升层次感 */
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  /* 创建伪元素作为背景 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* 添加背景色确保覆盖下方内容 */
}

.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: -1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  /* 添加轻微的纹理效果 */
  background-size: 200% 200%;
  animation: gradientShift 10s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

/* 左侧容器：弹性布局适配不同屏幕 */
.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  /* 增加间距 */
  flex: 1;
  /* 占据可用空间，防止溢出 */
  overflow: hidden;
  /* 超出部分隐藏 */
}

/* 商城图标+名称样式 */
.mall-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  white-space: nowrap;
  /* 防止文字折行 */
  font-size: 18px;
  color: white;
  /* 白色文字提高可读性 */
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.5px;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(5px);
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mall-logo:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.mall-logo .el-icon {
  font-size: 22px;
  /* 图标适中大小 */
  color: white;
  /* 白色图标 */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* 右侧链接区域：弹性布局紧凑排列 */
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
  /* 增加间距 */
  padding: 0 10px;
}

/* 右侧链接样式统一 */
.header-right .el-link,
.header-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 1) !important;
  text-decoration: none;
  /* 去除默认下划线 */
  transition: all 0.3s;
  /* hover过渡效果 */
  padding: 6px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  /* 添加内发光效果 */
  position: relative;
  overflow: hidden;
}

.header-right .el-link::before,
.header-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
}

.header-right .el-link:hover::before,
.header-link:hover::before {
  opacity: 1;
}

.header-right el-link:hover,
.header-link:hover {
  color: white !important;
  /*  hover时变色 */
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
  /* 增强悬停效果 */
  border-color: rgba(255, 255, 255, 0.4);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.header-right .el-icon {
  font-size: 18px;
  /* 图标统一大小 */
  color: white;
}

/* 消息徽章样式优化 */
.el-badge.item {
  vertical-align: middle;
}

.el-badge__content {
  background-color: #ff4d4f !important;
  border: 1px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 用户名触发区域 */
.username-trigger {
  white-space: nowrap;
}

.username-trigger .el-button {
  padding: 8px 15px;
  font-size: 14px;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  transition: all 0.3s;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.username-trigger .el-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 用户信息弹窗样式 */
.user-card {
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7f4 100%);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.avatar-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.avatar {
  cursor: pointer;
  transition: transform 0.3s;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar:hover {
  transform: scale(1.1);
  /* 更明显的放大效果 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.user-info {
  flex: 1;
}

.nickname {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 5px;
  color: #333;
}

.username {
  font-size: 14px;
  color: #666;
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  padding-top: 5px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
  padding: 6px 12px;
  border-radius: 6px;
}

.action-btn:hover {
  background-color: #f0f2f5;
  transform: translateY(-1px);
}

.logout-btn {
  color: #f56c6c;
  /* 退出按钮红色强调 */
  font-weight: 500;
  transition: all 0.3s;
}

.logout-btn:hover {
  color: #ff4d4f;
  background-color: #fef0f0;
  transform: translateY(-1px);
}

/* 主内容区域样式 */
.main {
  margin-top: 70px;
  /* 增加顶部边距，防止被header遮挡 */
  padding: 20px;
}

/* 响应式适配：平板及以下（最大宽度768px） */
@media (max-width: 768px) {
  .app-header {
    padding: 0 15px;
    height: 55px;
  }

  .header-left {
    gap: 12px;
  }

  /* 隐藏次要文字，保留核心图标 */
  .header-right .el-link span:not(.el-badge__content) {
    display: none;
  }

  .header-link {
    font-size: 13px;
    padding: 5px 10px;
  }

  .header-right {
    gap: 8px;
  }

  /* 简化商城名称显示 */
  .mall-logo span {
    font-size: 16px;
  }

  .mall-logo .el-icon {
    font-size: 20px;
  }

  /* 调整用户弹窗布局 */
  .avatar-container {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .user-info {
    text-align: center;
  }

  .nickname {
    font-size: 15px;
  }

  .username {
    font-size: 13px;
  }
}

/* 响应式适配：手机小屏幕（最大宽度480px） */
@media (max-width: 480px) {
  .header-left {
    gap: 8px;
  }

  /* 隐藏"返回主页"的文字，只保留图标 */
  .mall-logo:first-child span {
    display: none;
  }

  .mall-logo:first-child .el-icon {
    font-size: 20px;
    /* 放大图标提升辨识度 */
  }

  /* 进一步简化右侧图标间距 */
  .header-right {
    gap: 8px;
  }

  .header-right .el-icon {
    font-size: 18px;
    /* 放大图标，便于点击 */
  }

  /* 隐藏用户名文本，只保留头像触发 */
  .username-trigger .el-button span:first-child {
    display: none;
  }

  /* 弹窗按钮文字缩小 */
  .action-btn {
    font-size: 12px;
  }
}

/* 解决移动端点击元素高亮问题 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* 自定义通知样式 */
.custom-notification {
  border-left: 5px solid #409eff !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(10px);
}

.custom-notification .el-notification__title {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.custom-notification .el-notification__content {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.custom-notification.success {
  border-left-color: #67c23a !important;
}

.custom-notification.info {
  border-left-color: #409eff !important;
}

.custom-notification.warning {
  border-left-color: #e6a23c !important;
}

.custom-notification.error {
  border-left-color: #f56c6c !important;
}

/* 右侧边栏样式 */
.sidebar {
  position: fixed;
  right: -180px;
  top: 50%;
  transform: translateY(-50%);
  width: 180px;
  background: #ffffff;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: visible;
  transition: right 0.3s ease;
}

.sidebar.expanded {
  right: 0;
}

/* 侧边栏遮罩层 */
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

/* 折叠/展开按钮 */
.sidebar-toggle {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  border: 1px solid #111827;
  background: #111827;
  background-image: none;
  border-radius: 8px 0 0 8px;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
  z-index: 101;
}

.sidebar-toggle:hover,
.sidebar-toggle:active,
.sidebar-toggle:focus-visible,
.sidebar.expanded .sidebar-toggle,
.sidebar.expanded .sidebar-toggle:hover {
  border-color: #111827;
  background: #111827;
  background-image: none;
  box-shadow: none;
  transform: translateY(-50%);
  outline: none;
}

.sidebar-toggle .el-icon {
  font-size: 24px;
  color: #ffffff;
  font-weight: bold;
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

/* 签到日历对话框样式 */
.calendar-container {
  padding: 20px;
}

/* 签到统计 */
.sign-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.stat-item .el-button {
  margin-top: 10px;
}

/* 日历头部 */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.month-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

/* 星期标题 */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}

.weekday {
  text-align: center;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* 日历主体 */
.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.calendar-day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
}

.calendar-day.is-empty {
  cursor: default;
}

.calendar-day.is-today {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  border: 2px solid #409eff;
}

.calendar-day.is-today::before {
  content: '今';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #409eff;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: bold;
}

.calendar-day.is-signed {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
}

/* 今天且已签到：同时显示两种标记 */
.calendar-day.is-today.is-signed {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.6), 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.calendar-day.is-today.is-signed::before {
  content: '今';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: bold;
}

.calendar-day.is-signed:hover {
  transform: scale(1.05);
}

.sign-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 12px;
}

/* 签到日历：统一为信息型商城风格 */
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
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--mall-text);
}

.stat-item {
  min-height: 78px;
  padding: 14px;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface-muted);
}

.stat-value {
  margin-bottom: 4px;
  color: var(--mall-primary);
  font-size: 26px;
  line-height: 1;
}

.stat-label {
  color: var(--mall-text-muted);
  opacity: 1;
}

.stat-item .el-button {
  margin-top: 8px;
  box-shadow: none;
}

.calendar-header {
  margin-bottom: 12px;
  padding: 0;
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
  gap: 6px;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--mall-border);
}

.weekday {
  color: var(--mall-text-muted);
  font-weight: 600;
}

.calendar-days {
  gap: 6px;
}

.calendar-day {
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--mall-text);
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.calendar-day:hover:not(.is-empty) {
  border-color: var(--mall-border);
  background: var(--mall-surface-muted);
  transform: none;
}

.calendar-day.is-today {
  border: 1px solid #bcd4ff;
  background: #eef5ff;
  color: var(--mall-primary);
  box-shadow: none;
}

.calendar-day.is-today::before,
.calendar-day.is-today.is-signed::before {
  background: var(--mall-primary);
  color: #fff;
}

.calendar-day.is-signed,
.calendar-day.is-today.is-signed {
  border: 1px solid #b7e4c7;
  background: #f0fdf4;
  color: var(--mall-success);
  box-shadow: none;
}

.calendar-day.is-signed:hover {
  transform: none;
}

.sign-icon {
  color: var(--mall-success);
}

/* 响应式适配 */
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
    left: -35px;
    width: 35px;
    height: 60px;
  }
}

/* Marketplace visual reset: keep the app useful and retail-focused. */
.global-bg {
  display: none;
}

.app-header {
  height: 60px;
  border-bottom: 1px solid var(--mall-border);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: none;
  color: var(--mall-text);
  text-shadow: none;
  backdrop-filter: blur(10px);
}

.app-header::before {
  display: none;
}

.header-left {
  gap: 14px;
}

.mall-logo {
  gap: 7px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--mall-text);
  text-shadow: none;
  letter-spacing: 0;
}

.mall-logo:hover {
  background: transparent;
  box-shadow: none;
  color: var(--mall-primary);
  transform: none;
}

.mall-logo .el-icon {
  color: var(--mall-primary);
  filter: none;
}

.header-right {
  gap: 6px;
}

.header-right .el-link,
.header-link {
  padding: 7px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  box-shadow: none;
  color: var(--mall-text-muted) !important;
  text-shadow: none;
  letter-spacing: 0;
  backdrop-filter: none;
}

.header-right .el-link::before,
.header-link::before {
  display: none;
}

.header-right .el-link:hover,
.header-link:hover {
  border-color: transparent;
  background: var(--mall-surface-muted);
  box-shadow: none;
  color: var(--mall-text) !important;
  text-shadow: none;
  transform: none;
}

.header-right .el-icon {
  color: currentColor;
}

.username-trigger .el-button {
  border: 1px solid var(--mall-border);
  border-radius: 6px;
  background: var(--mall-surface);
  color: var(--mall-text);
  text-shadow: none;
}

.username-trigger .el-button:hover {
  border-color: var(--mall-border-strong);
  background: var(--mall-surface-muted);
  box-shadow: none;
  transform: none;
}

.user-card {
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius);
  background: var(--mall-surface);
  box-shadow: var(--mall-shadow-hover);
}

.avatar {
  border: 1px solid var(--mall-border);
  box-shadow: none;
}

.avatar:hover,
.action-btn:hover,
.logout-btn:hover {
  box-shadow: none;
  transform: none;
}

.main {
  margin-top: 60px;
  padding: 0;
}

.sidebar {
  border-right: 1px solid var(--mall-border);
  box-shadow: none;
}

.sidebar-toggle {
  border: 1px solid #111827;
  background: #111827 !important;
  background-image: none !important;
  box-shadow: none;
}

.sidebar-toggle:hover {
  background: #111827 !important;
  background-image: none !important;
  box-shadow: none !important;
  transform: translateY(-50%) !important;
}

.sidebar-toggle .el-icon {
  color: #fff !important;
}

@media (max-width: 768px) {
  .app-header {
    height: 56px;
    padding: 0 12px;
  }

  .main {
    margin-top: 56px;
  }

  .header-right {
    gap: 4px;
  }
}
</style>
