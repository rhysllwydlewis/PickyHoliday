import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalisePromotedDeal } from '../../src/services/deals/promotedDealModel.js';

const dataDir = path.resolve(process.cwd(), 'data');
const dealFile = path.join(dataDir, 'promoted-deals.json');

const readDeals = async () => {
  try {
    const rawDeals = await readFile(dealFile, 'utf8');
    const deals = JSON.parse(rawDeals);
    return Array.isArray(deals) ? deals : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const writeDeals = async (deals) => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dealFile, JSON.stringify(deals, null, 2));
};

export async function listJsonPromotedDeals() {
  return readDeals();
}

export async function createJsonPromotedDeal(payload) {
  const deals = await readDeals();
  const deal = normalisePromotedDeal(payload);
  deals.unshift(deal);
  await writeDeals(deals);
  return deal;
}

export async function updateJsonPromotedDeal(id, payload) {
  const deals = await readDeals();
  const index = deals.findIndex((deal) => deal.id === id);
  if (index === -1) {
    const error = new Error('Promoted deal not found.');
    error.status = 404;
    throw error;
  }

  const updated = normalisePromotedDeal(payload, deals[index]);
  deals[index] = updated;
  await writeDeals(deals);
  return updated;
}

export async function getJsonPromotedDealStatus() {
  return { promotedDealStorageMode: 'json', promotedDealStorageStatus: 'json' };
}
