<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="workspace narrow">
  <p class="eyebrow">{page.status}</p>
  <h1>
    {page.status === 401
      ? 'احفظ مكانك في التعلّم.'
      : page.status === 404
        ? 'الصفحة غير موجودة.'
        : 'حدث خطأ يحتاج إلى مراجعة.'}
  </h1>
  <p class="lead">{page.error?.message}</p>
  {#if page.status === 401}<a class="button" href="/auth/github"
      >الدخول باستخدام GitHub</a
    >{/if}<a class="back" href="/">← ارجع إلى مسار التعلّم</a>
</div>
