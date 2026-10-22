import fs from 'fs';
import * as topo from 'topojson-client';
import {geoNaturalEarth1, geoPath} from 'd3-geo';
const w=JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const fc=topo.feature(w,w.objects.countries);
fc.features=fc.features.filter(f=>f.id!=='010');
const proj=geoNaturalEarth1().fitExtent([[40,70],[1880,1030]],fc);
const path=geoPath(proj); path.digits?.(1);
const EZ=['040','056','191','196','233','246','250','276','300','372','380','428','440','442','470','528','620','703','705','724'];
const out={countries:[],labels:{}};
for(const f of fc.features){ out.countries.push({id:f.id,name:f.properties.name,ez:EZ.includes(f.id),d:path(f)}); }
const L={NZ:[172,-41.5],AU:[134,-25],EU:[8,48],US:[-99,39],JP:[138.5,36.5],ZA:[24,-29.5],NO:[11,63],CN:[104,35],KR:[127.8,36.4]};
for(const k in L) out.labels[k]=proj(L[k]);
fs.writeFileSync('map.json',JSON.stringify(out));
console.log(out.countries.length, (fs.statSync('map.json').size/1024|0)+'KB', out.labels);