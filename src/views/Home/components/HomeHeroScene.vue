<template>
  <!-- Decorative clinic landscape painted straight onto the Home hero card. The sky is the
       card background (Home.vue); this layer only adds the scenery. Inline SVG + CSS only:
       no raster assets, no JSON player, no network requests. -->
  <svg
    class="hero-scene"
    :class="['hero-scene--' + period, 'hero-scene--season-' + season]"
    viewBox="-200 0 1000 260"
    preserveAspectRatio="xMaxYMax slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient id="hhs-sun-glow">
        <stop offset="0" stop-color="#ffcf80" stop-opacity="0.7" />
        <stop offset="0.45" stop-color="#ffd9a0" stop-opacity="0.28" />
        <stop offset="1" stop-color="#ffe3bd" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="hhs-moon-glow">
        <stop offset="0" stop-color="#dbeafe" stop-opacity="0.5" />
        <stop offset="1" stop-color="#dbeafe" stop-opacity="0" />
      </radialGradient>
      <mask id="hhs-moon-mask">
        <rect x="700" y="30" width="90" height="90" fill="#fff" />
        <circle cx="752" cy="62" r="17" fill="#000" />
      </mask>
    </defs>

    <!-- Sky: sun or moon -->
    <g v-if="period === 'morning'" class="hs-celestial">
      <circle class="hs-glow" cx="346" cy="150" r="130" fill="url(#hhs-sun-glow)" />
      <circle class="hs-rays" cx="346" cy="150" r="46" />
      <circle cx="346" cy="150" r="31" fill="#ffc567" />
      <circle cx="346" cy="150" r="23" fill="#ffdb99" />
    </g>
    <g v-else-if="period === 'afternoon'" class="hs-celestial">
      <circle class="hs-glow" cx="742" cy="70" r="100" fill="url(#hhs-sun-glow)" />
      <circle class="hs-rays" cx="742" cy="70" r="36" />
      <circle cx="742" cy="70" r="23" fill="#ffbf4d" />
      <circle cx="742" cy="70" r="17" fill="#ffd885" />
    </g>
    <g v-else class="hs-celestial">
      <g v-for="star in stars" :key="'star-' + star.x" :transform="'translate(' + star.x + ' ' + star.y + ')'">
        <path v-if="star.plus" class="hs-star hs-star--plus" d="M-3.4 0H3.4M0-3.4V3.4" :style="{ animationDelay: star.delay }" />
        <circle v-else class="hs-star" :r="star.r" :style="{ animationDelay: star.delay }" />
      </g>
      <line class="hs-shooting" x1="600" y1="26" x2="636" y2="13" />
      <circle class="hs-glow" cx="742" cy="70" r="70" fill="url(#hhs-moon-glow)" />
      <circle cx="742" cy="70" r="20" fill="#fdf3c7" mask="url(#hhs-moon-mask)" />
    </g>

    <!-- Clouds -->
    <g v-for="cloud in clouds" :key="'cloud-' + cloud.x" :transform="'translate(' + cloud.x + ' ' + cloud.y + ') scale(' + cloud.scale + ')'">
      <g class="hs-cloud" :style="{ animationDelay: cloud.delay, animationDuration: cloud.duration }">
        <ellipse rx="24" ry="9" />
        <circle cx="-9" cy="-6" r="9" />
        <circle cx="6" cy="-9" r="12" />
        <circle cx="18" cy="-3" r="7" />
        <path v-if="cloud.plus" class="hs-cloud-plus" d="M2-8h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
      </g>
    </g>

    <!-- Hot-air balloon doing its morning rounds -->
    <g v-if="period !== 'night'" transform="translate(436 74) scale(1.25)">
      <g class="hs-balloon">
        <path d="M-5 28L-4 37M5 28L4 37" stroke="#8a6a4f" stroke-width="1" />
        <rect x="-5.5" y="36" width="11" height="8" rx="2" fill="#b98146" />
        <path d="M0-27C16-27 25-15 25-2C25 10 12 20 5 28H-5C-12 20-25 10-25-2C-25-15-16-27 0-27Z" fill="#ffffff" />
        <path d="M-12-23C-20-17-25-10-25-2C-25 10-12 20-5 28H-2C-8 18-14 8-14-3C-14-11-13-18-12-23Z" fill="#14b8a6" />
        <path d="M12-23C20-17 25-10 25-2C25 10 12 20 5 28H2C8 18 14 8 14-3C14-11 13-18 12-23Z" fill="#0f766e" />
        <path d="M-3-12h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="#0f766e" />
      </g>
    </g>

    <path class="hs-hill-far" d="M-200 260V186C-120 168-20 190 80 180C170 171 250 150 330 156C420 163 480 172 560 160C640 148 720 158 800 146V260Z" />

    <!-- Clinic block, enlarged around its doorstep so it anchors the card -->
    <g transform="translate(632 202) scale(1.2) translate(-632 -202)">
    <!-- Trees behind the clinic -->
    <g v-for="tree in visibleTrees" :key="'tree-' + tree.x" :transform="'translate(' + tree.x + ' ' + tree.y + ') scale(' + tree.scale + ')'">
      <g class="hs-tree" :style="{ animationDelay: tree.delay }">
        <rect class="hs-trunk" x="-2" y="-16" width="4" height="17" rx="1" />
        <ellipse class="hs-leaves" cy="-28" rx="12" ry="17" />
        <ellipse class="hs-leaves-light" cx="-3" cy="-32" rx="6" ry="9" />
      </g>
    </g>

    <!-- Clinic -->
    <g>
      <rect class="hs-wall-shade" x="546" y="150" width="46" height="52" rx="3" />
      <rect class="hs-wall-shade" x="672" y="160" width="40" height="42" rx="3" />
      <rect class="hs-wall" x="588" y="116" width="88" height="86" rx="4" />
      <rect class="hs-roof" x="542" y="146" width="50" height="6" rx="3" />
      <rect class="hs-roof" x="672" y="156" width="44" height="6" rx="3" />
      <rect class="hs-roof" x="583" y="110" width="98" height="9" rx="4" />
      <rect class="hs-roof" x="630" y="101" width="4" height="10" />
      <circle class="hs-sign-glow" cx="632" cy="90" r="24" />
      <circle class="hs-sign" cx="632" cy="90" r="14" />
      <path class="hs-cross" d="M629 81h6v6h6v6h-6v6h-6v-6h-6v-6h6z" />
      <rect v-for="(pane, index) in windows" :key="'window-' + index" class="hs-window"
        :class="{ 'hs-window--lit': pane.lit, 'hs-window--flicker': pane.flicker }"
        :x="pane.x" :y="pane.y" :width="pane.w" :height="pane.h" rx="1.5" />
      <path class="hs-roof" d="M616 172h32l5 6h-42z" />
      <rect class="hs-door" x="622" y="178" width="20" height="24" rx="2" />
      <path class="hs-door-line" d="M632 179V202" />
    </g>

    <!-- Seasonal props standing on the hill -->
    <g v-if="season === 'christmas'">
      <path class="hs-snow" d="M583 113q0-6 8-6h82q8 0 8 6q-6 5-12 1q-7 6-14 1q-8 6-16 0q-8 6-17 1q-8 5-15 0q-8 5-14 0q-6 3-10-3z" />
      <rect class="hs-snow" x="541" y="143" width="52" height="5.5" rx="2.75" />
      <rect class="hs-snow" x="671" y="153" width="46" height="5.5" rx="2.75" />
      <g transform="translate(520 204) scale(1.3)">
        <rect x="-3" y="-3" width="6" height="10" rx="1" fill="#a47c51" />
        <path d="M0-43L-11-26H-7L-16-13H-10L-21 2H21L10-13H16L7-26H11Z" fill="#2d7258" />
        <path d="M0-39L-8-27H0L-12-14H0L-16-1H-5L0-8Z" fill="#53977a" />
        <path d="M-8-24Q0-18 8-24M-13-11Q0-3 13-11" fill="none" stroke="#e6c581" stroke-width="1" />
        <g class="hs-twinkle"><circle cx="-5" cy="-25" r="2" fill="#e5676b" /><circle cx="7" cy="-3" r="2" fill="#f5c451" /></g>
        <g class="hs-twinkle" style="animation-delay: -1.2s"><circle cx="6" cy="-16" r="2.2" fill="#f5c451" /><circle cx="-10" cy="-7" r="2.1" fill="#e5676b" /></g>
        <path class="hs-twinkle" d="M0-52L2-47L7-47L3-43L4-38L0-41L-4-38L-3-43L-7-47L-2-47Z" fill="#f5c451" stroke="#fff1bd" stroke-width="0.6" />
      </g>
      <!-- Snowman on call -->
      <g transform="translate(748 213)">
        <circle cy="-9" r="10" fill="#ffffff" stroke="#cfe3ea" stroke-width="0.8" />
        <circle cy="-24" r="7" fill="#ffffff" stroke="#cfe3ea" stroke-width="0.8" />
        <path d="M-6-19Q0-15 6-19L7-16Q0-12-7-16Z" fill="#e5676b" />
        <path d="M4-17L7-9" stroke="#e5676b" stroke-width="3" stroke-linecap="round" />
        <circle cx="-2.4" cy="-26" r="0.9" fill="#12313a" /><circle cx="2.4" cy="-26" r="0.9" fill="#12313a" />
        <path d="M0-24L6-22.6L0-22Z" fill="#f59e0b" />
        <path d="M-5-17Q-9-8-3-5" fill="none" stroke="#0f766e" stroke-width="1.2" stroke-linecap="round" />
        <circle cx="-2.4" cy="-4.6" r="2" fill="#0f766e" />
        <path d="M-7-31H7M-5-31V-37H5V-31" fill="#12313a" stroke="#12313a" stroke-width="1.6" stroke-linejoin="round" />
      </g>
    </g>
    <g v-else-if="season === 'independence'">
      <path d="M664 111V88" stroke="#8a6a4f" stroke-width="1.6" stroke-linecap="round" />
      <g class="hs-flag-wave">
        <rect x="664" y="88" width="6" height="11" fill="#0b7a4b" />
        <rect x="670" y="88" width="6" height="11" fill="#ffffff" />
        <rect x="676" y="88" width="6" height="11" fill="#c8102e" />
      </g>
    </g>
    <g v-else-if="season === 'doctors-day'">
      <path d="M556 115L568 147M570 101L568 147M583 119L568 147" fill="none" stroke="#94a3b8" stroke-width="0.7" />
      <g v-for="item in partyBalloons" :key="'party-' + item.x" :transform="'translate(' + item.x + ' ' + item.y + ')'">
        <g class="hs-bob" :style="{ animationDelay: item.delay }">
          <ellipse rx="9" ry="11" :fill="item.color" />
          <path d="M-2 11L0 9L2 11Z" :fill="item.color" />
          <path d="M-4-5Q-1-8 2-7" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.4" stroke-linecap="round" />
          <path v-if="item.plus" d="M-1.5-2.5h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="#ffffff" />
        </g>
      </g>
    </g>

    </g>

    <path class="hs-hill-mid" d="M-200 260V212C-80 200 40 218 160 210C280 202 380 194 480 197C580 200 680 199 800 195V260Z" />

    <g v-if="season === 'day-of-dead'">
      <g v-for="candle in candles" :key="'candle-' + candle.x" :transform="'translate(' + candle.x + ' ' + candle.y + ')'">
        <ellipse class="hs-candle-glow" cx="0" cy="-7" rx="9" ry="12" />
        <rect x="-4" y="0" width="8" :height="candle.height" rx="2" fill="#f6deac" stroke="#cc9a58" stroke-width="0.7" />
        <path class="hs-flame" d="M0-13C-1-8-5-6-3-2C-1 1 3 0 3-3C4-7 1-8 0-13Z" fill="#f4a82e" :style="{ animationDelay: candle.delay }" />
        <path d="M0-6C-3-2-1 0 1-1C3-3 1-4 0-6Z" fill="#fff3b0" />
      </g>
      <g v-for="flower in flowers" :key="'flower-' + flower.x" :transform="'translate(' + flower.x + ' ' + flower.y + ') scale(' + flower.scale + ')'">
        <path d="M-3 4Q-19-5-17 7Q-10 13 0 7Q13 16 18 7Q11 2 3 5" fill="#587e51" />
        <g v-for="angle in petalAngles" :key="angle" :transform="'rotate(' + angle + ')'">
          <ellipse cx="0" cy="-6" rx="4.6" ry="6" :fill="flower.color" />
        </g>
        <circle r="5.5" fill="#f7ad27" />
        <circle r="2.5" fill="#b9671c" />
      </g>
    </g>

    <!-- Road and ambulance -->
    <rect class="hs-road" x="-200" y="215" width="1000" height="13" />
    <path class="hs-road-line" d="M-200 221.5H800" />
    <g class="hs-ambulance">
      <rect class="hs-beacon" x="11" y="-26.5" width="7" height="4" rx="2" />
      <rect x="0" y="-23" width="31" height="19" rx="3" fill="#ffffff" />
      <path d="M30-19h8.5l7.5 8v7H30z" fill="#ffffff" />
      <path d="M32.5-16.5h5l5 5.5h-10z" class="hs-ambulance-glass" />
      <rect x="0" y="-10.5" width="46" height="3" fill="#14b8a6" />
      <path d="M13-21h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="#0f766e" />
      <rect class="hs-headlight" x="44" y="-9" width="2.5" height="3" rx="1" />
      <circle cx="9.5" cy="-3" r="4.3" fill="#1e293b" /><circle cx="9.5" cy="-3" r="1.6" fill="#cbd5e1" />
      <circle cx="36" cy="-3" r="4.3" fill="#1e293b" /><circle cx="36" cy="-3" r="1.6" fill="#cbd5e1" />
    </g>

    <path class="hs-hill-front" d="M-200 260V233C-60 225 100 240 260 233C420 226 560 238 680 232C740 229 780 231 800 229V260Z" />

    <!-- The landscape has a pulse -->
    <path class="hs-ecg" :d="ecgPath" />
    <path class="hs-ecg-pulse" :d="ecgPath" pathLength="1000" />

    <!-- Little "+" sparkles rising from the clinic -->
    <g v-for="spark in sparks" :key="'spark-' + spark.x" :transform="'translate(' + spark.x + ' ' + spark.y + ')'">
      <path class="hs-spark" d="M-4 0H4M0-4V4" :style="{ animationDelay: spark.delay }" />
    </g>

    <!-- Festivities: garland hanging from the top edge of the card -->
    <g v-if="season !== 'normal'" class="hs-garland">
      <path class="hs-string" d="M320-4Q562 48 804-4" />
      <template v-if="season === 'christmas'">
        <g v-for="(point, index) in garland" :key="'bulb-' + index" :transform="'translate(' + point.x + ' ' + point.y + ') rotate(' + point.angle + ')'">
          <rect x="-1.6" y="0" width="3.2" height="3.5" rx="0.8" fill="#5b7a6b" />
          <g class="hs-twinkle" :style="{ animationDelay: point.delay }">
            <circle class="hs-bulb-glow" cy="8" r="8" :fill="bulbColors[index % bulbColors.length]" />
            <ellipse cy="8" rx="3.2" ry="4.6" :fill="bulbColors[index % bulbColors.length]" />
          </g>
        </g>
      </template>
      <template v-else>
        <g v-for="(point, index) in garlandMain" :key="'hang-' + index" :transform="'translate(' + point.x + ' ' + point.y + ') rotate(' + point.angle + ') scale(1.2)'">
          <g class="hs-sway" :style="{ animationDelay: point.delay }">
            <template v-if="season === 'day-of-dead' || season === 'independence'">
              <path class="hs-paper" d="M-12 0H12V22L8 26L4 23L0 26L-4 23L-8 26L-12 22Z M0 5L5 10L0 15L-5 10Z M-9 17H-5V20H-9Z M5 17H9V20H5Z"
                :fill="hangColor(index)" fill-rule="evenodd" />
            </template>
            <path v-else-if="season === 'valentine'" d="M0 3V7M0 22C-15 11-10-1 0 7C10-1 15 11 0 22Z" :fill="hangColor(index)" stroke="#be123c" stroke-width="0.6" />
            <path v-else d="M-10 0H10L0 20Z" :fill="hangColor(index)" />
          </g>
        </g>
      </template>
    </g>

    <!-- Things that fall: snow, cempasuchil petals, confetti -->
    <g v-if="fallerKind" class="hs-fallers">
      <g v-for="(item, index) in fallers" :key="'fall-' + index" :transform="'translate(' + item.x + ' -14)'">
        <g class="hs-fall" :style="{ animationDelay: item.delay, animationDuration: item.duration, '--hs-drift': item.drift + 'px', '--hs-rest': item.rest + 'px' }">
          <circle v-if="fallerKind === 'snow'" class="hs-snowflake" :r="item.size" />
          <ellipse v-else-if="fallerKind === 'petal'" :rx="item.size + 1.5" :ry="item.size * 0.55" :fill="index % 2 ? '#f59e0b' : '#ea7a1a'" />
          <rect v-else :width="item.size * 2.2" :height="item.size * 1.2" rx="0.6" :fill="confettiColors[index % confettiColors.length]" />
        </g>
      </g>
    </g>

    <!-- Things that rise: hearts -->
    <g v-if="season === 'valentine'">
      <g v-for="(heart, index) in hearts" :key="'heart-' + index" :transform="'translate(' + heart.x + ' ' + heart.y + ') scale(' + heart.scale + ')'">
        <path class="hs-heart" d="M0 9C-15-2-10-14 0-6C10-14 15-2 0 9Z" :fill="heart.color" :style="{ animationDelay: heart.delay }" />
      </g>
    </g>

    <!-- Fireworks -->
    <g v-if="season === 'independence'">
      <g v-for="burst in bursts" :key="'burst-' + burst.x" :transform="'translate(' + burst.x + ' ' + burst.y + ')'">
        <g class="hs-burst" :style="{ animationDelay: burst.delay }">
          <circle r="22" fill="none" stroke="none" />
          <path v-for="angle in burstAngles" :key="angle" d="M0-7V-20" :transform="'rotate(' + angle + ')'" :stroke="burst.color" stroke-width="2" stroke-linecap="round" />
          <circle r="2.2" :fill="burst.color" />
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
const BEAT = 'l7-5l7 5h12l6-20l9 30l7-15l5 5';
const HANG_COLORS = {
  'day-of-dead': ['#d99024', '#a45b91', '#ce7031', '#728d70', '#a45b91', '#d99024', '#ce7031'],
  independence: ['#0b7a4b', '#ffffff', '#c8102e'],
  valentine: ['#fb7185', '#f472b6', '#e11d48'],
  'doctors-day': ['#0f766e', '#f5b942', '#fb7185', '#14b8a6']
};
const FALLER_KINDS = { christmas: 'snow', 'day-of-dead': 'petal', 'doctors-day': 'confetti' };

