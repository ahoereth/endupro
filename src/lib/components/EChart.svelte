<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import * as echarts from "echarts";

  export let option: echarts.EChartsCoreOption = {};
  export let height = "320px";

  const dispatch = createEventDispatcher();
  let container: HTMLDivElement;
  let chart: echarts.ECharts | null = null;
  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    chart = echarts.init(container, undefined, { renderer: "canvas" });
    chart.on("click", (params) => {
      dispatch("chartclick", params);
    });
    chart.on("legendselectchanged", (params) => {
      dispatch("legendselectchanged", params);
    });
    chart.on("mousemove", (params) => {
      dispatch("mousemove", params);
    });
    chart.on("mouseout", (params) => {
      dispatch("mouseout", params);
    });
    chart.setOption(option, true);

    resizeObserver = new ResizeObserver(() => {
      chart?.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      chart?.dispose();
      chart = null;
    };
  });

  $: if (chart) {
    chart.clear();
    chart.setOption(option, true);
    chart.resize();
  }
</script>

<div
  bind:this={container}
  class="chart-canvas"
  style={`width:100%;height:${height};`}
></div>
