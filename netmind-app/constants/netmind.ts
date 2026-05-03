export const palette = {
  ink: '#10252c',
  muted: '#627983',
  line: '#d5e5ea',
  surface: '#ffffff',
  wash: '#f3f9fb',
  court: '#0896aa',
  courtDark: '#045867',
  courtSoft: '#e0f7fa',
  courtMist: '#c9f1f6',
  gold: '#f5b849',
  coral: '#ef6f5e',
  blue: '#0a6f88',
  aqua: '#06a6b8',
};

export const darkPalette = {
  ink: '#e7f8fb',
  muted: '#9fc2cb',
  line: '#17404a',
  surface: '#0c2b34',
  wash: '#061c23',
  court: '#19c4d8',
  courtDark: '#031219',
  courtSoft: '#123c47',
  courtMist: '#9deaf3',
  gold: '#f7c867',
  coral: '#ff8b7c',
  blue: '#32bad2',
  aqua: '#31d3e5',
};

export const currentPlayer = {
  name: 'Mika Reyes',
  role: 'Outside Hitter',
  team: 'NetMind Elite U18',
  number: 12,
  height: '5 ft 10 in',
  dominantHand: 'Right',
  season: '2026 Summer League',
};

export const dashboardStats = [
  { label: 'Spike logs', value: '24', delta: 'Today', tone: palette.court },
  { label: 'Jump best', value: '59cm', delta: '+3cm', tone: palette.blue },
  { label: 'Run load', value: '3.8km', delta: 'AM session', tone: palette.gold },
  { label: 'Recovery', value: '82%', delta: 'Good', tone: palette.coral },
];

export const recentActivity = [
  { title: 'Spike and jump log saved', detail: '24 spikes, 59cm max jump', time: '10 min ago' },
  { title: 'Fatigue check submitted', detail: 'RPE 6, sleep 7.5 hours', time: 'Today' },
  { title: 'Training task completed', detail: 'Lower-body power set', time: 'Yesterday' },
  { title: 'Injury status checked', detail: 'No pain reported', time: 'Apr 28' },
];

export const pendingTasks = [
  { task: 'Log spike, jump, and run load', due: 'Today', status: 'Pending' },
  { task: 'Submit fatigue, RPE, and sleep', due: 'Tonight', status: 'Pending' },
  { task: 'Complete mobility routine', due: 'May 5', status: 'Pending' },
];

export const performanceMetrics = [
  { label: 'Spikes', value: 24 },
  { label: 'Max jump', value: 59 },
  { label: 'Run km', value: 3.8 },
  { label: 'Sprints', value: 12 },
];

export const jumpTrend = [48, 51, 50, 54, 57, 56, 59];

export const strengths = [
  { label: 'Transition attack', score: 92 },
  { label: 'Serve placement', score: 88 },
  { label: 'Court coverage', score: 84 },
  { label: 'Blocking timing', score: 79 },
];

export const trainingTasks = [
  { title: 'Explosive approach footwork', due: 'Today', progress: 60, completed: false },
  { title: 'Serve receive target reps', due: 'May 4', progress: 30, completed: false },
  { title: 'Core stability circuit', due: 'May 5', progress: 0, completed: false },
  { title: 'Film study: line defense', due: 'Done Apr 30', progress: 100, completed: true },
  { title: 'Recovery stretch flow', due: 'Done Apr 29', progress: 100, completed: true },
];

export const wellnessScores = [
  { label: 'Fatigue', value: 4, max: 10 },
  { label: 'RPE', value: 6, max: 10 },
  { label: 'Sleep', value: 7.5, max: 10 },
];

export const injuryChecklist = [
  'Ankle or knee pain',
  'Shoulder soreness',
  'Back tightness',
  'Headache or dizziness',
];

export const careerStats = [
  { label: 'Matches', value: '38' },
  { label: 'Kills', value: '412' },
  { label: 'Blocks', value: '96' },
  { label: 'Aces', value: '63' },
];
