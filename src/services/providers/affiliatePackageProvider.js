import { affiliatePartners, getAffiliatePartner } from '../../data/affiliatePartners.js';
import { packageDealResults } from '../../data/packageDeals.js';

const normalise = (value = '') => value.toString().trim().toLowerCase();

const matchesDestination = (result, destination) => {
  const query = normalise(destination);
  if (!query) return true;
  return normalise([
    result.destination,
    result.country,
    result.hotelName,
    result.supplierName,
    ...(result.airlineNames || []),
    ...(result.tags || []),
  ].join(' ')).includes(query);
};

const matchesIntent = (result, intent) => {
  if (!intent || intent === 'Holidays') return result.tags.includes('Holidays');
  return result.tags.includes(intent) || result.resultType === normalise(intent).replaceAll(' ', '-');
};

const partnerTrackingId = (partner, config = {}) => {
  if (!partner) return '';
  return config.trackingIds?.[partner.id]
    || config[partner.envTrackingIdName]
    || partner.defaultTrackingId
    || config.defaultTrackingId
    || '';
};

const isApprovedPartnerUrl = (url, partner) => {
  if (!url || !partner) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return partner.allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
};

const withTracking = (url, partner, trackingId) => {
  if (!trackingId || !partner?.trackingParamName) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has(partner.trackingParamName)) {
    parsed.searchParams.set(partner.trackingParamName, trackingId);
  }
  return parsed.toString();
};

export function createAffiliatePackageProvider(config = {}) {
  const partnerIds = config.partners || affiliatePartners.map((partner) => partner.id);
  const enabledPartners = affiliatePartners.filter((partner) => partnerIds.includes(partner.id));

  const normaliseResult = (result) => {
    const partner = getAffiliatePartner(result.partnerId);
    const hasSafeUrl = isApprovedPartnerUrl(result.partnerUrl, partner);
    const trackingId = partnerTrackingId(partner, config);
    const safePartnerUrl = hasSafeUrl ? withTracking(result.partnerUrl, partner, trackingId) : '';

    return {
      ...result,
      provider: 'affiliate-package',
      supplierName: result.supplierName || `${partner?.displayName || 'Partner'} package redirect candidate`,
      partnerUrl: safePartnerUrl,
      bookingMode: safePartnerUrl ? 'affiliate' : 'manual-quote',
      protectionLabel: result.protectionLabel || 'Partner terms and protection must be confirmed on the partner site before booking.',
      tags: [...new Set([...(result.tags || []), 'Package holidays'])],
    };
  };

  const availableDeals = () => packageDealResults
    .filter((result) => enabledPartners.some((partner) => partner.id === result.partnerId))
    .map(normaliseResult);

  const filterResults = (criteria = {}) => availableDeals().filter((result) => (
    matchesDestination(result, criteria.destination)
    && matchesIntent(result, criteria.intent)
  ));

  return {
    id: 'affiliate-package',
    label: 'Affiliate/package redirect provider',
    configured: enabledPartners.length > 0,
    partners: enabledPartners.map((partner) => partner.id),
    async search(criteria = {}) {
      return filterResults(criteria);
    },
    async packages(criteria = {}) {
      return filterResults({ ...criteria, intent: criteria.intent || 'Holidays' });
    },
    async composeHoliday(criteria = {}) {
      return this.packages(criteria);
    },
    buildPartnerRedirect(result) {
      const partner = getAffiliatePartner(result?.partnerId);
      if (!isApprovedPartnerUrl(result?.partnerUrl, partner)) return null;
      return withTracking(result.partnerUrl, partner, partnerTrackingId(partner, config));
    },
    getStatus() {
      return {
        provider: this.id,
        configured: this.configured,
        mode: this.configured ? 'config-mock-active' : 'no-approved-partners',
        partners: this.partners,
        resultCount: availableDeals().length,
        note: this.configured
          ? 'Package/affiliate provider is active with approved partner config and mock/config package deals. It is not a live affiliate feed or booking engine.'
          : 'No affiliate/package partners are enabled.',
      };
    },
  };
}
