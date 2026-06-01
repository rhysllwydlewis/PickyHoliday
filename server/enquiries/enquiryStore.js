import * as jsonEnquiryStore from './jsonEnquiryStore.js';
import * as postgresEnquiryStore from './postgresEnquiryStore.js';

const selectedStorageMode = () => `${process.env.ENQUIRY_STORAGE_MODE || 'json'}`.trim().toLowerCase();
const usesPostgres = () => selectedStorageMode() === 'postgres';

const selectedStore = () => (usesPostgres() ? postgresEnquiryStore : jsonEnquiryStore);

export async function createEnquiry(payload) {
  return selectedStore().createEnquiry(payload);
}

export async function listEnquiries() {
  return selectedStore().listEnquiries();
}

export async function updateEnquiryStatus(id, status) {
  return selectedStore().updateEnquiryStatus(id, status);
}

export async function getEnquiryStorageStatus() {
  const enquiryStorageMode = usesPostgres() ? 'postgres' : 'json';
  const databaseConfigured = postgresEnquiryStore.isPostgresConfigured();

  if (!usesPostgres()) {
    return {
      enquiryStorageMode,
      databaseConfigured,
      databaseStatus: 'json',
    };
  }

  const databaseStatus = await postgresEnquiryStore.getDatabaseStatus();

  return {
    enquiryStorageMode,
    databaseConfigured,
    databaseStatus,
  };
}
