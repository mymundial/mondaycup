import { useEffect, useMemo, useRef, useState } from "react";
import { captureShareElementBlob, reserveShareWindow, shareOrDownloadResult } from "../../utils/shareExport.js";
import { PitchPageBackground } from "../layout/PitchPageBackground.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { teamToGameTeam } from "../../logic/matchPresentation.js";
import { GAME } from "../../logic/penaltyEngine.js";
import { getTeamTheme } from "../../data/teams.js";
import {
  BADGE_OPTIONS,
  BG_OPTIONS,
  CROWD_OPTIONS,
  DARK_GREEN,
  EXPORT_STATES,
  FLASH_BG_OPTIONS,
  FONT_OPTIONS,
  FONT_STYLE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  IVORY,
  LED_YELLOW,
  SCORE_DISPLAY_OPTIONS,
  SD_OPTIONS,
  SHARE_PREVIEW_CLASS,
  SHIRT_COMPOSITION_STORAGE_KEY,
  SHIRT_DEFAULT_BG,
  SHIRT_DEFAULT_COMPOSITION,
} from "./shareConstants.js";
import {
  backgroundFor,
  hexWithAlpha,
  initialAttemptSequence,
  padMarkers,
  previewTicker,
  scoreFromProps,
} from "./shareUtils.jsx";
import {
  BracketPreview,
  PitchMow,
  PosterPreview,
  ShareMatchPreview,
  ShirtPosterPreview,
} from "./SharePreviews.jsx";
import { createShirtPosterBlob, normaliseInitialShirt } from "./ShirtShareModal.jsx";
import {
  CheckboxControl,
  ColourInput,
  Field,
  MarkerControl,
  MiniSegment,
  PanelPager,
  PositionSelect,
  RangeInput,
  SelectInput,
  TeamSelect,
  TextInput,
  ToggleButton,
  XYScaleControls,
  applyTeamShirtColourway,
} from "./ShareEditorControls.jsx";

export { ShareMatchPreview, ShirtPosterPreview } from "./SharePreviews.jsx";

