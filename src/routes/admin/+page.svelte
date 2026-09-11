<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>حالة المنهج · معمل التعلّم</title></svelte:head>
<div class="workspace narrow">
  <h1>حالة المنهج</h1>
  <h2>عمليات تحديث المنهج</h2>
  {#each data.runs as run}{@const report = JSON.parse(run.report)}
    <details>
      <summary>{run.created_at}</summary>
      <p>
        الكورسات: {report.coursesDiscovered} · الدروس: {report.lessonsDiscovered}
      </p>
      <p>
        دروس جديدة: {report.new} · دروس محدّثة: {report.updated} · دون تغيير: {report.unchanged}
      </p>
      <p>
        أخطاء استخراج المحتوى: {report.parsingFailures?.length || 0} · أخطاء التحقق:
        {report.validationFailures?.length || 0}
      </p>
      <p>
        دروس بالإنجليزية (لا توجد ترجمة عربية): {report.englishFallbacks
          ?.length || 0}
      </p>
    </details>{/each}
  <h2>أسئلة تحتاج إلى مراجعة ({data.questions.length})</h2>
  {#each data.questions as q}<p>
      <a href={'/lessons/' + q.lesson_id}>{q.id}</a>
    </p>{/each}
  <h2>آخر إصدارات المحتوى</h2>
  {#each data.versions as version}<p>
      {version.lesson_id} · الإصدار {version.version} · {version.imported_at}
    </p>{/each}
</div>
