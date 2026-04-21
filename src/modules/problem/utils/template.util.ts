/**
 * Điền các câu trả lời vào các ô {{...}} trong template theo thứ tự.
 */
export function fillTemplate(template: string, answers: string[]): string {
  if (!template) return '';
  if (!answers || !answers.length) return template;

  let answerIndex = 0;
  // Regex khớp với {{ bất kỳ nội dung gì }}
  return template.replace(/\{\{([\s\S]*?)\}\}/g, () => {
    const val = answers[answerIndex] !== undefined ? answers[answerIndex] : '';
    answerIndex++;
    return val;
  });
}
