from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Country, Indicator
from app.schemas import CountryRead, IndicatorRead

router = APIRouter(tags=["catalog"])


DEFAULT_COUNTRIES = [
    {"code": "AF", "name": "Afghanistan"},
    {"code": "AL", "name": "Albania"},
    {"code": "DZ", "name": "Algeria"},
    {"code": "AO", "name": "Angola"},
    {"code": "AR", "name": "Argentina"},
    {"code": "AM", "name": "Armenia"},
    {"code": "AU", "name": "Australia"},
    {"code": "AT", "name": "Austria"},
    {"code": "AZ", "name": "Azerbaijan"},
    {"code": "BD", "name": "Bangladesh"},
    {"code": "BY", "name": "Belarus"},
    {"code": "BE", "name": "Belgium"},
    {"code": "BJ", "name": "Benin"},
    {"code": "BO", "name": "Bolivia"},
    {"code": "BA", "name": "Bosnia and Herzegovina"},
    {"code": "BW", "name": "Botswana"},
    {"code": "BR", "name": "Brazil"},
    {"code": "BN", "name": "Brunei"},
    {"code": "BG", "name": "Bulgaria"},
    {"code": "BF", "name": "Burkina Faso"},
    {"code": "BI", "name": "Burundi"},
    {"code": "KH", "name": "Cambodia"},
    {"code": "CM", "name": "Cameroon"},
    {"code": "CA", "name": "Canada"},
    {"code": "CF", "name": "Central African Republic"},
    {"code": "TD", "name": "Chad"},
    {"code": "CL", "name": "Chile"},
    {"code": "CN", "name": "China"},
    {"code": "CO", "name": "Colombia"},
    {"code": "CD", "name": "Congo, Dem. Rep."},
    {"code": "CG", "name": "Congo, Rep."},
    {"code": "CR", "name": "Costa Rica"},
    {"code": "CI", "name": "Cote d'Ivoire"},
    {"code": "HR", "name": "Croatia"},
    {"code": "CU", "name": "Cuba"},
    {"code": "CZ", "name": "Czech Republic"},
    {"code": "DK", "name": "Denmark"},
    {"code": "DO", "name": "Dominican Republic"},
    {"code": "EC", "name": "Ecuador"},
    {"code": "EG", "name": "Egypt"},
    {"code": "SV", "name": "El Salvador"},
    {"code": "ET", "name": "Ethiopia"},
    {"code": "FI", "name": "Finland"},
    {"code": "FR", "name": "France"},
    {"code": "GA", "name": "Gabon"},
    {"code": "GE", "name": "Georgia"},
    {"code": "DE", "name": "Germany"},
    {"code": "GH", "name": "Ghana"},
    {"code": "GR", "name": "Greece"},
    {"code": "GT", "name": "Guatemala"},
    {"code": "GN", "name": "Guinea"},
    {"code": "HT", "name": "Haiti"},
    {"code": "HN", "name": "Honduras"},
    {"code": "HK", "name": "Hong Kong"},
    {"code": "HU", "name": "Hungary"},
    {"code": "IS", "name": "Iceland"},
    {"code": "IN", "name": "India"},
    {"code": "ID", "name": "Indonesia"},
    {"code": "IR", "name": "Iran"},
    {"code": "IQ", "name": "Iraq"},
    {"code": "IE", "name": "Ireland"},
    {"code": "IL", "name": "Israel"},
    {"code": "IT", "name": "Italy"},
    {"code": "JM", "name": "Jamaica"},
    {"code": "JP", "name": "Japan"},
    {"code": "JO", "name": "Jordan"},
    {"code": "KZ", "name": "Kazakhstan"},
    {"code": "KE", "name": "Kenya"},
    {"code": "KW", "name": "Kuwait"},
    {"code": "KG", "name": "Kyrgyzstan"},
    {"code": "LA", "name": "Laos"},
    {"code": "LV", "name": "Latvia"},
    {"code": "LB", "name": "Lebanon"},
    {"code": "LY", "name": "Libya"},
    {"code": "LT", "name": "Lithuania"},
    {"code": "LU", "name": "Luxembourg"},
    {"code": "MG", "name": "Madagascar"},
    {"code": "MW", "name": "Malawi"},
    {"code": "MY", "name": "Malaysia"},
    {"code": "ML", "name": "Mali"},
    {"code": "MR", "name": "Mauritania"},
    {"code": "MX", "name": "Mexico"},
    {"code": "MD", "name": "Moldova"},
    {"code": "MN", "name": "Mongolia"},
    {"code": "MA", "name": "Morocco"},
    {"code": "MZ", "name": "Mozambique"},
    {"code": "MM", "name": "Myanmar"},
    {"code": "NA", "name": "Namibia"},
    {"code": "NP", "name": "Nepal"},
    {"code": "NL", "name": "Netherlands"},
    {"code": "NZ", "name": "New Zealand"},
    {"code": "NI", "name": "Nicaragua"},
    {"code": "NE", "name": "Niger"},
    {"code": "NG", "name": "Nigeria"},
    {"code": "MK", "name": "North Macedonia"},
    {"code": "NO", "name": "Norway"},
    {"code": "OM", "name": "Oman"},
    {"code": "PK", "name": "Pakistan"},
    {"code": "PA", "name": "Panama"},
    {"code": "PG", "name": "Papua New Guinea"},
    {"code": "PY", "name": "Paraguay"},
    {"code": "PE", "name": "Peru"},
    {"code": "PH", "name": "Philippines"},
    {"code": "PL", "name": "Poland"},
    {"code": "PT", "name": "Portugal"},
    {"code": "QA", "name": "Qatar"},
    {"code": "RO", "name": "Romania"},
    {"code": "RU", "name": "Russia"},
    {"code": "RW", "name": "Rwanda"},
    {"code": "SA", "name": "Saudi Arabia"},
    {"code": "SN", "name": "Senegal"},
    {"code": "RS", "name": "Serbia"},
    {"code": "SL", "name": "Sierra Leone"},
    {"code": "SG", "name": "Singapore"},
    {"code": "SK", "name": "Slovakia"},
    {"code": "SI", "name": "Slovenia"},
    {"code": "SO", "name": "Somalia"},
    {"code": "ZA", "name": "South Africa"},
    {"code": "SS", "name": "South Sudan"},
    {"code": "ES", "name": "Spain"},
    {"code": "LK", "name": "Sri Lanka"},
    {"code": "SD", "name": "Sudan"},
    {"code": "SE", "name": "Sweden"},
    {"code": "CH", "name": "Switzerland"},
    {"code": "SY", "name": "Syria"},
    {"code": "TW", "name": "Taiwan"},
    {"code": "TJ", "name": "Tajikistan"},
    {"code": "TZ", "name": "Tanzania"},
    {"code": "TH", "name": "Thailand"},
    {"code": "TG", "name": "Togo"},
    {"code": "TT", "name": "Trinidad and Tobago"},
    {"code": "TN", "name": "Tunisia"},
    {"code": "TR", "name": "Turkey"},
    {"code": "TM", "name": "Turkmenistan"},
    {"code": "UG", "name": "Uganda"},
    {"code": "UA", "name": "Ukraine"},
    {"code": "AE", "name": "United Arab Emirates"},
    {"code": "GB", "name": "United Kingdom"},
    {"code": "US", "name": "United States"},
    {"code": "UY", "name": "Uruguay"},
    {"code": "UZ", "name": "Uzbekistan"},
    {"code": "VE", "name": "Venezuela"},
    {"code": "VN", "name": "Vietnam"},
    {"code": "YE", "name": "Yemen"},
    {"code": "ZM", "name": "Zambia"},
    {"code": "ZW", "name": "Zimbabwe"},
]


