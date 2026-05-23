import { runSelfTests } from "./logic/tournament.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { HomeScreen, HostSelectScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";
import { useTournamentController } from "./hooks/useTournamentController.js";

runSelfTests();

export default function App() {
  const tournament = useTournamentController();

  if (tournament.screen === "home") {
    return (
      <HomeScreen
        savedCampaign={tournament.savedCampaign}
        onContinueCampaign={tournament.continueCampaign}
        onNewCampaign={tournament.newCampaign}
        onPlayAsGuest={tournament.playAsGuest}
      />
    );
  }

  if (tournament.screen === "hosts") {
    return <HostSelectScreen onSelectGroup={tournament.selectGroup} onSelectTeam={tournament.startTeam} />;
  }

  if (tournament.screen === "teams") {
    return (
      <TeamSelectScreen
        selectedGroup={tournament.selectedGroup}
        onSelectGroup={tournament.setSelectedGroup}
        onSelectTeam={tournament.startTeam}
      />
    );
  }

  if (tournament.drawer === "groups") {
    return (
      <DrawerShell>
        <GroupsScreen
          allGroups={tournament.allGroups}
          qualifiers={tournament.qualifiers}
          menuProps={tournament.menuProps}
          standingsView={tournament.standingsView}
          onStandingsViewChange={tournament.setStandingsView}
          knockoutFixtures={tournament.visibleKnockoutFixtures}
          qualifiedTeams={tournament.qualifiedTeams}
          userTeam={tournament.team}
          podium={tournament.podium}
        />
      </DrawerShell>
    );
  }

  if (tournament.drawer === "fixtures") {
    return (
      <DrawerShell>
        <FixturesScreen
          fixtureView={tournament.fixtureView}
          onFixtureViewChange={tournament.setFixtureView}
          schedule={tournament.schedule}
          menuProps={tournament.menuProps}
          knockoutFixtures={tournament.visibleKnockoutFixtures}
          userTeam={tournament.team}
          scheduleFocus={tournament.scheduleFocus}
        />
      </DrawerShell>
    );
  }

  return (
    <MatchScreen
      team={tournament.team}
      opponent={tournament.opponent}
      score={tournament.score}
      matchResult={tournament.matchResult}
      modalDismissed={tournament.modalDismissed}
      onDismissModal={tournament.dismissModal}
      onQuickWin={tournament.quickWin}
      onMatchComplete={tournament.handleMatchComplete}
      onNextMatch={tournament.nextMatch}
      menuProps={tournament.menuProps}
      stageLabel={tournament.matchStage}
      fixture={tournament.currentFixture}
      groupRows={tournament.selectedGroupRows}
      qualifiedTeams={tournament.qualifiedTeams}
      selectedGroup={tournament.selectedGroup}
      userForm={tournament.userForm}
      campaignId={tournament.campaignId}
    />
  );
}
