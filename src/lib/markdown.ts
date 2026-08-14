// 轻量 markdown 渲染器（零依赖，替代 markdown-it）。
// 覆盖 AI 分析报告常见语法：标题、粗体/斜体、行内代码、围栏代码、列表、表格、引用、分隔线、链接。
// 安全策略：先整体转义 HTML 再套标签，杜绝 XSS。

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 行内渲染：行内代码（占位保护）→ 链接 → 粗体 → 斜体
function renderInline(raw: string): string {
  let s = escapeHtml(raw);
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m: string, c: string) => {
    codes.push("<code>" + c + "</code>");
    return "§C" + (codes.length - 1) + "§";
  });
  s = s.replace(/[[]([^]]+)[]][(]([^) ]+)[)]/g, (_m: string, t: string, u: string) => {
    return '<a href="' + u + '" target="_blank" rel="noopener">' + t + "</a>";
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*(?![*])/g, "$1<em>$2</em>");
  s = s.replace(/§C([0-9]+)§/g, (_m: string, i: string) => codes[Number(i)] ?? "");
  return s;
}

// 表格行切分（不处理转义竖线，报告中罕见）
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|");
}

export function renderMarkdown(mdText: string): string {
  const lines = mdText.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      out.push("<p>" + renderInline(para.join(" ")) + "</p>");
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    if (/^[ \t]*(\`\`\`|~~~)/.test(line)) {
      flushPara();
      if (!inCode) {
        inCode = true;
        codeBuf = [];
      } else {
        out.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
        inCode = false;
      }
      i += 1;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})[ \t]+(.*)$/);
    if (h) {
      flushPara();
      const level = Math.min(h[1].length, 6);
      out.push("<h" + level + ">" + renderInline(h[2]) + "</h" + level + ">");
      i += 1;
      continue;
    }

    // 分隔线
    if (/^[ \t]*(-{3,}|\*{3,})[ \t]*$/.test(line)) {
      flushPara();
      out.push("<hr />");
      i += 1;
      continue;
    }

    // 引用块
    if (/^[ \t]*>[ \t]?(.*)$/.test(line)) {
      flushPara();
      const bqLines: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^[ \t]*>[ \t]?(.*)$/);
        if (!m) break;
        bqLines.push(m[1]);
        i += 1;
      }
      const inner = renderMarkdown(bqLines.join("\n")).replace(/<\/?p>/g, "");
      out.push("<blockquote>" + inner + "</blockquote>");
      continue;
    }

    // 表格：当前行含 |，下一行是 |---| 分隔行
    const isSep = (l: string) => l.includes("-") && /^[ \t]*[|]?[ :|^-]+[|][ :|^-]*$/.test(l);
    if (line.includes("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      flushPara();
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      let t = "<table><thead><tr>";
      for (const c of head) t += "<th>" + renderInline(c.trim()) + "</th>";
      t += "</tr></thead><tbody>";
      for (const r of rows) {
        t += "<tr>";
        for (let c = 0; c < head.length; c += 1) {
          t += "<td>" + renderInline((r[c] ?? "").trim()) + "</td>";
        }
        t += "</tr>";
      }
      out.push(t + "</tbody></table>");
      continue;
    }

    // 无序列表
    if (/^[ \t]*[-*+][ \t]+(.*)$/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^[ \t]*[-*+][ \t]+(.*)$/);
        if (!m) break;
        items.push("<li>" + renderInline(m[1]) + "</li>");
        i += 1;
      }
      out.push("<ul>" + items.join("") + "</ul>");
      continue;
    }

    // 有序列表
    if (/^[ \t]*[0-9]+[.)][ \t]+(.*)$/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^[ \t]*[0-9]+[.)][ \t]+(.*)$/);
        if (!m) break;
        items.push("<li>" + renderInline(m[1]) + "</li>");
        i += 1;
      }
      out.push("<ol>" + items.join("") + "</ol>");
      continue;
    }

    // 空行 → 段落结束
    if (line.trim() === "") {
      flushPara();
      i += 1;
      continue;
    }

    para.push(line.trim());
    i += 1;
  }
  if (inCode) {
    out.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
  }
  flushPara();
  return out.join("\n");
}
