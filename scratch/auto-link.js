const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('/home/johnatan/Kora-os/.env.local', 'utf8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') || l.startsWith('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')).split('=')[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching channel listings...');
  const { data: channelIdData } = await supabase.from('channels').select('id').eq('name', 'Mercado Libre').single();
  let channelId = channelIdData ? channelIdData.id : null;
  if (!channelId) {
     const { data: rawListings } = await supabase.from('channel_listings').select('channel_id').limit(1);
     channelId = rawListings[0].channel_id;
  }

  const { data: listings, error: lErr } = await supabase
    .from('channel_listings')
    .select('id, external_id, channel_sku, title, source_data')
    .eq('channel_id', channelId)
    .is('variant_id', null);

  if (lErr) throw lErr;

  console.log(`Found ${listings.length} orphan listings. Processing ML SKUs...`);

  // Fix missing channel_sku by extracting from SELLER_SKU attribute
  const updates = [];
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    if (!l.channel_sku) {
       const sd = typeof l.source_data === 'string' ? JSON.parse(l.source_data) : l.source_data;
       if (sd && sd.attributes) {
          const skuAttr = sd.attributes.find(a => a.id === 'SELLER_SKU');
          if (skuAttr && skuAttr.value_name) {
             l.channel_sku = skuAttr.value_name;
             // Update database asynchronously
             updates.push(
               supabase.from('channel_listings').update({ channel_sku: l.channel_sku }).eq('id', l.id)
             );
          }
       }
    }
  }
  
  if (updates.length > 0) {
     console.log(`Found ${updates.length} SKUs in attributes. Updating DB...`);
     await Promise.all(updates);
  }

  console.log(`Fetching KORA variants...`);
  const { data: variants, error: vErr } = await supabase.from('product_variants').select('id, sku');
  if (vErr) throw vErr;

  const variantMap = new Map();
  variants.forEach(v => {
    if (v.sku) variantMap.set(v.sku.toLowerCase(), { id: v.id, sku: v.sku });
  });

  let exactMatches = 0;
  let noMatches = 0;
  let missingSku = 0;

  let mdContent = `# Auditoría de Conciliación Masiva (ML -> KORA)

**Resumen:**
- Publicaciones analizadas: ${listings.length}
`;

  let tableRows = `| Listing ID (KORA) | ML Item ID | ML SKU (channel_sku) | KORA SKU (variant_sku) | Confianza | Acción Recomendada |\n|---|---|---|---|---|---|\n`;

  for (const l of listings) {
    if (!l.channel_sku) {
      missingSku++;
      tableRows += `| \`${l.id.substring(0,8)}...\` | ${l.external_id} | *Vacío* | - | 🔴 Baja | Sin SKU en ML. Vincular manual. |\n`;
      continue;
    }

    const matchInfo = variantMap.get(l.channel_sku.toLowerCase());
    if (matchInfo) {
      exactMatches++;
      tableRows += `| \`${l.id.substring(0,8)}...\` | ${l.external_id} | ${l.channel_sku} | ${matchInfo.sku} | 🟢 Alta (Exacta) | Auto-enlazar |\n`;
    } else {
      noMatches++;
      tableRows += `| \`${l.id.substring(0,8)}...\` | ${l.external_id} | ${l.channel_sku} | - | 🔴 Baja | SKU de ML no existe en KORA |\n`;
    }
  }

  mdContent += `- Coincidencias Exactas (Auto-Enlace Posible): **${exactMatches}**
- Sin Coincidencia (Requiere Creación en KORA): **${noMatches}**
- Publicaciones sin SKU en ML: **${missingSku}**
- Eficiencia del enlace automático: **${((exactMatches / listings.length) * 100).toFixed(1)}%**

## Detalle de Auditoría (Top 100)
${tableRows.split('\n').slice(0, 103).join('\n')}
... (truncado por longitud)
`;

  const artifactPath = path.join('/home/johnatan/.gemini/antigravity-ide/brain/722a799d-1a80-46e7-9ac7-85c21471d83e', 'auto_reconciliation_audit.md');
  fs.writeFileSync(artifactPath, mdContent);
  console.log(`Audit saved to ${artifactPath}`);
}

run().catch(console.error);