// The garland follows the quadratic M320-4 Q562 48 804-4 drawn in the template.
function garlandPoints(count) {
  return Array.from({ length: count }, (_, index) => {
    const t = 0.07 + index * (0.87 / (count - 1));
    return {
      x: Math.round((320 + 484 * t) * 10) / 10,
      y: Math.round((-4 + 104 * t * (1 - t)) * 10) / 10,
      angle: Math.round(Math.atan(104 * (1 - 2 * t) / 484) * 1800 / Math.PI) / 10,
      delay: '-' + ((index * 1.7) % 5).toFixed(1) + 's'
    };
  });
}

export default {
  name: 'HomeHeroScene',
  props: {
    period: { type: String, default: 'morning' },
    season: { type: String, default: 'normal' }
  },
  data() {
    const garland = garlandPoints(13);
    return {
      ecgPath: 'M-200 247H250' + BEAT + 'h70' + BEAT + 'h110' + BEAT + 'h95' + BEAT + 'H800',
      garland,
      garlandMain: garland.filter((_, index) => index % 2 === 0),
      bulbColors: ['#e5484d', '#f5b942', '#34a37a', '#5aa9e6'],
      confettiColors: ['#0f766e', '#f5b942', '#fb7185', '#14b8a6', '#5aa9e6'],
      clouds: [
        { x: 566, y: 46, scale: 1.15, delay: '-4s', duration: '22s', plus: true },
        { x: 352, y: 92, scale: 0.85, delay: '-11s', duration: '28s', plus: false },
        { x: 664, y: 34, scale: 0.6, delay: '-17s', duration: '25s', plus: false }
      ],
      stars: [
        { x: 318, y: 58, r: 1.2, delay: '-0.4s' }, { x: 356, y: 24, r: 1.6, delay: '-2.1s' },
        { x: 402, y: 96, r: 1.1, delay: '-3.3s' }, { x: 438, y: 44, plus: true, delay: '-1.2s' },
        { x: 486, y: 18, r: 1.3, delay: '-2.8s' }, { x: 512, y: 112, r: 1.2, delay: '-0.9s' },
        { x: 548, y: 66, r: 1.7, delay: '-3.9s' }, { x: 596, y: 30, plus: true, delay: '-2.5s' },
        { x: 668, y: 52, r: 1.2, delay: '-1.6s' }, { x: 694, y: 18, r: 1.5, delay: '-3.1s' },
        { x: 778, y: 118, r: 1.3, delay: '-0.2s' }, { x: 786, y: 26, r: 1.1, delay: '-2.3s' },
        { x: 470, y: 132, r: 1, delay: '-1.9s' }, { x: 736, y: 132, plus: true, delay: '-3.6s' }
      ],
      trees: [
        { x: 468, y: 204, scale: 0.8, delay: '-1s' }, { x: 522, y: 203, scale: 1.05, delay: '-3s' },
        { x: 726, y: 202, scale: 0.9, delay: '-2s' }, { x: 772, y: 200, scale: 1.15, delay: '-4s' }
      ],
      windows: [
        { x: 598, y: 126, w: 14, h: 13, lit: true }, { x: 625, y: 126, w: 14, h: 13, lit: false },
        { x: 652, y: 126, w: 14, h: 13, lit: true, flicker: true }, { x: 598, y: 147, w: 14, h: 13, lit: false },
        { x: 625, y: 147, w: 14, h: 13, lit: true }, { x: 652, y: 147, w: 14, h: 13, lit: true },
        { x: 598, y: 170, w: 12, h: 13, lit: true }, { x: 654, y: 170, w: 12, h: 13, lit: false },
        { x: 554, y: 160, w: 10, h: 10, lit: true }, { x: 573, y: 160, w: 10, h: 10, lit: false },
        { x: 554, y: 178, w: 10, h: 10, lit: false }, { x: 573, y: 178, w: 10, h: 10, lit: true, flicker: true },
        { x: 680, y: 170, w: 10, h: 10, lit: true }, { x: 696, y: 170, w: 10, h: 10, lit: true }
      ],
      sparks: [
        { x: 560, y: 150, delay: '0s' }, { x: 652, y: 96, delay: '-2.6s' },
        { x: 708, y: 150, delay: '-5.2s' }, { x: 500, y: 168, delay: '-7.4s' }
      ],
      candles: [
        { x: 600, y: 193, height: 14, delay: '-0.4s' }, { x: 664, y: 194, height: 12, delay: '-1.1s' },
        { x: 520, y: 193, height: 13, delay: '-1.6s' }
      ],
      flowers: [
        { x: 486, y: 207, scale: 0.75, color: '#e8861e' }, { x: 556, y: 207, scale: 0.9, color: '#ef9e21' },
        { x: 584, y: 209, scale: 0.65, color: '#e8861e' }, { x: 684, y: 207, scale: 0.8, color: '#ef9e21' },
        { x: 742, y: 206, scale: 0.9, color: '#e8861e' }, { x: 786, y: 206, scale: 0.7, color: '#ef9e21' }
      ],
      petalAngles: [0, 45, 90, 135, 180, 225, 270, 315],
      partyBalloons: [
        { x: 556, y: 104, color: '#14b8a6', delay: '-0.6s', plus: true },
        { x: 570, y: 90, color: '#f5b942', delay: '-2.2s', plus: false },
        { x: 583, y: 108, color: '#fb7185', delay: '-3.4s', plus: true }
      ],
      hearts: [
        { x: 548, y: 150, scale: 0.9, color: '#fb7185', delay: '0s' }, { x: 604, y: 104, scale: 0.7, color: '#f472b6', delay: '-1.4s' },
        { x: 660, y: 100, scale: 1, color: '#e11d48', delay: '-2.9s' }, { x: 704, y: 150, scale: 0.75, color: '#fb7185', delay: '-4.3s' },
        { x: 500, y: 176, scale: 0.6, color: '#f472b6', delay: '-5.6s' }, { x: 756, y: 170, scale: 0.85, color: '#e11d48', delay: '-6.8s' }
      ],
      bursts: [
        { x: 420, y: 96, color: '#34a37a', delay: '0s' }, { x: 548, y: 84, color: '#f5b942', delay: '-1.1s' },
        { x: 742, y: 128, color: '#e5484d', delay: '-2.2s' }
      ],
      burstAngles: [0, 36, 72, 108, 144, 180, 216, 252, 288, 324],
      // Deterministic pseudo-scatter keeps renders stable for visual QA.
      fallers: Array.from({ length: 18 }, (_, index) => ({
        x: 300 + ((index * 137) % 500),
        size: 1.4 + (index % 4) * 0.5,
        drift: -20 - (index % 5) * 9,
        rest: 24 + ((index * 53) % 190),
        delay: '-' + ((index * 2.3) % 11).toFixed(1) + 's',
        duration: (9 + (index % 5) * 1.4).toFixed(1) + 's'
      }))
    };
  },
  computed: {
    // The Christmas tree takes the place of the tree beside the left wing.
    visibleTrees() {
      return this.season === 'christmas' ? this.trees.filter(tree => tree.x !== 522) : this.trees;
    },
    fallerKind() {
      return FALLER_KINDS[this.season] || '';
    }
  },
  methods: {
    hangColor(index) {
      const colors = HANG_COLORS[this.season] || HANG_COLORS['doctors-day'];
      return colors[index % colors.length];
    }
  }
};
</script>

