  /* ================= admin gate ================= */
  function getSettings(){ return STATE.settingsList[0] || {}; }
  function effectivePin(){ return getSettings().adminPin || "0000"; }
  /* "Админ" логин/пароли — 2026-10-01 сўровига кўра, бутун дастур энди
     МАЖБУРИЙ логин девори ортида: бу логин/парол ОРҚАЛИ кирган киши
     ҳамма менюни кўради (пастга қаранг: renderLoginGate/currentUser). */
  function effectiveAdminLogin(){ return getSettings().adminLogin || "admin"; }
  function effectiveAdminPassword(){ return getSettings().adminPassword || "admin0000"; }
  function requireAdmin(fn){ if(STATE.isAdmin){ fn(); return; } openAdminPinModal(fn); }
  function openAdminPinModal(onSuccess){
    var body = '<div class="field"><label>Админ PIN-код</label><input id="admin-pin" type="password" placeholder="****" autocomplete="off"></div>'+
      '<div class="field-hint">Стандарт PIN: 0000 (кейинчалик «Омборлар → Бошқарув» бўлимида ўзгартирилиши мумкин).</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-ok>Тасдиқлаш</button>';
    var m = openModal("Админ тасдиғи", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var input = m.querySelector("#admin-pin");
    input.focus();
    var tryOk = function(){
      if(input.value===effectivePin()){ STATE.isAdmin=true; closeModal(); toast("Админ ҳуқуқи очилди (шу сеанс учун)"); onSuccess(); }
      else toast("PIN нотўғри");
    };
    m.querySelector("[data-ok]").addEventListener("click", tryOk);
    input.addEventListener("keydown", function(e){ if(e.key==="Enter") tryOk(); });
  }

