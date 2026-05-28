<script setup>
import { ref, watchEffect, onMounted, nextTick } from "vue";
import { renderMarkdown, enhanceMarkdown } from "@/utils/markdown";
import "highlight.js/styles/github.css";

const props = defineProps({
    text: { type: String, default: "" }
});

const rootEl = ref(null);
const html = ref("");

watchEffect(() => {
    html.value = renderMarkdown(props.text);
});

const enhance = async () => {
    await nextTick();
    if (rootEl.value) enhanceMarkdown(rootEl.value);
};

onMounted(enhance);
watchEffect(() => {
    // 任何 props.text 变化后等 DOM 更新再增强
    // eslint-disable-next-line no-unused-expressions
    html.value;
    enhance();
});
</script>

<template>
    <div ref="rootEl" class="md-body" v-html="html"></div>
</template>

<style scoped>
.md-body {
    line-height: 1.6;
    color: #1f2937;
    word-break: break-word;
}
.md-body :deep(p) {
    margin: 6px 0;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3),
.md-body :deep(h4),
.md-body :deep(h5),
.md-body :deep(h6) {
    margin: 12px 0 6px;
    font-weight: 600;
    line-height: 1.3;
    color: #111827;
}
.md-body :deep(h1) { font-size: 18px; }
.md-body :deep(h2) { font-size: 17px; }
.md-body :deep(h3) { font-size: 16px; }
.md-body :deep(h4),
.md-body :deep(h5),
.md-body :deep(h6) { font-size: 14px; }

.md-body :deep(ul),
.md-body :deep(ol) {
    margin: 6px 0 6px 22px;
    padding: 0;
}
.md-body :deep(li) {
    margin: 2px 0;
}
.md-body :deep(blockquote) {
    margin: 8px 0;
    padding: 4px 12px;
    border-left: 3px solid #c4b5fd;
    background: #f5f3ff;
    color: #4c1d95;
    border-radius: 4px;
}
.md-body :deep(code) {
    padding: 1px 5px;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 12.5px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #be185d;
}
.md-body :deep(pre) {
    margin: 0;
    padding: 12px 14px;
    overflow-x: auto;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 0 0 6px 6px;
    font-size: 12.5px;
    line-height: 1.5;
}
.md-body :deep(pre code) {
    background: transparent;
    color: inherit;
    padding: 0;
}
.md-body :deep(.code-block) {
    margin: 8px 0;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #1e293b;
}
.md-body :deep(.code-block-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px;
    background: #1e293b;
    color: #cbd5e1;
    font-size: 11px;
}
.md-body :deep(.code-block-language) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.md-body :deep(.code-copy-btn) {
    background: transparent;
    border: 1px solid transparent;
    color: #cbd5e1;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    transition: background 0.15s ease, color 0.15s ease;
    position: relative;
}
.md-body :deep(.code-copy-btn:hover) {
    background: #334155;
    color: #f1f5f9;
}
.md-body :deep(.code-copy-btn.copied) {
    color: #34d399;
    border-color: #065f46;
}
.md-body :deep(.code-copy-btn::after) {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(2px);
    transition: opacity 0.15s ease, transform 0.15s ease;
    pointer-events: none;
}
.md-body :deep(.code-copy-btn:hover::after),
.md-body :deep(.code-copy-btn.copied::after) {
    opacity: 1;
    transform: translateY(0);
}

.md-body :deep(.md-table-wrap) {
    overflow-x: auto;
    margin: 8px 0;
}
.md-body :deep(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
}
.md-body :deep(th),
.md-body :deep(td) {
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    text-align: left;
}
.md-body :deep(th) {
    background: #f3f4f6;
    font-weight: 600;
}
.md-body :deep(a) {
    color: #7c3aed;
    text-decoration: none;
}
.md-body :deep(a:hover) {
    text-decoration: underline;
}
.md-body :deep(img) {
    max-width: 100%;
    border-radius: 6px;
}
.md-body :deep(hr) {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 12px 0;
}
</style>
