<template>
  <svg
    class="co26-tooth-svg"
    viewBox="0 0 64 96"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="co26-root-line"
      :d="
        number % 10 > 3
          ? 'M12 37 C10 10 17 2 22 27 L30 39 L38 14 Q45 0 48 18 L52 37'
          : 'M20 38 Q23 8 32 3 Q41 8 44 38'
      "
    />
    <g stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">
      <path
        v-for="face in faces"
        :key="face.id"
        :d="face.path"
        :class="faceTone(orientedFace(face.id))"
      />
    </g>
    <g v-if="presence" class="co26-presence-mark">
      <path v-if="presence.code === 'aus'" d="M10 41 L54 85 M54 41 L10 85" />
      <circle v-else cx="32" cy="63" r="22" stroke-dasharray="4 3" />
    </g>
    <circle
      v-if="tooth.findings.some((f) => f.surfaces === '?')"
      cx="55"
      cy="88"
      r="7"
      class="co26-pending-dot"
    />
    <text
      v-if="tooth.findings.some((f) => f.surfaces === '?')"
      x="55"
      y="91"
      text-anchor="middle"
      font-size="10"
      fill="white"
    >
      ?
    </text>
  </svg>
</template>
<script>
import { tone } from './odontogramPreviewFixtures';
export default {
  props: {
    number: { type: Number, required: true },
    tooth: { type: Object, required: true }
  },
  data: () => ({
    faces: [
      { id: 'V', path: 'M10 40 L54 40 L43 51 L21 51 Z' },
      { id: 'M', path: 'M10 40 L21 51 L21 73 L10 84 Z' },
      { id: 'D', path: 'M54 40 L54 84 L43 73 L43 51 Z' },
      { id: 'L', path: 'M10 84 L21 73 L43 73 L54 84 Z' },
      { id: 'O', path: 'M21 51 L43 51 L43 73 L21 73 Z' }
    ]
  }),
  computed: {
    presence() {
      return this.tooth.findings.find((f) => f.kind === 'presence');
    }
  },
  methods: {
    orientedFace(face) {
      return [1, 4, 5, 8].includes(Math.floor(this.number / 10)) &&
        ['M', 'D'].includes(face)
        ? face === 'M'
          ? 'D'
          : 'M'
        : face;
    },
    faceTone(face) {
      const f =
        this.tooth.findings.find(
          (f) =>
            tone(f) === 'condition' &&
            (!f.surfaces || f.surfaces.includes(face))
        ) ||
        this.tooth.findings.find(
          (f) =>
            f.kind !== 'presence' && (!f.surfaces || f.surfaces.includes(face))
        );
      return f ? 'co26-fill-' + tone(f) : 'co26-fill-empty';
    }
  }
};
</script>
