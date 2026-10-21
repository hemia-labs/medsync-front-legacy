<template>
  <svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true" focusable="false" class="pulse-static">
    <path v-for="(line,i) in lines" :key="'line'+i" :d="line" :stroke="palette[i%3]" stroke-opacity=".32" stroke-width="1" fill="none"/>
    <path v-for="(line,i) in warmLines" :key="'warm'+i" :d="line" :stroke="palette[3]" stroke-opacity=".55" stroke-width="1.3" fill="none"/>
    <circle v-for="star in stars" :key="star.id" :cx="star.x" :cy="star.y" :r="star.r * 1.15" :fill="star.color" :opacity="star.alpha"/>
  </svg>
</template>
<script>
import { staticStars, staticFilaments, PALETTE } from '../../domain/pulse/visualModel';
export default {
  props: {
    model: {
      type: Object,
      required: true
    },
    phase: {
      type: Number,
      default: 0
    }
  },
  computed: {
    palette() { return PALETTE; },
    stars() {
      return staticStars(this.model, this.phase);
    },
    lines() {
      return staticFilaments(this.model, this.phase);
    },
    warmLines() {
      return staticFilaments(this.model, this.phase, true);
    }
  }
};
</script>
<style scoped>.pulse-static{display:block;width:100%;height:100%;position:absolute;inset:0}</style>
