import { DEVELOPMENTS_DATA } from './developments.js';

// ==========================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================================
let currentDev = DEVELOPMENTS_DATA[9]; // Padrão: Bal Harbour (40/60)
let extraLines = []; // Linhas adicionais de negociação personalizadas
let paymentChart = null;

// ==========================================================================
// FORMATAÇÃO E HELPERS MONETÁRIOS (MÁSCARAS BRL)
// ==========================================================================
export function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
}

export function formatPct(val) {
  return (val || 0).toFixed(2) + '%';
}

export function formatNumberToBRLInput(val) {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseBRLInputToNumber(str) {
  if (!str) return 0;
  const cleanDigits = String(str).replace(/\D/g, '');
  if (!cleanDigits) return 0;
  return parseInt(cleanDigits, 10) / 100;
}

export function getTodayYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function calculateMonthsDiff(startDateStr, endDateStr) {
  if (!endDateStr) return 36;
  const [sy, sm] = startDateStr.split('-').map(Number);
  const [ey, em] = endDateStr.split('-').map(Number);
  const diff = (ey - sy) * 12 + (em - sm);
  return diff > 0 ? diff : 1;
}

export function formatMonthYear(ymStr) {
  if (!ymStr) return 'Pronto para morar';
  const [year, month] = ymStr.split('-').map(Number);
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${monthNames[month - 1]}/${year}`;
}

// ==========================================================================
// POPULAR SELECT DE EMPREENDIMENTOS
// ==========================================================================
function populateDevelopmentsSelect() {
  const select = document.getElementById('devSelect');
  if (!select) return;

  select.innerHTML = '';
  DEVELOPMENTS_DATA.forEach(dev => {
    const opt = document.createElement('option');
    opt.value = dev.id;
    opt.innerText = `${dev.name} (${dev.city} — ${dev.deliveryLabel})`;
    if (dev.id === currentDev.id) opt.selected = true;
    select.appendChild(opt);
  });
}

// ==========================================================================
// RENDERIZAÇÃO DO CARD SUPERIOR DO EMPREENDIMENTO
// ==========================================================================
function renderDevelopmentCard(dev) {
  document.getElementById('devCardName').innerText = dev.name;
  document.getElementById('devCardAddress').innerText = dev.address;
  document.getElementById('devCardBeach').innerText = dev.distanceSea;
  document.getElementById('devCardFloors').innerText = dev.floors ? `${dev.floors} Pavimentos` : 'Sob Consulta';
  document.getElementById('devCardLeisure').innerText = dev.leisureArea;
  document.getElementById('devCardUnits').innerText = dev.availableUnits;
  document.getElementById('devCardLimitFlow').innerText = dev.limitFlow;

  const statusBadge = document.getElementById('devCardStatusBadge');
  if (dev.status === 'pronto') {
    statusBadge.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5';
    statusBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i> Pronto para Morar';
  } else {
    statusBadge.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#ffb700]/15 text-[#ffb700] border border-[#ffb700]/40 flex items-center gap-1.5';
    statusBadge.innerHTML = `<i class="fa-solid fa-person-digging text-[#ffb700]"></i> Em Obras • Entrega ${dev.deliveryLabel}`;
  }

  // Atualiza cabeçalho do PDF
  document.getElementById('printDevName').innerText = dev.name;
  document.getElementById('printDevAddress').innerText = dev.address;
  document.getElementById('printDevDelivery').innerText = dev.deliveryLabel;
  document.getElementById('printDevBeach').innerText = dev.distanceSea;
  document.getElementById('printDevFloors').innerText = dev.floors ? `${dev.floors} Pav.` : '-';
  document.getElementById('printDevLeisure').innerText = dev.leisureArea;
  document.getElementById('printDevFlow').innerText = dev.limitFlow;

  // Atualiza o indicador padrão de chaves do formulário
  document.getElementById('keysStandardLabel').innerText = `${dev.standardKeysPct.toFixed(2)}%`;
}

// ==========================================================================
// SELEÇÃO DE EMPREENDIMENTO E APLICAÇÃO DOS PADRÕES
// ==========================================================================
export function selectDevelopment(devId) {
  const found = DEVELOPMENTS_DATA.find(d => d.id === devId);
  if (!found) return;

  currentDev = found;
  renderDevelopmentCard(currentDev);

  // Preenche dados padrão no formulário com máscara BRL
  document.getElementById('propTitle').value = `${currentDev.name} - Unidade`;
  document.getElementById('unitPrice').value = formatNumberToBRLInput(currentDev.defaultUnitPrice);

  // Data base da proposta (hoje)
  const baseDate = document.getElementById('proposalBaseDate').value || getTodayYearMonth();
  document.getElementById('proposalBaseDate').value = baseDate;

  // Data de entrega
  if (currentDev.deliveryDate) {
    document.getElementById('deliveryDate').value = currentDev.deliveryDate;
    document.getElementById('deliveryDateGroup').style.display = 'block';
  } else {
    document.getElementById('deliveryDate').value = '';
    document.getElementById('deliveryDateGroup').style.display = 'none';
  }

  // Cálculo automático do número de parcelas mensais baseado na data
  let calcCount = currentDev.defaultMonthlyCount;
  if (currentDev.deliveryDate) {
    calcCount = calculateMonthsDiff(baseDate, currentDev.deliveryDate);
  }
  document.getElementById('monthlyCountInput').value = calcCount;

  // Carrega valores e percentuais padrão
  const price = currentDev.defaultUnitPrice;
  const entryPct = currentDev.defaultEntryPct;
  const entryVal = (price * (entryPct / 100));
  
  document.getElementById('entryValueInput').value = formatNumberToBRLInput(entryVal);
  document.getElementById('entryPctInput').value = entryPct.toFixed(2);

  // Trava de 10% mínimo: se padrão for menor que 10, ajusta range.min para 0
  const entryRange = document.getElementById('entryPctRange');
  if (entryPct < 10) {
    entryRange.min = '0';
    entryRange.value = entryPct;
    document.getElementById('entryMinWarning').classList.remove('hidden');
  } else {
    entryRange.min = '10';
    entryRange.value = entryPct;
    document.getElementById('entryMinWarning').classList.add('hidden');
  }

  document.getElementById('monthlyPctRange').value = currentDev.defaultMonthlyPct;
  document.getElementById('monthlyPctInput').value = currentDev.defaultMonthlyPct.toFixed(1);

  document.getElementById('boostPctRange').value = currentDev.defaultBoostPct;
  document.getElementById('boostPctInput').value = currentDev.defaultBoostPct.toFixed(1);
  document.getElementById('boostCountInput').value = currentDev.defaultBoostCount;
  document.getElementById('keysPctInput').value = currentDev.standardKeysPct.toFixed(1);

  const entryCountInput = document.getElementById('entryCountInput');
  if (entryCountInput) entryCountInput.value = '1';

  renderExtraLinesInputs();
  calculate();
}

// ==========================================================================
// GERENCIAMENTO DE LINHAS DE NEGOCIAÇÃO ADICIONAIS
// ==========================================================================
export function addExtraLine() {
  const lineId = 'line_' + Date.now();
  const defaultNames = [
    "Parcela Intermediária",
    "Permuta (Veículo / Imóvel)",
    "Ato 60 Dias",
    "Reforço Semestral",
    "Bônus Comercial"
  ];
  const suggestedName = defaultNames[extraLines.length % defaultNames.length];

  extraLines.push({
    id: lineId,
    title: suggestedName,
    pct: 5.0,
    count: 1,
    details: "A combinar"
  });

  renderExtraLinesInputs();
  calculate();
}

export function removeExtraLine(id) {
  extraLines = extraLines.filter(line => line.id !== id);
  renderExtraLinesInputs();
  calculate();
}

export function updateExtraLine(id, field, value) {
  const line = extraLines.find(l => l.id === id);
  if (!line) return;

  if (field === 'pct') {
    line.pct = Math.max(0, parseFloat(value) || 0);
  } else if (field === 'count') {
    line.count = Math.max(1, parseInt(value) || 1);
  } else if (field === 'title') {
    line.title = value;
  } else if (field === 'details') {
    line.details = value;
  }

  calculate();
}

function renderExtraLinesInputs() {
  const container = document.getElementById('extraLinesContainer');
  if (!container) return;

  if (extraLines.length === 0) {
    container.innerHTML = `
      <div class="text-center py-3 border border-dashed border-slate-700/80 rounded-xl bg-slate-900/40">
        <p class="text-xs text-slate-400">Nenhuma linha adicional ativa.</p>
        <p class="text-[10px] text-slate-500 mt-0.5">Adicione permutas, parcelas intermediárias, semestrais ou atos secundários.</p>
      </div>
    `;
    return;
  }

  const unitPrice = parseBRLInputToNumber(document.getElementById('unitPrice').value);

  container.innerHTML = extraLines.map((line) => {
    const lineTotal = (unitPrice * (line.pct / 100));
    return `
      <div class="fade-in-item bg-[#181d24] border border-purple-500/30 rounded-xl p-3 space-y-2 relative">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-grow">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            <input type="text" value="${line.title}" 
              oninput="window.updateExtraLine('${line.id}', 'title', this.value)"
              placeholder="Descrição da Linha" 
              class="w-full bg-[#111418] border border-[#2d3644] rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-purple-400">
          </div>
          <button type="button" onclick="window.removeExtraLine('${line.id}')" title="Excluir Linha" class="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-[#111418] transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>

        <div class="grid grid-cols-12 gap-2 items-center text-xs">
          <div class="col-span-4">
            <label class="text-[10px] text-slate-400 block">% do Imóvel</label>
            <div class="flex items-center gap-1">
              <input type="number" step="0.1" min="0" max="80" value="${line.pct.toFixed(2)}"
                oninput="window.updateExtraLine('${line.id}', 'pct', this.value)"
                class="w-full bg-[#111418] border border-[#2d3644] rounded px-2 py-1 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-400">
              <span class="text-slate-400 text-[10px]">%</span>
            </div>
          </div>

          <div class="col-span-3">
            <label class="text-[10px] text-slate-400 block">Qtd (Vezes)</label>
            <input type="number" min="1" max="60" value="${line.count}"
              oninput="window.updateExtraLine('${line.id}', 'count', this.value)"
              class="w-full bg-[#111418] border border-[#2d3644] rounded px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-purple-400">
          </div>

          <div class="col-span-5">
            <label class="text-[10px] text-slate-400 block text-right">Subtotal</label>
            <div class="w-full bg-[#111418] border border-[#2d3644] rounded px-2 py-1 text-xs text-purple-300 text-right font-mono font-bold">
              ${formatCurrency(lineTotal)}
            </div>
          </div>
        </div>

        <div>
          <input type="text" value="${line.details}"
            oninput="window.updateExtraLine('${line.id}', 'details', this.value)"
            placeholder="Vencimento / Observações (ex: Dez/2027 ou Carro na entrega)"
            class="w-full bg-[#111418] border border-[#2d3644] rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-400">
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// ATUALIZAÇÃO DINÂMICA DE LIMITES (TRAVA DE 100% INVIOLÁVEL)
// ==========================================================================
function updateDynamicSliderLimits(entryPct, monthlyPct, boostPct, extraLinesTotalPct) {
  const entryRange = document.getElementById('entryPctRange');
  const monthlyRange = document.getElementById('monthlyPctRange');
  const boostRange = document.getElementById('boostPctRange');

  // Máximo permitido para cada controle sem que a soma passe de 100%
  const maxForMonthly = Math.max(0, 100 - entryPct - boostPct - extraLinesTotalPct);
  const maxForBoost = Math.max(0, 100 - entryPct - monthlyPct - extraLinesTotalPct);
  const maxForEntry = Math.max(0, 100 - monthlyPct - boostPct - extraLinesTotalPct);

  if (monthlyRange) monthlyRange.max = Math.min(80, maxForMonthly);
  if (boostRange) boostRange.max = Math.min(60, maxForBoost);
  if (entryRange) entryRange.max = Math.min(60, maxForEntry);
}

// ==========================================================================
// MOTOR DE CÁLCULO E SINCRONIZAÇÃO
// ==========================================================================
export function calculate() {
  const propTitle = document.getElementById('propTitle').value || currentDev.name;
  const clientName = document.getElementById('clientName').value || 'Cliente Especial';
  const consultantName = document.getElementById('consultantName').value || 'Consultor Vetter';
  
  // 1. Leitura de Preço e Entrada
  const unitPrice = parseBRLInputToNumber(document.getElementById('unitPrice').value);
  let entryVal = parseBRLInputToNumber(document.getElementById('entryValueInput').value);
  let entryPct = unitPrice > 0 ? (entryVal / unitPrice) * 100 : 0;

  const entryCount = Math.max(1, parseInt(document.getElementById('entryCountInput')?.value) || 1);
  const entryUnit = entryCount > 0 ? entryVal / entryCount : entryVal;

  const entryUnitDisplay = document.getElementById('entryUnitDisplay');
  if (entryUnitDisplay) {
    if (entryCount === 1) {
      entryUnitDisplay.innerText = `1x de ${formatCurrency(entryVal)} (À vista)`;
    } else {
      entryUnitDisplay.innerText = `${entryCount}x de ${formatCurrency(entryUnit)}`;
    }
  }

  // 2. Linhas Extras
  let extraLinesTotalPct = 0;
  let extraLinesTotalVal = 0;
  extraLines.forEach(line => {
    extraLinesTotalPct += line.pct;
    extraLinesTotalVal += (unitPrice * (line.pct / 100));
  });

  // 3. Leitura e Limites de Mensais e Balões
  let monthlyPct = parseFloat(document.getElementById('monthlyPctRange').value) || 0;
  let monthlyCount = parseInt(document.getElementById('monthlyCountInput').value) || 1;

  let boostPct = parseFloat(document.getElementById('boostPctRange').value) || 0;
  let boostCount = parseInt(document.getElementById('boostCountInput').value) || 0;

  // Garante que Entrada + Mensais + Balões + Extras não passem de 100%
  if (entryPct + monthlyPct + boostPct + extraLinesTotalPct > 100) {
    const overflow = (entryPct + monthlyPct + boostPct + extraLinesTotalPct) - 100;
    monthlyPct = Math.max(0, monthlyPct - overflow);
    document.getElementById('monthlyPctRange').value = monthlyPct;
    document.getElementById('monthlyPctInput').value = monthlyPct.toFixed(1);
  }

  // Atualiza limites dinâmicos dos sliders
  updateDynamicSliderLimits(entryPct, monthlyPct, boostPct, extraLinesTotalPct);

  // 4. Saldo Residual de Chaves (Garante sempre fechamento exato em 100%)
  const keysPct = Math.max(0, 100 - entryPct - monthlyPct - boostPct - extraLinesTotalPct);
  const keysValue = (unitPrice * keysPct) / 100;

  document.getElementById('keysPctInput').value = keysPct.toFixed(1);
  document.getElementById('keysValueDisplay').innerText = formatCurrency(keysValue);

  // 5. Totais Mensais e Balões em R$
  const monthlyTotal = (unitPrice * monthlyPct) / 100;
  const monthlyUnit = monthlyCount > 0 ? monthlyTotal / monthlyCount : 0;
  document.getElementById('monthlyTotalDisplay').value = formatCurrency(monthlyTotal);

  const boostTotal = (unitPrice * boostPct) / 100;
  const boostUnit = boostCount > 0 ? boostTotal / boostCount : 0;
  document.getElementById('boostTotalDisplay').value = formatCurrency(boostTotal);

  const deliveryDateVal = document.getElementById('deliveryDate').value;

  // 6. ANÁLISE DE CONFORMIDADE COM O FLUXO DE TABELA VETTER
  const isKeysAboveTable = currentDev.status !== 'pronto' && (keysPct > currentDev.standardKeysPct + 0.05);
  const isEntryBelowMin = currentDev.status !== 'pronto' && (entryPct < 9.99);

  // Atualização do Banner de Conformidade e Mudança de Cor
  const complianceBanner = document.getElementById('proposalComplianceBanner');
  const complianceIconContainer = document.getElementById('complianceIconContainer');
  const complianceIcon = document.getElementById('complianceIcon');
  const complianceTitle = document.getElementById('complianceTitle');
  const complianceDesc = document.getElementById('complianceDesc');
  const complianceBadge = document.getElementById('complianceBadge');

  const cardKeysContainer = document.getElementById('cardKeysContainer');
  const cardKeysStatusIndicator = document.getElementById('cardKeysStatusIndicator');
  const printComplianceStamp = document.getElementById('printComplianceStamp');

  if (isKeysAboveTable) {
    // ALERTA: Chaves acima do padrão de tabela (Requer Aprovação)
    complianceBanner.className = 'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg bg-amber-500/15 border-[#ffb700] text-[#ffb700]';
    complianceIconContainer.className = 'w-9 h-9 rounded-xl bg-[#ffb700]/20 text-[#ffb700] flex items-center justify-center text-lg flex-shrink-0 animate-pulse';
    complianceIcon.className = 'fa-solid fa-triangle-exclamation';
    complianceTitle.innerText = 'Negociação Especial — Sujeita à Aprovação da Gerência Comercial';
    complianceDesc.innerText = `O saldo de chaves (${keysPct.toFixed(2)}%) está acima do limite padrão de tabela (${currentDev.standardKeysPct.toFixed(0)}%). O fluxo de obra foi reduzido.`;
    complianceBadge.className = 'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider border border-[#ffb700] bg-[#ffb700] text-slate-950';
    complianceBadge.innerText = 'REQUER APROVAÇÃO';

    // Muda a cor do Card das Chaves para Destaque/Alerta
    cardKeysContainer.className = 'p-3 rounded-xl border border-[#ffb700] bg-[#ffb700]/15 text-[#ffb700] shadow-lg shadow-[#ffb700]/10 transition-all';
    cardKeysStatusIndicator.classList.remove('hidden');
    cardKeysStatusIndicator.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ffb700] text-slate-950';
    cardKeysStatusIndicator.innerText = `Acima Tabela (${currentDev.standardKeysPct}%)`;

    // Carimbo no PDF
    if (printComplianceStamp) {
      printComplianceStamp.className = 'font-bold px-2.5 py-0.5 rounded border border-amber-600 bg-amber-50 text-amber-900';
      printComplianceStamp.innerText = `⚠️ PROPOSTA ESPECIAL — SUJEITA À APROVAÇÃO DA GERÊNCIA (CHAVES ${keysPct.toFixed(1)}% / LIMITE ${currentDev.standardKeysPct}%)`;
    }
  } else if (isEntryBelowMin) {
    // ALERTA: Entrada abaixo do mínimo de 10%
    complianceBanner.className = 'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg bg-amber-500/15 border-[#ffb700] text-[#ffb700]';
    complianceIconContainer.className = 'w-9 h-9 rounded-xl bg-[#ffb700]/20 text-[#ffb700] flex items-center justify-center text-lg flex-shrink-0';
    complianceIcon.className = 'fa-solid fa-triangle-exclamation';
    complianceTitle.innerText = 'Negociação Especial — Entrada Flexibilizada';
    complianceDesc.innerText = `Entrada (${entryPct.toFixed(2)}%) abaixo do padrão mínimo regulamentar de 10%. Requer validação comercial.`;
    complianceBadge.className = 'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider border border-[#ffb700] bg-[#ffb700] text-slate-950';
    complianceBadge.innerText = 'REQUER APROVAÇÃO';

    cardKeysContainer.className = 'bg-[#111418] p-3 rounded-xl border border-[#2d3644] transition-all';
    cardKeysStatusIndicator.classList.add('hidden');

    if (printComplianceStamp) {
      printComplianceStamp.className = 'font-bold px-2.5 py-0.5 rounded border border-amber-600 bg-amber-50 text-amber-900';
      printComplianceStamp.innerText = `⚠️ PROPOSTA ESPECIAL — ENTRADA FLEXIBILIZADA (${entryPct.toFixed(1)}% < 10%)`;
    }
  } else {
    // CONFORME: Dentro das regras oficiais
    complianceBanner.className = 'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
    complianceIconContainer.className = 'w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg flex-shrink-0';
    complianceIcon.className = 'fa-solid fa-circle-check';
    complianceTitle.innerText = `Proposta em Conformidade com a Tabela Oficial (${currentDev.limitFlow})`;
    complianceDesc.innerText = 'Condições comerciais dentro da política padrão aprovada pela Vetter Empreendimentos.';
    complianceBadge.className = 'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider border border-emerald-500/40 bg-emerald-500/20 text-emerald-300';
    complianceBadge.innerText = 'APROVADA';

    cardKeysContainer.className = 'bg-[#111418] p-3 rounded-xl border border-[#2d3644] transition-all';
    cardKeysStatusIndicator.classList.add('hidden');

    if (printComplianceStamp) {
      printComplianceStamp.className = 'font-bold px-2.5 py-0.5 rounded border border-emerald-500 bg-emerald-50 text-emerald-900';
      printComplianceStamp.innerText = `✅ PROPOSTA REGULAR — EM CONFORMIDADE COM A TABELA OFICIAL (${currentDev.limitFlow})`;
    }
  }

  // 7. Cabeçalho da Proposta e Visualização
  document.getElementById('outPropTitle').innerText = propTitle;
  document.getElementById('outClientName').innerText = clientName;
  document.getElementById('outConsultantName').innerText = consultantName;
  document.getElementById('outUnitPrice').innerText = formatCurrency(unitPrice);

  // Cards de Resumo
  if (entryCount > 1) {
    document.getElementById('cardEntry').innerText = formatCurrency(entryUnit);
    document.getElementById('cardEntrySub').innerText = `${entryCount}x de ${formatCurrency(entryUnit)} (${formatPct(entryPct)})`;
  } else {
    document.getElementById('cardEntry').innerText = formatCurrency(entryVal);
    document.getElementById('cardEntrySub').innerText = `${formatPct(entryPct)} à vista`;
  }

  document.getElementById('cardMonthlyUnit').innerText = formatCurrency(monthlyUnit);
  document.getElementById('cardMonthlySub').innerText = `${monthlyCount}x de ${formatCurrency(monthlyUnit)}`;

  document.getElementById('cardBoostUnit').innerText = formatCurrency(boostUnit);
  document.getElementById('cardBoostSub').innerText = boostCount > 0 ? `${boostCount}x balões` : 'Sem balões';

  document.getElementById('cardKeys').innerText = formatCurrency(keysValue);
  document.getElementById('cardKeysSub').innerText = `${formatPct(keysPct)} final`;

  // Card para Linhas Extras se houver
  const extraMetricCard = document.getElementById('cardExtraMetric');
  if (extraLines.length > 0) {
    extraMetricCard.classList.remove('hidden');
    document.getElementById('cardExtraVal').innerText = formatCurrency(extraLinesTotalVal);
    document.getElementById('cardExtraSub').innerText = `${extraLines.length} item(ns) adicionais (${formatPct(extraLinesTotalPct)})`;
  } else {
    extraMetricCard.classList.add('hidden');
  }

  // 8. Renderizar Tabela Discriminativa de Fluxo
  renderFlowTable({
    unitPrice,
    entryVal,
    entryPct,
    entryCount,
    entryUnit,
    monthlyCount,
    monthlyPct,
    monthlyUnit,
    monthlyTotal,
    boostCount,
    boostPct,
    boostUnit,
    boostTotal,
    deliveryDateVal,
    keysPct,
    keysValue,
    extraLines
  });

  // 9. Atualizar Gráfico Doughnut Chart.js
  updateChartData({
    entryPct,
    monthlyPct,
    boostPct,
    extraLines,
    keysPct
  });
}

// ==========================================================================
// RENDERIZAR TABELA DISCRIMINATIVA
// ==========================================================================
function renderFlowTable(data) {
  const tbody = document.getElementById('flowTableBody');
  if (!tbody) return;

  let deliveryText = '';
  if (currentDev.status === 'pronto') {
    deliveryText = '<span class="text-emerald-400 font-semibold">(Pronto / Imediata)</span>';
  } else if (data.deliveryDateVal) {
    deliveryText = `<span class="text-slate-400">(${formatMonthYear(data.deliveryDateVal)})</span>`;
  }

  let html = `
    <!-- 1. Entrada -->
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <div>
            <span>Entrada / Ato ${data.entryCount > 1 ? `(Parcelada em ${data.entryCount}x)` : 'Inicial'}</span>
            ${data.entryCount > 1 ? `<span class="block text-[10px] text-slate-400">Parcelamento do sinal</span>` : ''}
          </div>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">${data.entryCount}x</td>
      <td class="text-center font-mono font-semibold text-emerald-400">${formatPct(data.entryPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.entryUnit)}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.entryVal)}</td>
    </tr>

    <!-- 2. Mensais -->
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#ffb700]"></span>
          <span>Parcelas Mensais (Fluxo de Obra)</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">${data.monthlyCount}x</td>
      <td class="text-center font-mono font-semibold text-[#ffb700]">${formatPct(data.monthlyPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.monthlyUnit)}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.monthlyTotal)}</td>
    </tr>

    <!-- 3. Reforços Anuais -->
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <span>Reforços Anuais (Balões)</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">${data.boostCount}x</td>
      <td class="text-center font-mono font-semibold text-sky-400">${formatPct(data.boostPct)}</td>
      <td class="text-right font-mono text-slate-300">${data.boostCount > 0 ? formatCurrency(data.boostUnit) : '-'}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.boostTotal)}</td>
    </tr>
  `;

  // Linhas Adicionais de Negociação
  data.extraLines.forEach((line) => {
    const lineTotal = (data.unitPrice * (line.pct / 100));
    const lineUnit = line.count > 0 ? lineTotal / line.count : 0;
    html += `
      <tr class="bg-purple-950/20">
        <td class="py-2.5 px-3 font-medium text-slate-200">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <div>
              <span class="text-purple-300 font-semibold">${line.title || 'Negociação Extra'}</span>
              ${line.details ? `<span class="block text-[10px] text-slate-400">${line.details}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="text-center font-mono text-slate-400">${line.count}x</td>
        <td class="text-center font-mono font-semibold text-purple-400">${formatPct(line.pct)}</td>
        <td class="text-right font-mono text-slate-300">${formatCurrency(lineUnit)}</td>
        <td class="text-right font-mono font-bold text-purple-300">${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  });

  // Chaves / Saldo Final
  html += `
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#ffb700]"></span>
          <span>Chaves / Saldo Final ${deliveryText}</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">1x</td>
      <td class="text-center font-mono font-semibold text-[#ffb700]">${formatPct(data.keysPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.keysValue)}</td>
      <td class="text-right font-mono font-bold text-[#ffb700]">${formatCurrency(data.keysValue)}</td>
    </tr>
  `;

  tbody.innerHTML = html;

  const totalCalculated = data.entryVal + data.monthlyTotal + data.boostTotal + 
    data.extraLines.reduce((acc, l) => acc + (data.unitPrice * (l.pct / 100)), 0) + 
    data.keysValue;

  document.getElementById('tbTotalVal').innerText = formatCurrency(totalCalculated);
}

// ==========================================================================
// INICIALIZAÇÃO E ATUALIZAÇÃO DO GRÁFICO (CHART.JS)
// ==========================================================================
function initChart() {
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  paymentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Entrada', 'Mensais', 'Reforços', 'Chaves'],
      datasets: [{
        data: [10.0, 20.0, 10.0, 60.0],
        backgroundColor: ['#10b981', '#ffb700', '#38bdf8', '#e5a500'],
        borderWidth: 2,
        borderColor: '#181d24'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw.toFixed(2)}%`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

function updateChartData({ entryPct, monthlyPct, boostPct, extraLines, keysPct }) {
  if (!paymentChart) return;

  const labels = ['Entrada', 'Mensais (Obra)', 'Reforços'];
  const data = [
    parseFloat(entryPct.toFixed(2)),
    parseFloat(monthlyPct.toFixed(2)),
    parseFloat(boostPct.toFixed(2))
  ];
  const bgColors = ['#10b981', '#ffb700', '#38bdf8'];

  const extraPalette = ['#a855f7', '#ec4899', '#06b6d4', '#14b8a6'];
  extraLines.forEach((line, idx) => {
    labels.push(line.title || `Negociação ${idx + 1}`);
    data.push(parseFloat(line.pct.toFixed(2)));
    bgColors.push(extraPalette[idx % extraPalette.length]);
  });

  labels.push('Saldo Chaves');
  data.push(parseFloat(keysPct.toFixed(2)));
  bgColors.push('#e5a500');

  paymentChart.data.labels = labels;
  paymentChart.data.datasets[0].data = data;
  paymentChart.data.datasets[0].backgroundColor = bgColors;
  paymentChart.update();

  renderChartLegend(labels, data, bgColors);
}

function renderChartLegend(labels, data, colors) {
  const container = document.getElementById('chartLegendContainer');
  if (!container) return;

  container.innerHTML = labels.map((label, idx) => `
    <div class="flex items-center justify-between p-2 rounded-xl bg-[#111418] border border-[#2d3644]">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full" style="background-color: ${colors[idx]}"></span>
        <span class="text-slate-300 font-medium text-xs">${label}</span>
      </div>
      <span class="font-mono font-bold text-white text-xs">${data[idx].toFixed(2)}%</span>
    </div>
  `).join('');
}

// ==========================================================================
// VINCULAR EVENTOS DO DOM
// ==========================================================================
function bindEvents() {
  // Seletor de Empreendimento
  const devSelect = document.getElementById('devSelect');
  if (devSelect) {
    devSelect.addEventListener('change', (e) => {
      selectDevelopment(e.target.value);
    });
  }

  // Data Base da Proposta -> recalcula parcelas mensais
  const baseDateInput = document.getElementById('proposalBaseDate');
  if (baseDateInput) {
    baseDateInput.addEventListener('change', () => {
      if (currentDev.deliveryDate) {
        const months = calculateMonthsDiff(baseDateInput.value, currentDev.deliveryDate);
        document.getElementById('monthlyCountInput').value = months;
      }
      calculate();
    });
  }

  // Data de Entrega manual
  const deliveryDateInput = document.getElementById('deliveryDate');
  if (deliveryDateInput) {
    deliveryDateInput.addEventListener('change', () => {
      const baseDate = document.getElementById('proposalBaseDate').value;
      if (deliveryDateInput.value && baseDate) {
        const months = calculateMonthsDiff(baseDate, deliveryDateInput.value);
        document.getElementById('monthlyCountInput').value = months;
      }
      calculate();
    });
  }

  // Inputs de Texto Gerais
  document.getElementById('propTitle').addEventListener('input', calculate);
  document.getElementById('clientName').addEventListener('input', calculate);
  document.getElementById('consultantName').addEventListener('input', calculate);

  // MÁSCARA MONETÁRIA: Valor de Tabela do Imóvel
  const unitPriceInput = document.getElementById('unitPrice');
  unitPriceInput.addEventListener('input', (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? parseInt(rawDigits, 10) / 100 : 0;
    e.target.value = formatNumberToBRLInput(num);

    const currentEntryPct = parseFloat(document.getElementById('entryPctInput').value) || 10;
    const newEntryVal = (num * currentEntryPct) / 100;
    document.getElementById('entryValueInput').value = formatNumberToBRLInput(newEntryVal);

    calculate();
  });

  // MÁSCARA MONETÁRIA: Entrada em R$
  const entryValueInput = document.getElementById('entryValueInput');
  entryValueInput.addEventListener('input', (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? parseInt(rawDigits, 10) / 100 : 0;
    e.target.value = formatNumberToBRLInput(num);

    const price = parseBRLInputToNumber(document.getElementById('unitPrice').value);
    const computedPct = price > 0 ? (num / price) * 100 : 0;

    applyEntryAdjustment(computedPct);
  });

  // PERCENTUAL DE ENTRADA MANUAL (Operador digita diretamente o %)
  const entryPctInput = document.getElementById('entryPctInput');
  entryPctInput.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value) || 0;
    applyEntryAdjustment(pct);
  });

  // SLIDER DE ENTRADA
  const entryPctRange = document.getElementById('entryPctRange');
  entryPctRange.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value) || 0;
    applyEntryAdjustment(pct);
  });

  // FUNÇÃO DE AJUSTE EQUILIBRADO DA ENTRADA
  function applyEntryAdjustment(newEntryPct) {
    // Limita entrada a no máximo 90%
    newEntryPct = Math.min(90, Math.max(0, newEntryPct));

    document.getElementById('entryPctInput').value = newEntryPct.toFixed(2);

    const price = parseBRLInputToNumber(document.getElementById('unitPrice').value);
    const newEntryVal = (price * newEntryPct) / 100;
    document.getElementById('entryValueInput').value = formatNumberToBRLInput(newEntryVal);

    // Ajusta o slider e alerta de 10%
    const range = document.getElementById('entryPctRange');
    if (newEntryPct < 10) {
      range.min = '0';
      range.value = newEntryPct;
      document.getElementById('entryMinWarning').classList.remove('hidden');
    } else {
      range.min = '10';
      range.value = newEntryPct;
      document.getElementById('entryMinWarning').classList.add('hidden');
    }

    // REEQUILÍBRIO INTELIGENTE:
    // Se o empreendimento tiver fluxo de obra definido (ex: 40% obra / 60% chaves),
    // preservamos o padrão das Chaves reequilibrando as Mensais dentro da Obra!
    if (currentDev.status !== 'pronto' && currentDev.standardObraPct > 0) {
      const remainingObra = Math.max(0, currentDev.standardObraPct - newEntryPct);
      const currentBoost = parseFloat(document.getElementById('boostPctRange').value) || 0;

      if (remainingObra >= currentBoost) {
        const newMonthly = remainingObra - currentBoost;
        document.getElementById('monthlyPctRange').value = newMonthly;
        document.getElementById('monthlyPctInput').value = newMonthly.toFixed(1);
      } else {
        document.getElementById('monthlyPctRange').value = 0;
        document.getElementById('monthlyPctInput').value = '0.0';
        document.getElementById('boostPctRange').value = remainingObra;
        document.getElementById('boostPctInput').value = remainingObra.toFixed(1);
      }
    }

    calculate();
  }

  // BOTÃO RESTAURAR 10% MÍNIMO DA ENTRADA
  const btnRestoreMinEntry = document.getElementById('btnRestoreMinEntry');
  if (btnRestoreMinEntry) {
    btnRestoreMinEntry.addEventListener('click', () => {
      applyEntryAdjustment(10.0);
    });
  }

  // QUANTIDADE DE VEZES DA ENTRADA (PARCELAMENTO)
  const entryCountInput = document.getElementById('entryCountInput');
  if (entryCountInput) {
    entryCountInput.addEventListener('input', calculate);
  }

  // PERCENTUAL MENSAL MANUAL
  const monthlyPctInput = document.getElementById('monthlyPctInput');
  const monthlyPctRange = document.getElementById('monthlyPctRange');

  monthlyPctInput.addEventListener('input', (e) => {
    let pct = parseFloat(e.target.value) || 0;
    const entry = parseFloat(document.getElementById('entryPctInput').value) || 0;
    const boost = parseFloat(document.getElementById('boostPctInput').value) || 0;
    const extras = extraLines.reduce((acc, l) => acc + l.pct, 0);

    // Trava de 100%
    pct = Math.min(pct, Math.max(0, 100 - entry - boost - extras));
    e.target.value = pct.toFixed(1);
    monthlyPctRange.value = pct;
    calculate();
  });

  monthlyPctRange.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value) || 0;
    monthlyPctInput.value = pct.toFixed(1);
    calculate();
  });

  document.getElementById('monthlyCountInput').addEventListener('input', calculate);

  // PERCENTUAL DE REFORÇOS / BALÕES MANUAL
  const boostPctInput = document.getElementById('boostPctInput');
  const boostPctRange = document.getElementById('boostPctRange');

  boostPctInput.addEventListener('input', (e) => {
    let pct = parseFloat(e.target.value) || 0;
    const entry = parseFloat(document.getElementById('entryPctInput').value) || 0;
    const monthly = parseFloat(document.getElementById('monthlyPctInput').value) || 0;
    const extras = extraLines.reduce((acc, l) => acc + l.pct, 0);

    // Trava de 100%
    pct = Math.min(pct, Math.max(0, 100 - entry - monthly - extras));
    e.target.value = pct.toFixed(1);
    boostPctRange.value = pct;
    calculate();
  });

  boostPctRange.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value) || 0;
    boostPctInput.value = pct.toFixed(1);
    calculate();
  });

  document.getElementById('boostCountInput').addEventListener('input', calculate);

  // PERCENTUAL DAS CHAVES MANUAL (Operador pode digitar o % desejado nas chaves)
  const keysPctInput = document.getElementById('keysPctInput');
  if (keysPctInput) {
    keysPctInput.addEventListener('input', (e) => {
      let targetKeys = parseFloat(e.target.value) || 0;
      targetKeys = Math.min(100, Math.max(0, targetKeys));

      const entry = parseFloat(document.getElementById('entryPctInput').value) || 0;
      const boost = parseFloat(document.getElementById('boostPctInput').value) || 0;
      const extras = extraLines.reduce((acc, l) => acc + l.pct, 0);

      // Reajusta mensais para absorver a diferença e manter 100%
      const newMonthly = Math.max(0, 100 - targetKeys - entry - boost - extras);
      document.getElementById('monthlyPctRange').value = newMonthly;
      document.getElementById('monthlyPctInput').value = newMonthly.toFixed(1);

      calculate();
    });
  }

  // BOTÃO: FIXAR CHAVES NO PADRÃO DE TABELA
  const btnLockTableKeys = document.getElementById('btnLockTableKeys');
  if (btnLockTableKeys) {
    btnLockTableKeys.addEventListener('click', () => {
      const targetKeys = currentDev.standardKeysPct;
      const entry = parseFloat(document.getElementById('entryPctInput').value) || 0;
      const boost = parseFloat(document.getElementById('boostPctInput').value) || 0;
      const extras = extraLines.reduce((acc, l) => acc + l.pct, 0);

      const newMonthly = Math.max(0, 100 - targetKeys - entry - boost - extras);
      document.getElementById('monthlyPctRange').value = newMonthly;
      document.getElementById('monthlyPctInput').value = newMonthly.toFixed(1);

      calculate();
    });
  }

  // Botão Adicionar Linha de Negociação
  const addLineBtn = document.getElementById('btnAddExtraLine');
  if (addLineBtn) {
    addLineBtn.addEventListener('click', () => {
      addExtraLine();
    });
  }

  // Botão Redefinir
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      extraLines = [];
      selectDevelopment(currentDev.id);
    });
  }
}

// Helpers globais para callbacks inline
window.updateExtraLine = updateExtraLine;
window.removeExtraLine = removeExtraLine;
window.addExtraLine = addExtraLine;

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  const baseDateInput = document.getElementById('proposalBaseDate');
  if (baseDateInput) {
    baseDateInput.value = getTodayYearMonth();
  }

  populateDevelopmentsSelect();
  initChart();
  bindEvents();
  selectDevelopment('bal_harbour');
});
