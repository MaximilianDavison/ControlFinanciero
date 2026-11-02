/* Datos FICTICIOS de demostración (espejo de productos/diagnostico-financiero-express/demo/movimientos_demo.csv).
   Ningún dato corresponde a una persona o empresa real. */
window.DEMO = {
  periodo: "octubre de 2026", moneda: "CLP",
  movs: [
    {f:"2026-10-03",t:"Ingreso",d:"Proyecto identidad visual cliente A",m:850000},
    {f:"2026-10-10",t:"Ingreso",d:"Proyecto sitio web cliente B",m:620000},
    {f:"2026-10-15",t:"Ingreso",d:"Mantención mensual cliente C",m:300000,rec:true},
    {f:"2026-10-05",t:"Inversión",d:"Curso online de especialización",m:150000},
    {f:"2026-10-06",t:"Costo",d:"Subcontrato de ilustración",m:280000},
    {f:"2026-10-08",t:"Costo",d:"Hosting y dominios",m:45000,fijo:true},
    {f:"2026-10-08",t:"Costo",d:"Suscripciones de software",m:60000,fijo:true,susc:true},
    {f:"2026-10-02",t:"Gasto",d:"Arriendo coworking",m:180000,fijo:true},
    {f:"2026-10-20",t:"Gasto",d:"Contador",m:70000,fijo:true},
    {f:"2026-10-12",t:"Gasto",d:"Transporte",m:55000},
    {f:"2026-10-14",t:"Gasto",d:"Alimentación",m:120000},
    {f:"2026-10-09",t:"Gasto",d:"Internet y telefonía",m:38000,fijo:true},
    {f:"2026-10-25",t:"Gasto",d:"Comisiones bancarias",m:12000},
    {f:"2026-10-28",t:"Gasto",d:"Sin clasificar (varios)",m:65000,sinc:true}
  ]
};
(function(D){
  var sum=function(f){return D.movs.filter(f).reduce(function(a,x){return a+x.m},0)};
  D.tot={ing:sum(function(x){return x.t==="Ingreso"}),inv:sum(function(x){return x.t==="Inversión"}),cos:sum(function(x){return x.t==="Costo"}),gas:sum(function(x){return x.t==="Gasto"})};
  D.tot.sal=D.tot.ing-D.tot.inv-D.tot.cos-D.tot.gas;
  D.fmt=function(n){return n.toLocaleString("es-CL")};
  D.pct=function(a,b){return (a/b*100).toLocaleString("es-CL",{minimumFractionDigits:1,maximumFractionDigits:1})+"%"};
})(window.DEMO);
