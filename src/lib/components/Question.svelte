<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Question } from '$lib/model';
  let {
    question,
    signedIn = false,
    result,
    passed = false,
  }: {
    question: Omit<Question, 'answer' | 'explanation'>;
    signedIn?: boolean;
    result?: {
      questionId?: string;
      correct?: boolean;
      explanation?: string;
      message?: string;
    } | null;
    passed?: boolean;
  } = $props();
  let answer = $state('');
  let hint = $state(false);
  let busy = $state(false);
  const choice = $derived(
    ['multiple-choice', 'multiple-select', 'true-false', 'find-bug'].includes(
      question.type,
    ),
  );
</script>

<div class="question" id={'question-' + question.id}>
  <p class="eyebrow">
    اختبر فهمك · {question.origin === 'source' ? 'سؤال من المصدر' : 'تدريب'}
    {passed ? ' · ✓ إجابة صحيحة' : ''}
  </p>
  <h3>{question.prompt}</h3>
  <form
    method="POST"
    action="?/answer"
    use:enhance={() => {
      busy = true;
      return async ({ update }) => {
        await update({ reset: false });
        busy = false;
      };
    }}
  >
    <input
      type="hidden"
      name="questionId"
      value={question.id}
    />{#if choice}<fieldset>
        <legend class="sr-only"
          >{question.type === 'multiple-select'
            ? 'اختر كل الإجابات الصحيحة'
            : 'اختر إجابة واحدة'}</legend
        >{#if question.type === 'multiple-select'}<p class="muted">
            اختر كل الإجابات الصحيحة.
          </p>{/if}{#each question.options as option, i}<label
            class="answer-option"
            ><input
              type={question.type === 'multiple-select' ? 'checkbox' : 'radio'}
              name="answer"
              value={i}
              required={question.type !== 'multiple-select'}
            /><span>{option}</span></label
          >{/each}
      </fieldset>{:else if question.type === 'reorder' || question.type === 'match'}<p
      >
        اكتب أرقام الاختيارات {question.type === 'reorder'
          ? 'بالترتيب الصحيح'
          : 'حسب ترتيب المطابقة'}، وافصل بينها بفواصل.
      </p>
      <ol>
        {#each question.options as option}<li>{option}</li>{/each}
      </ol>
      <label>إجابتك<input name="answer" required bind:value={answer} /></label
      >{:else}<label
        >إجابتك<textarea name="answer" required bind:value={answer}
        ></textarea></label
      >{/if}
    <div class="actions">
      {#if signedIn}<button disabled={busy}
          >{busy ? 'جارٍ الحفظ…' : 'تحقق من الإجابة'}</button
        >{:else}<a class="button" href="/auth/github">سجّل الدخول للإجابة</a
        >{/if}<button
        type="button"
        class="subtle"
        onclick={() => (hint = !hint)}>تلميح</button
      >
    </div>
  </form>
  {#if hint}<p class="hint">
      {question.hints.join(' ')}
    </p>{/if}{#if result?.questionId === question.id}<div
      class:correct={result.correct}
      class="feedback"
      role="status"
    >
      <strong>{result.message}</strong>
      <p>{result.explanation}</p>
    </div>{/if}
</div>
