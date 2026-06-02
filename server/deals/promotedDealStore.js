import { mapPromotedDealToHolidayResult, promotedDealStatuses, publicPromotedDeal } from '../../src/services/deals/promotedDealModel.js';
import { createJsonPromotedDeal, getJsonPromotedDealStatus, listJsonPromotedDeals, updateJsonPromotedDeal } from './jsonPromotedDealStore.js';
import { createPostgresPromotedDeal, getPostgresPromotedDealStatus, listPostgresPromotedDeals, updatePostgresPromotedDeal } from './postgresPromotedDealStore.js';

const mode = () => (process.env.PROMOTED_DEAL_STORAGE_MODE || 'json').toLowerCase() === 'postgres' ? 'postgres' : 'json';

const store = () => (mode() === 'postgres'
  ? {
    list: listPostgresPromotedDeals,
    create: createPostgresPromotedDeal,
    update: updatePostgresPromotedDeal,
    status: getPostgresPromotedDealStatus,
  }
  : {
    list: listJsonPromotedDeals,
    create: createJsonPromotedDeal,
    update: updateJsonPromotedDeal,
    status: getJsonPromotedDealStatus,
  });

export async function listPromotedDeals() {
  return store().list();
}

export async function listPublicPromotedDeals() {
  const deals = await listPromotedDeals();
  return deals.filter((deal) => deal.status === 'active').map(mapPromotedDealToHolidayResult);
}

export async function createPromotedDeal(payload) {
  return store().create(payload);
}

export async function updatePromotedDeal(id, payload) {
  return store().update(id, payload);
}

export async function updatePromotedDealStatus(id, status) {
  if (!promotedDealStatuses.includes(status)) {
    const error = new Error(`status must be one of: ${promotedDealStatuses.join(', ')}.`);
    error.status = 400;
    error.fieldErrors = [{ field: 'status', message: error.message }];
    throw error;
  }
  return updatePromotedDeal(id, { status });
}

export async function getPromotedDealStorageStatus() {
  return store().status();
}

export const toAdminPromotedDeal = publicPromotedDeal;
