<script lang="ts">
  export let leftPct = 0;
  export let label = "";
  export let topPx = -14;
  export let offsetXPx = 0;
</script>

<span
  class="slider-handle-bubble"
  style={`left:${leftPct}%;top:${topPx}px;transform:translate(calc(-50% + ${offsetXPx}px), 0);`}
>
  {label}
</span>

<style>
  .slider-handle-bubble {
    position: absolute;
    white-space: nowrap;
    color: #f4faf8;
    font-weight: 600;
    font-size: 0.74rem;
    line-height: 1;
    padding: 7px 9px;
    border-radius: 10px;
    background: rgba(16, 31, 28, 0.94);
    box-shadow: 0 8px 18px rgba(11, 24, 22, 0.16);
    pointer-events: none;
    z-index: 4;
  }

  .slider-handle-bubble::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 7px solid rgba(16, 31, 28, 0.94);
  }
</style>
