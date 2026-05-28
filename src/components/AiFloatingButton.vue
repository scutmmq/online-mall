<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

const emit = defineEmits(["click"]);

// 位置（页面右下角默认）。保存到 localStorage，下次进来还在原位。
const STORAGE_KEY = "ai-fab-position";
const SIZE = 52;        // 按钮直径（略小更精致）
const MARGIN = 16;      // 距视口最近边

const btnEl = ref(null);
const x = ref(0);
const y = ref(0);

// 拖动状态
const dragging = ref(false);
const moved = ref(false);
const dragStart = { mouseX: 0, mouseY: 0, x: 0, y: 0 };

// hover / press 视觉
const hovering = ref(false);
const pressing = ref(false);

const positionStyle = computed(() => ({
    left: x.value + "px",
    top: y.value + "px"
}));

const loadPosition = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            if (typeof p.x === "number" && typeof p.y === "number") {
                x.value = clampX(p.x);
                y.value = clampY(p.y);
                return;
            }
        }
    } catch {}
    // 默认右下
    x.value = window.innerWidth - SIZE - 24;
    y.value = window.innerHeight - SIZE - 24;
};

const savePosition = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: x.value, y: y.value }));
    } catch {}
};

const clampX = (v) => Math.max(MARGIN, Math.min(window.innerWidth - SIZE - MARGIN, v));
const clampY = (v) => Math.max(MARGIN, Math.min(window.innerHeight - SIZE - MARGIN, v));

const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragging.value = true;
    moved.value = false;
    pressing.value = true;
    dragStart.mouseX = e.clientX;
    dragStart.mouseY = e.clientY;
    dragStart.x = x.value;
    dragStart.y = y.value;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
};

const onMouseMove = (e) => {
    if (!dragging.value) return;
    const dx = e.clientX - dragStart.mouseX;
    const dy = e.clientY - dragStart.mouseY;
    if (!moved.value && Math.abs(dx) + Math.abs(dy) > 4) {
        moved.value = true;
    }
    x.value = clampX(dragStart.x + dx);
    y.value = clampY(dragStart.y + dy);
};

const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    dragging.value = false;
    pressing.value = false;
    if (moved.value) {
        // 拖完吸附到最近的左右边
        const center = x.value + SIZE / 2;
        const right = window.innerWidth - SIZE - MARGIN;
        x.value = center < window.innerWidth / 2 ? MARGIN : right;
        savePosition();
    } else {
        // 没拖动 = 点击
        emit("click");
    }
};

// 触摸支持
const onTouchStart = (e) => {
    if (!e.touches?.length) return;
    const t = e.touches[0];
    dragging.value = true;
    moved.value = false;
    pressing.value = true;
    dragStart.mouseX = t.clientX;
    dragStart.mouseY = t.clientY;
    dragStart.x = x.value;
    dragStart.y = y.value;
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
};
const onTouchMove = (e) => {
    if (!dragging.value || !e.touches?.length) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.mouseX;
    const dy = t.clientY - dragStart.mouseY;
    if (!moved.value && Math.abs(dx) + Math.abs(dy) > 4) moved.value = true;
    x.value = clampX(dragStart.x + dx);
    y.value = clampY(dragStart.y + dy);
    if (moved.value) e.preventDefault();
};
const onTouchEnd = () => {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    dragging.value = false;
    pressing.value = false;
    if (moved.value) {
        const center = x.value + SIZE / 2;
        const right = window.innerWidth - SIZE - MARGIN;
        x.value = center < window.innerWidth / 2 ? MARGIN : right;
        savePosition();
    } else {
        emit("click");
    }
};

const onResize = () => {
    x.value = clampX(x.value);
    y.value = clampY(y.value);
};

onMounted(() => {
    loadPosition();
    window.addEventListener("resize", onResize);
});
onBeforeUnmount(() => {
    window.removeEventListener("resize", onResize);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
    <div
        ref="btnEl"
        class="ai-fab"
        :class="{ dragging, hovering, pressing }"
        :style="positionStyle"
        @mousedown="onMouseDown"
        @touchstart.passive="onTouchStart"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
        <!-- 聊天图标 -->
        <svg class="fab-icon" viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="white"
                fill-opacity="0.15"
            />
            <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="12.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
        </svg>

        <!-- hover 提示气泡 -->
        <transition name="fade">
            <div v-if="hovering && !dragging" class="tip">
                <span>AI 助手</span>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.ai-fab {
    position: fixed;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    cursor: grab;
    z-index: 9999;
    user-select: none;
    background: var(--mall-primary, #1f6feb);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
        var(--mall-shadow-hover, 0 8px 24px rgba(15, 23, 42, 0.08)),
        0 4px 12px rgba(31, 111, 235, 0.25);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    color: #fff;
}
.ai-fab.dragging {
    cursor: grabbing;
    transition: none;
}
.ai-fab.hovering {
    transform: scale(1.06);
    background: var(--mall-primary-hover, #1557c0);
    box-shadow:
        0 8px 24px rgba(31, 111, 235, 0.35),
        0 0 0 3px rgba(31, 111, 235, 0.12);
}
.ai-fab.pressing {
    transform: scale(0.94);
}

/* 图标 */
.fab-icon {
    flex-shrink: 0;
}

/* hover 提示气泡 */
.tip {
    position: absolute;
    right: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    background: var(--mall-text, #111827);
    color: #fff;
    font-size: 13px;
    padding: 6px 11px;
    border-radius: var(--mall-radius, 8px);
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--mall-shadow-hover, 0 8px 24px rgba(15, 23, 42, 0.08));
}
.tip::after {
    content: "";
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: var(--mall-text, #111827);
}
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translate(4px, -50%);
}
</style>
