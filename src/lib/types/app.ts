export type NumericRange = {
  min: number | null;
  max: number | null;
};

export type HrZone = {
  label: string;
  minBpm: number | null;
  maxBpm: number | null;
};

export type RunSummary = {
  id: string;
  date: string | null;
  name?: string | null;
  startDateTime?: string | null;
  type?: string | null;
  distanceKm: number;
  movingTimeSec?: number | null;
  elevationGainM?: number | null;
  avgTempC?: number | null;
  avgHrBpm?: number | null;
  maxHrBpm?: number | null;
  load?: number | null;
  hrZoneDurationsSec?: number[];
  paceMinKm?: number | null;
};

export type RollingSeriesPoint = {
  date: string;
  dayKm: number;
  sum7: number;
  sum7ma30: number;
  sum7ma90: number;
  toleranceKmModel: number | null;
  sum14: number;
  sum28: number;
  sum30: number;
  sum90: number;
  sum180: number;
};

export type PaceHrPoint = {
  source: "interval" | "split-km" | "run";
  activityId: string;
  activityName: string | null;
  date: string;
  splitKm: number | null;
  distanceKm: number;
  paceMinKm: number;
  avgHrBpm: number;
};

export type FoundationsBlockRow = {
  label: string;
  count: number;
  valueLabel?: string;
};

export type FoundationsBlock = {
  title: string;
  total: number;
  rows: FoundationsBlockRow[];
};

export type FoundationsModel = {
  summary: string;
  blocks: FoundationsBlock[];
};

export type HeatmapCell = {
  weekKey: string;
  bin: number;
  avgHrBpm: number | null;
};

export type HeatmapModel = {
  weekKeys: string[];
  bins: number[];
  cells: HeatmapCell[];
};

export type ActivityIntervalPoint = {
  label?: string | null;
  name?: string | null;
  intervalType?: string | null;
  paceMinKm: number | null;
  avgHrBpm: number | null;
  maxHrBpm?: number | null;
  intervalIndex?: number | null;
  distanceKm?: number | null;
  movingTimeSec?: number | null;
  chartEligible?: boolean;
};

export type ActivitySplitPoint = {
  splitKm: number | null;
  paceMinKm: number | null;
  avgHrBpm: number | null;
};

export type ActivityDetailStreamPoint = {
  elapsedSec: number;
  distanceKm: number | null;
  paceMinKm: number | null;
  hrBpm: number | null;
  cadenceSpm: number | null;
  altitudeM: number | null;
};

export type ActivityDetailPayload = {
  summary: {
    id: string;
    date: string | null;
    name: string | null;
    startDateTime: string | null;
    type: string | null;
    distanceKm: number | null;
    movingTimeSec: number | null;
    paceMinKm: number | null;
    avgHrBpm: number | null;
    maxHrBpm: number | null;
    elevationGainM: number | null;
    avgTempC: number | null;
    load: number | null;
  };
  intervalPoints: ActivityIntervalPoint[];
  splitKmPoints: ActivitySplitPoint[];
  detailStreamPoints: ActivityDetailStreamPoint[];
  baselineContext: {
    date: string | null;
    sum7: number | null;
    sum7ma90: number | null;
    capKm: number | null;
    headroomKm: number | null;
    deltaKm: number | null;
    deltaPct: number | null;
    status: string;
  };
};

export type SeriesPayload = {
  syncedAt: string | null;
  activityCount: number;
  lookbackDays: number | "all" | null;
  defaultRunningThresholdHr: number | null;
  runningThresholdHrOverride: number | null;
  runningThresholdHr: number | null;
  defaultHrZonesRunning: HrZone[];
  hrZonesRunningOverride: HrZone[];
  hrZonesRunning: HrZone[];
  paceHrPoints: PaceHrPoint[];
  runs: RunSummary[];
  series: RollingSeriesPoint[];
  latest: RollingSeriesPoint | null;
};

export type WorkerSyncMode = "update" | "fetch-all";

export type WorkerSyncProgressEvent = {
  phase: "list" | "activity" | "profile" | "complete";
  syncMode: WorkerSyncMode;
  fetchedCount?: number;
  count?: number;
  completedActivities?: number;
  totalActivities?: number;
  activityId?: string;
  activityDate?: string | null;
  requestStage?: "detail" | "streams" | "cached" | "failed";
  isFinalForActivity?: boolean;
  browserBlocked?: boolean;
  unsupported?: boolean;
  streamFetchSkipped?: boolean;
  syncedAt?: string | null;
  refreshSuggested?: boolean;
};

export type SyncResult = {
  ok: boolean;
  syncMode: WorkerSyncMode;
  syncOldestDate: string;
  syncNewestDate: string;
  syncedAt: string | null;
  count: number;
  fetchedCount: number;
  splitPoints: number;
  splitRunsRebuilt: number;
  splitRunsCached: number;
  splitRunsFailed: number;
  splitUnsupported: boolean;
  browserBlocked: boolean;
  lookbackDays: number | "all" | null;
};

export type RecentActivitiesSelectionEvent = {
  activityId: string;
  shiftKey: boolean;
  altKey: boolean;
};
