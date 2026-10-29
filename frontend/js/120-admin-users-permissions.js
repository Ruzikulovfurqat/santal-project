  /* ================= Админ панел: фойдаланувчилар ва менюлар рухсати =================
     Фойдаланувчи сўровига кўра (2026-10-01, иккинчи сўров): бутун дастур
     МАЖБУРИЙ логин девори ортида — сайт манзили очилган заҳоти, ҳеч
     қандай меню/маълумот кўринмасдан, аввал Логин+Парол сўралади.
     Админ ўзининг логин+пароли билан кирса — БАРЧА менюлар кўринади
     (пастда "__ADMIN__" махсус currentUserId қиймати шуни англатади).
     Бошқа (Админ панелда яратилган) фойдаланувчи ўз логин+паролини
     киритса — фақат ўзига белгиланган (allowedMenus) менюлар кўринади. */
  var ADMIN_SESSION_ID = "__ADMIN__";
  /* ЭЪТИБОР: STATE.currentUserId сеансни фойдаланувчининг ЛОГИНИ (login
     майдони) орқали белгилайди, id орқали ЭМАС. Сабаби: янги фойдаланувчи
     dbAdd() орқали яратилганда аввал вақтинчалик (_pending_...) id билан
     яратилади, сервердан ҳақиқий id қайтгач эса attachSnapshot сервердан
     бутун STATE.users рўйхатини ҳақиқий id билан алмаштиради — агар
     сеанс id бўйича белгиланган бўлса, худди шу пайтда фойдаланувчи
     "танилмай" қолиб, мажбурий логин деворига қайтариб юборилар эди.
     Логин эса ҳеч қачон шундай алмашмайди, шунга кўра барқарор калит. */
  function currentUser(){
    if(!STATE.currentUserId) return null;
    if(STATE.currentUserId===ADMIN_SESSION_ID) return {id:ADMIN_SESSION_ID, name:"Админ", role:"Админ"};
    return STATE.users.find(function(u){ return u.login===STATE.currentUserId && !u.cancelled; }) || null;
  }
  /* Кейинчалик қўшилган янги менюлар. Эски фойдаланувчиларнинг
     allowedMenus рўйхатида улар бўлмайди — шу сабабли янги бўлим
     уларга умуман кўринмай қоларди. Шунга кўра: агар фойдаланувчига
     АВВАЛГИ барча менюлар очилган бўлса (яъни тўлиқ рухсат), янги
     менюлар ҳам автоматик очилади. Қисман рухсатли фойдаланувчиларга
     эса — Админ панелдан белгилаб берилади (2026-10-16 тузатиши). */
  var NAV_NEW_IDS = ["hisobot"];
  function visibleNav(){
    var u = currentUser();
    if(!u || u.id===ADMIN_SESSION_ID) return NAV;
    var allowed = (u.allowedMenus||[]).slice();
    var hadFullAccess = NAV.every(function(n){
      return NAV_NEW_IDS.indexOf(n.id)>-1 || allowed.indexOf(n.id)!==-1;
    });
    if(hadFullAccess){
      NAV_NEW_IDS.forEach(function(id){ if(allowed.indexOf(id)===-1) allowed.push(id); });
    }
    return NAV.filter(function(n){ return allowed.indexOf(n.id)!==-1; });
  }
  /* Мажбурий логин девори — модал эмас, бутун саҳифа ўрнини босади ва
     Esc/ташқарига босиш орқали ёпилмайди (openModal()дан фарқли
     равишда), токи логин қилмасдан дастурдан фойдаланиш мумкин бўлмасин. */
  function renderLoginGate(){
    var sidebarEl = document.getElementById("sidebar");
    if(sidebarEl) sidebarEl.style.display = "none";
    var hamburgerEl = document.getElementById("hamburgerBtn");
    if(hamburgerEl) hamburgerEl.style.display = "none";
    document.getElementById("pageTitle").textContent = "Тизимга кириш";
    document.getElementById("pageSub").textContent = "";
    document.getElementById("topbarActions").innerHTML = "";
    var root = document.getElementById("content");
    root.innerHTML = '<div style="max-width:360px;margin:60px auto 0;">'+
      '<div class="card" style="padding:28px 26px;">'+
        '<div style="text-align:center;margin-bottom:18px;">'+
          '<div style="font-weight:800;font-size:17px;">Ишлаб чиқариш бошқарув маркази</div>'+
          '<div class="field-hint" style="margin-top:4px;">Давом этиш учун логин ва паролингизни киритинг</div>'+
        '</div>'+
        '<div class="field"><label>Логин</label><input id="gate-login" autocomplete="username"></div>'+
        '<div class="field" style="margin-bottom:6px;"><label>Парол</label><input id="gate-password" type="password" autocomplete="current-password"></div>'+
        '<button class="btn btn-primary" id="gate-submit" style="width:100%;justify-content:center;margin-top:10px;">Кириш</button>'+
      '</div>'+
    '</div>';
    var loginInput = document.getElementById("gate-login");
    var passInput = document.getElementById("gate-password");
    loginInput.focus();
    var tryLogin = function(){
      var login = loginInput.value.trim();
      var password = passInput.value;
      if(!login || !password){ toast("Логин ва паролни киритинг"); return; }
      if(login===effectiveAdminLogin() && password===effectiveAdminPassword()){
        STATE.currentUserId = ADMIN_SESSION_ID;
        STATE.isAdmin = true;
        try { localStorage.setItem("ishlabChiqarishCurrentUserId", ADMIN_SESSION_ID); } catch(e){}
        toast("Хуш келибсиз, Админ");
        render();
        return;
      }
      var u = STATE.users.find(function(x){ return !x.cancelled && x.login===login && x.password===password; });
      if(!u){ toast("Логин ёки парол нотўғри"); return; }
      STATE.currentUserId = u.login;
      try { localStorage.setItem("ishlabChiqarishCurrentUserId", u.login); } catch(e){}
      var allowed = u.allowedMenus||[];
      if(allowed.indexOf(STATE.view)===-1) STATE.view = allowed[0]||"";
      toast("Хуш келибсиз, "+u.name);
      render();
    };
    document.getElementById("gate-submit").addEventListener("click", tryLogin);
    passInput.addEventListener("keydown", function(e){ if(e.key==="Enter") tryLogin(); });
    loginInput.addEventListener("keydown", function(e){ if(e.key==="Enter") passInput.focus(); });
  }
  function logoutCurrentUser(){
    STATE.currentUserId = "";
    STATE.isAdmin = false;
    try { localStorage.removeItem("ishlabChiqarishCurrentUserId"); } catch(e){}
    STATE.view = "dashboard";
    toast("Тизимдан чиқдингиз");
    render();
  }
  function updateLoginToggleLabel(){
    var b = document.getElementById("loginToggleBtn");
    if(!b) return;
    var u = currentUser();
    if(!u){ b.innerHTML = ""; return; }
    b.innerHTML = ICONS.unlock+'<span style="margin-left:6px;">'+esc(u.name)+' — чиқиш</span>';
  }

