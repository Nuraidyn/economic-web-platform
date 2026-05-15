BASELINE_INDICATORS = [
    "SI.POV.GINI",  # Gini index
    "NY.GDP.MKTP.CD",  # GDP (current US$)
    "NY.GDP.PCAP.CD",  # GDP per capita (current US$)
    "NY.GDP.PCAP.KD.ZG",  # GDP per capita growth (annual %)
    "FP.CPI.TOTL.ZG",  # Inflation (annual %)
    "SL.UEM.TOTL.ZS",  # Unemployment rate (% of total labor force)
    "SI.POV.DDAY",  # Poverty headcount ratio at $2.15/day (2017 PPP) (% of population)
    "NE.CON.GOVT.ZS",  # General government final consumption expenditure (% of GDP)
    "SI.DST.FRST.20",  # Income share held by lowest 20%
    "SI.DST.05TH.20",  # Income share held by highest 20%
]

BASELINE_COUNTRIES = [
    # G20 & major economies
    "US", "CN", "DE", "JP", "FR", "IN", "BR", "ZA", "AU", "GB",
    "CA", "IT", "ES", "KR", "MX", "ID", "TR", "SA", "RU", "KZ",

    # Europe — Western & Northern
    "NL", "CH", "SE", "NO", "DK", "FI", "AT", "BE", "IE", "LU",
    "IS", "PT", "GR", "CY", "MT", "AD", "SM",

    # Europe — Central & Eastern
    "PL", "CZ", "HU", "RO", "UA", "SK", "SI", "HR", "RS", "BG",
    "BA", "MK", "AL", "ME", "MD", "BY", "LT", "LV", "EE",

    # Caucasus & Central Asia
    "GE", "AM", "AZ", "UZ", "TJ", "TM", "KG", "MN",

    # Middle East
    "IL", "IR", "IQ", "JO", "LB", "SY", "YE", "AE", "QA", "KW", "BH", "OM",

    # North Africa
    "EG", "MA", "DZ", "TN", "LY", "SD",

    # Sub-Saharan Africa — all 54 sovereign states
    "NG", "ET", "CD", "TZ", "KE", "UG", "AO", "GH", "MZ", "MG",
    "CM", "CI", "NE", "BF", "ML", "MW", "ZM", "SN", "ZW", "TD",
    "GN", "RW", "SS", "BJ", "BI", "ER", "TG", "SL", "LR", "CF",
    "MR", "SO", "CG", "GA", "NA", "BW", "LS", "GW", "GM", "GQ",
    "SZ", "DJ", "KM", "CV", "ST", "SC", "MU",

    # South & Southeast Asia
    "PK", "BD", "NP", "LK", "AF", "BT", "MV", "MM", "TH", "VN",
    "MY", "PH", "KH", "LA", "TL", "SG", "BN",

    # East Asia & Pacific
    "NZ", "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "MH", "FM", "PW",

    # Americas — North & Central
    "GT", "BZ", "HN", "SV", "NI", "CR", "PA",

    # Americas — Caribbean
    "CU", "JM", "HT", "DO", "TT", "BB", "BS", "LC", "VC", "GD", "KN", "DM", "AG",

    # Americas — South
    "AR", "CO", "CL", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR",
]