export function ShareScreen({
  menuProps = {},
  team = "Ghana",
  opponent = "France",
  score = [0, 0],
  matchResult = null,
  stageLabel = "FINAL",
  currentUser = null,
  initialShirt = null,
}) {
  const frameRef = useRef(null);
  const [shareBusy, setShareBusy] = useState(false);

  const initialTeamA = team || matchResult?.home || "Ghana";
  const initialTeamB = opponent || matchResult?.away || "France";
  const initialScore = scoreFromProps({ team: initialTeamA, opponent: initialTeamB, score, matchResult });
  const initialTicker = previewTicker({ team: initialTeamA, opponent: initialTeamB, matchResult });
  const initialShareShirt = useMemo(() => normaliseInitialShirt(initialShirt, currentUser), [initialShirt, currentUser]);

  const [exportIndex, setExportIndex] = useState(0);
  const [matchEditorPanelIndex, setMatchEditorPanelIndex] = useState(0);
  const [shirtEditorPanelIndex, setShirtEditorPanelIndex] = useState(0);
  const [shirtCompositionLocked, setShirtCompositionLocked] = useState(false);
  const [teamA, setTeamA] = useState(initialTeamA);
  const [teamB, setTeamB] = useState(initialTeamB);
  const [scoreA, setScoreA] = useState(initialScore.user);
  const [scoreB, setScoreB] = useState(initialScore.opponent);
  const [stageTitle, setStageTitle] = useState(stageLabel || "FINAL");
  const [editMatchState, setEditMatchState] = useState(false);
  const [suddenDeathSlots, setSuddenDeathSlots] = useState(0);
  const [showMarkers, setShowMarkers] = useState(true);
  const [markerText, setMarkerText] = useState("PENS 5-4");
  const [usernameEnabled, setUsernameEnabled] = useState(false);
  const [username, setUsername] = useState("MYMUNDIAL");
  const [teamAMarkers, setTeamAMarkers] = useState(() => initialAttemptSequence(matchResult?.attempts?.user, initialScore.user));
  const [teamBMarkers, setTeamBMarkers] = useState(() => initialAttemptSequence(matchResult?.attempts?.opponent, initialScore.opponent));
  const [flashText, setFlashText] = useState(initialTicker);
  const [flashBgMode, setFlashBgMode] = useState("teamA");
  const [customFlashBg, setCustomFlashBg] = useState(LED_YELLOW);
  const [flashFontColour, setFlashFontColour] = useState(IVORY);
  const [crowdStage, setCrowdStage] = useState(stageLabel || "FINAL");
  const [badgeMode, setBadgeMode] = useState("none");
  const [showGoalkeeper, setShowGoalkeeper] = useState(false);
  const [goalkeeperPosition, setGoalkeeperPosition] = useState("CM");
  const [showBall, setShowBall] = useState(false);
  const [ballPosition, setBallPosition] = useState("spot");
  const [matchScoreboardHeight, setMatchScoreboardHeight] = useState(34);
  const [matchTextColour, setMatchTextColour] = useState(LED_YELLOW);
  const [matchFontType, setMatchFontType] = useState("led");
  const [matchOutlineWeight, setMatchOutlineWeight] = useState(0);
  const [matchOutlineColour, setMatchOutlineColour] = useState(DARK_GREEN);
  const [matchShowStage, setMatchShowStage] = useState(true);
  const [matchStageBox, setMatchStageBox] = useState(true);
  const [matchStageScale, setMatchStageScale] = useState(1);
  const [matchStageX, setMatchStageX] = useState(0);
  const [matchStageY, setMatchStageY] = useState(0);
  const [matchShowFlags, setMatchShowFlags] = useState(true);
  const [matchFlagScale, setMatchFlagScale] = useState(1);
  const [matchFlagAX, setMatchFlagAX] = useState(0);
  const [matchFlagAY, setMatchFlagAY] = useState(0);
  const [matchFlagBX, setMatchFlagBX] = useState(0);
  const [matchFlagBY, setMatchFlagBY] = useState(0);
  const [matchShowTeamCodes, setMatchShowTeamCodes] = useState(true);
  const [matchTeamScale, setMatchTeamScale] = useState(1);
  const [matchTeamAX, setMatchTeamAX] = useState(0);
  const [matchTeamAY, setMatchTeamAY] = useState(0);
  const [matchTeamBX, setMatchTeamBX] = useState(0);
  const [matchTeamBY, setMatchTeamBY] = useState(0);
  const [matchShowScore, setMatchShowScore] = useState(true);
  const [matchScoreDisplayMode, setMatchScoreDisplayMode] = useState("score");
  const [matchBorderEnabled, setMatchBorderEnabled] = useState(true);
  const [matchBorderColour, setMatchBorderColour] = useState("#0B5F35");
  const [matchScoreScale, setMatchScoreScale] = useState(1);
  const [matchScoreX, setMatchScoreX] = useState(0);
  const [matchScoreY, setMatchScoreY] = useState(0);
  const [matchMarkerBox, setMatchMarkerBox] = useState(true);
  const [matchMarkerScale, setMatchMarkerScale] = useState(1);
  const [matchMarkerAX, setMatchMarkerAX] = useState(0);
  const [matchMarkerAY, setMatchMarkerAY] = useState(0);
  const [matchMarkerBX, setMatchMarkerBX] = useState(0);
  const [matchMarkerBY, setMatchMarkerBY] = useState(0);
  const [matchUsernameScale, setMatchUsernameScale] = useState(1);
  const [matchUsernameX, setMatchUsernameX] = useState(0);
  const [matchUsernameY, setMatchUsernameY] = useState(0);
  const [matchFlashBox, setMatchFlashBox] = useState(true);
  const [matchFlashScale, setMatchFlashScale] = useState(1);
  const [matchFlashX, setMatchFlashX] = useState(0);
  const [matchFlashY, setMatchFlashY] = useState(0);
  const [matchFlashFontType, setMatchFlashFontType] = useState("bold");
  const [matchFlashOutlineWeight, setMatchFlashOutlineWeight] = useState(0);
  const [matchFlashOutlineColour, setMatchFlashOutlineColour] = useState(DARK_GREEN);
  const [matchBadgeScale, setMatchBadgeScale] = useState(1);
  const [matchBadgeX, setMatchBadgeX] = useState(0);
  const [matchBadgeY, setMatchBadgeY] = useState(0);
  const [matchGoalkeeperScale, setMatchGoalkeeperScale] = useState(1);
  const [matchBallScale, setMatchBallScale] = useState(1);
  const [matchPitchHeight, setMatchPitchHeight] = useState(620);

  const [posterTitle, setPosterTitle] = useState("COMING SOON");
  const [posterSubtitle, setPosterSubtitle] = useState("");
  const [posterSecondSubtitle, setPosterSecondSubtitle] = useState("");
  const [posterShowLogo, setPosterShowLogo] = useState(true);
  const [posterLogoGlow, setPosterLogoGlow] = useState(true);
  const [posterLogoShadow, setPosterLogoShadow] = useState(false);
  const [posterBgMode, setPosterBgMode] = useState("pitch");
  const [posterBgTeam, setPosterBgTeam] = useState(initialTeamA);
  const [posterCustomBg, setPosterCustomBg] = useState(DARK_GREEN);
  const [posterFontColour, setPosterFontColour] = useState(LED_YELLOW);
  const [posterTitleFontType, setPosterTitleFontType] = useState("led");
  const [posterSubtitleFontType, setPosterSubtitleFontType] = useState("bold");
  const [posterSecondSubtitleFontType, setPosterSecondSubtitleFontType] = useState("bold");
  const [posterShowBrothers, setPosterShowBrothers] = useState(true);
  const [posterLogoScale, setPosterLogoScale] = useState(1);
  const [posterTitleScale, setPosterTitleScale] = useState(1);
  const [posterSubtitleScale, setPosterSubtitleScale] = useState(1);
  const [posterSecondSubtitleScale, setPosterSecondSubtitleScale] = useState(1);
  const [posterBrothersScale, setPosterBrothersScale] = useState(1);
  const [posterLogoY, setPosterLogoY] = useState(0);
  const [posterTitleY, setPosterTitleY] = useState(0);
  const [posterSubtitleY, setPosterSubtitleY] = useState(0);
  const [posterSecondSubtitleY, setPosterSecondSubtitleY] = useState(0);
  const [posterBrothersY, setPosterBrothersY] = useState(0);
  const [posterLogoX, setPosterLogoX] = useState(0);
  const [posterTitleX, setPosterTitleX] = useState(0);
  const [posterSubtitleX, setPosterSubtitleX] = useState(0);
  const [posterSecondSubtitleX, setPosterSecondSubtitleX] = useState(0);
  const [posterBrothersX, setPosterBrothersX] = useState(0);
  const [posterTitleColour, setPosterTitleColour] = useState(LED_YELLOW);
  const [posterSubtitleColour, setPosterSubtitleColour] = useState(IVORY);
  const [posterSecondSubtitleColour, setPosterSecondSubtitleColour] = useState(IVORY);
  const [posterOutlineWeight, setPosterOutlineWeight] = useState(0);
  const [posterOutlineColour, setPosterOutlineColour] = useState(DARK_GREEN);
  const [posterGlowColour, setPosterGlowColour] = useState(LED_YELLOW);
  const [posterGlowOpacity, setPosterGlowOpacity] = useState(0.3);
  const [posterGlowBrightness, setPosterGlowBrightness] = useState(1.1);
  const [posterShadowOpacity, setPosterShadowOpacity] = useState(0.3);

  const [bracketTitle, setBracketTitle] = useState("ROAD TO THE FINAL");
  const [bracketChampion, setBracketChampion] = useState(initialTeamA);

  const [shirtTeam, setShirtTeam] = useState(initialShareShirt.team);
  const [shirtName, setShirtName] = useState(initialShareShirt.name);
  const [shirtNumber, setShirtNumber] = useState(initialShareShirt.number);
  const [shirtShowMondayLogo, setShirtShowMondayLogo] = useState(true);
  const [shirtShowBrothers, setShirtShowBrothers] = useState(true);
  const [shirtShowTeam, setShirtShowTeam] = useState(false);
  const [shirtShowName, setShirtShowName] = useState(true);
  const [shirtShowNumber, setShirtShowNumber] = useState(true);
  const [shirtBgMode, setShirtBgMode] = useState("custom");
  const [shirtCustomBg, setShirtCustomBg] = useState(initialShareShirt.bg || SHIRT_DEFAULT_BG);
  const [shirtTextColour, setShirtTextColour] = useState(initialShareShirt.textColour || IVORY);
  const [shirtNumberColour, setShirtNumberColour] = useState(initialShareShirt.numberColour || IVORY);
  const [shirtPatternMode, setShirtPatternMode] = useState("team");
  const [shirtPatternColour, setShirtPatternColour] = useState("#FFFFFF");
  const [shirtOutlineEnabled, setShirtOutlineEnabled] = useState(false);
  const [shirtNumberOutlineEnabled, setShirtNumberOutlineEnabled] = useState(false);
  const [shirtOutlineColour, setShirtOutlineColour] = useState("#F5F1E8");
  const [shirtFontWeight, setShirtFontWeight] = useState("900");
  const [shirtFontStyle, setShirtFontStyle] = useState("normal");
  const [shirtFontType, setShirtFontType] = useState("bold");
  const [shirtOutlineWeight, setShirtOutlineWeight] = useState(2);
  const [shirtMondayScale, setShirtMondayScale] = useState(initialShareShirt.composition.mondayScale);
  const [shirtNameScale, setShirtNameScale] = useState(initialShareShirt.composition.nameScale);
  const [shirtNumberScale, setShirtNumberScale] = useState(initialShareShirt.composition.numberScale);
  const [shirtNameNumberLocked, setShirtNameNumberLocked] = useState(false);
  const [shirtBrothersScale, setShirtBrothersScale] = useState(initialShareShirt.composition.brothersScale);
  const [shirtTeamScale, setShirtTeamScale] = useState(1);
  const [shirtTeamX, setShirtTeamX] = useState(0);
  const [shirtTeamY, setShirtTeamY] = useState(0);
  const [shirtMondayX, setShirtMondayX] = useState(initialShareShirt.composition.mondayX);
  const [shirtMondayY, setShirtMondayY] = useState(initialShareShirt.composition.mondayY);
  const [shirtNameX, setShirtNameX] = useState(initialShareShirt.composition.nameX);
  const [shirtNameY, setShirtNameY] = useState(initialShareShirt.composition.nameY);
  const [shirtNumberX, setShirtNumberX] = useState(initialShareShirt.composition.numberX);
  const [shirtNumberY, setShirtNumberY] = useState(initialShareShirt.composition.numberY);
  const [shirtBrothersX, setShirtBrothersX] = useState(initialShareShirt.composition.brothersX);
  const [shirtBrothersY, setShirtBrothersY] = useState(initialShareShirt.composition.brothersY);

  useEffect(() => {
    setShirtTeam(initialShareShirt.team);
    setShirtName(initialShareShirt.name);
    setShirtNumber(initialShareShirt.number);
    setShirtBgMode("custom");
    setShirtCustomBg(initialShareShirt.bg || SHIRT_DEFAULT_BG);
    setShirtTextColour(initialShareShirt.textColour || IVORY);
    setShirtNumberColour(initialShareShirt.numberColour || initialShareShirt.textColour || IVORY);
    setShirtMondayScale(initialShareShirt.composition.mondayScale);
    setShirtMondayX(initialShareShirt.composition.mondayX);
    setShirtMondayY(initialShareShirt.composition.mondayY);
    setShirtNameScale(initialShareShirt.composition.nameScale);
    setShirtNameX(initialShareShirt.composition.nameX);
    setShirtNameY(initialShareShirt.composition.nameY);
    setShirtNumberScale(initialShareShirt.composition.numberScale);
    setShirtNumberX(initialShareShirt.composition.numberX);
    setShirtNumberY(initialShareShirt.composition.numberY);
    setShirtBrothersScale(initialShareShirt.composition.brothersScale);
    setShirtBrothersX(initialShareShirt.composition.brothersX);
    setShirtBrothersY(initialShareShirt.composition.brothersY);
  }, [initialShareShirt]);

  useEffect(() => {
    if (shirtBgMode !== "team") return;
    const theme = getTeamTheme(shirtTeam);
    setShirtTextColour(theme.text);
    setShirtNumberColour(theme.text);
  }, [shirtBgMode, shirtTeam]);

  const handleShirtTeamChange = (teamName) => {
    setShirtTeam(teamName);
    applyTeamShirtColourway(teamName, {
      setBgMode: setShirtBgMode,
      setTextColour: setShirtTextColour,
      setNumberColour: setShirtNumberColour,
    });
  };

  const setLockedShirtNameScale = (value) => {
    setShirtNameScale(value);
    if (shirtNameNumberLocked) setShirtNumberScale(value);
  };
  const setLockedShirtNumberScale = (value) => {
    setShirtNumberScale(value);
    if (shirtNameNumberLocked) setShirtNameScale(value);
  };
  const setShirtNameNumberScale = (value) => {
    setShirtNameScale(value);
    setShirtNumberScale(value);
  };
  const applyDefaultShirtComposition = () => {
    setShirtBgMode("custom");
    setShirtCustomBg(SHIRT_DEFAULT_BG);
    setShirtMondayScale(SHIRT_DEFAULT_COMPOSITION.mondayScale);
    setShirtMondayX(SHIRT_DEFAULT_COMPOSITION.mondayX);
    setShirtMondayY(SHIRT_DEFAULT_COMPOSITION.mondayY);
    setShirtNameScale(SHIRT_DEFAULT_COMPOSITION.nameScale);
    setShirtNumberScale(SHIRT_DEFAULT_COMPOSITION.numberScale);
    setShirtNameX(SHIRT_DEFAULT_COMPOSITION.nameX);
    setShirtNameY(SHIRT_DEFAULT_COMPOSITION.nameY);
    setShirtNumberX(SHIRT_DEFAULT_COMPOSITION.numberX);
    setShirtNumberY(SHIRT_DEFAULT_COMPOSITION.numberY);
    setShirtBrothersScale(SHIRT_DEFAULT_COMPOSITION.brothersScale);
    setShirtBrothersX(SHIRT_DEFAULT_COMPOSITION.brothersX);
    setShirtBrothersY(SHIRT_DEFAULT_COMPOSITION.brothersY);
  };
  const lockCurrentShirtComposition = () => {
    const snapshot = {
      mondayScale: shirtMondayScale, mondayX: shirtMondayX, mondayY: shirtMondayY,
      nameScale: shirtNameScale, nameX: shirtNameX, nameY: shirtNameY,
      numberScale: shirtNumberScale, numberX: shirtNumberX, numberY: shirtNumberY,
      brothersScale: shirtBrothersScale, brothersX: shirtBrothersX, brothersY: shirtBrothersY, bg: shirtCustomBg,
    };
    try { window.localStorage?.setItem(SHIRT_COMPOSITION_STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
    setShirtCompositionLocked(true);
  };

  const activeState = EXPORT_STATES[exportIndex];
  const matchEditorPanels = [
    { id: "setup", label: "Match setup" },
    { id: "scoreboard", label: "Scoreboard" },
    { id: "flash", label: "Flash bar" },
    { id: "pitch", label: "Pitch badge" },
  ];
  const shirtEditorPanels = [
    { id: "text", label: "Shirt text" },
    { id: "style", label: "Style" },
    { id: "composition", label: "Composition" },
  ];
  const activeMatchEditorPanel = matchEditorPanels[((matchEditorPanelIndex % matchEditorPanels.length) + matchEditorPanels.length) % matchEditorPanels.length]?.id;
  const activeShirtEditorPanel = shirtEditorPanels[((shirtEditorPanelIndex % shirtEditorPanels.length) + shirtEditorPanels.length) % shirtEditorPanels.length]?.id;
  const userTeam = useMemo(() => teamToGameTeam(teamA), [teamA]);
  const opponentTeam = useMemo(() => teamToGameTeam(teamB), [teamB]);
  const totalMarkerSlots = GAME.regulationPens + Number(suddenDeathSlots || 0);
  const bracketTeams = useMemo(() => [teamA, teamB, "Brazil", "England", "Canada", "Spain", "Argentina", "Portugal"], [teamA, teamB]);

  const flashBackground = flashBgMode === "teamA"
    ? userTeam.primaryColour
    : flashBgMode === "teamB"
      ? opponentTeam.primaryColour
      : flashBgMode === "yellow"
        ? LED_YELLOW
        : flashBgMode === "dark"
          ? DARK_GREEN
          : customFlashBg;
  const flashStyle = { background: flashBackground, color: flashFontColour };
  const matchDesign = {
    scoreboardHeight: matchScoreboardHeight,
    textColour: matchTextColour,
    fontType: matchFontType,
    outlineWeight: matchOutlineWeight,
    outlineColour: matchOutlineColour,
    showStage: matchShowStage,
    stageBox: matchStageBox,
    stageScale: matchStageScale,
    stageX: matchStageX,
    stageY: matchStageY,
    showFlags: matchShowFlags,
    flagScale: matchFlagScale,
    flagAX: matchFlagAX,
    flagAY: matchFlagAY,
    flagBX: matchFlagBX,
    flagBY: matchFlagBY,
    showTeamCodes: matchShowTeamCodes,
    teamScale: matchTeamScale,
    teamAX: matchTeamAX,
    teamAY: matchTeamAY,
    teamBX: matchTeamBX,
    teamBY: matchTeamBY,
    showScore: matchShowScore,
    scoreDisplayMode: matchScoreDisplayMode,
    scoreScale: matchScoreScale,
    scoreX: matchScoreX,
    scoreY: matchScoreY,
    markerBox: matchMarkerBox,
    markerScale: matchMarkerScale,
    markerAX: matchMarkerAX,
    markerAY: matchMarkerAY,
    markerBX: matchMarkerBX,
    markerBY: matchMarkerBY,
    usernameScale: matchUsernameScale,
    usernameX: matchUsernameX,
    usernameY: matchUsernameY,
    flashBox: matchFlashBox,
    flashScale: matchFlashScale,
    flashX: matchFlashX,
    flashY: matchFlashY,
    flashFontType: matchFlashFontType,
    flashOutlineWeight: matchFlashOutlineWeight,
    flashOutlineColour: matchFlashOutlineColour,
    badgeScale: matchBadgeScale,
    badgeX: matchBadgeX,
    badgeY: matchBadgeY,
    goalkeeperScale: matchGoalkeeperScale,
    ballScale: matchBallScale,
    pitchHeight: matchPitchHeight,
  };

  const updateExportIndex = (delta) => {
    setExportIndex((current) => (current + delta + EXPORT_STATES.length) % EXPORT_STATES.length);
  };

  const toggleMarker = (teamKey, index) => {
    const setter = teamKey === "A" ? setTeamAMarkers : setTeamBMarkers;
    setter((current) => {
      const next = padMarkers(current, totalMarkerSlots);
      next[index] = next[index] === "" ? "G" : next[index] === "G" ? "S" : "";
      return next;
    });
  };

  const resetPoster = () => {
    setPosterTitle("COMING SOON");
    setPosterSubtitle("");
    setPosterSecondSubtitle("");
    setPosterShowLogo(true);
    setPosterLogoGlow(true);
    setPosterLogoShadow(false);
    setPosterBgMode("pitch");
    setPosterBgTeam(initialTeamA);
    setPosterCustomBg(DARK_GREEN);
    setPosterFontColour(LED_YELLOW);
    setPosterTitleFontType("led");
    setPosterSubtitleFontType("bold");
    setPosterSecondSubtitleFontType("bold");
    setPosterShowBrothers(true);
    setPosterLogoScale(1);
    setPosterTitleScale(1);
    setPosterSubtitleScale(1);
    setPosterSecondSubtitleScale(1);
    setPosterBrothersScale(1);
    setPosterLogoY(0);
    setPosterTitleY(0);
    setPosterSubtitleY(0);
    setPosterSecondSubtitleY(0);
    setPosterBrothersY(0);
    setPosterLogoX(0);
    setPosterTitleX(0);
    setPosterSubtitleX(0);
    setPosterSecondSubtitleX(0);
    setPosterBrothersX(0);
    setPosterTitleColour(LED_YELLOW);
    setPosterSubtitleColour(IVORY);
    setPosterSecondSubtitleColour(IVORY);
    setPosterOutlineWeight(0);
    setPosterOutlineColour(DARK_GREEN);
    setPosterGlowColour(LED_YELLOW);
    setPosterGlowOpacity(0.3);
    setPosterGlowBrightness(1.1);
    setPosterShadowOpacity(0.3);
  };

  const currentShirtComposition = () => ({
    mondayScale: shirtMondayScale,
    mondayX: shirtMondayX,
    mondayY: shirtMondayY,
    nameScale: shirtNameScale,
    nameX: shirtNameX,
    nameY: shirtNameY,
    numberScale: shirtNumberScale,
    numberX: shirtNumberX,
    numberY: shirtNumberY,
    brothersScale: shirtBrothersScale,
    brothersX: shirtBrothersX,
    brothersY: shirtBrothersY,
  });

  const handleExport = async () => {
    if (!frameRef.current || shareBusy) return;
    const previewWindow = reserveShareWindow();
    setShareBusy(true);
    try {
      const blob = activeState.id === "shirt"
        ? await createShirtPosterBlob({
          team: shirtTeam,
          name: shirtName,
          number: shirtNumber,
          background: shirtBgMode === "custom" ? shirtCustomBg : (getTeamTheme(shirtTeam)?.primary || getTeamTheme(shirtTeam)?.bg || SHIRT_DEFAULT_BG),
          textColour: shirtTextColour,
          numberColour: shirtNumberColour,
          composition: currentShirtComposition(),
          showMondayLogo: shirtShowMondayLogo,
          showBrothers: shirtShowBrothers,
          showName: shirtShowName,
          showNumber: shirtShowNumber,
          textOutlineEnabled: shirtOutlineEnabled,
          numberOutlineEnabled: shirtNumberOutlineEnabled,
          outlineColour: shirtOutlineColour,
          outlineWeight: shirtOutlineWeight,
          fontType: shirtFontType,
          patternMode: shirtPatternMode,
          patternColour: shirtPatternColour,
        })
        : await captureShareElementBlob(frameRef.current, teamA);
      await shareOrDownloadResult({ blob, filename: `monday-cup-${activeState.id}-share.png`, previewWindow });
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      console.error("Share page export failed", error);
      window.alert("Sorry, the share preview could not be exported. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <PitchPageBackground />
      <ScreenTopBar {...menuProps}>SHARE</ScreenTopBar>
      <section className="relative z-[1] flex min-h-0 flex-1 flex-col items-center overflow-auto px-4 pb-24 pt-4">
        <div className={`${SHARE_PREVIEW_CLASS} mb-2 grid grid-cols-[44px_1fr_44px] items-center gap-2 text-center`}>
          <button type="button" onClick={() => updateExportIndex(-1)} className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#F5F1E8]/20 bg-[#051A11]/76 text-[25px] leading-none text-[#F7D117] shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur-[2px]" aria-label="Previous export state">‹</button>
          <div className="min-w-0">
            <div className="led-text-glow font-led truncate text-[18px] font-black uppercase tracking-[0.16em] text-[#F7D117]">{activeState.label}</div>
          </div>
          <button type="button" onClick={() => updateExportIndex(1)} className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#F5F1E8]/20 bg-[#051A11]/76 text-[25px] leading-none text-[#F7D117] shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur-[2px]" aria-label="Next export state">›</button>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} relative aspect-square`}>
          <div
            ref={frameRef}
            data-share-layout={activeState.id}
            className="absolute inset-0 overflow-hidden bg-[#0d6c3d] shadow-[0_14px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(245,241,232,0.08)]"
            style={{
              backgroundColor: "#0d6c3d",
              border: activeState.id === "match" && matchBorderEnabled ? `3px solid ${matchBorderColour}` : "none",
              boxShadow: activeState.id === "shirt" ? "none" : undefined,
            }}
          >
            {activeState.id === "match" && (
              <ShareMatchPreview
                userTeam={userTeam}
                opponentTeam={opponentTeam}
                score={{ user: scoreA, opponent: scoreB }}
                stageTitle={stageTitle}
                flashText={flashText}
                flashStyle={flashStyle}
                crowdStage={crowdStage}
                showMarkers={showMarkers}
                markerText={markerText}
                usernameEnabled={usernameEnabled}
                username={username}
                teamAMarkers={teamAMarkers}
                teamBMarkers={teamBMarkers}
                totalMarkerSlots={totalMarkerSlots}
                badgeMode={badgeMode}
                showGoalkeeper={showGoalkeeper}
                goalkeeperPosition={goalkeeperPosition}
                showBall={showBall}
                ballPosition={ballPosition}
                matchDesign={matchDesign}
              />
            )}
            {activeState.id === "bracket" && <BracketPreview bracketTitle={bracketTitle} bracketTeams={bracketTeams} champion={bracketChampion} />}
            {activeState.id === "poster" && (
              <PosterPreview
                posterTitle={posterTitle}
                posterSubtitle={posterSubtitle}
                posterSecondSubtitle={posterSecondSubtitle}
                posterShowLogo={posterShowLogo}
                posterLogoGlow={posterLogoGlow}
                posterLogoShadow={posterLogoShadow}
                posterBgMode={posterBgMode}
                posterBgTeam={posterBgTeam}
                posterCustomBg={posterCustomBg}
                posterFontColour={posterFontColour}
                posterTitleFontType={posterTitleFontType}
                posterSubtitleFontType={posterSubtitleFontType}
                posterSecondSubtitleFontType={posterSecondSubtitleFontType}
                posterShowBrothers={posterShowBrothers}
                posterLogoScale={posterLogoScale}
                posterTitleScale={posterTitleScale}
                posterSubtitleScale={posterSubtitleScale}
                posterSecondSubtitleScale={posterSecondSubtitleScale}
                posterBrothersScale={posterBrothersScale}
                posterLogoY={posterLogoY}
                posterTitleY={posterTitleY}
                posterSubtitleY={posterSubtitleY}
                posterSecondSubtitleY={posterSecondSubtitleY}
                posterBrothersY={posterBrothersY}
                posterLogoX={posterLogoX}
                posterTitleX={posterTitleX}
                posterSubtitleX={posterSubtitleX}
                posterSecondSubtitleX={posterSecondSubtitleX}
                posterBrothersX={posterBrothersX}
                posterTitleColour={posterTitleColour}
                posterSubtitleColour={posterSubtitleColour}
                posterSecondSubtitleColour={posterSecondSubtitleColour}
                posterOutlineWeight={posterOutlineWeight}
                posterOutlineColour={posterOutlineColour}
                posterGlowColour={posterGlowColour}
                posterGlowOpacity={posterGlowOpacity}
                posterGlowBrightness={posterGlowBrightness}
                posterShadowOpacity={posterShadowOpacity}
              />
            )}
            {activeState.id === "shirt" && (
              <ShirtPosterPreview
                shirtTeam={shirtTeam}
                shirtName={shirtName}
                shirtNumber={shirtNumber}
                shirtShowMondayLogo={shirtShowMondayLogo}
                shirtShowBrothers={shirtShowBrothers}
                shirtShowTeam={shirtShowTeam}
                shirtShowName={shirtShowName}
                shirtShowNumber={shirtShowNumber}
                shirtBgMode={shirtBgMode}
                shirtCustomBg={shirtCustomBg}
                shirtTextColour={shirtTextColour}
                shirtNumberColour={shirtNumberColour}
                shirtOutlineEnabled={shirtOutlineEnabled}
                shirtNumberOutlineEnabled={shirtNumberOutlineEnabled}
                shirtOutlineColour={shirtOutlineColour}
                shirtPatternMode={shirtPatternMode}
                shirtPatternColour={shirtPatternColour}
                shirtFontWeight={shirtFontWeight}
                shirtFontStyle={shirtFontStyle}
                shirtFontType={shirtFontType}
                shirtOutlineWeight={shirtOutlineWeight}
                shirtMondayScale={shirtMondayScale}
                shirtNameScale={shirtNameScale}
                shirtNumberScale={shirtNumberScale}
                shirtBrothersScale={shirtBrothersScale}
                shirtNameNumberLocked={shirtNameNumberLocked}
                shirtTeamScale={shirtTeamScale}
                shirtTeamX={shirtTeamX}
                shirtTeamY={shirtTeamY}
                shirtMondayX={shirtMondayX}
                shirtMondayY={shirtMondayY}
                shirtNameX={shirtNameX}
                shirtNameY={shirtNameY}
                shirtNumberX={shirtNumberX}
                shirtNumberY={shirtNumberY}
                shirtBrothersX={shirtBrothersX}
                shirtBrothersY={shirtBrothersY}
              />
            )}
          </div>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]`}>
          <button type="button" onClick={handleExport} disabled={shareBusy} className="grid h-[50px] min-h-[50px] place-items-center rounded-[16px] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[16px] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65">
            {shareBusy ? "PREPARING" : "SAVE AS PHOTO"}
          </button>
          <div className="grid h-[50px] place-items-center rounded-[16px] border border-[#F5F1E8]/16 bg-[#051A11]/70 px-4 home-copy-bold text-[11px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/70">
            400 x 400 PREVIEW
          </div>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} mt-4 rounded-[18px] border border-[#F5F1E8]/14 bg-[#072D1D]/84 p-3 shadow-[0_16px_34px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(245,241,232,0.06)] sm:p-4`}>
          {activeState.id === "match" && (
            <div className="grid gap-4">
              <CheckboxControl checked={editMatchState} onChange={setEditMatchState} label="Edit starting state" />
              {!editMatchState ? (
                <div className="home-copy-bold rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 text-[11px] font-black uppercase leading-relaxed tracking-[0.12em] text-[#F5F1E8]/66">
                  Using current campaign screen state. Turn edit on to customise the export.
                </div>
              ) : (
                <>
                  <PanelPager panels={matchEditorPanels} index={matchEditorPanelIndex} onChange={setMatchEditorPanelIndex} />

                  {activeMatchEditorPanel === "setup" && (
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Team A"><TeamSelect value={teamA} onChange={setTeamA} /></Field>
                        <Field label="Team B"><TeamSelect value={teamB} onChange={setTeamB} /></Field>
                        <Field label="Team A score"><TextInput type="number" min="0" max="99" value={scoreA} onChange={(value) => setScoreA(Number(value) || 0)} /></Field>
                        <Field label="Team B score"><TextInput type="number" min="0" max="99" value={scoreB} onChange={(value) => setScoreB(Number(value) || 0)} /></Field>
                        <Field label="Score display"><MiniSegment options={SCORE_DISPLAY_OPTIONS} value={matchScoreDisplayMode} onChange={setMatchScoreDisplayMode} /></Field>
                        <Field label="Round title"><TextInput value={stageTitle} onChange={setStageTitle} /></Field>
                        <Field label="Crowd density"><MiniSegment options={CROWD_OPTIONS} value={crowdStage} onChange={setCrowdStage} /></Field>
                      </div>

                      <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="Penalty markers"><ToggleButton active={showMarkers} onClick={() => setShowMarkers((value) => !value)}>{showMarkers ? "ON" : "TEXT"}</ToggleButton></Field>
                          <Field label="SD options"><MiniSegment options={SD_OPTIONS.map((value) => ({ value, label: value ? `+${value}` : "0" }))} value={suddenDeathSlots} onChange={setSuddenDeathSlots} /></Field>
                          <Field label="Username"><ToggleButton active={usernameEnabled} onClick={() => setUsernameEnabled((value) => !value)}>{usernameEnabled ? "ON" : "OFF"}</ToggleButton></Field>
                        </div>
                        {showMarkers ? (
                          <div className="grid gap-3">
                            <MarkerControl title={`${teamA} sequence`} markers={teamAMarkers} totalSlots={totalMarkerSlots} onToggle={(index) => toggleMarker("A", index)} />
                            <MarkerControl title={`${teamB} sequence`} markers={teamBMarkers} totalSlots={totalMarkerSlots} onToggle={(index) => toggleMarker("B", index)} />
                            {usernameEnabled && <Field label="Username text"><TextInput value={username} onChange={setUsername} /></Field>}
                          </div>
                        ) : (
                          <Field label="Penalty text"><TextInput value={markerText} onChange={setMarkerText} /></Field>
                        )}
                      </div>
                    </div>
                  )}

                  {activeMatchEditorPanel === "scoreboard" && (
                    <div className="grid gap-3">
                      <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                        <Field label="Scoreboard height"><RangeInput value={matchScoreboardHeight} onChange={setMatchScoreboardHeight} min={24} max={46} step={1} suffix="%" /></Field>
                        <Field label="Pitch crop height"><RangeInput value={matchPitchHeight} onChange={setMatchPitchHeight} min={500} max={760} step={10} suffix="px" /></Field>
                        <Field label="Scoreboard colour"><ColourInput value={matchTextColour} onChange={setMatchTextColour} /></Field>
                        <Field label="Scoreboard font"><SelectInput value={matchFontType} onChange={setMatchFontType} options={FONT_OPTIONS} /></Field>
                        <Field label="Outline colour"><ColourInput value={matchOutlineColour} onChange={setMatchOutlineColour} /></Field>
                        <Field label="Outline weight"><RangeInput value={matchOutlineWeight} onChange={setMatchOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
                        <Field label="Border colour"><ColourInput value={matchBorderColour} onChange={setMatchBorderColour} /></Field>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <CheckboxControl checked={matchShowStage} onChange={setMatchShowStage} label="Round title" />
                        <CheckboxControl checked={matchStageBox} onChange={setMatchStageBox} label="Round title box" />
                        <CheckboxControl checked={matchShowFlags} onChange={setMatchShowFlags} label="Flags" />
                        <CheckboxControl checked={matchShowTeamCodes} onChange={setMatchShowTeamCodes} label="Team codes" />
                        <CheckboxControl checked={matchShowScore} onChange={setMatchShowScore} label="Score/VS text" />
                        <CheckboxControl checked={matchBorderEnabled} onChange={setMatchBorderEnabled} label="Export border" />
                        <CheckboxControl checked={matchMarkerBox} onChange={setMatchMarkerBox} label="Marker/text boxes" />
                      </div>
                    </div>
                  )}

                  {activeMatchEditorPanel === "flash" && (
                    <div className="grid gap-3">
                      <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                        <Field label="Flash commentary"><TextInput value={flashText} onChange={setFlashText} /></Field>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="Team colour"><SelectInput value={flashBgMode} onChange={setFlashBgMode} options={FLASH_BG_OPTIONS} /></Field>
                          <Field label="Custom bg"><ColourInput value={customFlashBg} onChange={setCustomFlashBg} /></Field>
                          <Field label="Font colour"><ColourInput value={flashFontColour} onChange={setFlashFontColour} /></Field>
                          <Field label="Flash font"><SelectInput value={matchFlashFontType} onChange={setMatchFlashFontType} options={FONT_OPTIONS} /></Field>
                          <Field label="Flash outline colour"><ColourInput value={matchFlashOutlineColour} onChange={setMatchFlashOutlineColour} /></Field>
                          <Field label="Flash outline weight"><RangeInput value={matchFlashOutlineWeight} onChange={setMatchFlashOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
                        </div>
                      </div>
                      <CheckboxControl checked={matchFlashBox} onChange={setMatchFlashBox} label="Flash box" />
                    </div>
                  )}

                  {activeMatchEditorPanel === "pitch" && (
                    <div className="grid gap-3">
                      <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                        <Field label="Pitch badge"><SelectInput value={badgeMode} onChange={setBadgeMode} options={BADGE_OPTIONS} /></Field>
                        <Field label="Goalkeeper"><ToggleButton active={showGoalkeeper} onClick={() => setShowGoalkeeper((value) => !value)}>{showGoalkeeper ? "ON" : "OFF"}</ToggleButton></Field>
                        {showGoalkeeper && <Field label="GK position"><PositionSelect value={goalkeeperPosition} onChange={setGoalkeeperPosition} /></Field>}
                        <Field label="Ball"><ToggleButton active={showBall} onClick={() => setShowBall((value) => !value)}>{showBall ? "ON" : "OFF"}</ToggleButton></Field>
                        {showBall && <Field label="Ball position"><PositionSelect value={ballPosition} onChange={setBallPosition} /></Field>}
                      </div>
                      <XYScaleControls title="Pitch badge/logo" x={matchBadgeX} setX={setMatchBadgeX} y={matchBadgeY} setY={setMatchBadgeY} scale={matchBadgeScale} setScale={setMatchBadgeScale} xRange={100} yRange={100} minScale={0.4} maxScale={2.2} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeState.id === "bracket" && (
            <div className="grid gap-3">
              <Field label="Bracket title"><TextInput value={bracketTitle} onChange={setBracketTitle} /></Field>
              <Field label="Champion"><TeamSelect value={bracketChampion} onChange={setBracketChampion} /></Field>
              <div className="home-copy-bold text-[11px] font-black uppercase leading-relaxed tracking-[0.14em] text-[#F5F1E8]/66">Bracket state uses the current Team A and Team B plus fixed QF placeholders for now.</div>
            </div>
          )}

          {activeState.id === "poster" && (
            <div className="grid gap-3">
              <button type="button" onClick={resetPoster} className="grid h-10 place-items-center rounded-[12px] border border-[#F7D117]/55 bg-[#F7D117] px-3 home-copy-bold text-[11px] font-black uppercase tracking-[0.13em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.18)]">Reset poster</button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Main text"><TextInput value={posterTitle} onChange={setPosterTitle} /></Field>
                <Field label="Subtitle"><TextInput value={posterSubtitle} onChange={setPosterSubtitle} /></Field>
                <Field label="Second subtitle"><TextInput value={posterSecondSubtitle} onChange={setPosterSecondSubtitle} /></Field>
                <Field label="Background"><SelectInput value={posterBgMode} onChange={setPosterBgMode} options={BG_OPTIONS} /></Field>
                <Field label="Team colour"><TeamSelect value={posterBgTeam} onChange={setPosterBgTeam} /></Field>
                <Field label="Custom bg"><ColourInput value={posterCustomBg} onChange={setPosterCustomBg} /></Field>
                <Field label="Base font colour"><ColourInput value={posterFontColour} onChange={setPosterFontColour} /></Field>
                <Field label="Main colour"><ColourInput value={posterTitleColour} onChange={setPosterTitleColour} /></Field>
                <Field label="Subtitle colour"><ColourInput value={posterSubtitleColour} onChange={setPosterSubtitleColour} /></Field>
                <Field label="Second colour"><ColourInput value={posterSecondSubtitleColour} onChange={setPosterSecondSubtitleColour} /></Field>
                <Field label="Main font"><SelectInput value={posterTitleFontType} onChange={setPosterTitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Subtitle font"><SelectInput value={posterSubtitleFontType} onChange={setPosterSubtitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Second font"><SelectInput value={posterSecondSubtitleFontType} onChange={setPosterSecondSubtitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Outline colour"><ColourInput value={posterOutlineColour} onChange={setPosterOutlineColour} /></Field>
                <Field label="Outline weight"><RangeInput value={posterOutlineWeight} onChange={setPosterOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckboxControl checked={posterShowLogo} onChange={setPosterShowLogo} label="Include logo" />
                <CheckboxControl checked={posterLogoGlow} onChange={setPosterLogoGlow} label="Logo glow" />
                <CheckboxControl checked={posterLogoShadow} onChange={setPosterLogoShadow} label="Logo shadow" />
                <CheckboxControl checked={posterShowBrothers} onChange={setPosterShowBrothers} label="Brothers logo" />
              </div>
              <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                <Field label="Glow colour"><ColourInput value={posterGlowColour} onChange={setPosterGlowColour} /></Field>
                <Field label="Glow transparency"><RangeInput value={posterGlowOpacity} onChange={setPosterGlowOpacity} min={0} max={1} step={0.05} suffix="" /></Field>
                <Field label="Glow brightness"><RangeInput value={posterGlowBrightness} onChange={setPosterGlowBrightness} min={0.5} max={2} step={0.05} suffix="×" /></Field>
                <Field label="Shadow opacity"><RangeInput value={posterShadowOpacity} onChange={setPosterShadowOpacity} min={0} max={1} step={0.05} suffix="" /></Field>
              </div>
              <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                <Field label="Logo scale"><RangeInput value={posterLogoScale} onChange={setPosterLogoScale} min={0.65} max={1.45} step={0.05} /></Field>
                <Field label="Title scale"><RangeInput value={posterTitleScale} onChange={setPosterTitleScale} min={0.65} max={1.5} step={0.05} /></Field>
                <Field label="Subtitle scale"><RangeInput value={posterSubtitleScale} onChange={setPosterSubtitleScale} min={0.65} max={1.6} step={0.05} /></Field>
                <Field label="Second scale"><RangeInput value={posterSecondSubtitleScale} onChange={setPosterSecondSubtitleScale} min={0.65} max={1.6} step={0.05} /></Field>
                <Field label="Brothers scale"><RangeInput value={posterBrothersScale} onChange={setPosterBrothersScale} min={0.65} max={1.45} step={0.05} /></Field>
              </div>
              <XYScaleControls title="Logo position" x={posterLogoX} setX={setPosterLogoX} y={posterLogoY} setY={setPosterLogoY} scale={posterLogoScale} setScale={setPosterLogoScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.45} />
              <XYScaleControls title="Main text position" x={posterTitleX} setX={setPosterTitleX} y={posterTitleY} setY={setPosterTitleY} scale={posterTitleScale} setScale={setPosterTitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.5} />
              <XYScaleControls title="Subtitle position" x={posterSubtitleX} setX={setPosterSubtitleX} y={posterSubtitleY} setY={setPosterSubtitleY} scale={posterSubtitleScale} setScale={setPosterSubtitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.6} />
              <XYScaleControls title="Second subtitle position" x={posterSecondSubtitleX} setX={setPosterSecondSubtitleX} y={posterSecondSubtitleY} setY={setPosterSecondSubtitleY} scale={posterSecondSubtitleScale} setScale={setPosterSecondSubtitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.6} />
              <XYScaleControls title="Brothers position" x={posterBrothersX} setX={setPosterBrothersX} y={posterBrothersY} setY={setPosterBrothersY} scale={posterBrothersScale} setScale={setPosterBrothersScale} xRange={90} yRange={50} minScale={0.65} maxScale={1.45} />
            </div>
          )}

          {activeState.id === "shirt" && (
            <div className="grid gap-3">
              <PanelPager panels={shirtEditorPanels} index={shirtEditorPanelIndex} onChange={setShirtEditorPanelIndex} />

              {activeShirtEditorPanel === "text" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Favourite team"><TeamSelect value={shirtTeam} onChange={handleShirtTeamChange} /></Field>
                  <Field label="Name"><TextInput value={shirtName} onChange={(value) => setShirtName(value.toUpperCase().slice(0, 14))} /></Field>
                  <Field label="Number"><TextInput type="number" min="0" max="99" value={shirtNumber} onChange={(value) => setShirtNumber(String(value).slice(0, 2))} /></Field>

                </div>
              )}

              {activeShirtEditorPanel === "style" && (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Background"><SelectInput value={shirtBgMode} onChange={setShirtBgMode} options={[{ value: "team", label: "TEAM" }, { value: "custom", label: "CUSTOM" }]} /></Field>
                    <Field label="Custom bg"><ColourInput value={shirtCustomBg} onChange={(value) => { setShirtBgMode("custom"); setShirtCustomBg(value); }} /></Field>
                    <Field label="Text colour"><ColourInput value={shirtTextColour} onChange={setShirtTextColour} /></Field>
                    <Field label="Number colour"><ColourInput value={shirtNumberColour} onChange={setShirtNumberColour} /></Field>
                    <Field label="Shirt design"><SelectInput value={shirtPatternMode} onChange={setShirtPatternMode} options={[{ value: "team", label: "TEAM" }, { value: "plain", label: "PLAIN" }, { value: "stripes", label: "STRIPES" }, { value: "checkerboard", label: "CHECKER" }, { value: "hoops", label: "HOOPS" }]} /></Field>
                    <Field label="Pattern colour"><ColourInput value={shirtPatternColour} onChange={setShirtPatternColour} /></Field>
                    <Field label="Font"><SelectInput value={shirtFontType} onChange={setShirtFontType} options={FONT_OPTIONS} /></Field>
                    <Field label="Font weight"><SelectInput value={shirtFontWeight} onChange={setShirtFontWeight} options={FONT_WEIGHT_OPTIONS} /></Field>
                    <Field label="Font style"><SelectInput value={shirtFontStyle} onChange={setShirtFontStyle} options={FONT_STYLE_OPTIONS} /></Field>
                    <Field label="Outline colour"><ColourInput value={shirtOutlineColour} onChange={setShirtOutlineColour} /></Field>
                    <Field label="Outline weight"><RangeInput value={shirtOutlineWeight} onChange={setShirtOutlineWeight} min={0} max={16} step={0.25} suffix="px" /></Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckboxControl checked={shirtShowMondayLogo} onChange={setShirtShowMondayLogo} label="Monday logo" />
                    <CheckboxControl checked={shirtShowBrothers} onChange={setShirtShowBrothers} label="Brothers logo" />
                    <CheckboxControl checked={shirtOutlineEnabled} onChange={setShirtOutlineEnabled} label="Outline text" />
                    <CheckboxControl checked={shirtNumberOutlineEnabled} onChange={setShirtNumberOutlineEnabled} label="Outline number" />
                    <CheckboxControl checked={shirtNameNumberLocked} onChange={setShirtNameNumberLocked} label="Lock name + number scale" />
                  </div>
                </div>
              )}

              {activeShirtEditorPanel === "composition" && (
                <div className="grid gap-3">
                  <div className="grid gap-2 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                    <button type="button" onClick={applyDefaultShirtComposition} className={`${smallButtonBase} border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]`}>Reset default</button>
                    <button type="button" onClick={shirtCompositionLocked ? () => setShirtCompositionLocked(false) : lockCurrentShirtComposition} className={`${smallButtonBase} ${shirtCompositionLocked ? "border-[#F7D117]/70 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>{shirtCompositionLocked ? "Unlock composition" : "Lock composition"}</button>
                  </div>
                  {shirtNameNumberLocked && (
                    <div className="rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                      <Field label="Name + number scale"><RangeInput value={shirtNameScale} onChange={setShirtNameNumberScale} min={0.7} max={1.6} step={0.05} /></Field>
                    </div>
                  )}
                  <div className={shirtCompositionLocked ? "pointer-events-none opacity-45" : "grid gap-3"}>
                    <XYScaleControls title="Monday logo position" x={shirtMondayX} setX={setShirtMondayX} y={shirtMondayY} setY={setShirtMondayY} scale={shirtMondayScale} setScale={setShirtMondayScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.5} />
                    <XYScaleControls title="Name position" x={shirtNameX} setX={setShirtNameX} y={shirtNameY} setY={setShirtNameY} scale={shirtNameScale} setScale={shirtNameNumberLocked ? null : setLockedShirtNameScale} xRange={100} yRange={90} minScale={0.7} maxScale={1.6} />
                    <XYScaleControls title="Number position" x={shirtNumberX} setX={setShirtNumberX} y={shirtNumberY} setY={setShirtNumberY} scale={shirtNumberScale} setScale={shirtNameNumberLocked ? null : setLockedShirtNumberScale} xRange={100} yRange={90} minScale={0.7} maxScale={1.6} />
                    <XYScaleControls title="Brothers position" x={shirtBrothersX} setX={setShirtBrothersX} y={shirtBrothersY} setY={setShirtBrothersY} scale={shirtBrothersScale} setScale={setShirtBrothersScale} xRange={90} yRange={60} minScale={0.65} maxScale={1.45} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ShareScreen;
