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

export const TEAM_THEME = {
  Mexico: { bg: "#2DA94F", text: "#000000" }, "South Africa": { bg: "#F7D117", text: "#000000" }, "South Korea": { bg: "#FF1E3C", text: "#FFFFFF" }, "Czech Republic": { bg: "#FF3131", text: "#FFFFFF" },
  Canada: { bg: "#E1251B", text: "#FFFFFF" }, "Bosnia-Herzegovina": { bg: "#2F3ED6", text: "#FFFFFF" }, Qatar: { bg: "#8A1538", text: "#FFFFFF" }, Switzerland: { bg: "#E3000F", text: "#FFFFFF" },
  Brazil: { bg: "#F7D117", text: "#000000" }, Morocco: { bg: "#E10600", text: "#FFFFFF" }, Haiti: { bg: "#1A22C9", text: "#FFFFFF" }, Scotland: { bg: "#2A248A", text: "#FFFFFF" },
  "United States": { bg: "#1B2BE0", text: "#FFFFFF" }, Paraguay: { bg: "#E10600", text: "#FFFFFF" }, Australia: { bg: "#F7C600", text: "#000000" }, Turkey: { bg: "#E10600", text: "#FFFFFF" },
  Germany: { bg: "#1A1A1A", text: "#FFFFFF" }, Curacao: { bg: "#2D6FD2", text: "#FFFFFF" }, "Ivory Coast": { bg: "#FF8A00", text: "#000000" }, Ecuador: { bg: "#F7D900", text: "#000000" },
  Netherlands: { bg: "#FF8500", text: "#000000" }, Japan: { bg: "#3131E8", text: "#FFFFFF" }, Sweden: { bg: "#F7D117", text: "#000000" }, Tunisia: { bg: "#FF1744", text: "#FFFFFF" },
  Belgium: { bg: "#9B003F", text: "#FFFFFF" }, Egypt: { bg: "#FF1744", text: "#000000" }, Iran: { bg: "#F20D1B", text: "#FFFFFF" }, "New Zealand": { bg: "#000000", text: "#FFFFFF" },
  Spain: { bg: "#F20D1B", text: "#FFFFFF" }, "Cape Verde": { bg: "#25308F", text: "#FFFFFF" }, "Saudi Arabia": { bg: "#2DA94F", text: "#FFFFFF" }, Uruguay: { bg: "#7CB5E8", text: "#000000" },
  France: { bg: "#0D47A1", text: "#FFFFFF" }, Senegal: { bg: "#F7D900", text: "#000000" }, Iraq: { bg: "#157A52", text: "#FFFFFF" }, Norway: { bg: "#D50000", text: "#FFFFFF" },
  Argentina: { bg: "#93BFEA", text: "#000000" }, Algeria: { bg: "#00A86B", text: "#FFFFFF" }, Austria: { bg: "#FF3B30", text: "#000000" }, Jordan: { bg: "#FF1E3C", text: "#000000" },
  Portugal: { bg: "#E10600", text: "#FFFFFF" }, "DR Congo": { bg: "#1E7FF0", text: "#000000" }, Uzbekistan: { bg: "#2437C6", text: "#FFFFFF" }, Colombia: { bg: "#F7D900", text: "#000000" },
  England: { bg: "#FFFFFF", text: "#000000" }, Croatia: { bg: "#FF1E1E", text: "#FFFFFF" }, Ghana: { bg: "#F5C343", text: "#000000" }, Panama: { bg: "#F20D4A", text: "#FFFFFF" },
};

export const FLAG_CC = {
  Mexico: "mx", "South Africa": "za", "South Korea": "kr", "Czech Republic": "cz", Canada: "ca", "Bosnia-Herzegovina": "ba", Qatar: "qa", Switzerland: "ch", Brazil: "br", Morocco: "ma", Haiti: "ht", Scotland: "gb-sct", "United States": "us", Paraguay: "py", Australia: "au", Turkey: "tr", Germany: "de", Curacao: "cw", "Ivory Coast": "ci", Ecuador: "ec", Netherlands: "nl", Japan: "jp", Sweden: "se", Tunisia: "tn", Belgium: "be", Egypt: "eg", Iran: "ir", "New Zealand": "nz", Spain: "es", "Cape Verde": "cv", "Saudi Arabia": "sa", Uruguay: "uy", France: "fr", Senegal: "sn", Iraq: "iq", Norway: "no", Argentina: "ar", Algeria: "dz", Austria: "at", Jordan: "jo", Portugal: "pt", "DR Congo": "cd", Uzbekistan: "uz", Colombia: "co", England: "gb-eng", Croatia: "hr", Ghana: "gh", Panama: "pa",
};

export const TEAM_CODE = { Mexico: "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE", Canada: "CAN", "Bosnia-Herzegovina": "BIH", Qatar: "QAT", Switzerland: "SUI", Brazil: "BRA", Morocco: "MAR", Haiti: "HAI", Scotland: "SCO", "United States": "USA", Paraguay: "PAR", Australia: "AUS", Turkey: "TUR", Germany: "GER", Curacao: "CUW", "Ivory Coast": "CIV", Ecuador: "ECU", Netherlands: "NED", Japan: "JPN", Sweden: "SWE", Tunisia: "TUN", Belgium: "BEL", Egypt: "EGY", Iran: "IRN", "New Zealand": "NZL", Spain: "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", Uruguay: "URU", France: "FRA", Senegal: "SEN", Iraq: "IRQ", Norway: "NOR", Argentina: "ARG", Algeria: "ALG", Austria: "AUT", Jordan: "JOR", Portugal: "POR", "DR Congo": "COD", Uzbekistan: "UZB", Colombia: "COL", England: "ENG", Croatia: "CRO", Ghana: "GHA", Panama: "PAN" };

export function getTeamTheme(team) {
  return TEAM_THEME[team] || { bg: "#F7D117", text: "#000000" };
}

export function teamCode(team) {
  return TEAM_CODE[team] || String(team || "TMA").slice(0, 3).toUpperCase();
}
