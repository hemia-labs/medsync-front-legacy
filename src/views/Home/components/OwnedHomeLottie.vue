<script>
import LegacyLottie from 'lottie-vuejs/src/LottieAnimation.vue';

// The installed wrapper does not release animations on destroy. Keep its
// rendering/props/events, while owning this keyed Home instance's lifetime.
export default {
  name: 'OwnedHomeLottie',
  extends: LegacyLottie,
  created() {
    this._homeAnimationInstance = null;
    // Vue 2 must not recursively observe the renderer/SVG object graph.
    // The vendor only reads this slot from methods; its template uses style.
    Object.defineProperty(this, 'anim', {
      configurable: true,
      get: () => this._homeAnimationInstance,
      set: value => { this._homeAnimationInstance = value; }
    });
    this._homeLottieActive = true;
    this._homeLottieDisposed = false;
    this._homeLottieLoading = false;
  },
  beforeDestroy() {
    this._homeLottieDisposed = true;
    this._homeLottieActive = false;
    this.releaseHomeAnimation();
  },
  deactivated() {
    this._homeLottieActive = false;
    this.releaseHomeAnimation();
  },
  activated() {
    this._homeLottieActive = true;
    if (!this.anim && !this._homeLottieLoading) this.init();
  },
  methods: {
    async loadJsonData(path) {
      const data = await LegacyLottie.methods.loadJsonData.call(this, path);
      if (!this._homeLottieActive || this._homeLottieDisposed) throw Error('HOME_ANIMATION_INACTIVE');
      return data;
    },
    async init() {
      if (!this._homeLottieActive || this._homeLottieDisposed || this._homeLottieLoading) return;
      this._homeLottieLoading = true;
      try { await LegacyLottie.methods.init.call(this); }
      catch (_) { this.releaseHomeAnimation(); }
      finally {
        this._homeLottieLoading = false;
        if (!this._homeLottieActive || this._homeLottieDisposed) this.releaseHomeAnimation();
      }
    },
    releaseHomeAnimation() {
      const animation = this.anim;
      this.anim = null;
      if (animation && typeof animation.destroy === 'function') {
        try { animation.destroy(); } catch (_) { /* Decorative failure cannot block navigation. */ }
      }
    }
  }
};
</script>
