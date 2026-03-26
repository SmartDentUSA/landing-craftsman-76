// src/services/wikidata-sync.ts
// Cliente frontend para a Edge Function wikidata-sync v2.0

import { supabase } from '@/integrations/supabase/client';

export type WikidataSyncAction = 'sync_company' | 'sync_products' | 'sync_all';

export interface WikidataSyncOptions {
  action: WikidataSyncAction;
  dryRun?: boolean;
  uploadImages?: boolean;
  productIds?: string[];
}

export interface WikidataCompanyResult {
  wikidataQid: string | null;
  commonsLogo: string | null;
  status: 'pending' | 'syncing' | 'success' | 'error';
  statementsCreated: number;
  error?: string;
}

export interface WikidataProductResult {
  productId: string;
  productName: string;
  wikidataQid: string | null;
  commonsImage: string | null;
  status: 'success' | 'error' | 'partial';
  statementsCreated: number;
  error?: string;
}

export interface WikidataSyncReport {
  syncId: string;
  startedAt: string;
  completedAt: string;
  totalDuration: number;
  company: WikidataCompanyResult;
  products: WikidataProductResult[];
  summary: {
    totalProducts: number;
    succeeded: number;
    failed: number;
  };
}

export interface WikidataSyncResult {
  success: boolean;
  report?: WikidataSyncReport;
  error?: string;
}

export async function syncWikidata(options: WikidataSyncOptions): Promise<WikidataSyncResult> {
  const { data, error } = await supabase.functions.invoke('wikidata-sync', {
    body: options,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as WikidataSyncResult;
}

export async function syncCompanyToWikidata(dryRun = false): Promise<WikidataSyncResult> {
  return syncWikidata({ action: 'sync_company', dryRun });
}

export async function syncProductsToWikidata(
  productIds?: string[],
  dryRun = false,
  uploadImages = false,
): Promise<WikidataSyncResult> {
  return syncWikidata({ action: 'sync_products', dryRun, uploadImages, productIds });
}

export async function syncAllToWikidata(
  dryRun = false,
  uploadImages = false,
): Promise<WikidataSyncResult> {
  return syncWikidata({ action: 'sync_all', dryRun, uploadImages });
}
