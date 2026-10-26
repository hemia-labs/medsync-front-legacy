<template>
  <svg class="home-seasonal-decoration" :class="[`home-seasonal-decoration--${period}`, `home-seasonal-decoration--${season}`]"
    viewBox="0 0 190 190" aria-hidden="true" focusable="false">
    <g v-if="season === 'day-of-dead'">
    <!-- Papel picado: small open cuts, no raster assets or external requests. -->
    <path d="M10 16 Q95 37 180 16" fill="none" stroke="#a67550" stroke-width="1" />
    <g v-for="flag in flags" :key="`flag-${flag.x}`" class="home-seasonal-decoration__flag"
      :style="{ '--sway-delay': flag.delay }" :transform="`translate(${flag.x} ${flag.y}) rotate(${flag.angle})`">
      <g class="home-seasonal-decoration__paper">
        <path d="M-12 0H12V22L8 26L4 23L0 26L-4 23L-8 26L-12 22Z M0 5L5 10L0 15L-5 10Z M-9 17H-5V20H-9Z M5 17H9V20H5Z"
          :fill="flag.color" fill-rule="evenodd" />
        <path d="M-8 3V7M8 3V7M0 19V21" stroke="#fff8ed" stroke-width="1.2" stroke-linecap="round" />
      </g>
    </g>

    <!-- Cempasuchil and candles frame the existing medical scene. -->
    <ellipse cx="95" cy="177" rx="76" ry="6" fill="#b77938" opacity="0.12" />
    <g v-for="candle in candles" :key="`candle-${candle.x}`" :transform="`translate(${candle.x} ${candle.y})`">
      <ellipse class="home-seasonal-decoration__glow" cx="0" cy="-9" rx="13" ry="17" fill="#ffd36b" />
      <rect x="-4.5" y="0" width="9" :height="candle.height" rx="2" fill="#f6deac" stroke="#cc9a58" stroke-width="0.7" />
      <path d="M-4 3H4M-1 4V9" stroke="#fff7db" stroke-width="1.5" stroke-linecap="round" />
      <path class="home-seasonal-decoration__flame" d="M0-13C-1-8-5-6-3-2C-1 1 3 0 3-3C4-7 1-8 0-13Z"
        fill="#f4a82e" :style="{ 'animation-delay': candle.delay }" />
      <path d="M0-6C-3-2-1 0 1-1C3-3 1-4 0-6Z" fill="#fff3b0" />
    </g>
    <g v-for="flower in flowers" :key="`flower-${flower.x}`" :transform="`translate(${flower.x} ${flower.y}) scale(${flower.scale})`">
      <path d="M-3 4Q-19-5-17 7Q-10 13 0 7Q13 16 18 7Q11 2 3 5" fill="#587e51" />
      <g v-for="angle in petals" :key="angle" :transform="`rotate(${angle})`">
        <ellipse cx="0" cy="-6" rx="4.6" ry="6" :fill="flower.color" />
        <path d="M0-9V-4" stroke="#ffc24b" stroke-width="0.8" stroke-linecap="round" />
      </g>
      <circle r="5.5" fill="#f7ad27" />
      <circle r="2.5" fill="#b9671c" />
      <path d="M-2-1L0-3L2-1L1 2H-1Z" fill="#ffe08a" />
    </g>
    <g fill="#ed9d2a" opacity="0.8">
      <ellipse cx="58" cy="180" rx="3" ry="1.4" transform="rotate(-15 58 180)" />
      <ellipse cx="91" cy="177" rx="2.5" ry="1.3" transform="rotate(25 91 177)" />
      <ellipse cx="126" cy="181" rx="3" ry="1.4" transform="rotate(-25 126 181)" />
    </g>
    </g>
    <g v-else-if="season === 'christmas'">
      <!-- Evergreen garland and warm lights frame the unchanged medical scene. -->
      <path d="M9 17Q95 45 181 17" fill="none" stroke="#3c7059" stroke-width="5" stroke-linecap="round" />
      <g v-for="light in lights" :key="`light-${light.x}`" :transform="`translate(${light.x} ${light.y})`">
        <path d="M-5-4L0 0L5-3M-4 3L0 0L5 4" fill="none" stroke="#56816b" stroke-width="2" stroke-linecap="round" />
        <g class="home-seasonal-decoration__light" :style="{ 'animation-delay': light.delay }">
          <circle class="home-seasonal-decoration__christmas-glow" cy="4" r="7" fill="#ffdc83" />
          <path d="M0 1V4" stroke="#896b42" stroke-width="1" />
          <ellipse cy="5" rx="1.8" ry="2.5" fill="#ffe1a0" />
        </g>
      </g>
      <g v-for="ornament in ornaments" :key="`ornament-${ornament.x}`" :transform="`translate(${ornament.x} ${ornament.y})`">
        <path d="M0 0V9" stroke="#b59861" stroke-width="0.8" />
        <g class="home-seasonal-decoration__ornament" :style="{ 'animation-delay': ornament.delay }">
          <rect x="-1.5" y="8" width="3" height="3" rx="0.8" fill="#b59861" />
          <circle cy="16" r="5.8" :fill="ornament.color" />
          <path d="M-3 13Q-4 15-3 17" fill="none" stroke="#fff6e4" stroke-opacity="0.7" stroke-linecap="round" />
          <path d="M-5 18Q0 21 5 18" fill="none" stroke="#fff6e4" stroke-opacity="0.3" />
        </g>
      </g>
      <ellipse cx="95" cy="178" rx="77" ry="5" fill="#48765b" opacity="0.12" />
      <g transform="translate(28 172)">
        <rect x="-3" y="-3" width="6" height="10" rx="1" fill="#a47c51" />
        <path d="M0-43L-11-26H-7L-16-13H-10L-21 2H21L10-13H16L7-26H11Z" fill="#2d7258" />
        <path d="M0-39L-8-27H0L-12-14H0L-16-1H-5L0-8Z" fill="#53977a" />
        <path d="M-8-24Q0-18 8-24M-13-11Q0-3 13-11" fill="none" stroke="#e6c581" stroke-width="1" />
        <circle cx="-5" cy="-25" r="2" fill="#d86f66" />
        <circle cx="6" cy="-16" r="2.2" fill="#e6c581" />
        <circle cx="-10" cy="-7" r="2.1" fill="#d86f66" />
        <circle cx="7" cy="-3" r="2" fill="#e6c581" />
        <g class="home-seasonal-decoration__light">
          <circle class="home-seasonal-decoration__christmas-glow" cy="-45" r="10" fill="#ffdc83" />
          <path d="M0-52L2-47L7-47L3-43L4-38L0-41L-4-38L-3-43L-7-47L-2-47Z" fill="#e9bf65" stroke="#fff1bd" stroke-width="0.6" />
        </g>
      </g>
      <g transform="translate(144 158)">
        <rect y="3" width="19" height="17" rx="2" fill="#ad4e51" />
        <rect x="-1" y="1" width="21" height="5" rx="1" fill="#c36b67" />
        <path d="M9 1V20" stroke="#e8cf9b" stroke-width="3" />
        <path d="M9 1C-2 0 2-8 9 1C17-9 21 0 9 1Z" fill="none" stroke="#e8cf9b" stroke-width="1.5" />
      </g>
      <g transform="translate(163 167)">
        <rect width="15" height="12" rx="1.5" fill="#d5b779" />
        <path d="M-1 2H16M7 0V12" stroke="#fbecd0" stroke-width="2.5" />
        <path d="M7 0C-1-1 2-7 7 0C13-8 18-1 7 0Z" fill="none" stroke="#fbecd0" stroke-width="1.5" />
      </g>
    </g>
  </svg>
