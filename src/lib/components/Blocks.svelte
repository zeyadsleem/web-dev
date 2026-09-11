<script lang="ts">
  import type { Block } from '$lib/model';
  let { blocks }: { blocks: Block[] } = $props();
</script>

{#each blocks as block}{#if block.type === 'code'}<div class="code-block">
      <span>{block.language || 'كود'}</span>
      {#if block.html}{@html block.html}{:else}<pre><code>{block.text}</code
          ></pre>{/if}
    </div>{:else if block.type === 'image'}<figure>
      <img
        src={block.url}
        alt={block.alt || ''}
        loading="lazy"
        referrerpolicy="no-referrer"
      />{#if block.alt}<figcaption>{block.alt}</figcaption>{/if}
    </figure>{:else if block.type === 'embed'}<a
      class="embed-link"
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      >{block.text} ↗ <small>افتح المثال الأصلي</small></a
    >{:else if block.html}<div
      class:callout={block.type === 'callout'}
      class="content-block"
    >
      {@html block.html}
    </div>{:else}<p>{block.text}</p>{/if}{/each}
