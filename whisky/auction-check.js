"use strict";

const germanLots = [
  ["2026-11", 4840354, 251], ["2026-06", 4477886, 241], ["2026-04", 4330988, 241],
  ["2026-02", 4229947, 301], ["2026-01", 4153719, 270], ["2025-11", 4033391, 180],
  ["2025-09", 3872842, 325], ["2024-05", 2801915, 257], ["2023-12", 2513474, 280],
  ["2022-12", 1708787, 360], ["2022-10", 1410132, 381], ["2022-09", 1410141, 381],
  ["2022-08", 1374243, 345], ["2021-03", 1213443, 350], ["2020-11", 1174718, 300],
  ["2020-01", 1098645, 305], ["2018-12", 1016419, 305], ["2018-07", 997498, 262],
  ["2018-06", 990047, 345], ["2017-08", 945751, 265], ["2017-05", 935071, 321],
  ["2017-02", 922353, 288], ["2016-11", 906415, 249], ["2016-07", 886888, 284],
  ["2015-08", 834250, 230], ["2014-11", 799301, 175], ["2014-10", 798826, 157],
  ["2014-09", 794518, 185],
];
const isRecent = ([month]) => month >= "2026-01" && month <= "2026-11";

function statsForLots(lots) {
  const prices = lots.map(([, , price]) => price).sort((a, b) => a - b);
  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  return {
    min: prices[0], max: prices.at(-1), count: prices.length,
    median: prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2,
  };
}

function totals(budget, fee, extras, nextBid) {
  const factor = 1 + fee / 100;
  const limitCents = Math.floor(((budget - extras) * 100) / factor + 1e-6);
  return {
    limit: limitCents > 0 ? limitCents / 100 : null,
    nextTotal: nextBid === null ? null : Math.round((nextBid * factor + extras) * 100) / 100,
  };
}

function searchUrl(domain, query) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", "site:" + domain + " " + query);
  return url.href;
}

if (typeof module !== "undefined") module.exports = { germanLots, isRecent, statsForLots, totals, searchUrl };

if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const eur = (value) => "€" + value;
  const cny = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
  const recent = germanLots.filter(isRecent);
  const stats = statsForLots(recent);
  $("median").textContent = eur(stats.median);
  $("range").textContent = eur(stats.min) + "–" + stats.max;
  $("sample").textContent = stats.count + " 笔";

  for (const row of germanLots) {
    const [month, itemId, price] = row;
    const tr = $(isRecent(row) ? "recent-lots" : "older-lots").insertRow();
    tr.insertCell().textContent = month;
    tr.insertCell().textContent = eur(price);
    const link = document.createElement("a");
    link.href = "https://www.whiskyauction.com/item/" + itemId;
    link.textContent = "#" + itemId;
    tr.insertCell().append(link);
  }

  $("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = event.currentTarget.elements.query.value.trim();
    if (!query) {
      $("search-status").textContent = "请输入酒款、酒厂或桶号。";
      return;
    }
    document.querySelectorAll("[data-source]").forEach((link) => {
      link.href = searchUrl(link.dataset.source, query);
    });
    const wa = new URL("https://whiskyauctioneer.com/search/past-auctions");
    wa.searchParams.set("keyword", query);
    wa.searchParams.set("lots_bottle", "All");
    document.querySelector("[data-wa]").href = wa.href;
    $("search-status").textContent = "检索词：" + query + "。站内索引不代表完整成交记录。";
  });

  const form = $("limit-form");
  const output = $("limit-result");
  const reset = () => {
    output.textContent = "尚未计算";
    delete output.dataset.over;
  };
  form.addEventListener("reset", reset);
  form.addEventListener("input", reset);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { budget, fee, extras, bid } = form.elements;
    const nextBid = bid.valueAsNumber;
    const result = totals(budget.valueAsNumber, fee.valueAsNumber, extras.valueAsNumber, bid.value ? nextBid : null);
    const over = bid.value && (result.limit === null || nextBid > result.limit);
    output.dataset.over = String(Boolean(over));
    output.textContent = result.limit === null ? "没有可用的落槌预算" : "最高落槌 " + cny.format(result.limit);
    if (result.nextTotal !== null) {
      output.textContent += " · 下一口到手 " + cny.format(result.nextTotal) + (over ? " · 超出上限" : " · 未超过上限");
    }
  });
}
