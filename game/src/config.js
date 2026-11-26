// SKYLANE — Island Run: configuration for the flight game.
// Every number that tunes the game lives here so the other files stay small.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.config = {
  gameTitle: 'SKYLANE — Island Run',
  worldSize: 2600,          // terrain spans -1300..1300 on x and z
  seaLevel: 0,
  islandRadius: 980,        // hills fade out past this distance from the centre

  // The runway sits on the main island, pointing north (-z).
  runway: { x: 0, z: 430, heading: 0, length: 280, width: 34, elevation: 8 },

  // Arcade flight model.
  maxSpeed: 95,             // m/s at full throttle
  minSpeed: 15,             // m/s at idle
  stallSpeed: 24,           // below this the plane starts to sink
  maxBank: 0.95,            // radians
  maxPitchUp: 0.38,
  maxPitchDown: -0.32,
  turnRate: 0.55,           // yaw per second per radian of bank, scaled by speed
  accelRate: 0.8,           // how fast speed chases the throttle target

  // Fuel and scoring.
  fuelMax: 100,
  fuelDrainIdle: 0.35,      // per second
  fuelDrainFull: 0.75,      // extra per second at full throttle
  ringFuelBonus: 15,
  ringScore: 500,
  landingScore: 1000,
  stageScore: 1000,

  // Ring courses: [x, y, z] — y is raised above the terrain at build time.
  ringsStage1: [
    [0, 70, 300], [-260, 85, 0], [-460, 95, -360], [-160, 75, -660],
    [210, 90, -520], [460, 80, -160],
  ],
  ringsStage2: [
    [620, 105, 320], [320, 125, 720], [-220, 115, 820], [-620, 95, 520],
    [-720, 105, -120], [-420, 125, -720], [120, 105, -820], [520, 95, -620],
  ],
  stageNames: ['RING RUN', 'ISLAND TOUR', 'FINAL APPROACH'],
};
