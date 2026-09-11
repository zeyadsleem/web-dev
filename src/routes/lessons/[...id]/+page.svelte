<script lang="ts">
  import { statusLabel, arabicSource } from '$lib/arabic';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { afterNavigate, disableScrollHandling } from '$app/navigation';
  import Blocks from '$lib/components/Blocks.svelte';
  import Question from '$lib/components/Question.svelte';
  let { data, form } = $props();
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
  let playground =
    $state<typeof import('$lib/components/Playground.svelte').default>();
  const index = $derived(
    data.siblings.findIndex((l) => l.id === data.lesson.id),
  );
  const next = $derived(data.siblings[index + 1]);
  const code = $derived(
    data.lesson.sections.flatMap((s) => s.blocks).find((b) => b.type === 'code')
      ?.text,
  );
  let saveStatus = $state('');
  afterNavigate(({ type }) => {
    if (type === 'popstate') return;
    if (!location.hash && data.progress?.section_id) {
      const element = document.getElementById(data.progress.section_id);
      if (element) {
        disableScrollHandling();
        requestAnimationFrame(() =>
          window.scrollTo(
            0,
            element.getBoundingClientRect().top +
              window.scrollY +
              (data.progress?.scroll_offset || 0),
          ),
        );
      }
    }
  });
  $effect(() => {
    const lessonId = data.lesson.id;
    if (!data.user) return;
    let timer: ReturnType<typeof setTimeout>;
    const payload = () => {
      const sections = [
        ...document.querySelectorAll<HTMLElement>('.learning-section'),
      ];
      const section =
        sections.filter((s) => s.getBoundingClientRect().top < 150).at(-1) ||
        sections[0];
      return section
        ? JSON.stringify({
            lessonId,
            sectionId: section.id,
            offset: Math.max(0, -section.getBoundingClientRect().top),
          })
        : null;
    };
    const save = async () => {
      const body = payload();
      if (!body) return;
      try {
        const response = await fetch('/api/position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body,
        });
        saveStatus = response.ok
          ? 'تم حفظ مكان القراءة'
          : 'تعذر حفظ مكان القراءة. تحقق من الاتصال.';
      } catch {
        saveStatus = 'الاتصال مقطوع. لم يتم حفظ آخر مكان للقراءة.';
      }
    };
    const scroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 1500);
    };
    const leave = () => {
      const body = payload();
      if (body) navigator.sendBeacon('/api/position', body);
    };
    timer = setTimeout(save, 1500);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pagehide', leave);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pagehide', leave);
    };
  });
</script>

<svelte:head><title>{data.lesson.title} · معمل التعلّم</title></svelte:head>
<div class="lesson-layout">
  <aside class="lesson-nav">
    <a class="back" href={'/courses/' + data.lesson.course_id}
      >← نظرة عامة على الكورس</a
    >
    <p class="eyebrow">
      {data.lesson.course_id.toUpperCase()} · {index + 1} / {data.siblings
        .length}
    </p>
    <nav aria-label="دروس الكورس">
      {#each data.siblings as sibling}<a
          class:active={sibling.id === data.lesson.id}
          href={'/lessons/' + sibling.id}>{sibling.title}</a
        >{/each}
    </nav>
  </aside>
  <article class="lesson-content prose">
    <p class="eyebrow">تعلّم · جرّب · افهم</p>
    <h1>{data.lesson.title}</h1>
    <p class="lead">{data.lesson.description}</p>
    <div class="lesson-byline">
      من <a href={arabicSource(data.lesson.url)}>web.dev ↗</a
      >{#if JSON.parse(data.lesson.authors).length}
        · {JSON.parse(data.lesson.authors).join(', ')}{/if} · الإصدار {data
        .lesson.content_version}
    </div>
    {#if data.lesson.pendingQuestions}<div class="callout">
        {data.lesson.pendingQuestions} سؤالًا من المصدر يحتاج نموذج إجابتها إلى مراجعة.
        <a href={arabicSource(data.lesson.url)}
          >افتح الاختبار الأصلي على web.dev</a
        >. إكمال القراءة هنا لا يعني اجتياز اختبار المصدر.
      </div>{/if}{#if data.lesson.status !== 'published'}<div class="callout">
        حالة الصفحة الأصلية: {statusLabel(data.lesson.status)}
        . لا تُحتسب ضمن إكمال المنهج.
      </div>{/if}{#if Date.now() - Date.parse(data.lesson.imported_at) > 30 * 86400000}<div
        class="callout"
      >
        مرّ أكثر من 30 يومًا على تحديث هذا الدرس. راجع المصدر للاطلاع على آخر
        التغييرات.
      </div>{/if}
    {#each data.lesson.sections as section}<section
        id={section.id}
        class="learning-section"
      >
        <h2>{section.title}</h2>
        <Blocks
          blocks={section.blocks}
        />{#each data.lesson.questions.filter((q) => q.sectionId === section.id) as question}<Question
            {question}
            signedIn={!!data.user}
            result={form}
            passed={data.passed.includes(question.id)}
          />{/each}{#if data.user}<form
            method="POST"
            action="?/bookmark"
            use:enhance
          >
            <input type="hidden" name="section" value={section.id} /><button
              class="bookmark">احفظ مكان القراءة هنا</button
            >
          </form>{/if}
      </section>{/each}
    {#if playground}{@const Playground = playground}<Playground
        initial={code}
      />{:else}<button
        class="subtle"
        disabled={!mounted}
        onclick={async () =>
          (playground = (await import('$lib/components/Playground.svelte'))
            .default)}>افتح ساحة تجربة الأكواد ▷</button
      >{/if}
    {#if form?.message}<p class="feedback" role="status">{form.message}</p>{/if}
    <section class="completion">
      <p class="eyebrow">تقييم الدرس</p>
      <h2>
        {data.progress?.status === 'completed'
          ? 'أكملت الدرس. أحسنت!'
          : 'جاهز للخطوة التالية؟'}
      </h2>
      <p>
        {data.lesson.questions.length
          ? `${data.passed.length} من ${data.lesson.questions.length} سؤالًا تمت الإجابة عنها بشكل صحيح.`
          : 'لا يوجد اختبار معتمد لهذا الدرس. يمكنك إكماله بعد دراسة المحتوى.'}
      </p>
      {#if data.user && data.lesson.status === 'published'}<form
          method="POST"
          action="?/complete"
          use:enhance
        >
          <button>أكمل الدرس واحفظ التقدم ✓</button>
        </form>{:else if !data.user}<a class="button" href="/auth/github"
          >سجّل الدخول لحفظ التقدم</a
        >{/if}{#if next}<a class="back" href={'/lessons/' + next.id}
          >التالي: {next.title} →</a
        >{/if}
    </section>
    <p class="source-note">
      المحتوى مقتبس من <a href={arabicSource(data.lesson.url)}
        >{data.lesson.title} · web.dev</a
      >.
      <a href="/about">نسب المحتوى والتراخيص</a>.
    </p>
  </article>
  <aside class="lesson-toc">
    <p class="eyebrow">في هذا الدرس</p>
    <nav aria-label="أقسام الدرس">
      {#each data.lesson.sections as section}<a href={'#' + section.id}
          >{section.title}</a
        >{/each}
    </nav>
    <p class="muted" role="status">{saveStatus}</p>
    <p class="muted">{statusLabel(data.progress?.status)}</p>
  </aside>
</div>
