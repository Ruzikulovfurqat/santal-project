  /* ================= клавиатура орқали тезкор амаллар ================= */
  /* Бир бўлимга кирганда, ўша бўлимнинг асосий "яратиш" тугмасини (топбарда
     кўринадиган, масалан "Янги буюртма", "Яратиш", "Цех қўшиш" ва ҳ.к.)
     "+" тугмасини босиш орқали ҳам ишга тушириш мумкин — модал очиқ бўлса
     ёки фокус матн киритиш майдонида бўлса, аралашмайди. */
  function primaryCreateBtn(){
    var ta = document.getElementById("topbarActions");
    return ta ? ta.querySelector(".btn-primary") : null;
  }
  document.addEventListener("keydown", function(e){
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key!=="+" && e.key!=="Insert") return;
    var modalRoot = document.getElementById("modalRoot");
    if(modalRoot && modalRoot.children.length) return;
    var ae = document.activeElement;
    var tag = ae ? ae.tagName : "";
    if(tag==="INPUT" || tag==="TEXTAREA" || tag==="SELECT" || (ae && ae.isContentEditable)) return;
    var btn = primaryCreateBtn();
    if(btn){ e.preventDefault(); btn.click(); }
  });

