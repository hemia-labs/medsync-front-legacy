<template>
  <main class="account-flow">
    <div class="account-flow__wrap">
      <header class="account-flow__brand"><img :src="logo" alt="MedSync" width="144" /><span>Tu consultorio, conectado</span></header>
      <div class="account-flow__grid">
        <section class="account-flow__card" aria-labelledby="account-title"><slot /></section>
        <aside class="account-flow__aside" aria-label="Pasos para comenzar">
          <p class="account-flow__eyebrow">COMIENZA CON MEDSYNC</p>
          <h2>Todo empieza con tu cuenta.</h2>
          <ol><li :aria-current="step === 1 ? 'step' : null"><b>01</b><div><strong>Crea tu cuenta</strong><p>Los datos de tu negocio y de su administrador.</p></div></li>
            <li :aria-current="step === 2 ? 'step' : null"><b>02</b><div><strong>Verifica tu correo</strong><p>Confirma el código que recibirás por correo.</p></div></li>
            <li :aria-current="step === 3 ? 'step' : null"><b>03</b><div><strong>Activa Profesional</strong><p>Cuando esté disponible la contratación, podrás continuar con tu licencia.</p></div></li></ol>
          <p class="account-flow__note">Crear tu cuenta no realiza ningún cobro. Después de activar tu licencia, podrás configurar tu consultorio a tu ritmo.</p>
        </aside>
      </div>
    </div>
  </main>
</template>
<script>
import logo from '@/assets/login/med-sync-logo.png';
export default { props: { step: { type: Number, default: 1 } }, data: () => ({ logo }) };
</script>
<style scoped>
.account-flow{min-height:100vh;background:#f3f7f8;color:#17383e;padding:32px 24px 48px;font-family:Inter,Roboto,Arial,sans-serif}
.account-flow__wrap{max-width:1080px;margin:auto}.account-flow__brand{display:flex;align-items:center;gap:22px;margin-bottom:28px}.account-flow__brand img{height:auto;object-fit:contain}.account-flow__brand span{font-size:13px;color:#526970}
.account-flow__grid{display:grid;grid-template-columns:minmax(0,620px) minmax(0,1fr);gap:48px;align-items:start}.account-flow__card{background:white;border:1px solid #dce6e8;border-radius:22px;padding:32px;box-shadow:0 12px 45px #153f4610;min-width:0}.account-flow__aside{padding-top:42px}.account-flow__eyebrow{font-size:11px;letter-spacing:.13em;font-weight:700;color:#30736e}.account-flow__aside h2{font-size:32px;line-height:1.18;letter-spacing:-.025em;margin:14px 0 30px}.account-flow__aside ol{list-style:none;padding:0;margin:0}.account-flow__aside li{display:flex;gap:16px;margin-bottom:25px}.account-flow__aside b{display:flex;flex:none;align-items:center;justify-content:center;width:35px;height:35px;border-radius:50%;background:#e1ecec;color:#42676a;font-size:12px}.account-flow__aside li[aria-current=step] b{background:#176b61;color:white}.account-flow__aside strong{font-size:15px}.account-flow__aside li p{font-size:14px;line-height:1.5;color:#526970;margin:5px 0 0}.account-flow__note{font-size:13px;line-height:1.7;color:#526970;border-top:1px solid #d4e2e3;padding-top:22px;margin-top:30px}
@media(max-width:800px){.account-flow{padding:20px 16px 32px}.account-flow__grid{grid-template-columns:minmax(0,1fr);gap:0;max-width:620px;margin:auto}.account-flow__aside{display:none}.account-flow__brand{max-width:620px;margin:0 auto 20px}.account-flow__brand span{display:none}.account-flow__card{padding:24px}}
@media(max-width:360px){.account-flow{padding:16px 10px 24px}.account-flow__card{padding:20px 16px;border-radius:16px}}
</style>
