<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let startId = "";
  export let endId = "";
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let startValue = 0;
  export let endValue = 100;
  export let startPct = 0;
  export let endPct = 100;
  export let startLabel = "";
  export let endLabel = "";
  export let activeHandle: "start" | "end" = "end";
  export let heightPx = 54;
  export let trackInsetPx = 0;
  export let labelAreaHeightPx = 18;
  export let baseBackground = "#d9e7e2";
  export let baseBorder = "";
  export let trackHeightPx = 6;
  export let fillBackground = "linear-gradient(90deg, #57b6a6, #0f766e)";
  export let fillBorder = "";
  export let fillHeightPx = 6;
  export let thumbSizePx = 16;

  const dispatch = createEventDispatcher<{
    pointerdownhandle: { handle: "start" | "end" };
    inputhandle: { handle: "start" | "end"; value: number };
  }>();

  $: fillLeftPct = startPct;
  $: fillWidthPct = Math.max(0, endPct - startPct);
</script>

<div
  class="dual-handle-slider"
  style={`height:${heightPx}px;--thumb-size:${thumbSizePx}px;--track-height:${trackHeightPx}px;--label-area-height:${labelAreaHeightPx}px;`}
>
  <div
    class="dual-handle-slider-track-area"
    style={`left:${trackInsetPx}px;right:${trackInsetPx}px;`}
  >
    <div
      class="dual-handle-slider-base"
      style={`height:${trackHeightPx}px;background:${baseBackground};${baseBorder ? `border:${baseBorder};` : ""}`}
    ></div>
    <div
      class="dual-handle-slider-fill"
      style={`left:${fillLeftPct}%;width:${fillWidthPct}%;height:${fillHeightPx}px;background:${fillBackground};${fillBorder ? `border:${fillBorder};` : ""}`}
    ></div>
  </div>
  <input
    id={startId || undefined}
    class="dual-handle-slider-input"
    type="range"
    {min}
    {max}
    {step}
    value={startValue}
    style={`z-index:${activeHandle === "start" ? 4 : 3}`}
    on:pointerdown={() => dispatch("pointerdownhandle", { handle: "start" })}
    on:input={(event) =>
      dispatch("inputhandle", {
        handle: "start",
        value: Number((event.currentTarget as HTMLInputElement).value),
      })}
  />
  <input
    id={endId || undefined}
    class="dual-handle-slider-input"
    type="range"
    {min}
    {max}
    {step}
    value={endValue}
    style={`z-index:${activeHandle === "end" ? 4 : 3}`}
    on:pointerdown={() => dispatch("pointerdownhandle", { handle: "end" })}
    on:input={(event) =>
      dispatch("inputhandle", {
        handle: "end",
        value: Number((event.currentTarget as HTMLInputElement).value),
      })}
  />
  <div class="dual-handle-slider-value-labels" aria-hidden="true">
    <span class="dual-handle-slider-value-label">{startLabel}</span>
    <span class="dual-handle-slider-value-label is-end">{endLabel}</span>
  </div>
</div>

<style>
  .dual-handle-slider {
    position: relative;
    width: 100%;
    min-width: 0;
    overflow: visible;
  }

  .dual-handle-slider-track-area {
    position: absolute;
    top: 0;
    bottom: var(--label-area-height);
  }

  .dual-handle-slider-base,
  .dual-handle-slider-fill {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 999px;
    box-sizing: border-box;
  }

  .dual-handle-slider-base {
    left: 0;
    right: 0;
  }

  .dual-handle-slider-fill {
    width: 0;
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.08);
  }

  .dual-handle-slider-input {
    position: absolute;
    left: 0;
    top: calc((100% - var(--label-area-height)) / 2);
    width: 100%;
    height: var(--thumb-size);
    min-width: 0;
    min-height: 0;
    margin: 0;
    padding: 0;
    border: 0;
    transform: translateY(-50%);
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    pointer-events: none;
  }

  .dual-handle-slider-value-labels {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    pointer-events: none;
    color: #5f736d;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .dual-handle-slider-value-label {
    min-width: 0;
    white-space: nowrap;
  }

  .dual-handle-slider-value-label.is-end {
    text-align: right;
  }

  .dual-handle-slider-input::-webkit-slider-runnable-track {
    background: transparent;
  }

  .dual-handle-slider-input::-moz-range-track {
    background: transparent;
  }

  .dual-handle-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: var(--thumb-size);
    height: var(--thumb-size);
    border-radius: 50%;
    border: 2px solid #ffffff;
    background: var(--accent);
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.35);
    margin-top: calc((var(--track-height) - var(--thumb-size)) / 2);
    pointer-events: auto;
    cursor: pointer;
  }

  .dual-handle-slider-input::-moz-range-thumb {
    width: var(--thumb-size);
    height: var(--thumb-size);
    border-radius: 50%;
    border: 2px solid #ffffff;
    background: var(--accent);
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.35);
    pointer-events: auto;
    cursor: pointer;
  }
</style>