DEFAULT_INDICATORS = [
    {"code": "SI.POV.GINI", "name": "Gini Index", "source": "world_bank"},
    {"code": "NY.GDP.MKTP.CD", "name": "GDP (current US$)", "source": "world_bank"},
    {"code": "NY.GDP.PCAP.CD", "name": "GDP per capita (current US$)", "source": "world_bank"},
    {"code": "NY.GDP.PCAP.KD.ZG", "name": "GDP per capita growth (annual %)", "source": "world_bank"},
    {"code": "FP.CPI.TOTL.ZG", "name": "Inflation (annual %)", "source": "world_bank"},
    {"code": "SL.UEM.TOTL.ZS", "name": "Unemployment rate (%)", "source": "world_bank"},
    {"code": "SI.POV.DDAY", "name": "Poverty headcount ($2.15/day)", "source": "world_bank"},
    {"code": "NE.CON.GOVT.ZS", "name": "Government consumption (% of GDP)", "source": "world_bank"},
    {"code": "SI.DST.FRST.20", "name": "Income share lowest 20%", "source": "world_bank"},
    {"code": "SI.DST.05TH.20", "name": "Income share highest 20%", "source": "world_bank"},
]


@router.get("/countries", response_model=list[CountryRead])
def list_countries(db: Session = Depends(get_db)):
    rows = db.query(Country).order_by(Country.name).all()
    defaults_by_code = {row["code"].upper(): row["name"] for row in DEFAULT_COUNTRIES}
    by_code: dict[str, Country | CountryRead] = {}
    max_id = 0
    for row in rows:
        code = row.code.upper()
        by_code[code] = row
        if row.id and row.id > max_id:
            max_id = row.id

    for code, name in defaults_by_code.items():
        if code in by_code:
            continue
        max_id += 1
        by_code[code] = CountryRead(id=max_id, code=code, name=name)

    result: list[CountryRead] = []
    for code, entry in by_code.items():
        if isinstance(entry, Country):
            display_name = entry.name
            if display_name == entry.code and code in defaults_by_code:
                display_name = defaults_by_code[code]
            result.append(CountryRead(id=entry.id, code=entry.code, name=display_name))
        else:
            result.append(entry)

    result.sort(key=lambda item: item.name)
    return result


@router.get("/indicators", response_model=list[IndicatorRead])
def list_indicators(db: Session = Depends(get_db)):
    rows = db.query(Indicator).order_by(Indicator.code).all()
    defaults_by_code = {row["code"]: row["name"] for row in DEFAULT_INDICATORS}

    if rows:
        result = []
        for row in rows:
            display_name = row.name
            if display_name == row.code and row.code in defaults_by_code:
                display_name = defaults_by_code[row.code]
            result.append(
                IndicatorRead(
                    id=row.id,
                    code=row.code,
                    name=display_name,
                    source=row.source,
                    unit=row.unit,
                    description=row.description,
                )
            )
        return result

    return [
        IndicatorRead(
            id=index + 1,
            code=row["code"],
            name=row["name"],
            source=row["source"],
            unit=None,
            description=None,
        )
        for index, row in enumerate(DEFAULT_INDICATORS)
    ]
