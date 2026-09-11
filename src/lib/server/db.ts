import { error } from '@sveltejs/kit';
export function db(platform: App.Platform | undefined) {
  if (!platform?.env.DB) error(503, 'قاعدة البيانات غير متاحة حاليًا.');
  return platform.env.DB;
}
export function requireUser(locals: App.Locals) {
  if (!locals.user) error(401, 'سجّل الدخول لحفظ تقدّمك في التعلّم.');
  return locals.user;
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
