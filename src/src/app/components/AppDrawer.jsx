import { DrawerShell } from "../../components/layout/Layout.jsx";
import { GroupsScreen } from "../../components/standings/StandingsScreens.jsx";
import { FixturesScreen } from "../../components/schedule/ScheduleScreens.jsx";
import {
  ClubhouseScreen,
  TrophyCabinetScreen,
  LeaderboardScreen,
} from "../../components/profile/ProfileScreens.jsx";

export function AppDrawer({
  drawer,
  allGroups,
  qualifiers,
  menuProps,
  standingsView,
  onStandingsViewChange,
  visibleKnockoutFixtures,
  schedule,
  qualifiedTeams,
  userTeam,
  podium,
  fixtureView,
  onFixtureViewChange,
  profile,
  clubhouse,
  trophies,
  leaderboard,
}) {
  if (drawer === "groups") {
    return (
      <DrawerShell title="STANDINGS">
        <GroupsScreen
          allGroups={allGroups}
          qualifiers={qualifiers}
          menuProps={menuProps}
          standingsView={standingsView}
          onStandingsViewChange={onStandingsViewChange}
          knockoutFixtures={visibleKnockoutFixtures}
          qualifiedTeams={qualifiedTeams}
          userTeam={userTeam}
          podium={podium}
        />
      </DrawerShell>
    );
  }

  if (drawer === "clubhouse") {
    return (
      <DrawerShell title="CLUBHOUSE">
        <ClubhouseScreen
          menuProps={menuProps}
          team={userTeam}
          userForm={profile.userForm}
          campaignPoints={profile.campaignPoints}
          bestCampaignSummary={profile.bestCampaignSummary}
          currentRoundLabel={profile.currentRoundLabel}
          leaderboardRank={profile.leaderboardRank}
          mondayCupsWon={profile.mondayCupsWon}
          highScore={profile.highScore}
          allTimeMatchesPlayed={profile.allTimeMatchesPlayed}
          allTimeMatchesWon={profile.allTimeMatchesWon}
          allTimeMatchesDrawn={profile.allTimeMatchesDrawn}
          allTimeMatchesLost={profile.allTimeMatchesLost}
          allTimeGoals={profile.allTimeGoals}
          allTimeShots={profile.allTimeShots}
          activeCosmetics={profile.activeCosmetics}
          ownedItems={clubhouse.storeEntitlements}
          onToggleCosmetic={clubhouse.onToggleCosmetic}
          onOpenShop={clubhouse.onOpenShop}
          allTeamsUnlocked={clubhouse.allTeamsUnlocked}
          onUnlockAllTeams={clubhouse.onUnlockAllTeams}
          onResumeCampaign={clubhouse.onResumeCampaign}
          currentUser={clubhouse.currentUser}
          shirtProfile={clubhouse.shirtProfile}
          onEditShirt={clubhouse.onEditShirt}
          onNicknameUpdate={clubhouse.onNicknameUpdate}
        />
      </DrawerShell>
    );
  }

  if (drawer === "trophyCabinet") {
    return (
      <DrawerShell title="TROPHIES">
        <TrophyCabinetScreen
          menuProps={menuProps}
          achievements={trophies.achievements}
          nationCupWins={trophies.nationCupWins}
          nationStickerProgress={trophies.nationStickerProgress}
          careerStats={trophies.careerStats}
          allTeamsUnlocked={trophies.allTeamsUnlocked}
          userTeam={userTeam}
          onOpenNationSticker={trophies.onOpenNationSticker}
        />
      </DrawerShell>
    );
  }

  if (drawer === "leaderboard") {
    return (
      <DrawerShell title="LEADERBOARD">
        <LeaderboardScreen
          menuProps={menuProps}
          rows={leaderboard.rows}
          currentCampaignScore={leaderboard.currentCampaignScore}
          bestCampaignScore={leaderboard.bestCampaignScore}
          team={userTeam}
          bestCampaignSummary={leaderboard.bestCampaignSummary}
          activeCosmetics={leaderboard.activeCosmetics}
          currentUser={leaderboard.currentUser}
        />
      </DrawerShell>
    );
  }

  if (drawer === "fixtures") {
    return (
      <DrawerShell title="SCHEDULE">
        <FixturesScreen
          fixtureView={fixtureView}
          onFixtureViewChange={onFixtureViewChange}
          schedule={schedule}
          menuProps={menuProps}
          knockoutFixtures={visibleKnockoutFixtures}
          userTeam={userTeam}
        />
      </DrawerShell>
    );
  }

  return null;
}
