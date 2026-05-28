// Markdown 渲染 + 代码块增强，仿照 my-agent/static/js/chat.js 的实现，做了模块化和 XSS 防护。
import { marked } from "marked";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

let configured = false;

function configureMarked() {
    if (configured) return;
    marked.setOptions({
        gfm: true,
        breaks: true,
        highlight(code, lang) {
            try {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
                }
                return hljs.highlightAuto(code).value;
            } catch {
                return code;
            }
        }
    });
    configured = true;
}

/**
 * 修复 AI 返回 Markdown 里常见的缺空格问题：
 *  - "#标题"     -> "# 标题"
 *  - "-列表项"   -> "- 列表项"
 *  - "1.列表项"  -> "1. 列表项"
 * 围栏代码块内（``` 或 ~~~ 包裹）保持原样不动。
 */
export function normalizeMarkdownForRendering(text) {
    let inFence = false;
    return String(text || "")
        .split("\n")
        .map((line) => {
            const trimmedStart = line.trimStart();
            if (/^(```|~~~)/.test(trimmedStart)) {
                inFence = !inFence;
                return line;
            }
            if (inFence) return line;
            return line
                .replace(/^(\s{0,3}#{1,6})(?=[^\s#])/, "$1 ")
                .replace(/^(\s{0,3}[-+])(?=\S)(?![-+])/, "$1 ")
                .replace(/^(\s{0,3}\d{1,3}[.)])(?=\S)(?!\d)/, "$1 ");
        })
        .join("\n");
}

/**
 * 把 Markdown 字符串渲染成已经做过 XSS 过滤的 HTML 字符串。
 * 调用方在挂载 HTML 后再调用 enhanceMarkdown 给代码块加复制按钮和高亮。
 */
export function renderMarkdown(text) {
    configureMarked();
    const html = marked.parse(normalizeMarkdownForRendering(text || ""));
    return DOMPurify.sanitize(html, {
        ADD_ATTR: ["target", "rel"]
    });
}

function copyIconSvg() {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;
}

function getCodeLanguage(codeEl) {
    if (!codeEl) return "code";
    const m = codeEl.className.match(/language-([\w+-]+)/i);
    return m ? m[1] : "code";
}

async function copyText(text, btn) {
    try {
        await navigator.clipboard.writeText(text || "");
        if (btn) {
            const old = btn.dataset.tooltip;
            btn.dataset.tooltip = "已复制";
            btn.classList.add("copied");
            setTimeout(() => {
                btn.dataset.tooltip = old || "复制";
                btn.classList.remove("copied");
            }, 1200);
        }
    } catch {
        // 静默失败
    }
}

/**
 * 给已经挂载到 DOM 的 markdown 容器做增强：
 * - 高亮所有 pre>code
 * - 给每个 pre 包一层带语言标签 + 复制按钮的 wrapper
 */
export function enhanceMarkdown(container) {
    if (!container) return;
    container.querySelectorAll("pre code").forEach((block) => {
        try {
            hljs.highlightElement(block);
        } catch {}
    });

    container.querySelectorAll("pre").forEach((pre) => {
        if (pre.parentElement && pre.parentElement.classList.contains("code-block")) return;

        const code = pre.querySelector("code");
        const wrapper = document.createElement("div");
        wrapper.className = "code-block";

        const header = document.createElement("div");
        header.className = "code-block-header";

        const language = document.createElement("span");
        language.className = "code-block-language";
        language.textContent = getCodeLanguage(code);

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "code-copy-btn";
        copyBtn.setAttribute("aria-label", "复制代码");
        copyBtn.dataset.tooltip = "复制";
        copyBtn.innerHTML = copyIconSvg();
        copyBtn.addEventListener("click", () =>
            copyText(code ? code.textContent : pre.textContent, copyBtn)
        );

        header.appendChild(language);
        header.appendChild(copyBtn);

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });

    // 表格容器加滚动外壳，避免破坏抽屉布局
    container.querySelectorAll("table").forEach((table) => {
        if (table.parentElement && table.parentElement.classList.contains("md-table-wrap")) return;
        const wrap = document.createElement("div");
        wrap.className = "md-table-wrap";
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    });

    // 链接强制新窗打开 + noopener
    container.querySelectorAll("a[href]").forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
    });
}
