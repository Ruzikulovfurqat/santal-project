  /* ================= lookups: suppliers ================= */
  function supplierById(id){ return STATE.suppliers.find(function(x){return x.id===id;}); }
  function supplierName(id){ var s=supplierById(id); return s?s.name:"—"; }
  function supplierPayable(supplierId){
    var base = STATE.receipts.filter(function(r){return !r.cancelled && r.supplierId===supplierId;}).reduce(function(sum,r){return sum+Number(r.payableAmount||0);},0);
    /* Асосий ускуна ва ёрдамчи жиҳоз киримлари ҳам таъминотчига қарз
       ҳосил қилиши мумкин — уларни ҳам шу йиғиндига қўшамиз. */
    var equip = STATE.equipmentReceipts.filter(function(r){return !r.cancelled && r.supplierId===supplierId;}).reduce(function(sum,r){return sum+Number(r.payableAmount||0);},0);
    return base+equip;
  }
  function supplierOverduePayable(supplierId){
    var today = todayISO();
    var base = STATE.receipts.filter(function(r){return !r.cancelled && r.supplierId===supplierId && Number(r.payableAmount||0)>0 && r.dueDate && r.dueDate<today;}).reduce(function(sum,r){return sum+Number(r.payableAmount||0);},0);
    var equip = STATE.equipmentReceipts.filter(function(r){return !r.cancelled && r.supplierId===supplierId && Number(r.payableAmount||0)>0 && r.dueDate && r.dueDate<today;}).reduce(function(sum,r){return sum+Number(r.payableAmount||0);},0);
    return base+equip;
  }
  function totalPayable(){ return STATE.suppliers.reduce(function(sum,s){return sum+supplierPayable(s.id);},0); }
  function totalOverduePayable(){ return STATE.suppliers.reduce(function(sum,s){return sum+supplierOverduePayable(s.id);},0); }
  function resolveSupplierByName(name){
    name = (name||"").trim();
    if(!name) return null;
    return STATE.suppliers.find(function(s){ return (s.name||"").trim().toLowerCase()===name.toLowerCase(); }) || null;
  }

