const SAMPLE_DATA = {
  generatedAt: new Date().toISOString(),
  source: "sample",
  cards: [
    {
      key: "pikachu-205-172-japanese-psa10",
      cardName: "Pikachu AR 205/172",
      cardNumber: "205/172",
      language: "Japanese",
      grade: "PSA10",
      currentPrice: 150,
      price7dChangePct: 4,
      price30dChangePct: 18,
      demandChangePct: 120,
      soldCount7d: 22,
      listingCount: 72,
      listingCount7dAgo: 111,
      listingChangePct: -35,
      lowPrices: [145, 150, 154, 171, 188, 194, 211, 220, 239, 244],
      ebaySearchUrl: "https://www.ebay.com/sch/i.html?_nkw=Pikachu+205%2F172+PSA+10+Japanese+Pokemon",
      cheapListings: [
        ["Pikachu 205/172 PSA 10 Japanese", 145],
        ["Pikachu AR VSTAR Universe PSA10", 150],
        ["Pokemon Pikachu 205/172 PSA 10", 154],
        ["Pikachu Japanese PSA 10 205/172", 171],
        ["Pokemon Card Pikachu AR PSA10", 188]
      ],
      history: [
        ["90日前", 118], ["30日前", 127], ["14日前", 141], ["7日前", 144], ["今日", 150]
      ]
    },
    {
      key: "mew-347-190-japanese-psa10",
      cardName: "Mew 347/190",
      cardNumber: "347/190",
      language: "Japanese",
      grade: "PSA10",
      currentPrice: 87,
      price7dChangePct: 9,
      price30dChangePct: 24,
      demandChangePct: 83,
      soldCount7d: 18,
      listingCount: 64,
      listingCount7dAgo: 86,
      listingChangePct: -26,
      lowPrices: [86, 87, 89, 94, 109, 112, 119, 122, 128, 136],
      ebaySearchUrl: "https://www.ebay.com/sch/i.html?_nkw=Mew+347%2F190+PSA+10+Japanese+Pokemon",
      cheapListings: [
        ["Mew 347/190 PSA 10 Japanese", 86],
        ["Pokemon Mew Japanese PSA10", 87],
        ["Mew Shiny Treasure PSA 10", 89],
        ["Mew 347/190 GEM MINT", 94],
        ["Pokemon Card Mew PSA10", 109]
      ],
      history: [["90日前", 66], ["30日前", 70], ["14日前", 78], ["7日前", 80], ["今日", 87]]
    },
    {
      key: "eevee-188-167-english-raw",
      cardName: "Eevee 188/167",
      cardNumber: "188/167",
      language: "English",
      grade: "RAW",
      currentPrice: 42,
      price7dChangePct: 6,
      price30dChangePct: 13,
      demandChangePct: 68,
      soldCount7d: 41,
      listingCount: 180,
      listingCount7dAgo: 215,
      listingChangePct: -16,
      lowPrices: [40, 42, 43, 45, 52, 55, 58, 61, 65, 69],
      ebaySearchUrl: "https://www.ebay.com/sch/i.html?_nkw=Eevee+188%2F167+Pokemon+RAW",
      cheapListings: [
        ["Eevee 188/167 Near Mint", 40],
        ["Pokemon Eevee Illustration Rare", 42],
        ["Eevee Raw English NM", 43],
        ["Eevee 188/167 Pokemon Card", 45],
        ["Eevee IR NM", 52]
      ],
      history: [["90日前", 31], ["30日前", 37], ["14日前", 39], ["7日前", 40], ["今日", 42]]
    },
    {
      key: "charizard-199-165-english-psa10",
      cardName: "Charizard ex 199/165",
      cardNumber: "199/165",
      language: "English",
      grade: "PSA10",
      currentPrice: 312,
      price7dChangePct: 31,
      price30dChangePct: 122,
      demandChangePct: 95,
      soldCount7d: 37,
      listingCount: 48,
      listingCount7dAgo: 62,
      listingChangePct: -23,
      lowPrices: [305, 312, 338, 360, 392, 410, 420, 455, 470, 488],
      ebaySearchUrl: "https://www.ebay.com/sch/i.html?_nkw=Charizard+199%2F165+PSA+10+English",
      cheapListings: [
        ["Charizard ex 199/165 PSA 10", 305],
        ["Pokemon 151 Charizard PSA10", 312],
        ["Charizard SIR PSA 10 English", 338],
        ["Charizard ex English GEM MINT", 360],
        ["Pokemon Charizard PSA10 199/165", 392]
      ],
      history: [["90日前", 122], ["30日前", 141], ["14日前", 215], ["7日前", 238], ["今日", 312]]
    }
  ]
};

