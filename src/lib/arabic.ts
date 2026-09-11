export function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    completed: 'مكتمل',
    'in-progress': 'قيد التعلّم',
    in_progress: 'قيد التعلّم',
    'not-started': 'لم يبدأ',
    published: 'منشور',
    unavailable: 'غير متاح',
    'coming-soon': 'قريبًا',
    'needs-review': 'يحتاج إلى مراجعة',
    validated: 'معتمد',
  };
  return value ? labels[value] || 'قيد التعلّم' : 'لم يبدأ';
}
export function arabicSource(url: string) {
  const source = new URL(url);
  if (source.hostname === 'web.dev') source.searchParams.set('hl', 'ar');
  return source.href;
}
