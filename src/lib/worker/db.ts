import Dexie, { type Table } from "dexie";

export type ActivityRecord = {
  id: string;
  date: string | null;
  [key: string]: unknown;
};

export type SyncMetaRecord = {
  id: "singleton";
  syncedAt: string | null;
  lookbackMode: "all" | "days";
  lookbackDays: number | null;
  runningThresholdHr: number | null;
  hrZonesRunning: Array<{
    label: string;
    minBpm: number | null;
    maxBpm: number | null;
  }>;
};

export type DerivedCacheRecord = {
  key: string;
  payload: unknown;
  signature: string;
  updatedAt: string;
};

export class EduproDb extends Dexie {
  syncMeta!: Table<SyncMetaRecord, string>;
  activities!: Table<ActivityRecord, string>;
  derivedCache!: Table<DerivedCacheRecord, string>;

  constructor() {
    super("edupro");
    this.version(1).stores({
      syncMeta: "id",
      activities: "id, date",
      derivedCache: "key",
    });
  }
}

export const db = new EduproDb();