<style scoped>
.hero-scene {
  --hs-hill-far: #d3f0e9;
  --hs-hill-mid: #a9e0d4;
  --hs-hill-front: #7fd0c1;
  --hs-wall: #ffffff;
  --hs-wall-shade: #e4f1f0;
  --hs-roof: #0f766e;
  --hs-window: #b9e3ee;
  --hs-window-lit: #b9e3ee;
  --hs-door: #0f766e;
  --hs-leaves: #3fae9a;
  --hs-leaves-light: #6fcab8;
  --hs-trunk: #8a6a4f;
  --hs-cloud: #ffffff;
  --hs-cloud-opacity: 0.92;
  --hs-road: #eef8f6;
  --hs-ecg: #0f766e;
  --hs-ecg-pulse: #0f766e;
  --hs-spark: #14b8a6;
  --hs-string: #a67550;
  --hs-night: 0;
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 0;
  width: 62%;
  height: 100%;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to right, transparent 4%, rgba(0, 0, 0, 0.4) 22%, #000 44%);
  mask-image: linear-gradient(to right, transparent 4%, rgba(0, 0, 0, 0.4) 22%, #000 44%);
  animation: hs-enter 900ms ease-out both;
}

.hero-scene--afternoon {
  --hs-hill-far: #c5ecdf;
  --hs-hill-mid: #8fd8c6;
  --hs-hill-front: #5cc4ae;
  --hs-leaves: #2fa18c;
  --hs-road: #f1faf8;
}

/* Night hour, or the app's own dark theme at any hour, share the lit-clinic palette. */
.hero-scene--night,
html[data-theme="clinical-night"] .hero-scene {
  --hs-hill-far: #1c3859;
  --hs-hill-mid: #17304d;
  --hs-hill-front: #11263e;
  --hs-wall: #2d4a70;
  --hs-wall-shade: #243d5f;
  --hs-roof: #0d9488;
  --hs-window: #3b5b86;
  --hs-window-lit: #ffd98a;
  --hs-door: #0d9488;
  --hs-leaves: #1d5a5c;
  --hs-leaves-light: #277274;
  --hs-trunk: #4a3f3a;
  --hs-cloud: #9fb4d1;
  --hs-cloud-opacity: 0.2;
  --hs-road: #223c5e;
  --hs-ecg: #2dd4bf;
  --hs-ecg-pulse: #ccfbf1;
  --hs-spark: #5eead4;
  --hs-string: #7c8aa3;
  --hs-night: 1;
}

.hs-hill-far { fill: var(--hs-hill-far); }
.hs-hill-mid { fill: var(--hs-hill-mid); }
.hs-hill-front { fill: var(--hs-hill-front); }
.hs-wall { fill: var(--hs-wall); }
.hs-wall-shade { fill: var(--hs-wall-shade); }
.hs-roof { fill: var(--hs-roof); }
.hs-door { fill: var(--hs-door); }
.hs-door-line { stroke: var(--hs-wall); stroke-width: 1; opacity: 0.6; }
.hs-window { fill: var(--hs-window); }
.hs-window--lit { fill: var(--hs-window-lit); }
.hs-window--flicker { animation: hs-flicker 7s steps(1) infinite; }
.hs-sign { fill: #ffffff; stroke: var(--hs-roof); stroke-width: 2; }
.hs-cross { fill: #0f766e; }
.hs-sign-glow {
  fill: #5eead4;
  opacity: calc(var(--hs-night) * 0.28);
  transform-box: fill-box;
  transform-origin: center;
  animation: hs-breathe 3.6s ease-in-out infinite;
}
.hs-leaves { fill: var(--hs-leaves); }
.hs-leaves-light { fill: var(--hs-leaves-light); }
.hs-trunk { fill: var(--hs-trunk); }
.hs-tree {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: hs-sway 6s ease-in-out infinite;
}
.hs-road { fill: var(--hs-road); }
.hs-road-line { fill: none; stroke: var(--hs-hill-mid); stroke-width: 1.2; stroke-dasharray: 10 12; }
.hs-snow { fill: #ffffff; }
.hs-string { fill: none; stroke: var(--hs-string); stroke-width: 1.1; }
.hs-paper { stroke: rgba(15, 23, 42, 0.12); stroke-width: 0.5; }

.hs-glow {
  transform-box: fill-box;
  transform-origin: center;
  animation: hs-breathe 6s ease-in-out infinite;
}
.hs-rays {
  fill: none;
  stroke: #ffc46b;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 2 12.4;
  opacity: 0.75;
  transform-box: fill-box;
  transform-origin: center;
  animation: hs-spin 48s linear infinite;
}
html[data-theme="clinical-night"] .hs-celestial { opacity: 0.82; }

.hs-star { fill: #f8fafc; animation: hs-twinkle 4.2s ease-in-out infinite; }
.hs-star--plus { fill: none; stroke: #99f6e4; stroke-width: 1.3; stroke-linecap: round; }
.hs-shooting {
  stroke: #f8fafc;
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0;
  animation: hs-shooting 13s ease-in infinite;
}

.hs-cloud {
  fill: var(--hs-cloud);
  opacity: var(--hs-cloud-opacity);
  animation: hs-drift 24s ease-in-out infinite alternate;
}
.hs-cloud-plus { fill: #99e6da; }
.hs-balloon { animation: hs-balloon 11s ease-in-out infinite; }
.hs-bob { animation: hs-bob 4.5s ease-in-out infinite; }

.hs-ambulance {
  transform: translate(452px, 222px);
  animation: hs-drive 26s linear infinite;
}
.hs-ambulance-glass { fill: #9bd8ea; }
.hs-beacon { fill: #f59e0b; animation: hs-beacon 0.9s steps(1) infinite; }
.hs-headlight { fill: #fde68a; opacity: calc(0.35 + var(--hs-night) * 0.65); }

.hs-ecg {
  fill: none;
  stroke: var(--hs-ecg);
  stroke-width: 1.6;
  stroke-linejoin: round;
  stroke-linecap: round;
  opacity: 0.42;
}
.hs-ecg-pulse {
  fill: none;
  stroke: var(--hs-ecg-pulse);
  stroke-width: 2.6;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 90 910;
  stroke-dashoffset: 420;
  animation: hs-pulse 5.5s linear infinite;
}

.hs-spark {
  fill: none;
  stroke: var(--hs-spark);
  stroke-width: 2.2;
  stroke-linecap: round;
  opacity: 0;
  animation: hs-rise 10s ease-out infinite;
}

.hs-sway {
  transform-box: fill-box;
  transform-origin: top center;
  animation: hs-sway 5s ease-in-out infinite;
}
.hs-twinkle { animation: hs-twinkle 3.2s ease-in-out infinite; }
.hs-bulb-glow { opacity: calc(0.12 + var(--hs-night) * 0.28); }
.hs-candle-glow { fill: #ffd36b; opacity: calc(0.14 + var(--hs-night) * 0.2); }
.hs-flame {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: hs-flame 2.8s ease-in-out infinite;
}
.hs-flag-wave {
  transform-box: fill-box;
  transform-origin: left center;
  animation: hs-wave 3s ease-in-out infinite;
}
.hs-fall { animation: hs-fall 10s linear infinite; }
.hs-snowflake { fill: #ffffff; stroke: #c9e2ee; stroke-width: 0.6; }
.hs-heart { opacity: 0; animation: hs-heart 8s ease-out infinite; }
.hs-burst {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  animation: hs-burst 3.3s ease-out infinite;
}

@keyframes hs-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes hs-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes hs-spin { to { transform: rotate(360deg); } }
@keyframes hs-twinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes hs-flicker { 0%, 61%, 66%, 100% { opacity: 1; } 62%, 65% { opacity: 0.55; } }
@keyframes hs-drift { from { transform: translateX(-16px); } to { transform: translateX(16px); } }
@keyframes hs-balloon {
  0%, 100% { transform: translate(0, 0) rotate(-2deg); }
  50% { transform: translate(14px, -9px) rotate(2deg); }
}
@keyframes hs-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes hs-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes hs-wave { 0%, 100% { transform: skewY(-4deg); } 50% { transform: skewY(4deg); } }
@keyframes hs-flame { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(0.9, 1.1); opacity: 1; } }
@keyframes hs-beacon { 0%, 100% { fill: #f59e0b; } 50% { fill: #ef4444; } }
@keyframes hs-drive {
  0% { transform: translate(150px, 222px); }
  72%, 100% { transform: translate(830px, 222px); }
}
@keyframes hs-pulse { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
@keyframes hs-rise {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  12% { opacity: 0.75; }
  55%, 100% { transform: translateY(-80px) scale(1); opacity: 0; }
}
@keyframes hs-shooting {
  0% { transform: translate(70px, -26px); opacity: 0; }
  3% { opacity: 1; }
  9%, 100% { transform: translate(-130px, 46px); opacity: 0; }
}
@keyframes hs-fall {
  from { transform: translate(0, 0) rotate(0deg); }
  to { transform: translate(var(--hs-drift, -30px), 290px) rotate(300deg); }
}
@keyframes hs-heart {
  0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
  12% { opacity: 0.9; }
  70%, 100% { transform: translate(10px, -92px) scale(1); opacity: 0; }
}
@keyframes hs-burst {
  0% { transform: scale(0.15); opacity: 0; }
  12% { opacity: 1; }
  60% { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(1.15); opacity: 0; }
}

/* Phones: the scene becomes a band along the bottom of the card. */
@media (max-width: 760px) {
  .hero-scene {
    width: 100%;
    height: 8.5rem;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 42%);
    mask-image: linear-gradient(to bottom, transparent 0%, #000 42%);
  }
  .hs-garland,
  .hs-fallers { display: none; }
}

/* Still picture: every piece rests in a composed position. */
@media (prefers-reduced-motion: reduce) {
  .hero-scene,
  .hero-scene * { animation: none !important; }
  .hs-spark { opacity: 0.4; }
  .hs-heart { opacity: 0.85; }
  .hs-burst { opacity: 0.9; }
  .hs-fall { transform: translateY(var(--hs-rest, 120px)); }
}
</style>
