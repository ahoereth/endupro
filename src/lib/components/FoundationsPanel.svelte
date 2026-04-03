<script lang="ts">
  import type { FoundationsBlockRow, FoundationsModel } from "$lib/types/app";

  export let foundations: FoundationsModel | null = null;

  function rowValue(row: FoundationsBlockRow, total: number) {
    if (row?.valueLabel) {
      return row.valueLabel;
    }
    const pct =
      total > 0 ? `${((row.count / total) * 100).toFixed(1)}%` : "0.0%";
    return `${row.count} (${pct})`;
  }
</script>

<section class="card foundational-stats-panel">
  <div class="chart-header">
    <h2>Fundamentals</h2>
    <p>{foundations?.summary || ""}</p>
  </div>

  {#if foundations?.blocks?.length}
    <div class="foundational-stats-root">
      <div class="foundational-grid">
        {#each foundations.blocks as block}
          <section class="foundation-block">
            <h3 class="foundation-title">
              {block.title}{block.total ? ` (n=${block.total})` : ""}
            </h3>
            {#if block.rows?.length}
              {#each block.rows as row}
                <div class="foundation-row">
                  <span class="foundation-label">{row.label}</span>
                  <div class="foundation-bar-track">
                    <div
                      class="foundation-bar"
                      style={`width:${block.rows.length ? (Math.max(...block.rows.map((entry) => entry.count)) > 0 ? (row.count / Math.max(...block.rows.map((entry) => entry.count))) * 100 : 0) : 0}%`}
                    ></div>
                  </div>
                  <span class="foundation-value"
                    >{rowValue(row, block.total)}</span
                  >
                </div>
              {/each}
            {:else}
              <p class="field-hint">No data.</p>
            {/if}
          </section>
        {/each}
      </div>
    </div>
  {:else}
    <p class="field-hint">No runs in selected timeline range.</p>
  {/if}
</section>
