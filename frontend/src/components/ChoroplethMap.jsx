import React, { useCallback, useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { fetchWorldSnapshot } from "../api/analyticsApi";
import { useI18n } from "../context/I18nContext";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const USD_INDICATORS = new Set(["NY.GDP.PCAP.CD", "NY.GDP.MKTP.CD"]);

// Predefined indicators available on the world map.
// reverse: true  → high value is BAD (red), low value is GOOD (blue)
// reverse: false → high value is GOOD (blue), low value is BAD (red)
const MAP_INDICATORS = [
  { code: "NY.GDP.PCAP.CD",    labelKey: "map.ind.gdpCap",    reverse: false },
  { code: "NY.GDP.MKTP.CD",    labelKey: "map.ind.gdpTotal",  reverse: false },
  { code: "FP.CPI.TOTL.ZG",   labelKey: "map.ind.inflation", reverse: true  },
  { code: "SL.UEM.TOTL.ZS",   labelKey: "map.ind.unemploy",  reverse: true  },
  // World Bank reports Gini as 0–100; divide by 100 for display to show canonical 0–1 range
  { code: "SI.POV.GINI",       labelKey: "map.ind.gini",      reverse: true,  displayScale: 0.01, legendMin: 0, legendMax: 1 },
  { code: "NY.GDP.PCAP.KD.ZG", labelKey: "map.ind.gdpGrowth", reverse: false },
  { code: "SI.POV.DDAY",       labelKey: "map.ind.poverty",   reverse: true  },
];

// ISO alpha-2 (World Bank) → ISO numeric (world-atlas geo.id)
const ISO2_TO_NUM = {
  AF:"4",  AL:"8",  DZ:"12", AD:"20", AO:"24", AG:"28", AZ:"31",
  AR:"32", AU:"36", AT:"40", BS:"44", BH:"48", BD:"50", AM:"51",
  BB:"52", BE:"56", BT:"64", BO:"68", BA:"70", BW:"72", BR:"76",
  BZ:"84", SB:"90", BN:"96", BG:"100",MM:"104",BI:"108",BY:"112",
  KH:"116",CM:"120",CA:"124",CV:"132",CF:"140",LK:"144",TD:"148",
  CL:"152",CN:"156",CO:"170",KM:"174",CG:"178",CD:"180",CR:"188",
  HR:"191",CU:"192",CY:"196",CZ:"203",BJ:"204",DK:"208",DM:"212",
  DO:"214",EC:"218",SV:"222",GQ:"226",ET:"231",ER:"232",EE:"233",
  FJ:"242",FI:"246",FR:"250",DJ:"262",GA:"266",GE:"268",GM:"270",
  PS:"275",DE:"276",GH:"288",GI:"292",KI:"296",GR:"300",GL:"304",
  GD:"308",GT:"320",GN:"324",GY:"328",HT:"332",HN:"340",HK:"344",
  HU:"348",IS:"352",IN:"356",ID:"360",IR:"364",IQ:"368",IE:"372",
  IL:"376",IT:"380",CI:"384",JM:"388",JP:"392",KZ:"398",JO:"400",
  KE:"404",KP:"408",KR:"410",KW:"414",KG:"417",LA:"418",LB:"422",
  LS:"426",LV:"428",LR:"430",LY:"434",LI:"438",LT:"440",LU:"442",
  MO:"446",MG:"450",MW:"454",MY:"458",MV:"462",ML:"466",MT:"470",
  MR:"478",MU:"480",MX:"484",MC:"492",MN:"496",MD:"498",ME:"499",
  MA:"504",MZ:"508",OM:"512",NA:"516",NP:"524",NL:"528",NC:"540",
  VU:"548",NZ:"554",NI:"558",NE:"562",NG:"566",NO:"578",FM:"583",
  MH:"584",PW:"585",PK:"586",PA:"591",PG:"598",PY:"600",PE:"604",
  PH:"608",PL:"616",PT:"620",GW:"624",TL:"626",QA:"634",RO:"642",
  RU:"643",RW:"646",KN:"659",LC:"662",VC:"670",SM:"674",ST:"678",
  SA:"682",SN:"686",RS:"688",SC:"690",SL:"694",SG:"702",SK:"703",
  VN:"704",SI:"705",SO:"706",ZA:"710",ZW:"716",ES:"724",SS:"728",
  SD:"736",SR:"740",SZ:"748",SE:"752",CH:"756",SY:"760",TJ:"762",
  TH:"764",TG:"768",TO:"776",TT:"780",AE:"784",TN:"788",TR:"792",
  TM:"795",UG:"800",UA:"804",MK:"807",EG:"818",GB:"826",TZ:"834",
  US:"840",BF:"854",UY:"858",UZ:"860",VE:"862",WS:"882",YE:"887",
  ZM:"894",TW:"158",EH:"732",
};

const NUM_TO_ISO2 = Object.fromEntries(
  Object.entries(ISO2_TO_NUM).map(([k, v]) => [v, k])
);

// 3-stop gradient: red → amber → blue
function mapColor(t) {
  const stops = [
    [239, 68, 68],   // red-500   at t=0
    [251, 191, 36],  // amber-400 at t=0.5
    [59, 130, 246],  // blue-500  at t=1
  ];
  let a, b, tt;
  if (t <= 0.5) {
    [a, b, tt] = [stops[0], stops[1], t * 2];
  } else {
    [a, b, tt] = [stops[1], stops[2], (t - 0.5) * 2];
  }
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*tt)},${Math.round(a[1]+(b[1]-a[1])*tt)},${Math.round(a[2]+(b[2]-a[2])*tt)})`;
}

function formatValue(v) {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + " T";
  if (abs >= 1e9)  return (v / 1e9).toFixed(2)  + " B";
  if (abs >= 1e6)  return (v / 1e6).toFixed(2)  + " M";
  if (abs >= 1e3)  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const MAX_RETRIES = 3;

export default function ChoroplethMap() {
  const { t } = useI18n();

  const [activeCode, setActiveCode]   = useState(MAP_INDICATORS[0].code);
  const [year, setYear]               = useState(null);
  const [yearRange, setYearRange]     = useState([1990, new Date().getFullYear()]);
  const [valueMap, setValueMap]       = useState({});  // ISO2 → float
  const [rankMap, setRankMap]         = useState({});  // ISO2 → 0..1 percentile rank
  const [minVal, setMinVal]           = useState(0);
  const [maxVal, setMaxVal]           = useState(1);
  const [isLoading, setIsLoading]     = useState(false);
  const [fetchKey, setFetchKey]       = useState(0);  // increment to force re-fetch

  // Derived from activeCode — high value is bad for reversed indicators
  const activeInd = MAP_INDICATORS.find((i) => i.code === activeCode) ?? MAP_INDICATORS[0];
  const reversed = activeInd.reverse;
  const displayScale = activeInd.displayScale ?? 1;
  const legendMinDisplay = activeInd.legendMin ?? null;
  const legendMaxDisplay = activeInd.legendMax ?? null;

  // Retry counter resets when indicator changes
  const retryCountRef = useRef(0);
  useEffect(() => { retryCountRef.current = 0; }, [activeCode]);

  // DOM refs for tooltip (avoids re-renders on every mouse move)
  const containerRef = useRef(null);
  const tooltipRef   = useRef(null);
  const tipName      = useRef(null);
  const tipVal       = useRef(null);

  const isDark = document.documentElement.classList.contains("dark");
  const noDataFill  = isDark ? "#16182e" : "#e4e6f4";
  const strokeColor = isDark ? "#1a1d35" : "#c5c9e0";

  // Fetch world snapshot when indicator or year changes
  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);

    fetchWorldSnapshot({ indicator: activeCode, year: year ?? undefined }, ctrl.signal)
      .then((res) => {
        const data = res.data ?? {};
        const vals = Object.values(data).filter((v) => v != null);
        setValueMap(data);
        setMinVal(vals.length ? Math.min(...vals) : 0);
        setMaxVal(vals.length ? Math.max(...vals) : 1);

        // Percentile rank with tie handling: countries with identical values
        // get the same color. reversed indicators map high→red, low→blue.
        const sorted = Object.entries(data)
          .filter(([, v]) => v != null)
          .sort((a, b) => a[1] - b[1]);
        const n = sorted.length;
        const rm = {};
        let i = 0;
        while (i < sorted.length) {
          const val = sorted[i][1];
          let j = i;
          while (j < sorted.length && sorted[j][1] === val) j++;
          // Average rank for the tied group, normalised to [0, 1]
          const avgRank = n > 1 ? ((i + j - 1) / 2) / (n - 1) : 0.5;
          const t = reversed ? 1 - avgRank : avgRank;
          for (let k = i; k < j; k++) rm[sorted[k][0]] = t;
          i = j;
        }
        setRankMap(rm);

        const resolvedYear = res.year;
        if (resolvedYear && resolvedYear > 0) {
          setYear(resolvedYear);
          setYearRange((prev) => [Math.min(prev[0], resolvedYear), Math.max(prev[1], resolvedYear)]);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    return () => ctrl.abort();
  }, [activeCode, year, fetchKey]);

  // Auto-retry when cache is empty (baseline seed may still be running on first start)
  const countryCount = Object.keys(valueMap).length;
  useEffect(() => {
    if (countryCount > 0 || isLoading || retryCountRef.current >= MAX_RETRIES) return;
    const delay = 10_000 * (retryCountRef.current + 1); // 10s, 20s, 30s
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      setFetchKey((k) => k + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [countryCount, isLoading]);

  const getCountryFill = useCallback(
    (iso2) => {
      const t = rankMap[iso2];
      if (t == null) return null;
      return mapColor(t);
    },
    [rankMap]
  );

  // Tooltip DOM manipulation
  const showTooltip = (name, value) => {
    if (!tooltipRef.current) return;
    if (tipName.current) tipName.current.textContent = name;
    if (tipVal.current)
      tipVal.current.textContent = value != null ? formatValue(value * displayScale) : t("map.noValue");
    tooltipRef.current.style.opacity = "1";
  };
  const hideTooltip = () => {
    if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
  };
  const handleMouseMove = useCallback((e) => {
    if (!tooltipRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tw = tooltipRef.current.offsetWidth  || 160;
    const th = tooltipRef.current.offsetHeight || 56;
    tooltipRef.current.style.left = `${Math.min(x + 14, rect.width  - tw - 4)}px`;
    tooltipRef.current.style.top  = `${Math.max(y - th - 10, 4)}px`;
  }, []);


  return (
    <section aria-labelledby="choropleth-heading">
      <div className="panel-wide space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="page-section-kicker">{t("map.kicker")}</span>
            <h2 id="choropleth-heading" className="panel-title mt-1">{t("map.title")}</h2>
            <p className="text-xs text-muted mt-0.5">{t("map.subtitle")}</p>
          </div>

          {/* Year slider */}
          {year != null && (
            <div className="flex items-center gap-3 shrink-0 mt-1">
              <span className="label">{t("map.year")}</span>
              <input
                type="range"
                min={yearRange[0]}
                max={yearRange[1]}
                value={year}
                step={1}
                style={{ accentColor: "var(--accent)", width: "8rem" }}
                onChange={(e) => setYear(Number(e.target.value))}
              />
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: "var(--accent)", minWidth: "3rem" }}
              >
                {year}
              </span>
            </div>
          )}
        </div>

        {/* ── Indicator tabs ── */}
        <div className="flex flex-wrap gap-2">
          {MAP_INDICATORS.map((ind) => (
            <button
              key={ind.code}
              type="button"
              className={activeCode === ind.code ? "tab-active" : "tab"}
              onClick={() => setActiveCode(ind.code)}
            >
              {t(ind.labelKey)}
            </button>
          ))}
        </div>

        {/* ── Map + tooltip ── */}
        <div
          ref={containerRef}
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={hideTooltip}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
              style={{ background: isDark ? "rgba(6,7,15,0.55)" : "rgba(240,242,250,0.60)", backdropFilter: "blur(2px)" }}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
                <span className="text-xs text-muted">{t("home.loading")}</span>
              </div>
            </div>
          )}

          {/* Map container — 16:9 aspect ratio matches ComposableMap viewBox so SVG fills exactly */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: isDark ? "#06070f" : "#eef0f8",
              aspectRatio: "16 / 9",
              width: "100%",
            }}
          >
            <ComposableMap
              width={800}
              height={450}
              projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // world-atlas stores IDs as zero-padded strings ("036" for AU).
                    // Our mapping uses numeric strings ("36"), so strip leading zeros.
                    const iso2    = NUM_TO_ISO2[String(parseInt(String(geo.id ?? ""), 10))];
                    const fill    = iso2 ? (getCountryFill(iso2) ?? noDataFill) : noDataFill;
                    const hasData = iso2 && valueMap[iso2] != null;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        stroke={strokeColor}
                        strokeWidth={0.35}
                        style={{
                          default: {
                            fill,
                            outline: "none",
                            transition: "fill 0.45s ease",
                          },
                          hover: {
                            fill: hasData ? fill : (isDark ? "#252a45" : "#d8dcef"),
                            outline: "none",
                            opacity: 0.80,
                            cursor: hasData ? "pointer" : "default",
                          },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={() => {
                          const name  = geo.properties?.name ?? (iso2 || "");
                          const value = iso2 ? (valueMap[iso2] ?? null) : null;
                          showTooltip(name, value);
                        }}
                        onMouseLeave={hideTooltip}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>

          {/* Floating tooltip */}
          <div
            ref={tooltipRef}
            className="chart-tooltip-ext"
            style={{ position: "absolute", opacity: 0, top: 0, left: 0, zIndex: 20 }}
            aria-hidden="true"
          >
            <p ref={tipName} className="ctt-title" />
            <p ref={tipVal}  className="text-xs" style={{ color: "var(--text-dim)" }} />
          </div>
        </div>

        {/* ── Legend + stats ── */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Gradient legend: red = bad, blue = good.
              For reversed indicators high is bad, so labels swap. */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted tabular-nums shrink-0">
              {legendMinDisplay != null
                ? formatValue(reversed ? legendMaxDisplay : legendMinDisplay)
                : formatValue((reversed ? maxVal : minVal) * displayScale)}
            </span>
            <div
              className="flex-1 h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, rgb(239,68,68), rgb(251,191,36), rgb(59,130,246))",
                minWidth: "80px",
              }}
            />
            <span className="text-xs text-muted tabular-nums shrink-0">
              {legendMinDisplay != null
                ? formatValue(reversed ? legendMinDisplay : legendMaxDisplay)
                : formatValue((reversed ? minVal : maxVal) * displayScale)}
            </span>
          </div>

          {/* Country count badge */}
          {countryCount > 0 && (
            <span className="badge badge-neutral shrink-0">
              {countryCount} {t("map.countries")}
            </span>
          )}

          {/* Currency note — only for USD-denominated indicators */}
          {USD_INDICATORS.has(activeCode) && (
            <span className="badge badge-neutral shrink-0 font-medium">
              $ {t("map.usdNote")}
            </span>
          )}

          {countryCount === 0 && !isLoading && (
            <span className="text-xs text-muted">{t("map.noCache")}</span>
          )}
        </div>
      </div>
    </section>
  );
}