const state = {
  tab: "start",
  cards: [],
  selectedKey: null
};

const $ = (id) => document.getElementById(id);

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${Math.round(number)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateScore(card) {
  const price = clamp((card.price7dChangePct / 20) * 30, 0, 30);
  const demand = clamp((card.demandChangePct / 100) * 30, 0, 30);
  const inventory = clamp((Math.abs(Math.min(card.listingChangePct, 0)) / 40) * 20, 0, 20);
  const p1 = card.lowPrices?.[0] || card.currentPrice;
  const p5 = card.lowPrices?.[4] || p1;
  const shelfGap = p1 ? ((p5 - p1) / p1) * 100 : 0;
  const thinBook = clamp((shelfGap / 30) * 20, 0, 20);
  const earlyBonus = card.price7dChangePct <= 10 && card.demandChangePct >= 60 ? 8 : 0;
  const total = clamp(Math.round(price + demand + inventory + thinBook + earlyBonus), 0, 100);
  return {
    total,
    parts: {
      price: Math.round(price),
      demand: Math.round(demand),
      inventory: Math.round(inventory),
      thinBook: Math.round(thinBook),
      earlyBonus
    }
  };
}

function classify(card) {
  if (card.price30dChangePct >= 80 || card.price7dChangePct >= 28) return "hot";
  if (card.demandChangePct >= 75 && card.price7dChangePct <= 12) return "start";
  if (card.demandChangePct >= 65) return "demand";
  if (card.listingChangePct <= -25) return "supply";
  return "start";
}

function labelFor(card) {
  if (classify(card) === "hot") return "すでに高騰中";
  if (card.score.total >= 85) return "急騰";
  if (card.score.total >= 75) return "注目";
  return "上昇";
}

async function loadData() {
  try {
    const response = await fetch("data/latest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No data file");
    return await response.json();
  } catch {
    return SAMPLE_DATA;
  }
}

function applyFilters(cards) {
  const grade = $("gradeFilter").value;
  const language = $("languageFilter").value;
  const minPrice = Number($("minPrice").value || 0);
  const maxPrice = Number($("maxPrice").value || Number.MAX_SAFE_INTEGER);
  const minScore = Number($("minScore").value || 0);
  const minSales = Number($("minSales").value || 0);
  const minListings = Number($("minListings").value || 0);
  return cards
    .filter((card) => classify(card) === state.tab)
    .filter((card) => grade === "all" || card.grade === grade)
    .filter((card) => language === "all" || card.language === language)
    .filter((card) => card.currentPrice >= minPrice && card.currentPrice <= maxPrice)
    .filter((card) => card.score.total >= minScore)
    .filter((card) => (card.soldCount7d || 0) >= minSales)
    .filter((card) => (card.listingCount || 0) >= minListings)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 50);
}

