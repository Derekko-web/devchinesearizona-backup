import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

type QueryResult = {
  data: unknown;
  error: null;
};

type QueryBuilder = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  limit: (count: number) => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  upsert: (payload: unknown) => Promise<{ error: null }>;
};

type LoadFunction = (request: string, parent?: unknown, isMain?: boolean) => unknown;

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  RADAR_STORE_PATH: process.env.RADAR_STORE_PATH,
  RADAR_STORAGE_MODE: process.env.RADAR_STORAGE_MODE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase');
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function createAppSupabaseQueryBuilder(table: string): QueryBuilder {
  const jobControlRow = {
    paused: false,
    publish_cap: 6,
    updated_at: '2026-04-18T13:00:00.000Z',
  };

  function queryResultForAppTable(): QueryResult {
    if (table === 'radar_job_controls') {
      return { data: jobControlRow, error: null };
    }

    return { data: [], error: null };
  }

  const builder = {} as QueryBuilder;
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.limit = () => Promise.resolve(queryResultForAppTable());
  builder.maybeSingle = () => Promise.resolve(queryResultForAppTable());
  builder.upsert = () => Promise.resolve({ error: null });
  builder.then = (resolve, reject) =>
    Promise.resolve(queryResultForAppTable()).then(resolve, reject);
  return builder;
}

function createStorageModuleWithFakeSupabase() {
  const nodeModule = require('node:module') as { _load: LoadFunction };
  const originalLoad = nodeModule._load;
  const storagePath = require.resolve('../scripts/arizona_radar/storage.cjs');
  let jobControlRow = {
    paused: false,
    publish_cap: 10,
    updated_at: '2026-04-18T12:00:00.000Z',
  };
  const createClientOptions: unknown[] = [];
  const upserts: Array<{ payload: unknown; table: string }> = [];

  function queryResultFor(table: string): QueryResult {
    if (table === 'radar_job_controls') {
      return { data: jobControlRow, error: null };
    }

    return { data: [], error: null };
  }

  function createQueryBuilder(table: string): QueryBuilder {
    const builder = {} as QueryBuilder;
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.order = () => builder;
    builder.limit = () => Promise.resolve(queryResultFor(table));
    builder.maybeSingle = () => Promise.resolve(queryResultFor(table));
    builder.upsert = (payload: unknown) => {
      upserts.push({ table, payload });
      if (table === 'radar_job_controls' && payload && typeof payload === 'object') {
        const row = payload as {
          paused?: boolean;
          publish_cap?: number;
          updated_at?: string;
        };
        jobControlRow = {
          paused: Boolean(row.paused),
          publish_cap: Number(row.publish_cap ?? 10),
          updated_at: String(row.updated_at ?? jobControlRow.updated_at),
        };
      }
      return Promise.resolve({ error: null });
    };
    builder.then = (resolve, reject) => Promise.resolve(queryResultFor(table)).then(resolve, reject);
    return builder;
  }

  delete require.cache[storagePath];
  nodeModule._load = ((request: string, parent?: unknown, isMain?: boolean) => {
    if (request === '@supabase/supabase-js') {
      return {
        createClient: (_url: string, _key: string, options: unknown) => {
          createClientOptions.push(options);
          return {
            from: (table: string) => createQueryBuilder(table),
          };
        },
      };
    }

    return Reflect.apply(originalLoad, nodeModule, [request, parent, isMain]);
  }) as LoadFunction;

  try {
    return {
      module: require('../scripts/arizona_radar/storage.cjs') as {
        readStoreSnapshot: (storePath: string) => Promise<Record<string, unknown>>;
        writeStoreSnapshot: (
          storePath: string,
          store: Record<string, unknown>
        ) => Promise<Record<string, unknown>>;
      },
      createClientOptions,
      upserts,
    };
  } finally {
    nodeModule._load = originalLoad;
  }
}

