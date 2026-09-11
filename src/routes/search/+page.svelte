<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>البحث في المنهج · معمل التعلّم</title></svelte:head>
<div class="workspace narrow">
  <p class="eyebrow">اعثر على إجابتك التالية</p>
  <h1>ابحث في المنهج.</h1>
  <form class="search-form" action="/search">
    <label class="sr-only" for="q">ابحث في الكورسات والدروس والمحتوى</label
    ><input
      id="q"
      name="q"
      value={data.query}
      placeholder="جرّب: النماذج، التنسيق، أو الذكاء الاصطناعي…"
      minlength="2"
      maxlength="100"
    /><button>بحث</button>
  </form>
  {#if data.query.length >= 2}<p>
      {data.results.length} نتيجة{data.results.length === 100
        ? ' (أول 100 نتيجة)'
        : ''}
    </p>
    {#each data.results as item}<a
        class="review-row"
        href={'/lessons/' + item.id}
        ><span class="eyebrow">{item.course}</span>
        <h2>{item.title}</h2>
        <p>{item.description}</p></a
      >{:else}<p>لا توجد دروس مطابقة. جرّب كلمة بحث أعمّ.</p>{/each}{/if}
</div>
