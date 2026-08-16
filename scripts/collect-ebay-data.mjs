import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SNAPSHOT_DIR = path.join(ROOT, "data", "snapshots");
const LATEST_FILE = path.join(ROOT, "data", "latest.json");
const MARKETPLACE = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
const QUERY = process.env.EBAY_QUERY || "pokemon card psa 10 japanese|pokemon card raw|pokemon card psa 9";
const CATEGORY_ID = process.env.EBAY_CATEGORY_ID || "183454";
const LIMIT = Number(process.env.EBAY_LIMIT || 200);

const today = new Date().toISOString().slice(0, 10);

async function getAccessToken() {
  if (process.env.EBAY_ACCESS_TOKEN) return process.env.EBAY_ACCESS_TOKEN;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required for live collection.");
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope"
    })
  });
  if (!response.ok) throw new Error(`eBay token failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

function detectGrade(title) {
  const text = title.toUpperCase().replace(/\s+/g, " ");
  if (/\bPSA\s*10\b|PSA10|GEM MINT 10/.test(text)) return "PSA10";
  if (/\bPSA\s*9\b|PSA9|MINT 9/.test(text)) return "PSA9";
  if (/\bBGS\b|BECKETT/.test(text)) return "BGS";
  if (/\bCGC\b/.test(text)) return "CGC";
  return "RAW";
}

function detectLanguage(title) {
  const text = title.toLowerCase();
  if (text.includes("japanese") || text.includes("jp ") || text.includes("japan")) return "Japanese";
  if (text.includes("english") || text.includes("eng ")) return "English";
  return "Unknown";
}

function detectCardNumber(title) {
  return title.match(/\b\d{1,3}\/\d{1,3}\b/)?.[0] || "";
}

function normalizeName(title) {
  return title
    .replace(/\bpokemon\b/ig, "")
    .replace(/\bcard\b/ig, "")
    .replace(/\bPSA\s*10\b|\bPSA10\b|\bPSA\s*9\b|\bPSA9\b|\bBGS\b|\bCGC\b/ig, "")
    .replace(/\bJapanese\b|\bEnglish\b|\bJapan\b|\bJPN\b|\bENG\b/ig, "")
    .replace(/\b\d{1,3}\/\d{1,3}\b/g, "")
    .replace(/\bGEM MINT\b|\bMINT\b|\bNM\b|\bRAW\b|\bHOLO\b|\bRARE\b/ig, "")
    .replace(/[^a-z0-9\s-]/ig, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ") || "Unknown Pokemon";
}

function groupKey(item) {
  const title = item.title || "";
  const number = detectCardNumber(title);
  const language = detectLanguage(title);
  const grade = detectGrade(title);
  const name = normalizeName(title).toLowerCase().replaceAll(" ", "-");
  return `${name}-${number || "no-number"}-${language}-${grade}`.toLowerCase();
}

function summarizeGroup(items) {
  const first = items[0];
  const title = first.title || "Unknown Pokemon";
  const prices = items
    .map((item) => Number(item.price?.value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const lowPrices = prices.slice(0, 10);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const cardNumber = detectCardNumber(title);
  const grade = detectGrade(title);
  const language = detectLanguage(title);
  const cardName = `${normalizeName(title)}${cardNumber ? ` ${cardNumber}` : ""}`;
  const query = encodeURIComponent(`${cardName} ${grade === "RAW" ? "" : grade} ${language === "Unknown" ? "" : language} Pokemon`);
  return {
    key: groupKey(first),
    cardName,
    cardNumber,
    language,
    grade,
    currentPrice: Math.round(median || lowPrices[0] || 0),
    price7dChangePct: 0,
    price30dChangePct: 0,
    demandChangePct: 0,
    soldCount7d: 0,
    listingCount: items.length,
    listingCount7dAgo: items.length,
    listingChangePct: 0,
    lowPrices,
    ebaySearchUrl: `https://www.ebay.com/sch/i.html?_nkw=${query}`,
    cheapListings: items
      .map((item) => [item.title, Number(item.price?.value), item.itemWebUrl])
      .filter((row) => Number.isFinite(row[1]))
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10),
    history: [[today, Math.round(median || lowPrices[0] || 0)]]
  };
}

async function fetchBrowseItems(token, q) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", q);
  url.searchParams.set("category_ids", CATEGORY_ID);
  url.searchParams.set("limit", String(Math.min(LIMIT, 200)));
  url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE},priceCurrency:USD");
  url.searchParams.set("sort", "price");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE
    }
  });
  if (!response.ok) throw new Error(`Browse API failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return data.itemSummaries || [];
}

async function readSnapshot(daysAgo) {
  const target = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  try {
    const text = await readFile(path.join(SNAPSHOT_DIR, `${target}.json`), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pctChange(now, before) {
  if (!before || before === 0) return 0;
  return Math.round(((now - before) / before) * 100);
}

function enrichWithHistory(cards, snapshot7, snapshot30) {
  const by7 = new Map((snapshot7?.cards || []).map((card) => [card.key, card]));
  const by30 = new Map((snapshot30?.cards || []).map((card) => [card.key, card]));
  return cards.map((card) => {
    const old7 = by7.get(card.key);
    const old30 = by30.get(card.key);
    const price7dChangePct = pctChange(card.currentPrice, old7?.currentPrice);
    const price30dChangePct = pctChange(card.currentPrice, old30?.currentPrice);
    const listingChangePct = pctChange(card.listingCount, old7?.listingCount);
    const demandChangePct = Math.max(0, pctChange(Math.max(1, card.listingCount), Math.max(1, old7?.listingCount || card.listingCount)) * -1);
    const history = [
      old30 && ["30日前", old30.currentPrice],
      old7 && ["7日前", old7.currentPrice],
      ["今日", card.currentPrice]
    ].filter(Boolean);
    return {
      ...card,
      price7dChangePct,
      price30dChangePct,
      demandChangePct,
      listingCount7dAgo: old7?.listingCount || card.listingCount,
      listingChangePct,
      history
    };
  });
}

async function main() {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const token = await getAccessToken();
  const queries = QUERY.split("|").map((item) => item.trim()).filter(Boolean);
  const allItems = [];
  for (const q of queries) {
    allItems.push(...await fetchBrowseItems(token, q));
  }
  const groups = new Map();
  for (const item of allItems) {
    const key = groupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const cards = [...groups.values()].map(summarizeGroup).filter((card) => card.currentPrice > 0);
  const snapshot7 = await readSnapshot(7);
  const snapshot30 = await readSnapshot(30);
  const output = {
    generatedAt: new Date().toISOString(),
    source: "ebay-browse-api-current-listings-v1",
    cards: enrichWithHistory(cards, snapshot7, snapshot30)
  };
  await writeFile(path.join(SNAPSHOT_DIR, `${today}.json`), JSON.stringify(output, null, 2));
  await writeFile(LATEST_FILE, JSON.stringify(output, null, 2));
  const files = await readdir(SNAPSHOT_DIR);
  console.log(`Saved ${output.cards.length} card groups. Snapshots stored: ${files.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
