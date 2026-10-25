  /* ================= toast ================= */
  function toast(msg){
    var root = document.getElementById("toastRoot");
    var t = el('<div class="toast">'+ICONS.check+'<span></span></div>');
    t.querySelector("span").textContent = msg;
    root.appendChild(t);
    setTimeout(function(){ t.style.opacity="0"; t.style.transition="opacity .25s"; setTimeout(function(){ t.remove(); }, 260); }, 2400);
  }