function renderSummary(cards) {
  const top = [...cards].sort((a, b) => b.score.total - a.score.total)[0];
  $("summary").innerHTML = [
    ["TOPスコア", top ? top.score.total : 0],
    ["監視カード数", cards.length],
    ["平均需要変化", `${Math.round(cards.reduce((sum, card) => sum + card.demandChangePct, 0) / Math.max(cards.length, 1))}%`],
    ["最終更新", new Date(state.generatedAt).toLocaleString("ja-JP")]
  ].map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderTable() {
  const visible = applyFilters(state.cards);
  const body = $("rankingBody");
  body.innerHTML = visible.map((card, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><button class="card-link" data-key="${card.key}">${card.cardName} ${card.grade}</button><br><small>${card.language} / ${card.cardNumber}</small></td>
      <td><span class="score">${card.score.total}</span></td>
      <td>${money(card.currentPrice)}</td>
      <td class="${card.price7dChangePct >= 0 ? "positive" : "negative"}">${pct(card.price7dChangePct)}</td>
      <td class="positive">${pct(card.demandChangePct)}</td>
      <td class="${card.listingChangePct <= 0 ? "positive" : "negative"}">${pct(card.listingChangePct)}</td>
      <td><span class="badge">${labelFor(card)}</span></td>
    </tr>
  `).join("");

  body.querySelectorAll(".card-link").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKey = button.dataset.key;
      renderDetail();
    });
  });

  if (!visible.some((card) => card.key === state.selectedKey)) {
    state.selectedKey = visible[0]?.key || null;
  }
  renderDetail();
}

function renderChart(card) {
  const points = card.history || [];
  if (!points.length) return "";
  const values = points.map((point) => point[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 340;
  const height = 130;
  const coords = values.map((value, index) => {
    const x = 18 + index * ((width - 36) / Math.max(values.length - 1, 1));
    const y = height - 18 - ((value - min) / Math.max(max - min, 1)) * (height - 36);
    return `${x},${y}`;
  }).join(" ");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="価格推移グラフ">
    <polyline points="${coords}" fill="none" stroke="#0f766e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    ${points.map((point, index) => {
      const [x, y] = coords.split(" ")[index].split(",");
      return `<circle cx="${x}" cy="${y}" r="4" fill="#0f766e"><title>${point[0]} ${money(point[1])}</title></circle>`;
    }).join("")}
  </svg>`;
}

function renderDetail() {
  const card = state.cards.find((item) => item.key === state.selectedKey);
  const detail = $("detail");
  if (!card) {
    detail.innerHTML = "<p>条件に合うカードがありません。</p>";
    return;
  }
  const parts = card.score.parts;
  detail.innerHTML = `
    <h2>${card.cardName}</h2>
    <p class="sub">${card.language} / ${card.grade} / ${card.cardNumber}</p>
    <div class="detail-grid">
      <div class="mini"><span>現在価格</span><strong>${money(card.currentPrice)}</strong></div>
      <div class="mini"><span>7日前との差</span><strong>${pct(card.price7dChangePct)}</strong></div>
      <div class="mini"><span>30日前との差</span><strong>${pct(card.price30dChangePct)}</strong></div>
      <div class="mini"><span>現在の出品数</span><strong>${card.listingCount}</strong></div>
      <div class="mini"><span>需要変化</span><strong>${pct(card.demandChangePct)}</strong></div>
      <div class="mini"><span>出品数変化</span><strong>${pct(card.listingChangePct)}</strong></div>
    </div>
    ${renderChart(card)}
    <div class="bars">
      ${[
        ["価格", parts.price, 30],
        ["需要", parts.demand, 30],
        ["在庫", parts.inventory, 20],
        ["板の薄さ", parts.thinBook, 20],
        ["先行サイン", parts.earlyBonus, 8]
      ].map(([label, value, max]) => `
        <div class="bar-row"><span>${label}</span><div class="bar"><i style="width:${(value / max) * 100}%"></i></div><b>${value}</b></div>
      `).join("")}
    </div>
    <p class="reason">高騰スコアは${card.score.total}点です。価格 ${parts.price}点 / 需要 ${parts.demand}点 / 在庫 ${parts.inventory}点 / 板 ${parts.thinBook}点 / 先行サイン ${parts.earlyBonus}点。直近価格の上昇がまだ小さめで、需要増加と在庫減少が同時に出ているカードを高く評価します。</p>
    <h3>現在の安い出品</h3>
    <ol class="cheap-list">
      ${(card.cheapListings || []).slice(0, 10).map(([title, price]) => `<li><a href="${card.ebaySearchUrl}" target="_blank" rel="noreferrer">${title}</a> ${money(price)}</li>`).join("")}
    </ol>
  `;
}

function downloadCsv() {
  const rows = applyFilters(state.cards);
  const header = [
    "日付", "カード名", "カード番号", "言語", "RAW/PSA", "現在価格", "7日価格変化", "30日価格変化",
    "需要変化", "出品数", "出品数変化", "最安値", "3番目価格", "5番目価格", "10番目価格", "高騰スコア", "eBay検索URL"
  ];
  const csvRows = rows.map((card) => [
    state.generatedAt?.slice(0, 10), card.cardName, card.cardNumber, card.language, card.grade,
    card.currentPrice, card.price7dChangePct, card.price30dChangePct, card.demandChangePct,
    card.listingCount, card.listingChangePct, card.lowPrices?.[0], card.lowPrices?.[2],
    card.lowPrices?.[4], card.lowPrices?.[9], card.score.total, card.ebaySearchUrl
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ebay-pokemon-ranking-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
      button.classList.add("is-active");
      state.tab = button.dataset.tab;
      renderTable();
    });
  });
  ["gradeFilter", "languageFilter", "minPrice", "maxPrice", "minScore", "minSales", "minListings"].forEach((id) => {
    $(id).addEventListener("input", renderTable);
  });
  $("csvButton").addEventListener("click", downloadCsv);
}

loadData().then((data) => {
  state.generatedAt = data.generatedAt;
  state.cards = (data.cards || []).map((card) => ({ ...card, score: calculateScore(card) }));
  renderSummary(state.cards);
  bindEvents();
  renderTable();
});
