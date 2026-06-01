export function createAffiliatePackageProvider(config = {}) {
  return {
    id: 'affiliate-package',
    label: 'Affiliate/package redirect provider scaffold',
    configured: Boolean(config.defaultTrackingId),
    partners: config.partners || [],
    async search() {
      return [];
    },
    async packages() {
      return [];
    },
    buildPartnerRedirect(result) {
      if (!result?.partnerUrl) return null;
      const separator = result.partnerUrl.includes('?') ? '&' : '?';
      return config.defaultTrackingId ? `${result.partnerUrl}${separator}tracking_id=${encodeURIComponent(config.defaultTrackingId)}` : result.partnerUrl;
    },
    getStatus() {
      return {
        provider: this.id,
        configured: this.configured,
        mode: 'scaffold-only',
        note: 'Partner feeds and affiliate redirect tracking are placeholders for a future package-provider PR.',
      };
    },
  };
}
