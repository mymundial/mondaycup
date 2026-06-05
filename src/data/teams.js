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
  Mexico: { first: "#2BA84A", second: "#111111", third: "#C8102E" },
  "South Africa": { first: "#FFD800", second: "#111111", third: "#007A3D" },
  "South Korea": { first: "#FF2442", second: "#111111", third: "#0047A0" },
  "Czech Republic": { first: "#FF2A2F", second: "#111111", third: "#11457E" },
  Canada: { first: "#DD2A1F", second: "#FFFFFF", third: "#111111" },
  "Bosnia-Herzegovina": { first: "#2E3FDC", second: "#FFFFFF", third: "#F7D117" },
  Qatar: { first: "#981B45", second: "#FFFFFF", third: "#111111" },
  Switzerland: { first: "#E80008", second: "#FFFFFF", third: "#111111" },
  Brazil: { first: "#FFD22E", second: "#111111", third: "#009C3B" },
  Morocco: { first: "#E00000", second: "#111111", third: "#006233" },
  Haiti: { first: "#0B1BC2", second: "#FFFFFF", third: "#D21034" },
  Scotland: { first: "#25247D", second: "#FFFFFF", third: "#111111" },
  "United States": { first: "#0B30E8", second: "#FFFFFF", third: "#C8102E" },
  Paraguay: { first: "#E00000", second: "#FFFFFF", third: "#0038A8" },
  Australia: { first: "#FFC000", second: "#111111", third: "#007A3D" },
  Turkey: { first: "#FFFFFF", second: "#111111", third: "#E30A17" },
  Germany: { first: "#202020", second: "#FFFFFF", third: "#D7A500" },
  Curacao: { first: "#2D75D6", second: "#FFFFFF", third: "#F7D117" },
  "Ivory Coast": { first: "#FF8500", second: "#111111", third: "#009E60" },
  Ecuador: { first: "#FFD70D", second: "#111111", third: "#002B7F" },
  Netherlands: { first: "#FF7900", second: "#111111", third: "#FFFFFF" },
  Japan: { first: "#3030E0", second: "#FFFFFF", third: "#BC002D" },
  Sweden: { first: "#3A8245", second: "#FFFFFF", third: "#F7D117" },
  Tunisia: { first: "#EF1426", second: "#FFFFFF", third: "#111111" },
  Belgium: { first: "#9E0034", second: "#FFFFFF", third: "#F7D117" },
  Egypt: { first: "#F20A18", second: "#111111", third: "#FFFFFF" },
  Iran: { first: "#E41C1B", second: "#FFFFFF", third: "#239F40" },
  "New Zealand": { first: "#000000", second: "#FFFFFF", third: "#C0C0C0" },
  Spain: { first: "#FF0603", second: "#111111", third: "#F7D117" },
  "Cape Verde": { first: "#26357D", second: "#FFFFFF", third: "#F7D117" },
  "Saudi Arabia": { first: "#2BA850", second: "#111111", third: "#FFFFFF" },
  Uruguay: { first: "#72B9F0", second: "#111111", third: "#FFFFFF" },
  France: { first: "#0F4E91", second: "#FFFFFF", third: "#C8102E" },
  Senegal: { first: "#FFDD00", second: "#111111", third: "#00853F" },
  Iraq: { first: "#137A5B", second: "#FFFFFF", third: "#CE1126" },
  Norway: { first: "#D30000", second: "#FFFFFF", third: "#00205B" },
  Argentina: { first: "#9BC7EA", second: "#111111", third: "#1F2A44" },
  Algeria: { first: "#00A767", second: "#111111", third: "#D21034" },
  Austria: { first: "#F23932", second: "#111111", third: "#FFFFFF" },
  Jordan: { first: "#FF201C", second: "#111111", third: "#007A3D" },
  Portugal: { first: "#FF100D", second: "#111111", third: "#006A4E" },
  "DR Congo": { first: "#118CEC", second: "#111111", third: "#F7D117" },
  Uzbekistan: { first: "#1A32B9", second: "#FFFFFF", third: "#009B77" },
  Colombia: { first: "#FFD800", second: "#111111", third: "#003893" },
  England: { first: "#FFFFFF", second: "#111111", third: "#C8102E" },
  Croatia: { first: "#F60707", second: "#111111", third: "#23408E" },
  Ghana: { first: "#FFC000", second: "#111111", third: "#111111" },
  Panama: { first: "#EB1531", second: "#FFFFFF", third: "#005293" },
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
