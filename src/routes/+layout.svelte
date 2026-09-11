<script lang="ts">
  import '@fontsource-variable/dm-sans';
  import '@fontsource-variable/manrope';
  import '../app.css';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  let dark = $state(false);
  onMount(() => {
    dark = localStorage.getItem('theme') === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  });
  function toggle() {
    dark = !dark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
</script>

<svelte:head
  ><meta name="robots" content="noindex,nofollow" /><meta
    name="description"
    content="ادرس منهج web.dev كاملًا بالعربية، مع تمارين واختبارات وحفظ التقدم."
  /></svelte:head
>
<a class="skip" href="#main">انتقل إلى المحتوى</a>
<header class="site-header">
  <a class="brand" href="/"
    ><span class="brand-mark">ll.</span> معمل التعلّم<span class="brand-note"
      >مساحتك لتعلّم تطوير الويب</span
    ></a
  >
  <nav aria-label="التنقل الرئيسي">
    <a href="/">مسار التعلّم</a><a href="/review">المراجعة</a><a href="/search"
      >بحث</a
    >{#if data.isOwner}<a href="/admin">الإدارة</a>{/if}<button
      class="icon"
      onclick={toggle}
      aria-label={dark ? 'استخدم الوضع الفاتح' : 'استخدم الوضع الداكن'}
      >{dark ? '☀' : '◐'}</button
    >{#if data.user}<form method="POST" action="/auth/logout">
        <button class="subtle">تسجيل الخروج</button>
      </form>{:else}<a class="button small" href="/auth/github"
        >الدخول باستخدام GitHub ↗</a
      >{/if}
  </nav>
</header>
<main id="main">{@render children()}</main>
<footer>
  <span>تعلّم بفهم، وطبّق بثقة.</span><a href="/about">المصادر والتراخيص ↗</a
  ><span>موقع مستقل يعتمد على منهج web.dev</span>
</footer>
