<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { javascriptSandbox } from '$lib/runner';
  let {
    initial = '<h1>Hello, web.</h1>\n<p>Make something worth learning.</p>',
  }: { initial?: string } = $props();
  let code = $state(''),
    language = $state('html'),
    output = $state<string[]>([]),
    preview = $state(''),
    running = $state(false),
    editorHost: HTMLDivElement;
  let editor: import('@codemirror/view').EditorView | undefined,
    frame: HTMLIFrameElement | undefined,
    jsDocument = $state(''),
    timer: ReturnType<typeof setTimeout> | undefined;
  onMount(async () => {
    code = initial;
    const [{ EditorState }, { EditorView, keymap }, { html }] =
      await Promise.all([
        import('@codemirror/state'),
        import('@codemirror/view'),
        import('@codemirror/lang-html'),
      ]);
    editor = new EditorView({
      parent: editorHost,
      state: EditorState.create({
        doc: code,
        extensions: [
          html(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'محرر الأكواد' }),
          keymap.of([
            {
              key: 'Escape',
              run: (view) => {
                view.contentDOM.blur();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) code = u.state.doc.toString();
          }),
        ],
      }),
    });
  });
  onDestroy(() => {
    editor?.destroy();
    stop();
  });
  function stop() {
    jsDocument = '';
    clearTimeout(timer);
    running = false;
  }
  function receive(event: MessageEvent) {
    if (event.source !== frame?.contentWindow || !event.data?.lab) return;
    if (event.data.result?.done) {
      clearTimeout(timer);
      running = false;
      return;
    }
    if (output.length < 100)
      output = [...output, String(event.data.result).slice(0, 2000)];
  }
  function reset() {
    stop();
    code = initial;
    editor?.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: code },
    });
    output = [];
    preview = '';
  }
  function run() {
    stop();
    output = [];
    if (language === 'javascript') {
      running = true;
      jsDocument = javascriptSandbox(code);
      timer = setTimeout(() => {
        stop();
        output = [...output, 'توقف التنفيذ بعد تجاوز مهلة الثانيتين.'];
      }, 2400);
    } else {
      const policy =
        "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; form-action 'none'; base-uri 'none'";
      preview =
        `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><style>body{font:16px system-ui;padding:20px;color:#172c26}img{max-width:100%}</style>` +
        (language === 'css'
          ? `<style>${code}</style><h1>معاينة CSS</h1><p>فقرة لتجربة التنسيق.</p><button>زر</button>`
          : code);
    }
  }
</script>

<svelte:window onmessage={receive} /><iframe
  bind:this={frame}
  title="تنفيذ JavaScript في بيئة معزولة"
  sandbox="allow-scripts"
  srcdoc={jsDocument}
  hidden
></iframe>
<section class="playground">
  <p class="eyebrow">جرّب بنفسك</p>
  <div class="section-heading">
    <h2>ساحة تجربة الأكواد</h2>
    <label
      >اللغة <select bind:value={language}
        ><option value="html">HTML</option><option value="css">CSS</option
        ><option value="javascript">JavaScript</option></select
      ></label
    >
  </div>
  <p class="muted">
    جرّب HTML وCSS في معاينة معزولة، وشغّل JavaScript مع عرض النتائج. اضغط
    Escape للخروج من المحرر.
  </p>
  <div class="editor" bind:this={editorHost}></div>
  <div class="actions">
    <button onclick={run}>شغّل الكود ▷</button><button
      class="subtle"
      onclick={reset}>إعادة الضبط</button
    >{#if running}<button class="subtle" onclick={stop}>إيقاف</button>{/if}
  </div>
  {#if language === 'javascript'}<pre
      aria-live="polite"
      aria-label="نتائج التنفيذ">{output.length
        ? output.join('\n')
        : 'تظهر نتائج التنفيذ هنا.'}</pre>{:else}<iframe
      title="معاينة الكود في بيئة معزولة"
      sandbox=""
      srcdoc={preview}
    ></iframe>{/if}
</section>
