(function () {
  "use strict";

  const HOWL_MINT = "FY6ynAy9XUfiABUf9PkF9QzjSmZDTfWJJMLTmYyjBAGS";
  const DEXSCREENER_URL = "https://dexscreener.com/solana/FY6ynAy9XUfiABUf9PkF9QzjSmZDTfWJJMLTmYyjBAGS";
  const DEXSCREENER_API_TOKENS = "https://api.dexscreener.com/tokens/v1/solana/FY6ynAy9XUfiABUf9PkF9QzjSmZDTfWJJMLTmYyjBAGS";
  const CACHE_KEY = "alpha-husky:howl:dexscreener:v1";
  const CACHE_TTL_MS = 60 * 1000;
  const EMPTY = "\u2014";

  const globalConfig = window.HOWL_TOKEN_CONFIG || {};
  const HOWL_CHART_EMBED_URL = String(globalConfig.HOWL_CHART_EMBED_URL || "").trim();

  function init() {
    const section = document.getElementById("howl-token");
    if (!section) return;

    setupCopyButtons(section);
    setupLogoFallback(section);
    setupChart(section);
    loadMarketData(section);
  }

  function setupLogoFallback(section) {
    section.querySelectorAll("[data-howl-token-logo]").forEach((image) => {
      if (image.complete && image.naturalWidth === 0) {
        hideBrokenLogo(image);
        return;
      }

      image.addEventListener("error", () => hideBrokenLogo(image), { once: true });
    });
  }

  function hideBrokenLogo(image) {
    image.hidden = true;
  }

  function setupCopyButtons(section) {
    const statusEl = section.querySelector("[data-howl-copy-status]");
    let statusTimer = null;

    function showStatus(message) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.add("is-visible");
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => {
        statusEl.classList.remove("is-visible");
      }, 2200);
    }

    async function copyMint() {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(HOWL_MINT);
          showStatus("Mint copied");
          return;
        }

        if (fallbackCopy(HOWL_MINT)) {
          showStatus("Mint copied");
          return;
        }

        selectMintText();
        showStatus("Mint selected - press Ctrl+C");
      } catch (error) {
        selectMintText();
        showStatus("Mint selected - press Ctrl+C");
      }
    }

    section.querySelectorAll("[data-howl-copy]").forEach((button) => {
      button.addEventListener("click", copyMint);
    });
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    textarea.remove();
    return copied;
  }

  function selectMintText() {
    const mintEl = document.getElementById("howl-mint-value");
    if (!mintEl || !window.getSelection) return;

    const range = document.createRange();
    range.selectNodeContents(mintEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function setupChart(section) {
    const embedHost = section.querySelector("[data-howl-chart-embed]");
    const fallback = section.querySelector("[data-howl-chart-fallback]");
    const chartLink = section.querySelector("[data-howl-chart-link]");

    if (chartLink) chartLink.href = DEXSCREENER_URL;
    if (!embedHost || !HOWL_CHART_EMBED_URL || !isHttpUrl(HOWL_CHART_EMBED_URL)) return;

    const iframe = document.createElement("iframe");
    iframe.src = HOWL_CHART_EMBED_URL;
    iframe.title = "HOWL live chart";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.setAttribute("allowfullscreen", "");

    embedHost.hidden = false;
    embedHost.appendChild(iframe);

    if (fallback) {
      const title = fallback.querySelector("h3");
      const copy = fallback.querySelector("p:not(.howl-panel-kicker)");
      if (title) title.textContent = "Live chart preview";
      if (copy) copy.textContent = "The embedded chart is loaded lazily. DexScreener remains the fallback for the full live market view.";
    }
  }

  async function loadMarketData(section) {
    const cached = readCache();
    const now = Date.now();

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      renderPair(section, cached.pair, cached.fetchedAt, "Live data cached 60s");
      return;
    }

    setMarketState(section, "Loading");

    try {
      const response = await fetch(DEXSCREENER_API_TOKENS, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);

      const payload = await response.json();
      const pair = chooseBestPair(normalizePairs(payload));
      if (!pair) throw new Error("No HOWL pair returned");

      const cachedPair = compactPair(pair);
      writeCache(cachedPair);
      renderPair(section, cachedPair, Date.now(), "Live market data");
    } catch (error) {
      if (cached && cached.pair) {
        renderPair(section, cached.pair, cached.fetchedAt, "Using cached data");
      } else {
        renderEmpty(section);
      }
    }
  }

  function normalizePairs(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.pairs)) return payload.pairs;
    return [];
  }

  function chooseBestPair(pairs) {
    return pairs
      .filter(Boolean)
      .slice()
      .sort((a, b) => numberOrNull(b.liquidity && b.liquidity.usd) - numberOrNull(a.liquidity && a.liquidity.usd))[0] || null;
  }

  function compactPair(pair) {
    return {
      priceUsd: pair.priceUsd,
      marketCap: pair.marketCap,
      fdv: pair.fdv,
      liquidity: { usd: pair.liquidity && pair.liquidity.usd },
      volume: { h24: pair.volume && pair.volume.h24 },
      priceChange: { h24: pair.priceChange && pair.priceChange.h24 },
      txns: {
        h24: {
          buys: pair.txns && pair.txns.h24 && pair.txns.h24.buys,
          sells: pair.txns && pair.txns.h24 && pair.txns.h24.sells
        }
      },
      url: isHttpUrl(pair.url) ? pair.url : DEXSCREENER_URL,
      pairAddress: pair.pairAddress || ""
    };
  }

  function renderPair(section, pair, fetchedAt, stateText) {
    setStat(section, "price", formatPrice(pair.priceUsd));
    setStat(section, "marketCap", formatMarketCap(pair));
    setStat(section, "liquidity", formatUsdCompact(pair.liquidity && pair.liquidity.usd));
    setStat(section, "volume24h", formatUsdCompact(pair.volume && pair.volume.h24));
    setChange(section, pair.priceChange && pair.priceChange.h24);
    setStat(section, "txns24h", formatTxns(pair.txns && pair.txns.h24));
    setLastUpdated(section, fetchedAt);
    setMarketState(section, stateText);
    updateDexLinks(section, pair.url);
  }

  function renderEmpty(section) {
    ["price", "marketCap", "liquidity", "volume24h", "change24h", "txns24h"].forEach((key) => {
      setStat(section, key, EMPTY);
    });
    setLastUpdated(section, null);
    setMarketState(section, "Unavailable");
  }

  function setStat(section, key, value) {
    const el = section.querySelector('[data-howl-stat="' + key + '"]');
    if (el) el.textContent = value || EMPTY;
  }

  function setChange(section, value) {
    const el = section.querySelector('[data-howl-stat="change24h"]');
    if (!el) return;

    const change = numberOrNull(value);
    el.classList.remove("is-up", "is-down");

    if (change === null) {
      el.textContent = EMPTY;
      return;
    }

    el.textContent = (change > 0 ? "+" : "") + change.toFixed(2) + "%";
    if (change > 0) el.classList.add("is-up");
    if (change < 0) el.classList.add("is-down");
  }

  function setLastUpdated(section, timestamp) {
    const el = section.querySelector("[data-howl-last-updated]");
    if (!el) return;

    if (!timestamp) {
      el.textContent = EMPTY;
      el.removeAttribute("datetime");
      return;
    }

    const date = new Date(timestamp);
    el.dateTime = date.toISOString();
    el.textContent = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function setMarketState(section, text) {
    const el = section.querySelector("[data-howl-market-state]");
    if (el) el.textContent = text;
  }

  function updateDexLinks(section, url) {
    const target = isHttpUrl(url) ? url : DEXSCREENER_URL;
    section.querySelectorAll("[data-howl-dex-link], [data-howl-chart-link]").forEach((link) => {
      link.href = target;
    });
  }

  function readCache() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.pair || !parsed.fetchedAt) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeCache(pair) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({
        fetchedAt: Date.now(),
        pair: pair
      }));
    } catch (error) {
      // localStorage may be unavailable in private modes; live rendering still works.
    }
  }

  function formatPrice(value) {
    const number = numberOrNull(value);
    if (number === null) return EMPTY;
    if (number === 0) return "$0";
    if (number < 0.000001) return "$" + number.toPrecision(3);
    if (number < 1) {
      return "$" + number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
    }
    return formatUsd(number, 2, 4);
  }

  function formatMarketCap(pair) {
    const marketCap = numberOrNull(pair.marketCap);
    if (marketCap !== null) return formatUsdCompact(marketCap);

    const fdv = numberOrNull(pair.fdv);
    if (fdv !== null) return formatUsdCompact(fdv) + " FDV";

    return EMPTY;
  }

  function formatUsdCompact(value) {
    const number = numberOrNull(value);
    if (number === null) return EMPTY;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(number);
  }

  function formatUsd(value, minFractionDigits, maxFractionDigits) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits
    }).format(value);
  }

  function formatTxns(txns) {
    const buys = numberOrNull(txns && txns.buys);
    const sells = numberOrNull(txns && txns.sells);
    if (buys === null && sells === null) return EMPTY;
    return formatIntegerOrDash(buys) + " / " + formatIntegerOrDash(sells);
  }

  function formatIntegerOrDash(value) {
    if (value === null) return EMPTY;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
      return false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
