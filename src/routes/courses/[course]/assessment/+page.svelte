<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

<svelte:head
  ><title>{data.course.title} — الاختبار · معمل التعلّم</title></svelte:head
>
<div class="workspace narrow">
  <a class="back" href={'/courses/' + data.course.id}>← نظرة عامة على الكورس</a>
  <p class="eyebrow">اختبر إتقانك</p>
  <h1>{data.course.title}<br />اختبار الكورس</h1>
  <p class="lead">
    {data.questions.length}
    سؤالًا من دروس الكورس. تحتاج إلى 80% لاجتياز الاختبار. تُضاف الإجابات الخاطئة
    إلى قائمة المراجعة.
  </p>
  {#if form?.message}<p class="feedback" role="status">{form.message}</p>{/if}
  <form method="POST" use:enhance>
    <input
      type="hidden"
      name="revision"
      value={data.revision}
    />{#each data.questions as q, i}<section class="question">
        <p class="eyebrow">
          السؤال {i + 1} ·
          <a href={'/lessons/' + q.lessonId + '#' + q.sectionId}>راجع الدرس ↗</a
          >
        </p>
        <h2>{q.prompt}</h2>
        {#if q.options.length}<fieldset>
            <legend class="sr-only">{q.prompt}</legend
            >{#if q.type === 'multiple-select'}<p>
                اختر كل الإجابات الصحيحة.
              </p>{/if}{#each q.options as option, index}<label
                class="answer-option"
                ><input
                  type={q.type === 'multiple-select' ? 'checkbox' : 'radio'}
                  name={q.id}
                  value={index}
                />{option}</label
              >{/each}
          </fieldset>{:else}<label
            >إجابتك<textarea name={q.id} required></textarea></label
          >{/if}{#if form && 'results' in form}{#each form.results?.filter((r) => r.id === q.id) || [] as result}<p
              class="feedback"
              class:correct={result.correct}
            >
              {result.correct ? 'إجابة صحيحة' : 'تحتاج إلى مراجعة'} · {result.explanation}
            </p>{/each}{/if}
      </section>{/each}{#if data.user && data.questions.length}<button
        >سلّم اختبار الكورس</button
      >{:else if !data.user}<a class="button" href="/auth/github"
        >سجّل الدخول لبدء الاختبار</a
      >{/if}
  </form>
  {#if data.history.length}<h2>المحاولات السابقة</h2>
    {#each data.history as item}<p>
        {item.score}% · {item.created_at}
      </p>{/each}{/if}
</div>
