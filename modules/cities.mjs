// City-centre coordinates for the six existing quick-selection buttons.
export const quickCities=[
{name:'西安',region:'陕西',country:'中国',latitude:34.2658,longitude:108.9541,timezone:'Asia/Shanghai',aliases:["Xi'an",'Xian']},
{name:'北京',region:'北京',country:'中国',latitude:39.9042,longitude:116.4074,timezone:'Asia/Shanghai',aliases:['Beijing']},
{name:'上海',region:'上海',country:'中国',latitude:31.2304,longitude:121.4737,timezone:'Asia/Shanghai',aliases:['Shanghai']},
{name:'广州',region:'广东',country:'中国',latitude:23.1291,longitude:113.2644,timezone:'Asia/Shanghai',aliases:['Guangzhou']},
{name:'深圳',region:'广东',country:'中国',latitude:22.5431,longitude:114.0579,timezone:'Asia/Shanghai',aliases:['Shenzhen']},
{name:'成都',region:'四川',country:'中国',latitude:30.5728,longitude:104.0668,timezone:'Asia/Shanghai',aliases:['Chengdu']}
];
export function knownCities(query){const q=query.trim().replace(/市$/,'').toLowerCase();return quickCities.filter(c=>c.name===q||c.aliases.some(a=>a.toLowerCase()===q)).map(({aliases,...c})=>c)}
