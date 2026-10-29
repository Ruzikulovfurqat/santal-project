  /* ================= router ================= */
  function render(){
    SALE_PAY_CACHE = null;
    var u = currentUser();
    if(!u){ renderLoginGate(); return; }
    /* STATE.isAdmin ҳар доим (саҳифа қайта юкланганда ҳам) чин
       Админ сеансида автоматик "очиқ" бўлиб туриши керак — у қайта
       юклангандан кейин localStorage'дан фақат currentUserId тикланади,
       isAdmin эса янги STATE билан бирга бошидан false'дан бошланади. */
    if(u.id===ADMIN_SESSION_ID) STATE.isAdmin = true;
    var sidebarEl = document.getElementById("sidebar");
    if(sidebarEl) sidebarEl.style.display = "";
    var hamburgerEl = document.getElementById("hamburgerBtn");
    if(hamburgerEl) hamburgerEl.style.display = "";
    renderNav();
    updateAdminToggleLabel();
    updateLoginToggleLabel();
    var allowed = (u.id===ADMIN_SESSION_ID) ? null : (u.allowedMenus||[]);
    if(allowed && allowed.indexOf(STATE.view)===-1) STATE.view = allowed[0]||"";
    var viewFns = { dashboard:viewDashboard, orders:viewOrders, warehouse:viewWarehouse, production:viewProduction, sales:viewSales, kassa:viewKassa, moliya:viewMoliya, hisobot:viewHisobot, reconciliation:viewReconciliation, employees:viewEmployees, adminpanel:viewAdminPanel };
    var fn = viewFns[STATE.view];
    if(allowed && (!fn || allowed.indexOf(STATE.view)===-1)){
      setTopbar("Рухсат йўқ", "", "");
      document.getElementById("content").innerHTML = emptyState("Бирорта менюга рухсат берилмаган", "Админ сизга ҳали бирорта бўлим учун рухсат бермаган. Админ билан боғланинг.");
      return;
    }
    var contentEl = document.getElementById("content");
    /* Фойдаланувчи сўровига кўра (2026-10-17): Касса бўлими ҳам, худди
       Харидор буюртмаси каби, бутун экран кенглигида кўрсатилади —
       амаллар жадвали тор ойначага сиқилиб қолмаслиги учун. */
    if(contentEl) contentEl.classList.toggle("wide-view", STATE.view==="orders" || STATE.view==="warehouse" || STATE.view==="production" || STATE.view==="sales" || STATE.view==="kassa" || STATE.view==="hisobot");
    (fn || viewDashboard)();
  }

