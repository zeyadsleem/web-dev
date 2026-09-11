<script lang="ts">
  import { statusLabel, arabicSource } from '$lib/arabic';
  import { percentage } from '$lib/scoring';
  let { data } = $props();
  const next = $derived(
    data.lessons.find(
      (l) => l.source_status === 'published' && l.status !== 'completed',
    ),
  );
</script>

<svelte:head><title>{data.course.title} · معمل التعلّم</title></svelte:head>
<div class="workspace narrow">
  <a class="back" href="/">← مسار التعلّم</a>
  <p class="eyebrow">
    الكورس {data.course.pathOrder === null
      ? 'لم يحدد ترتيبه'
      : String(data.course.pathOrder + 1).padStart(2, '0')}
  </p>
  <h1>{data.course.title}</h1>
  <p class="lead">{data.course.description}</p>
  <div class="course-summary">
    <strong
      >{percentage(data.course.completed, data.course.total)}% مكتمل</strong
    ><span
      >{data.course.completed} مكتمل · {data.course.total -
        data.course.completed} متبقٍ · {data.course.total} درسًا منشورًا</span
    ><progress
      value={data.course.completed}
      max={data.course.total || 1}
      aria-label="إكمال الكورس"
    ></progress>{#if next}<a class="button" href={'/lessons/' + next.id}
        >كمّل الكورس ↗</a
      >{/if}
  </div>
  <p>
    <a class="button" href={'/courses/' + data.course.id + '/assessment'}
      >ابدأ اختبار الكورس →</a
    >
  </p>
  <h2>دروس الكورس</h2>
  <p class="muted">الدروس بترتيب المنهج الأصلي، مع التمارين المتاحة لكل درس.</p>
  <div class="course-list">
    {#each data.lessons as lesson, i}<a
        class="course-row"
        href={'/lessons/' + lesson.id}
        ><span class="course-number">{String(i + 1).padStart(2, '0')}</span
        ><span class="course-info"
          ><strong>{lesson.title}</strong><span>{lesson.description}</span
          ></span
        ><span class="pill"
          >{lesson.source_status !== 'published'
            ? statusLabel(lesson.source_status)
            : statusLabel(lesson.status)}{lesson.score !== null
            ? ` · ${lesson.score}%`
            : ''}</span
        ><span>↗</span></a
      >{/each}
  </div>
  <p class="source-note">
    المنهج: <a href={arabicSource(data.course.url)}
      >الكورس الأصلي على web.dev ↗</a
    >
  </p>
</div>
