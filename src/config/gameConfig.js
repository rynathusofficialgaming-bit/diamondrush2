export const gameConfig = {
  // Game enabled/disabled state (Set to true to test the full flow, false to see disabled screen)
  isEnabled: true,
  disabledMessage: "SYSTEM MAINTENANCE IN PROGRESS",
  
  // Game limits
  maxFailedAttempts: 2, // Lock out after X consecutive losses
  
  // Time-based codes (The user must enter one of the 'code' values to unlock the game)
  timeCodes: [
    { time: "00:00", code: "MIDNIGHT" },
    { time: "06:00", code: "SUNRISE" },
    { time: "12:00", code: "NOON" },
    { time: "18:00", code: "SUNSET" },
    { time: "23:59", code: "LASTCALL" },
    { time: "23:59", code: "LASTCALL1" },
    { time: "23:59", code: "LASTCALL2" },
    { time: "23:59", code: "TESTDEMO" },
    { time: "23:59", code: "TESTDEMO1" },
    { time: "23:59", code: "TESTDEMO2" },
    { time: "ANY", code: "ADMIN" } // Backdoor for testing
  ],
  
  // Rewards configuration
  rewards: [
  { amount: 100, prize: "Tokens" },
  { amount: 25, prize: "Gift card voucher" },
  { amount: 5, prize: "Free Ice pints" }
],
  
  // Odds configuration (percentage)
  odds: {
    diamond: 30,    // 30% chance for diamond
    bomb: 70        // 70% chance for bomb
  },
  
  // Grid configuration
  gridSize: {
    rows: 5,
    columns: 5
  },
  
  // Discord claim link
  discordClaimLink: "https://discord.gg/yourcommunity",
  
  // Visual settings
  colors: {
    primary: "#06b6d4", // Cyan-500
    secondary: "#3b82f6", // Blue-500
    danger: "#ef4444", // Red-500
    background: "#020617" // Slate-950
  }

};



