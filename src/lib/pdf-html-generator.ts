// Color Themes Registry
const COLOR_THEMES: Record<string, any> = {
  'cherry-red-cream': { primary: '#750505', background: '#FBFCEB', text: '#750505', kicker: '#750505', borderColor: 'rgba(117, 5, 5, 0.2)', boxBgColor: 'rgba(117, 5, 5, 0.06)' },
  'cream-cherry-red': { primary: '#FBFCEB', background: '#750505', text: '#FBFCEB', kicker: '#FFECD1', borderColor: 'rgba(251, 252, 235, 0.25)', boxBgColor: 'rgba(251, 252, 235, 0.08)' },
  'cyprus-sand-dune': { primary: '#004643', background: '#F0EDE5', text: '#004643', kicker: '#004643', borderColor: 'rgba(0, 70, 67, 0.2)', boxBgColor: 'rgba(0, 70, 67, 0.06)' },
  'sand-dune-cyprus': { primary: '#F0EDE5', background: '#004643', text: '#F0EDE5', kicker: '#E6CFA7', borderColor: 'rgba(240, 237, 229, 0.25)', boxBgColor: 'rgba(240, 237, 229, 0.08)' },
  'plum-milk': { primary: '#381932', background: '#FFF3E6', text: '#381932', kicker: '#381932', borderColor: 'rgba(56, 25, 50, 0.2)', boxBgColor: 'rgba(56, 25, 50, 0.06)' },
  'milk-plum': { primary: '#FFF3E6', background: '#381932', text: '#FFF3E6', kicker: '#FFECD1', borderColor: 'rgba(255, 243, 230, 0.25)', boxBgColor: 'rgba(255, 243, 230, 0.08)' },
  'sand-chocolate': { primary: '#3E000C', background: '#FFECD1', text: '#3E000C', kicker: '#3E000C', borderColor: 'rgba(62, 0, 12, 0.2)', boxBgColor: 'rgba(62, 0, 12, 0.06)' },
  'chocolate-sand': { primary: '#FFECD1', background: '#3E000C', text: '#FFECD1', kicker: '#FFECD1', borderColor: 'rgba(255, 236, 209, 0.25)', boxBgColor: 'rgba(255, 236, 209, 0.08)' },
  'feldgrau-wheat': { primary: '#3A4B41', background: '#E6CFA7', text: '#3A4B41', kicker: '#3A4B41', borderColor: 'rgba(58, 75, 65, 0.2)', boxBgColor: 'rgba(58, 75, 65, 0.06)' },
  'wheat-feldgrau': { primary: '#E6CFA7', background: '#3A4B41', text: '#E6CFA7', kicker: '#E6CFA7', borderColor: 'rgba(230, 207, 167, 0.25)', boxBgColor: 'rgba(230, 207, 167, 0.08)' },
  'noctis-marigold': { primary: '#1F2235', background: '#E3A419', text: '#1F2235', kicker: '#1F2235', borderColor: 'rgba(31, 34, 53, 0.2)', boxBgColor: 'rgba(31, 34, 53, 0.08)' },
  'marigold-noctis': { primary: '#E3A419', background: '#1F2235', text: '#E3A419', kicker: '#E3A419', borderColor: 'rgba(227, 164, 25, 0.25)', boxBgColor: 'rgba(227, 164, 25, 0.08)' },
  'champagne-obsidian': { primary: '#111111', background: '#F7F4EF', text: '#111111', kicker: '#71717A', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'obsidian-champagne': { primary: '#F7F4EF', background: '#111111', text: '#F7F4EF', kicker: '#D4D4D8', borderColor: 'rgba(247, 244, 239, 0.25)', boxBgColor: 'rgba(247, 244, 239, 0.08)' },
  'forest-olive-ivory': { primary: '#2C352E', background: '#F2EFE9', text: '#2C352E', kicker: '#58695C', borderColor: 'rgba(44, 53, 46, 0.2)', boxBgColor: 'rgba(44, 53, 46, 0.06)' },
  'ivory-forest-olive': { primary: '#F2EFE9', background: '#2C352E', text: '#F2EFE9', kicker: '#E2DFD9', borderColor: 'rgba(242, 239, 233, 0.25)', boxBgColor: 'rgba(242, 239, 233, 0.08)' },
  'airy-white': { primary: '#27272A', background: '#FFFFFF', text: '#27272A', kicker: '#A1A1AA', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'royal-gold': { primary: '#8A6D2F', background: '#FFF8EA', text: '#8A6D2F', kicker: '#8A6D2F', borderColor: 'rgba(138, 109, 47, 0.25)', boxBgColor: 'rgba(138, 109, 47, 0.08)' },
  'dark-studio': { primary: '#F3F4F6', background: '#141622', text: '#F3F4F6', kicker: '#E5C365', borderColor: '#232634', boxBgColor: '#0F1017' }
};

const DEFAULT_PAGE_SEQUENCE = [
  { id: 'cover', type: 'cover', label: 'Cover Page' },
  { id: 'aboutUs', type: 'aboutUs', label: 'About Us' },
  { id: 'shootDetails', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { id: 'functionsPage', type: 'functionsPage', label: 'Functions & Coverage' },
  { id: 'deliverablesPage', type: 'deliverablesPage', label: 'Deliverables' },
  { id: 'specialValueAdditions', type: 'specialValueAdditions', label: 'Special Value Additions' },
  { id: 'pricingPage', type: 'pricingPage', label: 'Pricing Details' },
  { id: 'paymentTermsPage', type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { id: 'addOnsPage', type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { id: 'termsPage', type: 'termsPage', label: 'Terms & Conditions' },
  { id: 'thankYouPage', type: 'thankYouPage', label: 'Thank You Page' }
];

export function renderQuotationToHTML(documentData: any): string {
  const themeKey = documentData?.look || documentData?.theme || 'cyprus-sand-dune';
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES['cyprus-sand-dune'];
  const primaryFont = documentData?.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = documentData?.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  const pageSequence = (documentData?.pageSequence && documentData.pageSequence.length > 0) 
    ? documentData.pageSequence 
    : DEFAULT_PAGE_SEQUENCE;

  const cover = documentData?.cover || {};
  const coupleName = cover.coupleName || (cover.groomName ? `${cover.groomName} & ${cover.brideName}` : 'RAHUL & NEHA');
  const eventType = (cover.eventType || 'WEDDING').toUpperCase();
  const sideOption = cover.sideOption || 'BOTH SIDES';
  const locationName = cover.locationName || cover.location || 'MUMBAI';
  const brandName = cover.brandName || 'FILMIFY WEDDINGS';
  const brandLogoUrl = cover.brandLogoUrl || '';
  const coverPhoto = cover.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80';

  const aboutUs = documentData?.aboutUs || documentData?.about || {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever'
  };

  const shootDetails = documentData?.shootDetails || {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot\nCandid Photography\nCinematography\nPortable Changing Room',
    crewText: 'Full Ultra HD Super-Fine Raw Photos\nApprox 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel'
  };

  const functionsPage = documentData?.functionsPage || {
    kicker: 'EVENT SCHEDULE',
    heading: 'Functions & Coverage',
    items: [
      { id: '1', title: 'HALDI & SANGEET', dateTime: '4 MAR 26 • 10:00 AM TO 05:00 PM • (7 Hours)', venue: 'JW MARRIOTT, MUMBAI', team: '2x Candid Photographers | 2x Cinematographers | 1x Drone' },
      { id: '2', title: 'WEDDING', dateTime: '5 MAR 26 • 04:00 PM TO 11:00 PM • (7 Hours)', venue: 'PALACE GROUNDS, MUMBAI', team: '2x Candid Photographers | 2x Cinematographers | 1x Drone | 1x Traditional Video' }
    ]
  };

  const deliverablesPage = documentData?.deliverablesPage || {
    kicker: 'WHAT WE DELIVER',
    heading: 'DELIVERABLES',
    selectedItems: ['Teaser Video (1-2 Min)', 'Main Highlight Film (15-20 Min)', 'Instagram Reels', 'All Raw Photos & Footage in Hard Drive', '75-80 Retouched High-Res Images']
  };

  const specialValueAdditions = documentData?.specialValueAdditions || {
    kicker: 'COMPLIMENTARY',
    heading: 'SPECIAL VALUE ADDITIONS',
    items: [
      { id: '1', title: 'Complimentary Pre-Wedding Session (1 Day)', free: true },
      { id: '2', title: 'Free Luxury Album Upgrade (40 Pages)', free: true },
      { id: '3', title: 'Drone Coverage Included for Wedding & Sangeet', free: true },
      { id: '4', title: 'Same Day Edit Reel for Instagram', free: true }
    ]
  };

  const pricingPage = documentData?.pricingPage || {
    kicker: 'INVESTMENT SUMMARY',
    heading: 'PRICING DETAILS',
    basePrice: 170000,
    discountAmount: 10000,
    discountPercent: 5
  };

  const paymentTermsPage = documentData?.paymentTermsPage || {
    kicker: 'PAYMENT SCHEDULE',
    heading: 'PAYMENT TERMS & SCHEDULE',
    steps: [
      { id: '1', stepName: 'Token Booking Amount', date: '10 FEB 26', amount: 25000, status: 'COMPLETED' },
      { id: '2', stepName: 'Advance Amount (Pre-Event)', date: '01 MAR 26', amount: 75000, status: 'PENDING' },
      { id: '3', stepName: 'On Wedding Day', date: '06 MAR 26', amount: 50000, status: 'PENDING' },
      { id: '4', stepName: 'Final Delivery Amount', date: '25 MAR 26', amount: 20000, status: 'PENDING' }
    ]
  };

  const addOnsPage = documentData?.addOnsPage || {
    kicker: "EMBRACE YOUR DAY - YOU'RE IN CONTROL",
    heading: 'ADD-ONS & UPGRADES',
    items: [
      { id: '1', title: 'Additional Candid Photographer', price: 15000 },
      { id: '2', title: 'Additional Cinematographer', price: 22000 },
      { id: '3', title: 'Extra Album Pages (Per 10 Pages)', price: 5000 }
    ]
  };

  const termsPage = documentData?.termsPage || {
    kicker: 'POLICIES & RULES',
    heading: 'TERMS & CONDITIONS',
    text: '1. Advance payment is non-refundable upon booking confirmation.\n2. Travel and accommodation charges outside base city shall be borne by client.\n3. Raw footage and unedited photos will be delivered as per agreed timelines.\n4. One cycle of revision is included for final video edits within 30 days of delivery.'
  };

  const thankYouPage = documentData?.thankYouPage || {
    heading: 'THANK YOU',
    subHeading: 'LOOKING FORWARD TO CREATING MAGIC',
    message: 'We would be honored to capture your celebration and create memories for a lifetime.',
    brandName: brandName,
    contactNumber: '+91 98765 43210',
    email: 'contact@filmifyweddings.com',
    website: 'www.filmifyweddings.com'
  };

  let pagesHTML = '';

  pageSequence.forEach((pageItem: any) => {
    const pageType = pageItem.type || pageItem.id;

    if (pageType === 'cover') {
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;">
          <div style="width:100%;display:flex;flex-direction:column;align-items:center;padding-top:24px;">
            <div style="font-family:${primaryFont};font-size:42px;letter-spacing:0.18em;text-transform:uppercase;font-weight:900;line-height:1.2;color:${theme.text};">
              ${coupleName}
            </div>
            <div style="font-family:${primaryFont};font-size:14px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;margin-top:12px;color:${theme.text};">
              ${eventType} QUOTATION
            </div>
          </div>

          ${coverPhoto ? `
            <div style="width:100%;height:450px;border-radius:16px;overflow:hidden;margin:24px 0;">
              <img src="${coverPhoto}" alt="Cover Photo" style="width:100%;height:100%;object-fit:cover;" crossOrigin="anonymous" />
            </div>
          ` : ''}

          <div style="width:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:16px;">
            <p style="font-size:12px;text-transform:uppercase;font-weight:800;letter-spacing:0.15em;color:${theme.text};margin:0;">
              ${[sideOption, locationName].filter(Boolean).join(' • ')}
            </p>
            ${brandName ? `<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.25em;font-weight:900;color:${theme.kicker};margin-top:6px;">${brandName}</p>` : ''}
          </div>
        </section>
      `;
    } else if (pageType === 'aboutUs') {
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${aboutUs.kicker || 'INTRODUCTION'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 16px 0;">
              ${aboutUs.heading || 'ABOUT US'}
            </h2>
            <p style="font-size:14px;line-height:1.7;opacity:0.9;font-weight:400;white-space:pre-line;color:${theme.text};">
              ${aboutUs.text}
            </p>
          </div>
        </section>
      `;
    } else if (pageType === 'shootDetails') {
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${shootDetails.kicker || 'WHAT WE DO'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${shootDetails.heading || 'Pre-Wedding Shoot'}
            </h2>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left;">
              <div style="padding:16px;border-radius:12px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:4px;">Duration & Days</span>
                <p style="font-size:12px;font-weight:700;white-space:pre-line;margin:0;">${shootDetails.daysText}</p>
              </div>
              <div style="padding:16px;border-radius:12px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:4px;">Crew & Equipment</span>
                <p style="font-size:12px;font-weight:700;white-space:pre-line;margin:0;">${shootDetails.crewText}</p>
              </div>
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'functionsPage') {
      let itemsHTML = '';
      (functionsPage.items || []).forEach((item: any) => {
        itemsHTML += `
          <div style="padding:16px;border-radius:12px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};">
            <h4 style="font-family:${primaryFont};font-size:14px;font-weight:800;text-transform:uppercase;margin:0 0 4px 0;">${item.title || item.name}</h4>
            ${item.dateTime ? `<p style="font-size:11px;font-weight:600;opacity:0.8;margin:0 0 2px 0;">${item.dateTime}</p>` : ''}
            ${item.venue ? `<p style="font-size:11px;font-weight:500;opacity:0.75;margin:0 0 4px 0;">${item.venue}</p>` : ''}
            ${item.team ? `<p style="font-size:10px;font-family:monospace;font-weight:700;color:${theme.kicker};margin:4px 0 0 0;">${item.team}</p>` : ''}
          </div>
        `;
      });

      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${functionsPage.kicker || 'EVENT SCHEDULE'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${functionsPage.heading || 'Functions & Coverage'}
            </h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left;">
              ${itemsHTML}
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'deliverablesPage') {
      let delivHTML = '';
      (deliverablesPage.selectedItems || deliverablesPage.items || []).forEach((item: any) => {
        delivHTML += `
          <div style="padding:14px;border-radius:12px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="width:16px;height:16px;border-radius:50%;border:1px solid ${theme.kicker};color:${theme.kicker};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">✓</div>
            <span style="font-size:12px;font-weight:700;">${typeof item === 'string' ? item : item.title || item.name}</span>
          </div>
        `;
      });

      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${deliverablesPage.kicker || 'WHAT WE DELIVER'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${deliverablesPage.heading || 'DELIVERABLES'}
            </h2>
            <div style="text-align:left;">
              ${delivHTML}
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'pricingPage') {
      const netTotal = (pricingPage.basePrice || 0) - (pricingPage.discountAmount || 0);
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${pricingPage.kicker || 'INVESTMENT SUMMARY'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${pricingPage.heading || 'PRICING DETAILS'}
            </h2>

            <div style="padding:24px;border-radius:16px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};text-align:left;">
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${theme.borderColor};padding-bottom:12px;">
                <span style="font-size:12px;font-weight:700;text-transform:uppercase;">Package Base Quote</span>
                <span style="font-size:14px;font-weight:800;font-family:sans-serif;">₹${Number(pricingPage.basePrice || 0).toLocaleString('en-IN')}</span>
              </div>
              ${Number(pricingPage.discountAmount || 0) > 0 ? `
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${theme.borderColor};padding:12px 0;color:#059669;font-weight:700;font-size:12px;">
                  <span>Special Discount (${pricingPage.discountPercent || 0}%)</span>
                  <span style="font-family:sans-serif;">- ₹${Number(pricingPage.discountAmount).toLocaleString('en-IN')}</span>
                </div>
              ` : ''}
              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;">
                <span style="font-size:14px;font-weight:800;text-transform:uppercase;color:${theme.kicker};">Net Total Investment</span>
                <span style="font-size:24px;font-weight:900;color:#b45309;font-family:sans-serif;">₹${Number(netTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'paymentTermsPage') {
      let rowsHTML = '';
      (paymentTermsPage.steps || []).forEach((step: any) => {
        rowsHTML += `
          <tr style="border-bottom:1px solid ${theme.borderColor};">
            <td style="padding:14px 16px;font-weight:700;">${step.stepName}</td>
            <td style="padding:14px 16px;">${step.date}</td>
            <td style="padding:14px 16px;text-align:right;font-family:sans-serif;font-weight:700;">₹${Number(step.amount || 0).toLocaleString('en-IN')}</td>
          </tr>
        `;
      });

      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${paymentTermsPage.kicker || 'PAYMENT SCHEDULE'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${paymentTermsPage.heading || 'PAYMENT TERMS & SCHEDULE'}
            </h2>

            <div style="border-radius:16px;overflow:hidden;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};text-align:left;">
              <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead style="font-size:10px;text-transform:uppercase;font-weight:700;border-bottom:1px solid ${theme.borderColor};color:${theme.kicker};">
                  <tr>
                    <th style="padding:12px 16px;text-align:left;">Milestone</th>
                    <th style="padding:12px 16px;text-align:left;">Due Date</th>
                    <th style="padding:12px 16px;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHTML}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'termsPage') {
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
          <div style="max-width:600px;width:100%;margin:auto;">
            <span style="font-size:12px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;color:${theme.kicker};display:block;margin-bottom:12px;">
              ${termsPage.kicker || 'POLICIES & RULES'}
            </span>
            <h2 style="font-family:${primaryFont};font-size:32px;text-transform:uppercase;letter-spacing:0.1em;font-weight:400;color:${theme.text};margin:0 0 24px 0;">
              ${termsPage.heading || 'TERMS & CONDITIONS'}
            </h2>
            <div style="padding:24px;border-radius:16px;border:1px solid ${theme.borderColor};background-color:${theme.boxBgColor};color:${theme.text};text-align:left;">
              <p style="font-size:12px;line-height:1.7;white-space:pre-line;font-weight:500;margin:0;">
                ${termsPage.text}
              </p>
            </div>
          </div>
        </section>
      `;
    } else if (pageType === 'thankYouPage') {
      pagesHTML += `
        <section className="pdf-page" style="width:210mm;height:297mm;padding:56px 48px;box-sizing:border-box;overflow:hidden;background-color:${theme.background};page-break-after:always;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;">
          <div style="max-width:600px;margin:auto;">
            <h1 style="font-family:${primaryFont};font-size:48px;text-transform:uppercase;letter-spacing:0.2em;font-weight:900;line-height:1.2;color:${theme.text};margin:0 0 16px 0;">
              ${thankYouPage.heading || 'THANK YOU'}
            </h1>
            <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.25em;font-weight:700;color:${theme.kicker};margin:0 0 24px 0;">
              ${thankYouPage.subHeading || 'LOOKING FORWARD TO CREATING MAGIC'}
            </h3>
            ${thankYouPage.message ? `<p style="font-size:14px;line-height:1.6;opacity:0.9;color:${theme.text};margin:0;">"${thankYouPage.message}"</p>` : ''}
          </div>

          <div style="width:100%;padding-top:24px;border-top:1px solid ${theme.borderColor};display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;">
            <span style="font-family:${primaryFont};font-weight:800;text-transform:uppercase;letter-spacing:0.1em;font-size:14px;color:${theme.text};">
              ${thankYouPage.brandName || brandName || 'FILMIFY WEDDINGS'}
            </span>
            <div style="display:flex;gap:16px;font-size:11px;font-family:sans-serif;">
              ${thankYouPage.contactNumber ? `<span>${thankYouPage.contactNumber}</span>` : ''}
              ${thankYouPage.email ? `<span>${thankYouPage.email}</span>` : ''}
              ${thankYouPage.website ? `<span>${thankYouPage.website}</span>` : ''}
            </div>
          </div>
        </section>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=794, initial-scale=1" />
        <title>${documentData?.designName || 'Quotation Preview'} - PDF</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            word-spacing: normal !important;
            font-variant-ligatures: none !important;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: ${theme.text} !important;
            font-family: ${secondaryFont} !important;
            width: 794px !important;
          }
          .pdf-container {
            width: 794px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
          .pdf-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            padding: 48px !important;
            position: relative !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background-color: ${theme.background} !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div id="quotation-full-canvas" className="pdf-container">
          ${pagesHTML}
        </div>
      </body>
    </html>
  `;
}
