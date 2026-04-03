<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { blankOverrideRows } from "$lib/runtime/settings";
  import type { HrZone } from "$lib/types/app";

  export let defaultThreshold: number | null = null;
  export let appliedThreshold: number | null = null;
  export let defaultZones: HrZone[] = [];
  export let appliedZones: HrZone[] = [];
  export let overrideZones: HrZone[] = [];

  const dispatch = createEventDispatcher();
  let thresholdOverride: string = "";
  let rows = blankOverrideRows();

  $: thresholdOverride =
    appliedThreshold && appliedThreshold !== defaultThreshold
      ? String(Math.round(appliedThreshold))
      : "";
  $: rows = overrideZones?.length
    ? overrideZones.map((row) => ({ ...row }))
    : blankOverrideRows();

  function submit() {
    dispatch("save", {
      runningThresholdHrOverride: thresholdOverride.trim()
        ? Number(thresholdOverride)
        : null,
      hrZonesRunningOverride: rows.map((row) => ({
        ...row,
        minBpm:
          row.minBpm === "" || row.minBpm === null ? null : Number(row.minBpm),
        maxBpm:
          row.maxBpm === "" || row.maxBpm === null ? null : Number(row.maxBpm),
      })),
    });
  }
</script>

<section class="card hr-zone-settings-card">
  <div class="chart-header">
    <h2>HR Zone Settings</h2>
    <p>
      {appliedZones?.length
        ? "Applied running zones"
        : "Threshold-based zones unavailable"}
    </p>
  </div>
  <p class="field-hint">
    Defaults come from synced running threshold HR. Override values are optional
    and applied locally in browser storage.
  </p>
  <form
    class="hr-zone-overrides-form"
    autocomplete="off"
    on:submit|preventDefault={submit}
  >
    <div class="hr-zone-settings-table">
      <div class="hr-zone-settings-head">Setting</div>
      <div class="hr-zone-settings-head">Default</div>
      <div class="hr-zone-settings-head">Applied</div>
      <div class="hr-zone-settings-head">Override Min</div>
      <div class="hr-zone-settings-head">Override Max</div>

      <div class="hr-zone-settings-row hr-zone-settings-row-threshold">
        <div class="hr-zone-settings-cell hr-zone-settings-label">LTHR</div>
        <div class="hr-zone-settings-cell hr-zone-settings-default">
          {defaultThreshold ?? "n/a"}
        </div>
        <div class="hr-zone-settings-cell hr-zone-settings-applied">
          {appliedThreshold ?? "n/a"}
        </div>
        <input
          class="hr-zone-settings-input hr-zone-settings-input-span-2"
          bind:value={thresholdOverride}
        />
      </div>

      {#each rows as row, index}
        <div class="hr-zone-settings-row">
          <div class="hr-zone-settings-cell hr-zone-settings-label">
            {row.label}
          </div>
          <div class="hr-zone-settings-cell hr-zone-settings-default">
            {defaultZones[index]
              ? `${defaultZones[index].minBpm}-${defaultZones[index].maxBpm ?? "+"}`
              : "n/a"}
          </div>
          <div class="hr-zone-settings-cell hr-zone-settings-applied">
            {appliedZones[index]
              ? `${appliedZones[index].minBpm}-${appliedZones[index].maxBpm ?? "+"}`
              : "n/a"}
          </div>
          <input
            class="hr-zone-settings-input"
            bind:value={rows[index].minBpm}
          />
          <input
            class="hr-zone-settings-input"
            bind:value={rows[index].maxBpm}
          />
        </div>
      {/each}
    </div>
    <div class="row compact hr-zone-overrides-actions">
      <button type="submit">Save Overrides</button>
      <button
        type="button"
        class="secondary-button"
        on:click={() => dispatch("clear")}>Clear Overrides</button
      >
    </div>
  </form>
</section>
