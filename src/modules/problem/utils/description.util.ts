/**
 * Chuyển đổi JSON Tiptap sang chuỗi HTML đơn giản.
 */
function jsonToHtml(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;

  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'code') text = `<code>${text}</code>`;
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
        }
        if (mark.type === 'link' && mark.attrs?.href) {
          text = `<a href="${mark.attrs.href}" target="_blank">${text}</a>`;
        }
      });
    }
    return text;
  }

  const content = node.content
    ? node.content.map((child: any) => jsonToHtml(child)).join('')
    : '';

  switch (node.type) {
    case 'doc':
      return content;
    case 'paragraph':
      return `<p>${content}</p>`;
    case 'heading':
      return `<h${node.attrs?.level || 1}>${content}</h${node.attrs?.level || 1}>`;
    case 'bulletList':
      return `<ul>${content}</ul>`;
    case 'orderedList':
      return `<ol>${content}</ol>`;
    case 'listItem':
      return `<li>${content}</li>`;
    case 'blockquote':
      return `<blockquote>${content}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${content}</code></pre>`;
    case 'horizontalRule':
      return `<hr />`;
    case 'hardBreak':
      return `<br />`;
    default:
      return content;
  }
}

/**
 * Đảm bảo description luôn ở định dạng Mảng khối HTML [ { content: "..." } ]
 */
export function standardizeDescription(description: any): any[] {
  if (!description) return [];

  // Nếu đã là mảng, giữ nguyên (Giả định là Format A)
  if (Array.isArray(description)) {
    return description;
  }

  // Nếu là Object Tiptap (Snippet 2)
  if (typeof description === 'object' && description.type === 'doc') {
    const html = jsonToHtml(description);
    return [{ id: 'migrated-block', content: html }];
  }

  // Nếu là chuỗi HTML thuần
  if (typeof description === 'string') {
    return [{ id: 'raw-block', content: description }];
  }

  return [];
}
