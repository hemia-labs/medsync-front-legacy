<template>
  <span class="guide-portal-anchor" hidden aria-hidden="true">
  <section ref="card" class="guide-spotlight" :style="position" role="region" :aria-label="title" @keydown.esc.stop="$emit('close')">
    <div class="spotlight-top"><span>TUTORIAL · PASO {{ progress }}</span><button type="button" aria-label="Cerrar esta ayuda" @click="$emit('close')">×</button></div>
    <h3>{{ title }}</h3><p :id="descriptionId">{{ text }}</p>
    <div class="spotlight-actions"><button v-if="!first" type="button" :disabled="busy" @click="$emit('previous')">Anterior</button><button type="button" class="spotlight-primary" :disabled="busy || nextDisabled" @click="$emit('next')">{{ nextLabel || (last ? 'Cerrar esta ayuda' : 'Siguiente paso') }} <span aria-hidden="true">→</span></button></div>
  </section>
  </span>
</template>
<script>
export default {
  props:{target:{required:true},hintHost:{default:null},title:String,text:String,progress:String,nextLabel:String,first:Boolean,last:Boolean,busy:Boolean,nextDisabled:Boolean},
  data:()=>({position:{visibility:'hidden'},frame:0,origin:null,described:null}),
  computed:{descriptionId(){return `guide-description-${this._uid}`;}},
  mounted(){
    // Vue owns this stable anchor; only its permanent child card is portalled.
    // Moving the component root breaks keyed replacement among Vue siblings.
    this.card=this.$refs.card;
    this.origin=this.$el.parentNode;
    // Keep the hint outside transformed dialogs; the editor's registered target is retained.
    // Vuetify 2 retains keyboard focus inside this content node, not its overlay.
    const dialog=this.target.closest('.v-dialog');
    this.dialog=dialog;
    if(dialog){dialog.addEventListener('transitionend',this.schedule);dialog.addEventListener('animationend',this.schedule);}
    this.inline=!!this.hintHost || window.innerWidth<=600;
    if(this.hintHost)this.hintHost.appendChild(this.card);
    else if(this.inline)this.target.insertAdjacentElement('afterend',this.card);
    else (dialog || document.body).appendChild(this.card);
    this.target.__hemiaGuideOwner=this._uid;
    this.target.classList.add('hemia-guide-target');
    this.described=document.activeElement && this.target.contains(document.activeElement) ? document.activeElement : this.target;
    this.oldDescription=this.described.getAttribute('aria-describedby');
    this.described.setAttribute('aria-describedby',[this.oldDescription,this.descriptionId].filter(Boolean).join(' '));
    this.target.addEventListener('keydown',this.escape);
    window.addEventListener('scroll',this.schedule,true);window.addEventListener('resize',this.schedule);
    // Menus and confirmation dialogs always take priority over background help.
    this.overlays=new MutationObserver(this.schedule);
    this.overlays.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    this.$nextTick(this.positionHint);
  },
  beforeDestroy(){
    window.removeEventListener('scroll',this.schedule,true);window.removeEventListener('resize',this.schedule);cancelAnimationFrame(this.frame);
    if(this.overlays)this.overlays.disconnect();
    if(this.dialog){this.dialog.removeEventListener('transitionend',this.schedule);this.dialog.removeEventListener('animationend',this.schedule);}
    if(this.target.__hemiaGuideOwner===this._uid){this.target.classList.remove('hemia-guide-target');delete this.target.__hemiaGuideOwner;}
    this.target.removeEventListener('keydown',this.escape);
    if(this.described){const remaining=(this.described.getAttribute('aria-describedby') || '').split(' ').filter(id=>id && id!==this.descriptionId).join(' ');if(remaining)this.described.setAttribute('aria-describedby',remaining);else this.described.removeAttribute('aria-describedby');}
  },
  destroyed(){if(this.card && this.card.parentNode)this.card.parentNode.removeChild(this.card);},
  methods:{
    escape(event){if(event.key==='Escape'){event.stopPropagation();this.$emit('close');}},
    schedule(event){if(event && event.type==='resize')this.flowFallback=false;cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(this.positionHint);},
    positionHint(){
      if(!this.target.isConnected)return this.$emit('close');
      const covered=Array.from(document.querySelectorAll('.swal2-container, .v-menu__content.menuable__content__active, .v-dialog__content--active')).some(overlay=>!overlay.contains(this.target) && overlay.getBoundingClientRect().width>0);
      if(covered){this.position={...this.position,visibility:'hidden'};return;}
      const r=this.target.getBoundingClientRect(),width=Math.min(360,window.innerWidth-24),height=this.card.offsetHeight;
      const roomBelow=window.innerHeight-r.bottom-24,roomAbove=r.top-24;
      const left=Math.max(12,Math.min(r.left,window.innerWidth-width-12));
      const top=r.bottom+12+height<window.innerHeight ? r.bottom+12 : Math.max(12,r.top-height-12);
      // The hint must not cover the next form action (for example Edit or Copy).
      // Reserve flow space if the proposed floating rectangle overlaps a control.
      if(!this.inline && Array.from((this.dialog || document.body).querySelectorAll('button,a,input,textarea,select')).some(control=>{
        if(this.card.contains(control) || this.target.contains(control))return false;
        const box=control.getBoundingClientRect();
        return box.width>0 && box.height>0 && box.left<left+width && box.right>left && box.top<top+height && box.bottom>top;
      }))this.flowFallback=true;
      // Keep the fallback stable: the wider inline card can become shorter,
      // which must not make it bounce back into a narrow floating card on scroll.
      if(height>roomBelow && height>roomAbove)this.flowFallback=true;
      const inline=!!this.hintHost || window.innerWidth<=600 || this.flowFallback;
      if(inline!==this.inline){this.inline=inline;if(this.hintHost)this.hintHost.appendChild(this.card);else if(inline)this.target.insertAdjacentElement('afterend',this.card);else (this.dialog || document.body).appendChild(this.card);}
      // Drawing surfaces need their full area. Reserve normal-flow space below
      // the editor's actions instead of flipping a floating hint over the canvas.
      if(this.inline){this.position={position:'relative',left:'auto',top:'auto',width:'100%',maxWidth:'440px',maxHeight:'none',gridColumn:'1 / -1',flexBasis:'100%',margin:'12px 0',visibility:'visible'};return;}
      this.position={position:'fixed',left:`${left}px`,top:`${top}px`,width:`${width}px`,visibility:r.bottom<0 || r.top>window.innerHeight?'hidden':'visible'};
    }
  }
};
</script>
<style>
.guide-spotlight{position:fixed;z-index:1050;box-sizing:border-box;padding:20px;border:1px solid #76ccc1;border-radius:18px;background:#123f43;color:#fff;box-shadow:0 18px 54px #102e4755;max-height:calc(100vh - 24px);overflow:auto;animation:hemia-hint-in .18s ease-out}.guide-spotlight h3{font-size:20px;line-height:1.3;margin:10px 0}.guide-spotlight p{font-size:15px;line-height:1.55;margin:12px 0}.spotlight-top,.spotlight-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.spotlight-top span{font-size:11px;letter-spacing:.08em;color:#aee9dd}.guide-spotlight button{min-height:44px;padding:8px 12px;border-radius:10px;color:inherit}.spotlight-top button{font-size:24px}.spotlight-actions button:last-child{background:#bdeee0;color:#143e40;font-weight:600}.guide-spotlight button:disabled{opacity:.45}.guide-spotlight small{display:block;margin-top:12px;color:#c5dfdd}.guide-spotlight :focus-visible{outline:3px solid #bdeee0;outline-offset:3px}.hemia-guide-target{outline:3px solid #087f80!important;outline-offset:5px;box-shadow:none!important;scroll-margin:130px 0 300px}.hemia-guide-target input:focus-visible,.hemia-guide-target textarea:focus-visible{outline:none!important}@keyframes hemia-hint-in{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.guide-spotlight{animation:none}}
.guide-spotlight{overflow-wrap:anywhere;max-width:calc(100vw - 24px)}
.spotlight-top button{flex:0 0 44px;padding:0}
.spotlight-actions{flex-wrap:wrap;align-items:stretch;gap:8px}
.spotlight-actions button{max-width:100%;white-space:normal;text-align:left;line-height:1.4}
.spotlight-actions .spotlight-primary{flex:1 1 170px;text-align:center}
.spotlight-actions button:only-child{flex-basis:100%}
@media(max-width:600px){.guide-spotlight{padding:16px;box-shadow:0 8px 24px #102e4726;border-radius:14px}.guide-spotlight h3{font-size:19px}}
</style>
