  /* ================= sample banner ================= */
  function sampleBanner(){
    if(!hasSampleData()) return "";
    return '<div class="banner">'+ICONS.alert+'<div class="banner-body"><div class="banner-title">Намунавий маълумотлар кўрсатилмоқда</div>Тизим қандай ишлашини кўрсатиш учун мисол маълумотлар қўшилган. Ўз ишингизни бошлаш учун уларни ўчириб, ҳақиқий буюртма ва маҳсулотларингизни киритинг.</div><button class="btn btn-secondary btn-sm" id="clearSampleBtn" style="flex-shrink:0;">Намунани ўчириш</button></div>';
  }
  function wireSampleBanner(root){
    var b = root.querySelector("#clearSampleBtn");
    if(b) b.addEventListener("click", function(){
      openConfirm("Намунавий маълумотларни ўчириш","Барча намунавий буюртма, омбор ва ходим ёзувлари ўчирилади. Давом этасизми?","Ҳа, ўчириш", clearSampleData, true);
    });
  }

