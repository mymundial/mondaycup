export const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const GROUP_LETTERS = Object.keys(GROUPS);

export const HOST_TEAMS = [
  { name: "Canada", group: "B", code: "CAN" },
  { name: "Mexico", group: "A", code: "MEX" },
  { name: "United States", group: "D", code: "USA" },
];

export const TEAM_RANK = {
  France: 1, Spain: 2, Argentina: 3, England: 4, Portugal: 5, Brazil: 6, Netherlands: 7, Morocco: 8,
  Belgium: 9, Germany: 10, Croatia: 11, Colombia: 12, Senegal: 13, Mexico: 14, "United States": 15,
  Uruguay: 16, Japan: 17, Switzerland: 18, Iran: 19, Turkey: 20, Ecuador: 21, Austria: 22,
  "South Korea": 23, Australia: 24, Algeria: 25, Egypt: 26, Canada: 27, Norway: 28, Panama: 29,
  "Ivory Coast": 30, Sweden: 31, Paraguay: 32, "Czech Republic": 33, Scotland: 34, Tunisia: 35,
  "DR Congo": 36, Uzbekistan: 37, Qatar: 38, Iraq: 39, "South Africa": 40, "Saudi Arabia": 41,
  Jordan: 42, "Bosnia-Herzegovina": 43, "Cape Verde": 44, Ghana: 45, Curacao: 46, Haiti: 47,
  "New Zealand": 48,
};

export const TEAM_COLOURS = {
  Mexico: { first: "#0B6B3A", second: "#FFFFFF", third: "#C8102E" },
  "South Africa": { first: "#F7D117", second: "#00843D", third: "#111111" },
  "South Korea": { first: "#E6002D", second: "#111111", third: "#FFFFFF" },
  "Czech Republic": { first: "#D7141A", second: "#11457E", third: "#FFFFFF" },
  Canada: { first: "#E1251B", second: "#FFFFFF", third: "#111111" },
  "Bosnia-Herzegovina": { first: "#1F4ED8", second: "#F7D117", third: "#FFFFFF" },
  Qatar: { first: "#8A1538", second: "#FFFFFF", third: "#111111" },
  Switzerland: { first: "#E3000F", second: "#FFFFFF", third: "#111111" },
  Brazil: { first: "#F7D117", second: "#009C3B", third: "#002776" },
  Morocco: { first: "#C1272D", second: "#006233", third: "#FFFFFF" },
  Haiti: { first: "#00209F", second: "#D21034", third: "#FFFFFF" },
  Scotland: { first: "#1A2D6B", second: "#FFFFFF", third: "#111111" },
  "United States": { first: "#FFFFFF", second: "#1F2A44", third: "#C8102E" },
  Paraguay: { first: "#D52B1E", second: "#0038A8", third: "#FFFFFF" },
  Australia: { first: "#F7C600", second: "#007A3D", third: "#111111" },
  Turkey: { first: "#E30A17", second: "#FFFFFF", third: "#111111" },
  Germany: { first: "#FFFFFF", second: "#111111", third: "#D7A500" },
  Curacao: { first: "#005EB8", second: "#F7D117", third: "#FFFFFF" },
  "Ivory Coast": { first: "#F77F00", second: "#009E60", third: "#FFFFFF" },
  Ecuador: { first: "#F7D900", second: "#002B7F", third: "#CE1126" },
  Netherlands: { first: "#FF7900", second: "#111111", third: "#FFFFFF" },
  Japan: { first: "#003DA5", second: "#FFFFFF", third: "#BC002D" },
  Sweden: { first: "#F7D117", second: "#005293", third: "#111111" },
  Tunisia: { first: "#FFFFFF", second: "#E70013", third: "#111111" },
  Belgium: { first: "#D90F2F", second: "#111111", third: "#F7D117" },
  Egypt: { first: "#CE1126", second: "#FFFFFF", third: "#111111" },
  Iran: { first: "#FFFFFF", second: "#239F40", third: "#DA0000" },
  "New Zealand": { first: "#FFFFFF", second: "#111111", third: "#C0C0C0" },
  Spain: { first: "#C60B1E", second: "#F7D117", third: "#002B7F" },
  "Cape Verde": { first: "#003893", second: "#F7D117", third: "#FFFFFF" },
  "Saudi Arabia": { first: "#006C35", second: "#FFFFFF", third: "#111111" },
  Uruguay: { first: "#7CB5E8", second: "#111111", third: "#FFFFFF" },
  France: { first: "#102A5E", second: "#FFFFFF", third: "#C8102E" },
  Senegal: { first: "#FFFFFF", second: "#00853F", third: "#F7D117" },
  Iraq: { first: "#007A3D", second: "#FFFFFF", third: "#CE1126" },
  Norway: { first: "#BA0C2F", second: "#00205B", third: "#FFFFFF" },
  Argentina: { first: "#75AADB", second: "#FFFFFF", third: "#1F2A44" },
  Algeria: { first: "#FFFFFF", second: "#006233", third: "#D21034" },
  Austria: { first: "#ED2939", second: "#FFFFFF", third: "#111111" },
  Jordan: { first: "#FFFFFF", second: "#CE1126", third: "#007A3D" },
  Portugal: { first: "#B30B18", second: "#006A4E", third: "#FFFFFF" },
  "DR Congo": { first: "#007FFF", second: "#F7D117", third: "#CE1126" },
  Uzbekistan: { first: "#FFFFFF", second: "#1EB6E8", third: "#009B77" },
  Colombia: { first: "#F7D117", second: "#003893", third: "#CE1126" },
  England: { first: "#FFFFFF", second: "#C8102E", third: "#1F2A44" },
  Croatia: { first: "#FFFFFF", second: "#C7222A", third: "#23408E" },
  Ghana: { first: "#FFFFFF", second: "#111111", third: "#F7D117" },
  Panama: { first: "#C8102E", second: "#FFFFFF", third: "#005293" },
};

