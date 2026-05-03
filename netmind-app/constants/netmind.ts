export const palette = {
  ink: '#172026',
  muted: '#66727f',
  line: '#dce4ea',
  surface: '#ffffff',
  wash: '#f5f8fa',
  court: '#0f766e',
  courtDark: '#115e59',
  gold: '#f5b849',
  coral: '#ef6f5e',
  blue: '#2563eb',
  green: '#16a34a',
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
  { label: 'Kill Rate', value: '46%', delta: '+8%', tone: palette.court },
  { label: 'Serve Accuracy', value: '88%', delta: '+4%', tone: palette.blue },
  { label: 'Training Score', value: '92', delta: '+11', tone: palette.gold },
  { label: 'Tasks Due', value: '3', delta: 'Today', tone: palette.coral },
];

export const recentActivity = [
  { title: 'Jump serve form review', detail: 'Coach Ana left 3 notes', time: '10 min ago' },
  { title: 'Lower-body power set completed', detail: '4 rounds logged', time: 'Yesterday' },
  { title: 'Match vs. Hawks added', detail: 'Team won 3-1', time: 'Apr 29' },
  { title: 'Recovery check submitted', detail: 'No soreness reported', time: 'Apr 28' },
];

export const pendingTasks = [
  { task: 'Upload 5 attack clips', due: 'Today', status: 'Pending' },
  { task: 'Complete mobility routine', due: 'Tomorrow', status: 'Pending' },
  { task: 'Review blocking plan', due: 'May 5', status: 'Pending' },
];

export const performanceMetrics = [
  { label: 'Kills', value: 18 },
  { label: 'Blocks', value: 5 },
  { label: 'Aces', value: 4 },
  { label: 'Digs', value: 21 },
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

export const careerStats = [
  { label: 'Matches', value: '38' },
  { label: 'Kills', value: '412' },
  { label: 'Blocks', value: '96' },
  { label: 'Aces', value: '63' },
];
