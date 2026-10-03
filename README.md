# Simulador de Propostas Comerciais — Vetter Empreendimentos

Aplicação web interativa de alta performance desenvolvida para consultores e equipe comercial da **Vetter Empreendimentos**, permitindo a simulação dinâmica de propostas imobiliárias com cálculo automático de prazos de obra, flexibilidade de fluxos, linhas extras de negociação e exportação profissional para PDF.

---

## 🌊 Principais Funcionalidades

1. **Catálogo Integrado Vetter (11 Empreendimentos)**:
   - *South Beach* (Pronto - Piçarras)
   - *Coral Gables* (Pronto - Penha)
   - *Ocean Park* (Out/2026 - Piçarras)
   - *Gold Coast* (Ago/2027 - Piçarras)
   - *Paradise Bay* (Ago/2028 - Piçarras)
   - *Dolphin Bay* (Out/2028 - Penha)
   - *Emerald Coast* (Mar/2029 - Piçarras)
   - *Tropical Beach* (Jun/2029 - Piçarras)
   - *Royal Bay* (Out/2029 - Penha)
   - *Bal Harbour* (Mai/2030 - Piçarras)
   - *Fort Myers* (Set/2031 - Penha)
   - Opção para fluxo personalizado.

2. **Card Executivo do Empreendimento**:
   - Apresenta instantaneamente: previsão de entrega, distância da praia (m), total de pavimentos, metragem e opções da área de lazer, unidades disponíveis e fluxo limite de tabela (20/80, 30/70, 40/60, 60/40, 36x).
   - Diagramado também para sair no topo da proposta ao imprimir/salvar em PDF.

3. **Cálculo Inteligente de Parcelas por Data**:
   - Ao selecionar o empreendimento, calcula a quantidade de meses entre a data base e a data de entrega e preenche automaticamente o campo de parcelas mensais.
   - Permite alteração manual a qualquer momento pelo usuário.

4. **Linhas Adicionais de Negociação**:
   - Adicione permutas (veículos/imóveis), atos secundários (30/60 dias), parcelas intermediárias ou reforços semestrais com 1 clique.
   - Integração direta nos subtotais, tabela financeira, métricas e no gráfico de rosca.

5. **Saldo Residual Automático nas Chaves**:
   - Ajusta dinamicamente o saldo final para garantir que a soma totalize 100% do imóvel.
   - Alerta visual caso o saldo fique abaixo de 15% ou caso ultrapasse 100%.

6. **Relatório em PDF / Impressão A4 Limpa**:
   - Folha timbrada executiva com cabeçalho Vetter, dados do cliente e consultor, discriminativo completo, gráfico e campo para assinatura.

---

## 🚀 Como Executar Localmente

### Opção 1: Via Extensão "Live Server" do VS Code
Basta abrir a pasta no VS Code e clicar em **"Go Live"** no arquivo `index.html`.

### Opção 2: Via Terminal (Node.js ou Python)
Com o terminal aberto nesta pasta:

```bash
# Com Python:
python -m http.server 3000

# Ou com Node (npx):
npx serve .
```

Acesse no navegador: `http://localhost:3000`

---

## 📦 Como Subir para o GitHub e Vercel

### 1. Inicializar e Enviar para o GitHub:
```bash
git init
git add .
git commit -m "feat: Simulador de Propostas Vetter Empreendimentos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/simulador-vetter.git
git push -u origin main
```

### 2. Deploy na Vercel:
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **"Add New Project"** e selecione o repositório `simulador-vetter`.
3. Como o projeto é estático com `vercel.json` pré-configurado, basta clicar em **Deploy**.
4. Sua aplicação estará no ar em poucos segundos!
