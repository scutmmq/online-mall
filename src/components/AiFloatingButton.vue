<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

const emit = defineEmits(["click"]);

// 位置（页面右下角默认）。保存到 localStorage，下次进来还在原位。
const STORAGE_KEY = "ai-fab-position";
const SIZE = 60;        // 按钮直径
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
        <!-- 三层光环 -->
        <span class="halo halo-1"></span>
        <span class="halo halo-2"></span>
        <span class="halo halo-3"></span>

        <!-- 主图标：呼吸气泡 -->
        <div class="core">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                <path
                    d="M4 5.5C4 4.12 5.12 3 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9A2.5 2.5 0 0 1 17.5 17H9l-4 4v-4h-.5A2.5 2.5 0 0 1 2 14.5v-9C2 5.5 4 5.5 4 5.5Z"
                    fill="white"
                    opacity="0.95"
                />
                <circle cx="8.5" cy="10" r="1.2" fill="#7C3AED" />
                <circle cx="12" cy="10" r="1.2" fill="#7C3AED" />
                <circle cx="15.5" cy="10" r="1.2" fill="#7C3AED" />
            </svg>
        </div>

        <!-- hover 时的提示气泡 -->
        <transition name="fade">
            <div v-if="hovering && !dragging" class="tip">
                <span>问问 AI 助手 ✨</span>
            </div>
        </transition>

        <!-- 小标签：sparkle -->
        <span class="sparkle s1">✦</span>
        <span class="sparkle s2">✧</span>
        <span class="sparkle s3">✦</span>
    </div>
</template>

<style scoped>
.ai-fab {
    position: fixed;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    cursor: grab;
    z-index: 9999;
    user-select: none;
    background: radial-gradient(circle at 30% 30%, #a78bfa 0%, #7c3aed 55%, #4c1d95 100%);
    box-shadow:
        0 8px 24px rgba(124, 58, 237, 0.45),
        0 0 0 1px rgba(255, 255, 255, 0.12) inset;
    transition:
        transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.22s ease,
        background 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
}
.ai-fab.dragging {
    cursor: grabbing;
    transition: none;
}
.ai-fab.hovering {
    transform: scale(1.08) rotate(-4deg);
    box-shadow:
        0 12px 32px rgba(124, 58, 237, 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.2) inset,
        0 0 24px rgba(167, 139, 250, 0.55);
    background: radial-gradient(circle at 30% 30%, #c4b5fd 0%, #8b5cf6 55%, #5b21b6 100%);
}
.ai-fab.pressing {
    transform: scale(0.94);
}

/* 内核：呼吸 + 转动 */
.core {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: corePulse 2.6s ease-in-out infinite;
}
.ai-fab.hovering .core {
    animation: coreSpin 4s linear infinite;
}
@keyframes corePulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.06);
    }
}
@keyframes coreSpin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* 三层光环：默认轻轻呼吸；hover 时变成扩散涟漪 */
.halo {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    border: 1.5px solid rgba(167, 139, 250, 0.55);
    opacity: 0.6;
    animation: haloIdle 3.4s ease-in-out infinite;
}
.halo-2 {
    animation-delay: 1s;
}
.halo-3 {
    animation-delay: 2s;
}
.ai-fab.hovering .halo {
    animation: haloRipple 1.6s ease-out infinite;
    border-color: rgba(196, 181, 253, 0.85);
}
.ai-fab.hovering .halo-2 {
    animation-delay: 0.5s;
}
.ai-fab.hovering .halo-3 {
    animation-delay: 1s;
}

@keyframes haloIdle {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.3;
    }
    50% {
        transform: scale(1.12);
        opacity: 0.55;
    }
}
@keyframes haloRipple {
    0% {
        transform: scale(1);
        opacity: 0.75;
    }
    80% {
        transform: scale(1.7);
        opacity: 0;
    }
    100% {
        transform: scale(1.7);
        opacity: 0;
    }
}

/* hover 提示气泡 */
.tip {
    position: absolute;
    right: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    background: rgba(31, 31, 46, 0.92);
    color: #fff;
    font-size: 13px;
    padding: 7px 12px;
    border-radius: 8px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.tip::after {
    content: "";
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: rgba(31, 31, 46, 0.92);
}
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translate(6px, -50%);
}

/* hover 时飘出的小星星 */
.sparkle {
    position: absolute;
    color: #fef3c7;
    font-size: 10px;
    opacity: 0;
    pointer-events: none;
    text-shadow: 0 0 6px rgba(254, 243, 199, 0.9);
}
.ai-fab.hovering .sparkle {
    animation: sparkleFly 1.6s ease-out infinite;
}
.sparkle.s1 {
    top: -2px;
    left: 20%;
    animation-delay: 0s;
}
.sparkle.s2 {
    top: 30%;
    right: -6px;
    animation-delay: 0.4s;
}
.sparkle.s3 {
    bottom: -2px;
    left: 60%;
    animation-delay: 0.8s;
}
@keyframes sparkleFly {
    0% {
        opacity: 0;
        transform: translate(0, 0) scale(0.6);
    }
    30% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translate(8px, -14px) scale(1.3);
    }
}
</style>
