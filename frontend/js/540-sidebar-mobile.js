  /* ================= sidebar mobile toggle ================= */
  document.getElementById("hamburgerBtn").addEventListener("click", function(){
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarBackdrop").classList.toggle("open");
  });
  document.getElementById("sidebarBackdrop").addEventListener("click", function(){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarBackdrop").classList.remove("open");
  });
  /* Фойдаланувчи сўровига кўра (2026-10-01): сидебар остидаги "Админ
     киритиш" тугмаси олиб ташланди — requireAdmin() керак бўлган жойда
     (масалан Админ панелдаги амаллар) ўзи ПИН сўраб, админ ҳуқуқини
     очаверади, шунинг учун алоҳида олдиндан "Админ киритиш" тугмаси
     шарт эмас. "Омборлар → Бошқарув" бўлимидаги "Админ ҳуқуқини очиш"
     тугмаси ўз жойида қолди. */
  var adminToggleBtnEl = document.getElementById("adminToggleBtn");
  if(adminToggleBtnEl) adminToggleBtnEl.addEventListener("click", function(){
    if(STATE.isAdmin){ STATE.isAdmin=false; toast("Админ ҳуқуқи ёпилди"); render(); }
    else openAdminPinModal(function(){ render(); });
  });
  document.getElementById("loginToggleBtn").addEventListener("click", function(){
    var u = currentUser();
    if(!u) return;
    openConfirm("Тизимдан чиқиш", "«"+u.name+"» сифатида тизимдан чиқасизми?", "Ҳа, чиқиш", function(){ logoutCurrentUser(); });
  });

