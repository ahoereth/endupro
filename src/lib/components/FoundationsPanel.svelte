<script lang="ts">
  import { onMount } from "svelte";
  import type { FoundationsBlockRow, FoundationsModel } from "$lib/types/app";
  import { persistFundamentalsCollapsed } from "$lib/runtime/preferences";

  export let foundations: FoundationsModel | null = null;

  let isCollapsed = false;

  function rowValue(row: FoundationsBlockRow, total: number) {
    if (row?.valueLabel) {
      return row.valueLabel;
    }
    const pct =
      total > 0 ? `${((row.count / total) * 100).toFixed(1)}%` : "0.0%";
    return `${row.count} (${pct})`;
  }

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
    persistFundamentalsCollapsed(isCollapsed);
  }

  onMount(() => {
    if (typeof localStorage !== "undefined") {
      isCollapsed =
        localStorage.getItem("edupro_fundamentals_collapsed") === "true";
    }
  });
</script>

<section class="card foundational-stats-panel">
  <button
    type="button"
    class="chart-header collapsible"
    on:click={toggleCollapsed}
    aria-expanded={!isCollapsed}
  >
    <h2>Fundamentals</h2>
    <p>{foundations?.summary || ""}</p>
    <span class="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
  </button>

  {#if !isCollapsed}
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
  {/if}
</section>
