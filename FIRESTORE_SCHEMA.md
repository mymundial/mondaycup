# Monday Cup Firestore Schema

This schema removes legacy/duplicate fields from Firestore while keeping UI compatibility inside the app data layer.

## users/{uid}

```js
{
  profile: {
    uid,
    username,
    usernameLower,
    email,
    emailVerified,
    emailCommsOptIn,
    accountStatus, // active | banned | deleted
    termsAcceptedAt,
    privacyAcceptedAt,
    createdAt,
    updatedAt,
    lastLoginAt
  },

  shirt: {
    playerName,
    playerNumber,
    fabric: {
      backgroundColour,
      patternColour,
      patternType // plain | stripes | hoops | checks
    },
    print: {
      nameColour,
      numberColour,
      nameOutlineEnabled,
      nameOutlineColour,
      numberOutlineEnabled,
      numberOutlineColour
    },
    updatedAt
  },

  careerStats: {
    matchesPlayed,
    matchesWon,
    matchesDrawn,
    matchesLost,
    goalsScored,
    goalsConceded,
    campaignsCompleted,
    cupsWon,
    runnerUpFinishes,
    thirdPlaceFinishes,
    totalShots,
    highScore,
    goalConversionRate
  },

  currentCampaign: {
    active,
    status,
    teamId,
    teamName,
    phase,
    round,
    matchId,
    groupId,
    groupPosition,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
    cupRun,
    gameScore,
    groupStageResults,
    knockoutResults,
    cosmeticsApplied,
    currentMatchState,
    runtimeSnapshot,
    startedAt,
    updatedAt
  },

  bestCampaign: {
    teamId,
    teamName,
    finish,
    phase,
    round,
    groupPosition,
    cupRun,
    gameScore,
    podium, // champions | runnerUp | thirdPlace | null
    cosmeticsApplied,
    completedAt
  },

  upgradesPurchased: {
    allTeams,
    goldenBoot,
    goldenBall,
    goldenGlove
  },

  cosmeticsEquipped: {
    goldenBoot,
    goldenBall,
    goldenGlove,
    goldenTicket
  },

  consumables: {
    goldenTicket: {
      quantity,
      totalPurchased,
      totalUsed,
      lastPurchasedAt,
      lastUsedAt
    }
  },

  feedback: {
    prompt1Shown, // shown/dismissed after 3 completed campaigns
    prompt2Shown, // shown/dismissed after first cup win or 10 completed campaigns
    hasSubmitted,
    lastPromptType, // prompt1 | prompt2 | null
    lastPromptedAt,
    lastSubmittedAt,
    latestRating: {
      id,
      stars,
      rating,
      comment,
      promptType,
      campaignsCompleted,
      cupsWon,
      createdAt
    },
    ratings: [
      {
        id,
        stars,
        rating,
        comment,
        promptType,
        campaignsCompleted,
        cupsWon,
        createdAt
      }
    ]
  },

  feedbackLatest: {
    id,
    stars,
    rating,
    comment,
    promptType,
    campaignsCompleted,
    cupsWon,
    createdAt
  },

  trophies: {
    careerHighlights: {
      rememberTheName,
      nationalPride,
      grizzledVeteran,
      serialWinner,
      siuuu,
      goat
    },
    matchesPlayed: {
      matchesPlayed1,
      matchesPlayed10,
      matchesPlayed25,
      matchesPlayed50,
      matchesPlayed100,
      matchesPlayed500
    },
    matchesWon: {
      matchesWon1,
      matchesWon5,
      matchesWon10,
      matchesWon25,
      matchesWon50,
      matchesWon250
    },
    goalsScored: {
      goalsScored5,
      goalsScored50,
      goalsScored125,
      goalsScored250,
      goalsScored500,
      goalsScored1000
    },
    podiumBadges: {
      thirdPlaceFinish,
      runnerUpFinish,
      championFinish
    }
  },

  stickers: {
    [teamId]: {
      wearTheShirt,
      flyTheFlag,
      liftTheCup,
      safeHands,
      talismanicLeader,
      superStriker,
      opened,
      claimable
    }
  },

  nationCupWins: {
    [teamId]: { unlocked, unlockedAt }
  },

  stripe: {
    customerId,
    lastCheckoutSessionId,
    lastPurchaseAt
  },

  lastPurchase: {
    provider,
    checkoutSessionId,
    paymentIntentId,
    purchasedAt,
    selectedItems
  },

  updatedAt
}
```

## leaderboard/{uid}

```js
{
  uid,
  username,
  teamId,
  teamName,
  gameScore,
  cupRun,
  finish,
  podium,
  completedAt,
  updatedAt
}
```

## Removed Firestore fields

The app now deletes these legacy fields from user and leaderboard documents during load/save/migration:

```js
achievements
nationStickerProgress
userShirt
shareShirt
stats
unlocks
allTeamsEquipped
allTeamsUnlocked
cosmeticsActive
cosmetics
currentProgress
emailOptIn
nickname
nicknameLower
username
usernameLower
email
accountStatus
formGuide
form
cupRunForm
tournamentProgress
campaignPoints
bestCampaign.formGuide
bestCampaign.form
bestCampaign.tournamentProgress
```

Legacy fields may still exist locally in memory for component compatibility, but they are not persisted back to Firestore.
