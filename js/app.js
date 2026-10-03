import { DEVELOPMENTS_DATA } from './developments.js';

// ==========================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================================
let currentDev = DEVELOPMENTS_DATA[9]; // Padrão: Bal Harbour
let extraLines = []; // Linhas adicionais de negociação personalizadas
let paymentChart = null;

// ==========================================================================
// FORMATAÇÃO E HELPERS
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

export function getTodayYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Calcula meses corridos entre duas datas no formato YYYY-MM
export function calculateMonthsDiff(startDateStr, endDateStr) {
  if (!endDateStr) return 36;
  const [sy, sm] = startDateStr.split('-').map(Number);
  const [ey, em] = endDateStr.split('-').map(Number);
  const diff = (ey - sy) * 12 + (em - sm);
  return diff > 0 ? diff : 1;
}

// Formata ano-mês (ex: 2030-05) para abreviado pt-BR (ex: Mai/2030)
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
  // Atualiza na tela principal
  document.getElementById('devCardName').innerText = dev.name;
  document.getElementById('devCardAddress').innerText = dev.address;
  document.getElementById('devCardBeach').innerText = dev.distanceSea;
  document.getElementById('devCardFloors').innerText = dev.floors ? `${dev.floors} Pavimentos` : 'Sob Consulta';
  document.getElementById('devCardLeisure').innerText = dev.leisureArea;
  document.getElementById('devCardUnits').innerText = dev.availableUnits;
  document.getElementById('devCardLimitFlow').innerText = dev.limitFlow;

  const statusBadge = document.getElementById('devCardStatusBadge');
  if (dev.status === 'pronto') {
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5';
    statusBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i> Pronto para Morar';
  } else {
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5';
    statusBadge.innerHTML = `<i class="fa-solid fa-person-digging text-amber-400"></i> Em Obras • Entrega ${dev.deliveryLabel}`;
  }

  // Atualiza também os elementos que aparecem no cabeçalho do PDF
  document.getElementById('printDevName').innerText = dev.name;
  document.getElementById('printDevAddress').innerText = dev.address;
  document.getElementById('printDevDelivery').innerText = dev.deliveryLabel;
  document.getElementById('printDevBeach').innerText = dev.distanceSea;
  document.getElementById('printDevFloors').innerText = dev.floors ? `${dev.floors} Pav.` : '-';
  document.getElementById('printDevLeisure').innerText = dev.leisureArea;
  document.getElementById('printDevFlow').innerText = dev.limitFlow;
}