export const TEAM_THEME = Object.fromEntries(
  Object.entries(TEAM_COLOURS).map(([team, colours]) => [team, {
    bg: colours.first,
    text: colours.second,
    accent: colours.third,
    primary: colours.first,
    secondary: colours.second,
    tertiary: colours.third,
    first: colours.first,
    second: colours.second,
    third: colours.third,
  }])
);


export const FLAG_CC = {
  Mexico: "mx", "South Africa": "za", "South Korea": "kr", "Czech Republic": "cz", Canada: "ca", "Bosnia-Herzegovina": "ba", Qatar: "qa", Switzerland: "ch", Brazil: "br", Morocco: "ma", Haiti: "ht", Scotland: "gb-sct", "United States": "us", Paraguay: "py", Australia: "au", Turkey: "tr", Germany: "de", Curacao: "cw", "Ivory Coast": "ci", Ecuador: "ec", Netherlands: "nl", Japan: "jp", Sweden: "se", Tunisia: "tn", Belgium: "be", Egypt: "eg", Iran: "ir", "New Zealand": "nz", Spain: "es", "Cape Verde": "cv", "Saudi Arabia": "sa", Uruguay: "uy", France: "fr", Senegal: "sn", Iraq: "iq", Norway: "no", Argentina: "ar", Algeria: "dz", Austria: "at", Jordan: "jo", Portugal: "pt", "DR Congo": "cd", Uzbekistan: "uz", Colombia: "co", England: "gb-eng", Croatia: "hr", Ghana: "gh", Panama: "pa",
};

export const TEAM_CODE = { Mexico: "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE", Canada: "CAN", "Bosnia-Herzegovina": "BIH", Qatar: "QAT", Switzerland: "SUI", Brazil: "BRA", Morocco: "MAR", Haiti: "HAI", Scotland: "SCO", "United States": "USA", Paraguay: "PAR", Australia: "AUS", Turkey: "TUR", Germany: "GER", Curacao: "CUW", "Ivory Coast": "CIV", Ecuador: "ECU", Netherlands: "NED", Japan: "JPN", Sweden: "SWE", Tunisia: "TUN", Belgium: "BEL", Egypt: "EGY", Iran: "IRN", "New Zealand": "NZL", Spain: "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", Uruguay: "URU", France: "FRA", Senegal: "SEN", Iraq: "IRQ", Norway: "NOR", Argentina: "ARG", Algeria: "ALG", Austria: "AUT", Jordan: "JOR", Portugal: "POR", "DR Congo": "COD", Uzbekistan: "UZB", Colombia: "COL", England: "ENG", Croatia: "CRO", Ghana: "GHA", Panama: "PAN" };

export function getTeamTheme(team) {
  return TEAM_THEME[team] || {
    bg: "#F7D117",
    text: "#000000",
    accent: "#FFFFFF",
    primary: "#F7D117",
    secondary: "#000000",
    tertiary: "#FFFFFF",
    first: "#F7D117",
    second: "#000000",
    third: "#FFFFFF",
  };
}

export function teamCode(team) {
  return TEAM_CODE[team] || String(team || "TMA").slice(0, 3).toUpperCase();
}
