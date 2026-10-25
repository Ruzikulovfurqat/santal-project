  /* ================= renderers: shell ================= */
  function updateAdminToggleLabel(){
    var b = document.getElementById("adminToggleBtn");
    if(!b) return;
    b.innerHTML = STATE.isAdmin ? (ICONS.unlock+'<span style="margin-left:6px;">Админ: очиқ</span>') : (ICONS.lock+'<span style="margin-left:6px;">Админ киритиш</span>');
  }
  function renderNav(){
    var nav = document.getElementById("nav");
    nav.innerHTML = visibleNav().map(function(n){
      return '<button class="nav-item'+(STATE.view===n.id?" active":"")+'" data-nav="'+n.id+'">'+n.icon+'<span>'+n.label+'</span></button>';
    }).join("");
    nav.querySelectorAll("[data-nav]").forEach(function(btn){
      btn.addEventListener("click", function(){
        STATE.view = btn.getAttribute("data-nav");
        if(STATE.view==="dashboard") STATE.dashWs = "";
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sidebarBackdrop").classList.remove("open");
        render();
        window.scrollTo(0,0);
      });
    });
  }

  function setTopbar(title, sub, actionsHtml){
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSub").textContent = sub||"";
    document.getElementById("topbarActions").innerHTML = actionsHtml||"";
  }

