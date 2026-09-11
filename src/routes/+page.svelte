<script lang="ts">
  import { statusLabel, arabicSource } from '$lib/arabic';
  import { percentage } from '$lib/scoring';
  let { data } = $props();
  let sourceOrder = $state(false);
  const total = $derived(data.courses.reduce((n, c) => n + c.total, 0));
  const completed = $derived(data.courses.reduce((n, c) => n + c.completed, 0));
  const ordered = $derived(
    sourceOrder
      ? [...data.courses].sort((a, b) => a.sourceOrder - b.sourceOrder)
      : data.courses,
  );
</script>

<svelte:head><title>مسار التعلّم · معمل التعلّم</title></svelte:head>
<div class="workspace">
  <section class="intro">
    <div>
      <p class="eyebrow">المسار الكامل لتعلّم تطوير الويب</p>
      <h1>كل درس جديد.<br />يفتح لك بابًا جديدًا.</h1>
      <p class="lead">
        اقرأ، جرّب، وثبّت معلوماتك.<br />منهج تطوير الويب كاملًا بالعربية، في
        مكان واحد.
      </p>
    </div>
    <div class="progress-seal">
      <strong>{percentage(completed, total)}<small>%</small></strong><span
        >من المنهج الكامل</span
      ><progress
        value={completed}
        max={total || 1}
        aria-label="نسبة إكمال المنهج"
      ></progress><span>اكتملت {completed} من {total} درسًا</span>
    </div>
  </section>
  <div class="stats">
    <div>
      <strong
        >{data.courses.filter((c) => c.total > 0 && c.completed === c.total)
          .length}<small> / {data.courses.length}</small></strong
      ><span>كورسات مكتملة</span>
    </div>
    <div>
      <strong>{completed}<small> / {total}</small></strong><span
        >دروس مكتملة</span
      >
    </div>
    <div>
      <strong>{data.stats?.answered || 0}</strong><span
        >أسئلة تمت الإجابة عنها</span
      >
    </div>
    <div>
      <strong
        >{data.stats?.answered
          ? percentage(data.stats.correct, data.stats.answered) + '%'
          : '—'}</strong
      ><span>دقة الإجابات</span>
    </div>
  </div>
  <div class="dashboard-grid">
    <div>
      {#if data.next}<section class="continue">
          <p class="eyebrow">{data.user ? 'خطوتك التالية' : 'ابدأ هنا'}</p>
          <div>
            <h2>{data.next.title}</h2>
            <a class="button" href={'/lessons/' + data.next.id}
              >{completed ? 'كمّل التعلّم' : 'افتح الدرس'}
              <span>↗</span></a
            >
          </div>
          <p>
            تعلّم بالسرعة المناسبة لك. {data.user
              ? 'يتم حفظ تقدّمك أثناء التعلّم.'
              : 'سجّل الدخول لحفظ إجاباتك ومكان القراءة.'}
          </p>
        </section>{/if}
      <div class="section-heading">
        <div>
          <p class="eyebrow">منهج واحد يشمل كل الكورسات</p>
          <h2>مسار تعلّمك</h2>
        </div>
        <label class="order"
          ><input type="checkbox" bind:checked={sourceOrder} /> ترتيب المصدر</label
        >
      </div>
      <div class="course-list">
        {#each ordered as course, i}<a
            class="course-row"
            href={'/courses/' + course.id}
            ><span class="course-number">{String(i + 1).padStart(2, '0')}</span
            ><span class="course-info"
              ><strong>{course.title.replace(/^Learn /, '')}</strong><span
                >{course.description}</span
              ></span
            ><span class="course-meta"
              >{course.completed} / {course.total} درسًا<progress
                value={course.completed}
                max={course.total || 1}
                aria-label={course.title + ' — التقدم'}
              ></progress>{#if course.pathOrder === null}<small
                  >ترتيب الكورس يحتاج إلى مراجعة</small
                >{/if}</span
            ><span class="arrow">↗</span></a
          >{/each}
      </div>
    </div>
    <aside class="dashboard-aside">
      <section class="note-card">
        <span class="eyebrow">ثبّت معلوماتك</span>
        <h2>مراجعة بسيطة<br />تفرق كتير.</h2>
        <p>
          {data.review
            ? `${data.review} سؤالًا جاهزًا لمحاولة جديدة.`
            : 'الأسئلة التي تخطئ فيها تظهر هنا لتجربها من جديد.'}
        </p>
        <a href={data.user ? '/review' : '/auth/github'}
          >{data.user ? 'راجع أخطاءك' : 'سجّل الدخول وابدأ'} →</a
        >
      </section>
      <section>
        <h3>آخر نشاط</h3>
        {#if data.recent.length}{#each data.recent as item}<a
              class="activity"
              href={'/lessons/' + item.lesson_id}
              ><strong>{item.title}</strong><span
                >{statusLabel(item.status)} · {item.last_activity.slice(
                  0,
                  10,
                )}</span
              ></a
            >{/each}{:else}<p class="muted">
            ابدأ درسك الأول، وسيظهر نشاطك هنا.
          </p>{/if}
      </section>
      <section class="source-note">
        <span class="eyebrow">محتوى تعليمي موثوق</span>
        <p>
          المحتوى التعليمي الأصلي من <a href="https://web.dev/learn/">web.dev</a
          >. مساحة للتعلّم والتطبيق بالعربية.
        </p>
        <a href="/about">عن المنهج ↗</a>
      </section>
    </aside>
  </div>
</div>