describe('Arizona Radar storage', () => {
  it('refreshes the app-side runtime store mirror after Supabase reads succeed', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.RADAR_STORAGE_MODE = 'supabase';

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-storage-app-'));
    const storePath = path.join(tempDir, 'radar-runtime', 'store.json');
    process.env.RADAR_STORE_PATH = storePath;

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseServiceClient: () => ({
        from: (table: string) => createAppSupabaseQueryBuilder(table),
      }),
      isSupabaseServiceConfigured: () => true,
    }));

    const radar = await import('@/lib/radar');

    const persisted = await radar.readRadarStoreAsync();
    const mirrored = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      jobControl: { publishCap: number; updatedAt: string };
    };

    expect(persisted.jobControl).toMatchObject({
      publishCap: 6,
      updatedAt: '2026-04-18T13:00:00.000Z',
    });
    expect(mirrored.jobControl.publishCap).toBe(6);
    expect(mirrored.jobControl.updatedAt).toBe('2026-04-18T13:00:00.000Z');
  });

  it('refreshes the local runtime store mirror after Supabase reads succeed', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    vi.stubEnv('NODE_ENV', 'production');
    process.env.RADAR_STORAGE_MODE = 'supabase';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const { module: storage } = createStorageModuleWithFakeSupabase();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-storage-'));
    const storePath = path.join(tempDir, 'radar-runtime', 'store.json');

    const persisted = await storage.readStoreSnapshot(storePath);
    const mirrored = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      jobControl: { publishCap: number; updatedAt: string };
    };

    expect(persisted.jobControl).toMatchObject({
      publishCap: 10,
      updatedAt: '2026-04-18T12:00:00.000Z',
    });
    expect(mirrored.jobControl.publishCap).toBe(10);
    expect(mirrored.jobControl.updatedAt).toBe('2026-04-18T12:00:00.000Z');
  });

  it('passes a ws transport to Supabase Realtime when Node lacks native WebSocket', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    vi.stubEnv('NODE_ENV', 'production');
    process.env.RADAR_STORAGE_MODE = 'supabase';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const { module: storage, createClientOptions } = createStorageModuleWithFakeSupabase();
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-storage-ws-'));
      const storePath = path.join(tempDir, 'radar-runtime', 'store.json');

      await storage.readStoreSnapshot(storePath);

      expect(createClientOptions[0]).toMatchObject({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          transport: require('ws'),
        },
      });
    } finally {
      if (originalWebSocket) {
        Object.defineProperty(globalThis, 'WebSocket', originalWebSocket);
      } else {
        delete (globalThis as { WebSocket?: unknown }).WebSocket;
      }
    }
  });

  it('refreshes the local runtime store mirror after Supabase writes succeed', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    vi.stubEnv('NODE_ENV', 'production');
    process.env.RADAR_STORAGE_MODE = 'supabase';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const { defaultStoreSnapshot } = require('../scripts/arizona_radar/core.cjs') as {
      defaultStoreSnapshot: () => Record<string, unknown>;
    };
    const { module: storage, upserts } = createStorageModuleWithFakeSupabase();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-storage-'));
    const storePath = path.join(tempDir, 'radar-runtime', 'store.json');
    const store = {
      ...defaultStoreSnapshot(),
      jobControl: {
        paused: false,
        publishCap: 3,
        updatedAt: '2026-04-18T12:30:00.000Z',
      },
    };

    const persisted = await storage.writeStoreSnapshot(storePath, store);
    const mirrored = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      jobControl: { publishCap: number; updatedAt: string };
    };

    expect(upserts.some((entry) => entry.table === 'radar_job_controls')).toBe(true);
    expect(persisted.jobControl).toMatchObject({
      publishCap: 3,
      updatedAt: '2026-04-18T12:30:00.000Z',
    });
    expect(mirrored.jobControl.publishCap).toBe(3);
    expect(mirrored.jobControl.updatedAt).toBe('2026-04-18T12:30:00.000Z');
  });
});
