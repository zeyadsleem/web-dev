<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>راجع أخطاءك · معمل التعلّم</title></svelte:head>
<div class="workspace narrow">
  <p class="eyebrow">تدريب يثبّت فهمك</p>
  <h1>ارجع للنقاط الصعبة.<br />وافهمها خطوة بخطوة.</h1>
  <p class="lead">
    {data.items.length} سؤالًا للمراجعة. تظهر الأخطاء المتكررة أولًا.
  </p>
  {#each data.items as item}<a
      class="review-row"
      href={'/lessons/' + item.lesson_id + '#question-' + item.id}
      ><span class="eyebrow"
        >{item.title} · {item.failures} محاولات غير صحيحة</span
      >
      <h2>{item.prompt}</h2>
      <span>حاول مرة أخرى →</span></a
    >{:else}<div class="note-card">
      <h2>لا توجد أسئلة للمراجعة حاليًا.</h2>
      <p>
        تظهر الإجابات الخاطئة هنا تلقائيًا، وتزيل الإجابة الصحيحة السؤال من
        المراجعة.
      </p>
      <a href="/">كمّل التعلّم →</a>
    </div>{/each}
</div>
