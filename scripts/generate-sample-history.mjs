import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const snapshotDir = path.join(root, "data", "snapshots");
await mkdir(snapshotDir, { recursive: true });

const cards = [
  ["pikachu-205-172-japanese-psa10", "Pikachu AR 205/172", "205/172", "Japanese", "PSA10", 150, 4, 18, 120, 22, 72, 111, -35, [145, 150, 154, 171, 188, 194, 211, 220, 239, 244]],
  ["mew-347-190-japanese-psa10", "Mew 347/190", "347/190", "Japanese", "PSA10", 87, 9, 24, 83, 18, 64, 86, -26, [86, 87, 89, 94, 109, 112, 119, 122, 128, 136]],
  ["eevee-188-167-english-raw", "Eevee 188/167", "188/167", "English", "RAW", 42, 6, 13, 68, 41, 180, 215, -16, [40, 42, 43, 45, 52, 55, 58, 61, 65, 69]],
  ["charizard-199-165-english-psa10", "Charizard ex 199/165", "199/165", "English", "PSA10", 312, 31, 122, 95, 37, 48, 62, -23, [305, 312, 338, 360, 392, 410, 420, 455, 470, 488]]
];

const output = {
  generatedAt: new Date().toISOString(),
  source: "sample",
  cards: cards.map(([key, cardName, cardNumber, language, grade, currentPrice, price7dChangePct, price30dChangePct, demandChangePct, soldCount7d, listingCount, listingCount7dAgo, listingChangePct, lowPrices]) => ({
    key,
    cardName,
    cardNumber,
    language,
    grade,
    currentPrice,
    price7dChangePct,
    price30dChangePct,
    demandChangePct,
    soldCount7d,
    listingCount,
    listingCount7dAgo,
    listingChangePct,
    lowPrices,
    ebaySearchUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${cardName} ${grade} ${language} Pokemon`)}`,
    cheapListings: lowPrices.slice(0, 5).map((price, index) => [`${cardName} ${grade} listing ${index + 1}`, price]),
    history: [["90日前", Math.round(currentPrice * 0.74)], ["30日前", Math.round(currentPrice / (1 + price30dChangePct / 100))], ["7日前", Math.round(currentPrice / (1 + price7dChangePct / 100))], ["今日", currentPrice]]
  }))
};

const today = new Date().toISOString().slice(0, 10);
await writeFile(path.join(snapshotDir, `${today}.json`), JSON.stringify(output, null, 2));
await writeFile(path.join(root, "data", "latest.json"), JSON.stringify(output, null, 2));
console.log("Sample data generated.");