// ==========================================================================
// SELEÇÃO DE EMPREENDIMENTO E APLICAÇÃO DOS PADRÕES
// ==========================================================================
export function selectDevelopment(devId) {
  const found = DEVELOPMENTS_DATA.find(d => d.id === devId);
  if (!found) return;

  currentDev = found;
  renderDevelopmentCard(currentDev);

  // Preenche dados padrão no formulário
  document.getElementById('propTitle').value = `${currentDev.name} - Unidade`;
  document.getElementById('unitPrice').value = currentDev.defaultUnitPrice;

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

  // Carrega percentuais padrão do empreendimento
  const price = currentDev.defaultUnitPrice;
  const entryVal = (price * (currentDev.defaultEntryPct / 100)).toFixed(2);
  document.getElementById('entryValueInput').value = entryVal;
  document.getElementById('entryPctRange').value = currentDev.defaultEntryPct;

  document.getElementById('monthlyPctRange').value = currentDev.defaultMonthlyPct;
  document.getElementById('boostPctRange').value = currentDev.defaultBoostPct;
  document.getElementById('boostCountInput').value = currentDev.defaultBoostCount;

  // Limpa linhas extras ao trocar empreendimento (ou mantém se desejar)
  // extraLines = [];
  renderExtraLinesInputs();

  // Dispara recálculo completo
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
  } else if (field === 'val') {
    const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;
    line.pct = unitPrice > 0 ? ((parseFloat(value) || 0) / unitPrice) * 100 : 0;
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

  const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;

  container.innerHTML = extraLines.map((line, idx) => {
    const lineTotal = (unitPrice * (line.pct / 100));
    return `
      <div class="fade-in-item bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 space-y-2 relative">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-grow">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
            <input type="text" value="${line.title}" 
              oninput="window.updateExtraLine('${line.id}', 'title', this.value)"
              placeholder="Descrição da Linha" 
              class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-indigo-400">
          </div>
          <button type="button" onclick="window.removeExtraLine('${line.id}')" title="Excluir Linha" class="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>

        <div class="grid grid-cols-12 gap-2 items-center text-xs">
          <div class="col-span-4">
            <label class="text-[10px] text-slate-400 block">% do Imóvel</label>
            <div class="flex items-center gap-1">
              <input type="number" step="0.1" min="0" max="80" value="${line.pct.toFixed(2)}"
                oninput="window.updateExtraLine('${line.id}', 'pct', this.value)"
                class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-400">
              <span class="text-slate-400 text-[10px]">%</span>
            </div>
          </div>

          <div class="col-span-3">
            <label class="text-[10px] text-slate-400 block">Qtd (Vezes)</label>
            <input type="number" min="1" max="60" value="${line.count}"
              oninput="window.updateExtraLine('${line.id}', 'count', this.value)"
              class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-indigo-400">
          </div>

          <div class="col-span-5">
            <label class="text-[10px] text-slate-400 block text-right">Subtotal</label>
            <div class="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-indigo-300 text-right font-mono font-bold">
              ${formatCurrency(lineTotal)}
            </div>
          </div>
        </div>

        <div>
          <input type="text" value="${line.details}"
            oninput="window.updateExtraLine('${line.id}', 'details', this.value)"
            placeholder="Vencimento / Observações (ex: Dez/2027 ou Carro na entrega)"
            class="w-full bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-400">
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// MOTOR DE CÁLCULO E SINCRONIZAÇÃO
// ==========================================================================
export function calculate() {
  // 1. Dados Básicos
  const propTitle = document.getElementById('propTitle').value || currentDev.name;
  const clientName = document.getElementById('clientName').value || 'Cliente Especial';
  const consultantName = document.getElementById('consultantName').value || 'Consultor Vetter';
  const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;

  let entryVal = parseFloat(document.getElementById('entryValueInput').value) || 0;
  let monthlyPct = parseFloat(document.getElementById('monthlyPctRange').value) || 0;
  let monthlyCount = parseInt(document.getElementById('monthlyCountInput').value) || 1;

  let boostPct = parseFloat(document.getElementById('boostPctRange').value) || 0;
  let boostCount = parseInt(document.getElementById('boostCountInput').value) || 0;

  const baseDateVal = document.getElementById('proposalBaseDate').value;
  const deliveryDateVal = document.getElementById('deliveryDate').value;

  // 2. Percentual de Entrada
  const entryPct = unitPrice > 0 ? (entryVal / unitPrice) * 100 : 0;
  document.getElementById('entryPctRange').value = entryPct.toFixed(4);
  document.getElementById('entryPctLabel').innerText = formatPct(entryPct);
  document.getElementById('monthlyPctLabel').innerText = formatPct(monthlyPct);
  document.getElementById('boostPctLabel').innerText = formatPct(boostPct);

  // 3. Totais Mensais
  const monthlyTotal = (unitPrice * monthlyPct) / 100;
  const monthlyUnit = monthlyCount > 0 ? monthlyTotal / monthlyCount : 0;
  document.getElementById('monthlyTotalDisplay').value = formatCurrency(monthlyTotal);

  // 4. Totais de Reforços / Balões
  const boostTotal = (unitPrice * boostPct) / 100;
  const boostUnit = boostCount > 0 ? boostTotal / boostCount : 0;
  document.getElementById('boostTotalDisplay').value = formatCurrency(boostTotal);

  // 5. Linhas Adicionais de Negociação
  let extraLinesTotalPct = 0;
  let extraLinesTotalVal = 0;
  extraLines.forEach(line => {
    extraLinesTotalPct += line.pct;
    extraLinesTotalVal += (unitPrice * (line.pct / 100));
  });

  // Atualiza subtotais das caixas de linhas extras se estiverem abertas
  const extraContainers = document.querySelectorAll('#extraLinesContainer input[type="number"]');
  // apenas render se necessário

  // 6. Saldo Residual de Chaves
  const keysPct = Math.max(0, 100 - entryPct - monthlyPct - boostPct - extraLinesTotalPct);
  const keysValue = (unitPrice * keysPct) / 100;

  document.getElementById('keysPctLabel').innerText = formatPct(keysPct);
  document.getElementById('keysValueDisplay').innerText = formatCurrency(keysValue);

  // 7. Validação de Alertas
  const alertEl = document.getElementById('keyWarningAlert');
  const alertText = document.getElementById('keyWarningText');
  const totalFlowBeforeKeys = entryPct + monthlyPct + boostPct + extraLinesTotalPct;

  if (totalFlowBeforeKeys > 100) {
    alertEl.classList.remove('hidden');
    alertEl.className = 'bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2';
    alertText.innerText = `Atenção: A soma dos pagamentos (${totalFlowBeforeKeys.toFixed(2)}%) ultrapassa 100% do valor do imóvel! Ajuste os percentuais.`;
  } else if (keysPct < 15 && currentDev.status !== 'pronto') {
    alertEl.classList.remove('hidden');
    alertEl.className = 'bg-amber-500/10 border border-amber-500/40 text-amber-300 p-3 rounded-xl text-xs flex items-center gap-2';
    alertText.innerText = 'Atenção: O saldo de chaves está abaixo de 15% do valor do imóvel. Condição sujeita à aprovação da diretoria comercial.';
  } else {
    alertEl.classList.add('hidden');
  }

  // 8. Cabeçalho da Proposta e Visualização
  document.getElementById('outPropTitle').innerText = propTitle;
  document.getElementById('outClientName').innerText = clientName;
  document.getElementById('outConsultantName').innerText = consultantName;
  document.getElementById('outUnitPrice').innerText = formatCurrency(unitPrice);

  // Cards de Resumo
  document.getElementById('cardEntry').innerText = formatCurrency(entryVal);
  document.getElementById('cardEntrySub').innerText = formatPct(entryPct);

  document.getElementById('cardMonthlyUnit').innerText = formatCurrency(monthlyUnit);
  document.getElementById('cardMonthlySub').innerText = `${monthlyCount}x de ${formatCurrency(monthlyUnit)}`;

  document.getElementById('cardBoostUnit').innerText = formatCurrency(boostUnit);
  document.getElementById('cardBoostSub').innerText = boostCount > 0 ? `${boostCount}x balões` : 'Sem balões';

  document.getElementById('cardKeys').innerText = formatCurrency(keysValue);
  document.getElementById('cardKeysSub').innerText = `${formatPct(keysPct)} do saldo final`;

  // Card para Linhas Extras se houver
  const extraMetricCard = document.getElementById('cardExtraMetric');
  if (extraLines.length > 0) {
    extraMetricCard.classList.remove('hidden');
    document.getElementById('cardExtraVal').innerText = formatCurrency(extraLinesTotalVal);
    document.getElementById('cardExtraSub').innerText = `${extraLines.length} item(ns) adicionais (${formatPct(extraLinesTotalPct)})`;
  } else {
    extraMetricCard.classList.add('hidden');
  }

  // 9. Renderizar Tabela Discriminativa de Fluxo
  renderFlowTable({
    unitPrice,
    entryVal,
    entryPct,
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

  // 10. Atualizar Gráfico Doughnut Chart.js
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
          <span>Entrada / Ato Inicial</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">1x</td>
      <td class="text-center font-mono font-semibold text-emerald-400">${formatPct(data.entryPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.entryVal)}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.entryVal)}</td>
    </tr>

    <!-- 2. Mensais -->
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          <span>Parcelas Mensais (Fluxo de Obra)</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">${data.monthlyCount}x</td>
      <td class="text-center font-mono font-semibold text-sky-400">${formatPct(data.monthlyPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.monthlyUnit)}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.monthlyTotal)}</td>
    </tr>

    <!-- 3. Reforços Anuais -->
    <tr>
      <td class="py-2.5 px-3 font-medium text-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span>Reforços Anuais (Balões)</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">${data.boostCount}x</td>
      <td class="text-center font-mono font-semibold text-indigo-400">${formatPct(data.boostPct)}</td>
      <td class="text-right font-mono text-slate-300">${data.boostCount > 0 ? formatCurrency(data.boostUnit) : '-'}</td>
      <td class="text-right font-mono font-bold text-white">${formatCurrency(data.boostTotal)}</td>
    </tr>
  `;

  // Linhas Adicionais de Negociação
  data.extraLines.forEach((line, index) => {
    const lineTotal = (data.unitPrice * (line.pct / 100));
    const lineUnit = line.count > 0 ? lineTotal / line.count : 0;
    html += `
      <tr class="bg-indigo-950/20">
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
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Chaves / Saldo Final ${deliveryText}</span>
        </div>
      </td>
      <td class="text-center font-mono text-slate-400">1x</td>
      <td class="text-center font-mono font-semibold text-amber-400">${formatPct(data.keysPct)}</td>
      <td class="text-right font-mono text-slate-300">${formatCurrency(data.keysValue)}</td>
      <td class="text-right font-mono font-bold text-amber-400">${formatCurrency(data.keysValue)}</td>
    </tr>
  `;

  tbody.innerHTML = html;

  // Atualizar rodapé total
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
        data: [11.94, 45.0, 20.0, 23.06],
        backgroundColor: ['#10b981', '#0284c7', '#6366f1', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#0f172a'
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

  const labels = ['Entrada', 'Mensais', 'Reforços'];
  const data = [
    parseFloat(entryPct.toFixed(2)),
    parseFloat(monthlyPct.toFixed(2)),
    parseFloat(boostPct.toFixed(2))
  ];
  const bgColors = ['#10b981', '#0284c7', '#6366f1'];

  // Cores para linhas adicionais
  const extraPalette = ['#a855f7', '#ec4899', '#06b6d4', '#14b8a6'];
  extraLines.forEach((line, idx) => {
    labels.push(line.title || `Negociação ${idx + 1}`);
    data.push(parseFloat(line.pct.toFixed(2)));
    bgColors.push(extraPalette[idx % extraPalette.length]);
  });

  labels.push('Chaves / Saldo');
  data.push(parseFloat(keysPct.toFixed(2)));
  bgColors.push('#f59e0b');

  paymentChart.data.labels = labels;
  paymentChart.data.datasets[0].data = data;
  paymentChart.data.datasets[0].backgroundColor = bgColors;
  paymentChart.update();

  // Atualiza também os badges da legenda no DOM
  renderChartLegend(labels, data, bgColors);
}

function renderChartLegend(labels, data, colors) {
  const container = document.getElementById('chartLegendContainer');
  if (!container) return;

  container.innerHTML = labels.map((label, idx) => `
    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
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

  // Mudança da Data Base da Proposta -> recalcula número de parcelas
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

  // Mudança manual da Data de Entrega
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

  // Inputs Principais
  document.getElementById('propTitle').addEventListener('input', calculate);
  document.getElementById('clientName').addEventListener('input', calculate);
  document.getElementById('consultantName').addEventListener('input', calculate);
  document.getElementById('unitPrice').addEventListener('input', () => {
    // Ao mudar o preço, reajusta a entrada em R$ mantendo a proporção ou recalcula
    const price = parseFloat(document.getElementById('unitPrice').value) || 0;
    const entryPct = parseFloat(document.getElementById('entryPctRange').value) || 0;
    document.getElementById('entryValueInput').value = ((price * entryPct) / 100).toFixed(2);
    calculate();
  });

  // Entrada em R$ -> atualiza Slider
  document.getElementById('entryValueInput').addEventListener('input', () => {
    calculate();
  });

  // Slider de Entrada -> atualiza R$
  document.getElementById('entryPctRange').addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value) || 0;
    const price = parseFloat(document.getElementById('unitPrice').value) || 0;
    document.getElementById('entryValueInput').value = ((price * pct) / 100).toFixed(2);
    calculate();
  });

  // Mensais
  document.getElementById('monthlyPctRange').addEventListener('input', calculate);
  document.getElementById('monthlyCountInput').addEventListener('input', calculate);

  // Balões
  document.getElementById('boostPctRange').addEventListener('input', calculate);
  document.getElementById('boostCountInput').addEventListener('input', calculate);

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

// Tornar helpers disponíveis globalmente para callbacks inline
window.updateExtraLine = updateExtraLine;
window.removeExtraLine = removeExtraLine;
window.addExtraLine = addExtraLine;

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Define data de hoje no campo base da proposta
  const baseDateInput = document.getElementById('proposalBaseDate');
  if (baseDateInput) {
    baseDateInput.value = getTodayYearMonth();
  }

  populateDevelopmentsSelect();
  initChart();
  bindEvents();
  selectDevelopment('bal_harbour'); // Inicia com Bal Harbour por padrão
});
