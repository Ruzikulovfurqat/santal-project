  /* ================= view: production ================= */
  function prodSubnav(active){
    var tabs=[["history","Тарих"],["recipes","Калькуляциялар"],["new-recipe","+ Янги калькуляция"],["lom","Лом (Алюмин)"],["labor","Иш ставкалари"]];
    return '<div class="filter-row" style="margin-bottom:18px;">'+tabs.map(function(t){return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-prodview="'+t[0]+'">'+t[1]+'</button>';}).join("")+
      '<span style="flex:1"></span><button class="btn btn-primary btn-sm" id="produceBtn">'+ICONS.plus+'Ишлаб чиқариш</button></div>';
  }
  function wireProdSubnav(root){
    root.querySelectorAll("[data-prodview]").forEach(function(b){ b.addEventListener("click", function(){ STATE.prodView=b.getAttribute("data-prodview"); render(); }); });
    var pb=root.querySelector("#produceBtn"); if(pb) pb.addEventListener("click", function(){ openProduceModal(null); });
  }

  function viewProduction(){
    if(STATE.prodView==="recipes") return renderProdRecipes();
    if(STATE.prodView==="new-recipe") return renderRecipeNew();
    if(STATE.prodView==="labor") return renderLaborCalcsList();
    if(STATE.prodView==="lom") return renderLomTab();
    return renderProdHistory();
  }