</template>

<script>
export default {
  name: 'HomeSeasonalDecoration',
  props: {
    season: { type: String, default: 'day-of-dead' },
    period: { type: String, default: 'morning' }
  },
  data() {
    return {
      lights: [
        { x: 17, y: 19, delay: '-0.5s' }, { x: 42, y: 25, delay: '-2s' },
        { x: 68, y: 29, delay: '-1s' }, { x: 95, y: 31, delay: '-3s' },
        { x: 122, y: 29, delay: '-1.5s' }, { x: 148, y: 25, delay: '-2.5s' },
        { x: 173, y: 19, delay: '-0.8s' }
      ],
      ornaments: [
        { x: 30, y: 23, color: '#b85a5f', delay: '-0.5s' },
        { x: 81, y: 31, color: '#d4af65', delay: '-2s' },
        { x: 135, y: 27, color: '#b85a5f', delay: '-1s' },
        { x: 163, y: 21, color: '#d4af65', delay: '-3s' }
      ],
      flags: [
        { x: 27, y: 20, angle: 9, color: '#d99024', delay: '-0.7s' },
        { x: 61, y: 25, angle: 4, color: '#a45b91', delay: '-2s' },
        { x: 95, y: 27, angle: 0, color: '#ce7031', delay: '-1.3s' },
        { x: 129, y: 25, angle: -4, color: '#728d70', delay: '-3s' },
        { x: 163, y: 20, angle: -9, color: '#a45b91', delay: '-1.8s' }
      ],
      candles: [
        { x: 22, y: 151, height: 23, delay: '-0.4s' },
        { x: 37, y: 159, height: 16, delay: '-1.1s' },
        { x: 162, y: 151, height: 23, delay: '-1.6s' }
      ],
      flowers: [
        { x: 22, y: 174, scale: 0.8, color: '#e8861e' },
        { x: 43, y: 174, scale: 0.65, color: '#ef9e21' },
        { x: 146, y: 174, scale: 0.7, color: '#e8861e' },
        { x: 169, y: 175, scale: 0.85, color: '#ef9e21' }
      ],
      petals: [0, 45, 90, 135, 180, 225, 270, 315]
    };
  }
};
</script>

<style scoped>
.home-seasonal-decoration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.home-seasonal-decoration__paper {
  transform-box: fill-box;
  transform-origin: top center;
  animation: home-seasonal-paper 5s ease-in-out var(--sway-delay) infinite;
}
.home-seasonal-decoration__flame {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: home-seasonal-flame 2.8s ease-in-out infinite;
}
.home-seasonal-decoration__glow { opacity: 0.08; }
.home-seasonal-decoration--afternoon .home-seasonal-decoration__glow { opacity: 0.18; }
.home-seasonal-decoration--night .home-seasonal-decoration__glow { opacity: 0.4; }
.home-seasonal-decoration__christmas-glow { opacity: 0.1; }
.home-seasonal-decoration--afternoon .home-seasonal-decoration__christmas-glow { opacity: 0.25; }
.home-seasonal-decoration--night .home-seasonal-decoration__christmas-glow { opacity: 0.5; }
.home-seasonal-decoration__light {
  animation: home-seasonal-light 4s ease-in-out infinite;
}
.home-seasonal-decoration__ornament {
  transform-box: fill-box;
  transform-origin: top center;
  animation: home-seasonal-paper 6s ease-in-out infinite;
}
@keyframes home-seasonal-light {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}
@keyframes home-seasonal-paper {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
@keyframes home-seasonal-flame {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(0.9, 1.08); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .home-seasonal-decoration__paper,
  .home-seasonal-decoration__flame,
  .home-seasonal-decoration__light,
  .home-seasonal-decoration__ornament { animation: none; }
}
</style>
