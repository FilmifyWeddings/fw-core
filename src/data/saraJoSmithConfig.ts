export interface NavItem {
  label: string;
  href: string;
  target?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

export interface HeroSlide {
  id: string;
  url: string;
  alt: string;
  position?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  quote: string;
  image: string;
  alt: string;
  href: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  content: string;
  author: string;
  leftImage: {
    url: string;
    caption: string;
  };
  rightImage: {
    url: string;
    caption: string;
  };
}

export interface PackageFeature {
  text: string;
  highlight?: boolean;
}

export interface PricingPackage {
  id: string;
  title: string;
  subtitle: string;
  investment: string;
  description: string;
  features: string[];
  ctaText: string;
  badge?: string;
  image?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: 'weddings' | 'elopements' | 'portraits' | 'all';
  image: string;
  aspectRatio: string;
  location?: string;
  caption?: string;
}

export interface InstagramPost {
  id: string;
  title: string;
  image: string;
  url: string;
}

export interface SiteConfig {
  meta: {
    title: string;
    description: string;
    ogImage: string;
    favicon: string;
    location: string;
    tagline: string;
    copyright: string;
    credit: {
      text: string;
      url: string;
    };
  };
  navigation: {
    main: NavItem[];
    socials: SocialLink[];
  };
  assets: {
    monogramHeader: string;
    headlineBanner: string;
    signatureFooter: string;
    drawerMonogram: string;
    stampMenuBadge: string;
    sunElement: string;
    vintageStampSeals: string[];
    watermarkBg: string;
    parchmentFrame: string;
    heartBrandElement: string;
  };
  hero: {
    slides: HeroSlide[];
    announcement: string;
    headlineAlt: string;
    autoplayIntervalMs: number;
  };
  intro: {
    scriptTag: string;
    scriptTag2: string;
    subheading: string;
    heading: string;
    body: string;
    mainImage: {
      url: string;
      alt: string;
    };
    tiltedImages: {
      left: { url: string; alt: string };
      right: { url: string; alt: string };
      accent: { url: string; alt: string };
    };
  };
  services: {
    cards: ServiceItem[];
    storyHeading: string;
    storyBody: string;
    ctaText: string;
    collageImages: {
      url: string;
      alt: string;
      title: string;
    }[];
  };
  meet: {
    quote: string;
    label: string;
    heading: string;
    paragraphs: string[];
    ctaText: string;
    mainPortrait: {
      url: string;
      alt: string;
    };
    cameraPortrait: {
      url: string;
      alt: string;
    };
  };
  testimonials: TestimonialItem[];
  collections: {
    heading: string;
    subheading: string;
    packages: PricingPackage[];
  };
  portfolio: {
    heading: string;
    subheading: string;
    items: PortfolioItem[];
  };
  ctaBanner: {
    heading: string;
    buttonText: string;
    socialHandle: string;
    travelNote: string;
    bgImage: string;
  };
  instagramFeed: InstagramPost[];
  contact: {
    heading: string;
    subheading: string;
    sessionHours: {
      title: string;
      description: string;
    };
    businessHours: {
      title: string;
      description: string;
    };
    sessionTypes: string[];
    successTitle: string;
    successMessage: string;
  };
}

export const siteConfig: SiteConfig = {
  meta: {
    title: "Sara Jo Smith Photography | Georgia Wedding Photographer",
    description: "Crafting timeless and authentic wedding photography with an editorial approach based in Georgia. Transforming precious moments into artful heirlooms that tell your unique love story.",
    ogImage: "https://static.showit.co/1200/ceF0Mtnxr5pDeybBXwNIGg/298575/0ba3153d-4696-4380-8f7f-6e6fd9f2b040.jpg",
    favicon: "https://static.showit.co/200/geI53thAwUArNtaVB70xHQ/298575/sjsartboard_1_4.png",
    location: "Georgia & Worldwide",
    tagline: "destination wedding & elopement photographer based in georgia",
    copyright: "All content Copyright © 2025 Sara Jo Smith Photography",
    credit: {
      text: "| brand & site: unfold studio",
      url: "https://byunfoldstudio.com/"
    }
  },

  navigation: {
    main: [
      { label: "home", href: "#hero" },
      { label: "collections", href: "#collections" },
      { label: "portfolio", href: "#portfolio" },
      { label: "contact", href: "#contact" },
    ],
    socials: [
      { platform: "facebook", url: "https://facebook.com", label: "Facebook" },
      { platform: "instagram", url: "https://instagram.com/sarajosmithphotography", label: "@sarajosmithphotography" },
      { platform: "email", url: "mailto:sarajosmithphotography@gmail.com", label: "sarajosmithphotography@gmail.com" },
    ]
  },

  assets: {
    monogramHeader: "https://static.showit.co/1200/sr2S1bH3POp1TqQSY4GT5A/298575/sjsartboard_1_10.png",
    headlineBanner: "https://static.showit.co/1200/D1OwWNvUB4zsiNev4VMPZw/298575/sjsartboard_1_8.png",
    signatureFooter: "https://static.showit.co/1200/6wpMYWfHFGigB5u2sWpgbA/298575/sjsartboard_1_15.png",
    drawerMonogram: "https://static.showit.co/1200/0SvXda2sE-DCN7aDtPXfCw/298575/sjsartboard_1_3.png",
    stampMenuBadge: "https://static.showit.co/1200/ywf0aI1FysAcSJuFPNd-EQ/298575/sara_jo_smith_website_elements12.png",
    sunElement: "https://static.showit.co/1200/wWzMpuT79eDHrHpHwoCqOg/298575/sjsp_brand_element_2.png",
    vintageStampSeals: [
      "https://static.showit.co/1200/AOGSEwdi8fwJuprChScqfQ/298575/sara_jo_smith_website_elements13.png",
      "https://static.showit.co/1200/BVUZ8rJkoVOwMmEjjdq1FA/298575/sara_jo_smith_website_elements6.png",
      "https://static.showit.co/1200/_2U14AMxnO_elf6r4ICrlw/298575/sara_jo_smith_website_elements8.png",
      "https://static.showit.co/1200/gULa05MD3AomLXpKC8vVgA/298575/sara_jo_smith_brand_elements4.png",
      "https://static.showit.co/1200/yis2czEdCHxxptM1H_EUjQ/298575/sara_jo_smith_brand_elements8.png"
    ],
    watermarkBg: "https://static.showit.co/1200/RhYWZgnxxsaCwNypcQ9MuA/298575/sara_jo_smith_website_elements2.png",
    parchmentFrame: "https://static.showit.co/1200/AqJij5xesX9tcpQcK-lVkg/298575/sara_jo_smith_website_elements11.png",
    heartBrandElement: "https://static.showit.co/1200/VWytsJHE7pF8YE5yDVanxQ/298575/sjsp_brand_element_3.png",
  },

  hero: {
    announcement: "documenting love stories for all | based in georgia & worldwide",
    headlineAlt: "Sara Jo Smith Photography",
    autoplayIntervalMs: 6000,
    slides: [
      {
        id: "hero-1",
        url: "https://static.showit.co/1200/Ovz9LfXkYfXYanX0Cwracw/298575/aedcef5d-6f60-47e2-932a-ba3e9d3a6958.jpg",
        alt: "Atmospheric wedding couple embracing at twilight",
        position: "70% 70%"
      },
      {
        id: "hero-2",
        url: "https://static.showit.co/1200/Wx6b7eQMnWdtdI1KMqXWPA/298575/sabrina_jaxson-9.jpg",
        alt: "Sabrina & Jaxson romantic outdoor wedding portrait",
        position: "50% 50%"
      },
      {
        id: "hero-3",
        url: "https://static.showit.co/1200/x9_XwVBV79D692uRXrZF3w/298575/k_x_finished-120.jpg",
        alt: "Intimate coastal wedding ceremony moments",
        position: "50% 50%"
      },
      {
        id: "hero-4",
        url: "https://static.showit.co/1200/-gJi-BZOmGW7w-eEM0Fncg/298575/haliee_drew.jpg",
        alt: "Haliee & Drew candid bride and groom embrace",
        position: "45% 45%"
      },
      {
        id: "hero-5",
        url: "https://static.showit.co/1200/oVHsTrU_Ae3fGhTaN8R-YA/298575/googewedding-18.jpg",
        alt: "Googe wedding heartfelt celebration in Georgia",
        position: "60% 60%"
      }
    ]
  },

  intro: {
    scriptTag: "Authentic Creations",
    scriptTag2: "Heartfelt Heirlooms",
    subheading: "Artful storytelling for Life's Poetry",
    heading: "destination wedding & elopement photographer based in georgia",
    body: "Transforming unscripted moments into timeless photographs that speaks to the heart.",
    mainImage: {
      url: "https://static.showit.co/1200/lw87UfpgwfcJVLl0JlxVCQ/298575/img_0082.jpg",
      alt: "Bride and groom intimate portrait under sunlit veil"
    },
    tiltedImages: {
      left: {
        url: "https://static.showit.co/1200/DeGPttSCfAljSNNWdrTHXw/298575/sabrina_jaxson.jpg",
        alt: "Sabrina & Jaxson candid couple laughter"
      },
      right: {
        url: "https://static.showit.co/1200/j47PhsBKA8DucxYEOced5Q/298575/hailee_drew_-4.jpg",
        alt: "Hailee & Drew walking through scenic fields"
      },
      accent: {
        url: "https://static.showit.co/1200/QDYE_zObBo8nagyuDrdOYw/298575/turner-46.jpg",
        alt: "Delicate wedding rings and bouquet details"
      }
    }
  },

  services: {
    cards: [
      {
        id: "service-weddings",
        title: "Weddings",
        quote: "Eternal vows whispered through hearts",
        image: "https://static.showit.co/1200/BVMQJRBW17_nSPy9NfapBA/298575/img_8841.jpg",
        alt: "Romantic bride holding floral bouquet",
        href: "#collections"
      },
      {
        id: "service-elopements",
        title: "Elopements",
        quote: "Sacred adventure, forever entwined",
        image: "https://static.showit.co/1200/Q9oj6wPsZcrmVcrpx7UiJg/298575/k_x_finished-67.jpg",
        alt: "Couple shares a kiss on a sailboat surrounded by flowers",
        href: "#collections"
      },
      {
        id: "service-portraits",
        title: "Portraits & Fam",
        quote: "Moments lovingly dance forever",
        image: "https://static.showit.co/1200/NlPWzT7Nn5mS0Xgzl6tUog/298575/img_5883.jpg",
        alt: "Intimate portrait capturing tender couple connection",
        href: "#collections"
      }
    ],
    storyHeading: "documenting love stories for all",
    storyBody: "Love knows no bounds, and neither does my lens. I celebrate every unique story and cherish each precious connection that unfolds before my camera. Your story matters deeply to me, and I'm here to document it with warmth, artistic vision, and the same careful attention I'd give to capturing memories of my own family.",
    ctaText: "the details!",
    collageImages: [
      {
        url: "https://static.showit.co/1200/qAgYUwRbNmCKnVkGcHrdUQ/298575/haliee_drew-15.jpg",
        alt: "Haliee & Drew intimate golden hour portrait",
        title: "Haliee + Drew"
      },
      {
        url: "https://static.showit.co/1200/-dep13AP0L7lM0Gyu1azOA/298575/img_0099.jpg",
        alt: "Emotional wedding ceremony exchange",
        title: "Ceremony Moments"
      },
      {
        url: "https://static.showit.co/1200/TXJIMa8xpDIniOOIcV9QPQ/298575/sarah_chase-35.jpg",
        alt: "Sarah & Chase romantic vintage black and white",
        title: "Sarah + Chase"
      }
    ]
  },

  meet: {
    quote: "To be in love is to touch with a lighter hand. In yourself you stretch, you are well.",
    label: "Meet Sara Jo",
    heading: "Hi! I'm Sara Jo, your visual storyteller",
    paragraphs: [
      "I’m a wedding photographer with an old soul and an endless love for capturing life's precious moments. Armed with my vintage cameras and an eye for moody, cinematic shots, and turn it into timeless treasures.",
      "My approach? It's intimate, editorial, and deeply personal - think of it as crafting visual poetry that tells your unique story. As your photographer, I'm more than just someone with a camera - I'm a storyteller, a moment-collector, and often, by the end of our time together, a friend who just happens to be documenting some of your most precious memories."
    ],
    ctaText: "browse my work",
    mainPortrait: {
      url: "https://static.showit.co/1200/6B4cJOD3Vh1YOgNeBF4nIw/298575/ct1a6070.jpg",
      alt: "Sara Jo radiating joy holding her camera in a sun-dappled garden"
    },
    cameraPortrait: {
      url: "https://static.showit.co/1200/YSziInDnNi5_3TtCWHK5ag/298575/sj_acworth-15.jpg",
      alt: "Sara Jo equipped with dual vintage cameras ready to document love"
    }
  },

  testimonials: [
    {
      id: "burges",
      quote: "Sara Jo captured our wedding perfectly!",
      content: "I felt like we were working with a friend, she was mindful when working with the videographer and went the extra mile to make sure everything was perfect! Between running defense on the minor hiccups to getting us to loosen up with the poses, she did her job flawlessly. We needed someone that knew how to shoot western styled photos and were so happy with how they turned out! She was open to all my wild ideas and made them come to life!!",
      author: "The Burges",
      leftImage: {
        url: "https://static.showit.co/1200/pozFsQnM4Z7ZdW2t1pXxbQ/298575/googewedding.jpg",
        caption: "romantic wedding portrait"
      },
      rightImage: {
        url: "https://static.showit.co/1200/Cdog-5v0WZ7egSrR5drYtQ/298575/googewedding-16.jpg",
        caption: "emotionally exchanging vows"
      }
    },
    {
      id: "sabrina-jaxson",
      quote: "Our photos look like scenes straight out of a classic French film!",
      content: "Sara Jo brought an ease and artistic magic to our elopement day that we will treasure forever. She let us just be ourselves, laugh through the wind, and caught every in-between glance. Looking through our heirloom gallery brought tears to our eyes.",
      author: "Sabrina + Jaxson",
      leftImage: {
        url: "https://static.showit.co/1200/Wx6b7eQMnWdtdI1KMqXWPA/298575/sabrina_jaxson-9.jpg",
        caption: "intimate mountain vows"
      },
      rightImage: {
        url: "https://static.showit.co/1200/DeGPttSCfAljSNNWdrTHXw/298575/sabrina_jaxson.jpg",
        caption: "candid celebration smiles"
      }
    },
    {
      id: "sarah-chase",
      quote: "The best investment we made for our wedding, hands down.",
      content: "From our first planning call to receiving our custom film scans and digital gallery, Sara Jo exceeded every expectation. Her eye for light, movement, and genuine human connection is completely unmatched.",
      author: "Sarah + Chase",
      leftImage: {
        url: "https://static.showit.co/1200/TKWFCTk0eSKq2v5hHSgB1w/298575/sarah_chase-66.jpg",
        caption: "sunset vineyard embrace"
      },
      rightImage: {
        url: "https://static.showit.co/1200/TXJIMa8xpDIniOOIcV9QPQ/298575/sarah_chase-35.jpg",
        caption: "vintage black & white dance"
      }
    }
  ],

  collections: {
    heading: "Wedding & Elopement Collections",
    subheading: "capturing Heirloom Stories, Where Time Stands Still",
    packages: [
      {
        id: "micro-wedding",
        title: "Micro Wedding",
        subtitle: "For intimate elopements and small gatherings",
        investment: "Starting at $800+",
        description: "Perfect for intimate elopements and small gatherings, this collection captures the heart of your ceremony and the joyful moments that follow.",
        features: [
          "2 Hours of Coverage ($800) or 4 Hours ($1,400)",
          "100+ to 200+ Artfully Edited High-Res Photos",
          "Private Digital Online Gallery with Full Print Rights",
          "Discounted Add-On Engagement Session",
          "High-Resolution Download & Print Store Access"
        ],
        ctaText: "get in touch",
        badge: "Intimate Ceremonies",
        image: "https://static.showit.co/1200/Q9oj6wPsZcrmVcrpx7UiJg/298575/k_x_finished-67.jpg"
      },
      {
        id: "8-hour-package",
        title: "8-Hour Package",
        subtitle: "The complete heirloom wedding story",
        investment: "investment: $2,400",
        description: "A comprehensive storytelling experience for couples who want every chapter of their wedding day preserved as an heirloom.",
        features: [
          "8 Hours of Continuous Wedding Day Coverage",
          "Complimentary Engagement Session Included",
          "Minimum of 400+ Artfully Curated & Hand-Edited Photos",
          "Authentic 35mm Film + Instant Polaroids Included",
          "Custom Wedding Timeline & Logistics Planning Session",
          "Digital Online Gallery + Keepsake Deluxe Wood USB Box"
        ],
        ctaText: "reserve this date",
        badge: "Most Cherished",
        image: "https://static.showit.co/1200/lw87UfpgwfcJVLl0JlxVCQ/298575/img_0082.jpg"
      },
      {
        id: "destination-elopement",
        title: "Destination Elopements",
        subtitle: "Wherever your wild love takes you",
        investment: "Starting at $1,500*",
        description: "An intimate photography experience crafted for couples who want to celebrate their love in a personal way, wherever love takes you.",
        features: [
          "2+ Hours of Flexible Adventure Coverage",
          "100+ Artfully Edited High-Res Photographs",
          "Multiple Scenic Locations Within Distance",
          "Private Digital Online Gallery with Lifetime Access",
          "Deluxe Keepsake USB & Location Scouting Guide",
          "* Specialized packages starting at $1,500. Travel fees quoted separately."
        ],
        ctaText: "inquire for custom quote",
        badge: "Adventure & Travel",
        image: "https://static.showit.co/1200/Ovz9LfXkYfXYanX0Cwracw/298575/aedcef5d-6f60-47e2-932a-ba3e9d3a6958.jpg"
      }
    ]
  },

  portfolio: {
    heading: "my art collections",
    subheading: "Timeless heirlooms crafted with warmth and artistic vision",
    items: [
      {
        id: "port-1",
        title: "Sabrina + Jaxson",
        category: "weddings",
        image: "https://static.showit.co/1200/Wx6b7eQMnWdtdI1KMqXWPA/298575/sabrina_jaxson-9.jpg",
        aspectRatio: "3/4",
        location: "Blue Ridge Foothills",
        caption: "A romantic outdoor ceremony in northern Georgia."
      },
      {
        id: "port-2",
        title: "Sailboat Elopement",
        category: "elopements",
        image: "https://static.showit.co/1200/Q9oj6wPsZcrmVcrpx7UiJg/298575/k_x_finished-67.jpg",
        aspectRatio: "4/5",
        location: "Coastal Waters",
        caption: "Exchanging vows at sea surrounded by blooms."
      },
      {
        id: "port-3",
        title: "Haliee + Drew",
        category: "weddings",
        image: "https://static.showit.co/1200/qAgYUwRbNmCKnVkGcHrdUQ/298575/haliee_drew-15.jpg",
        aspectRatio: "3/4",
        location: "Historic Estate",
        caption: "Golden hour romance in the Georgia countryside."
      },
      {
        id: "port-4",
        title: "The Googe Wedding",
        category: "weddings",
        image: "https://static.showit.co/1200/oVHsTrU_Ae3fGhTaN8R-YA/298575/googewedding-18.jpg",
        aspectRatio: "3/4",
        location: "Atlanta, GA",
        caption: "Heartfelt family vows and celebration."
      },
      {
        id: "port-5",
        title: "Sunset Serenade",
        category: "elopements",
        image: "https://static.showit.co/1200/Ovz9LfXkYfXYanX0Cwracw/298575/aedcef5d-6f60-47e2-932a-ba3e9d3a6958.jpg",
        aspectRatio: "4/5",
        location: "Mountain Summit",
        caption: "Moody twilight whispers atop the ridge."
      },
      {
        id: "port-6",
        title: "Sarah + Chase",
        category: "weddings",
        image: "https://static.showit.co/1200/TKWFCTk0eSKq2v5hHSgB1w/298575/sarah_chase-66.jpg",
        aspectRatio: "3/4",
        location: "Dahlonega Vineyard",
        caption: "Sunset stroll through the vines."
      },
      {
        id: "port-7",
        title: "Drew + Marisol",
        category: "portraits",
        image: "https://static.showit.co/1200/U7hlhBooETUwJjV30HjESA/298575/drew_marisol_-7.jpg",
        aspectRatio: "3/4",
        location: "Savannah Historic District",
        caption: "Cobblestone streets and Southern moss."
      },
      {
        id: "port-8",
        title: "Cassidy + Craig",
        category: "weddings",
        image: "https://static.showit.co/1200/0sBQjoLn-uI7Z9Y9wzOasQ/298575/cassidy_craig_finished-11.jpg",
        aspectRatio: "3/4",
        location: "Barn & Wildflowers",
        caption: "Western style and bohemian florals."
      },
      {
        id: "port-9",
        title: "Izzie + Brit",
        category: "portraits",
        image: "https://static.showit.co/1200/QigGF-3EyBdlUWRU3lJ1BQ/298575/izzie_brit-3.jpg",
        aspectRatio: "3/4",
        location: "Provincial Fields",
        caption: "Tender closeness captured in warm film grain."
      },
      {
        id: "port-10",
        title: "K + X Coastal Finished",
        category: "elopements",
        image: "https://static.showit.co/1200/x9_XwVBV79D692uRXrZF3w/298575/k_x_finished-120.jpg",
        aspectRatio: "4/5",
        location: "Sea Islands",
        caption: "A quiet seaside sanctuary for two."
      },
      {
        id: "port-11",
        title: "Maternity Warmth",
        category: "portraits",
        image: "https://static.showit.co/1200/NlPWzT7Nn5mS0Xgzl6tUog/298575/img_5883.jpg",
        aspectRatio: "3/2",
        location: "Studio & Sunroom",
        caption: "New life and intimate family love."
      },
      {
        id: "port-12",
        title: "Bridal Veil Whispers",
        category: "weddings",
        image: "https://static.showit.co/1200/lw87UfpgwfcJVLl0JlxVCQ/298575/img_0082.jpg",
        aspectRatio: "3/4",
        location: "Athens, GA",
        caption: "Delicate light touching lace and smiles."
      }
    ]
  },

  ctaBanner: {
    heading: "Let's preserve your story in a way that feels as timeless as your love.",
    buttonText: "get in touch",
    socialHandle: "follow along:\n@sarajosmithphotography",
    travelNote: "traveling for love:\nInquire for a quote",
    bgImage: "https://static.showit.co/1200/phYNF8RmQ8POd7sJMqk3tw/298575/turner-50.jpg"
  },

  instagramFeed: [
    {
      id: "ig-1",
      title: "Sabrina + Jaxson-9",
      image: "https://static.showit.co/1200/Wx6b7eQMnWdtdI1KMqXWPA/298575/sabrina_jaxson-9.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-2",
      title: "Haliee + Drew-15",
      image: "https://static.showit.co/1200/qAgYUwRbNmCKnVkGcHrdUQ/298575/haliee_drew-15.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-3",
      title: "GoogeWedding-18",
      image: "https://static.showit.co/1200/oVHsTrU_Ae3fGhTaN8R-YA/298575/googewedding-18.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-4",
      title: "Sarah+Chase-66",
      image: "https://static.showit.co/1200/TKWFCTk0eSKq2v5hHSgB1w/298575/sarah_chase-66.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-5",
      title: "Editorial Moments",
      image: "https://static.showit.co/1200/_w0Q1BcCu0GtGQuKSWpIZg/298575/10c467df-b61a-450f-a1d4-9cd1016fe52d.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-6",
      title: "Cassidy+Craig FINISHED-11",
      image: "https://static.showit.co/1200/0sBQjoLn-uI7Z9Y9wzOasQ/298575/cassidy_craig_finished-11.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-7",
      title: "Drew + Marisol_-7",
      image: "https://static.showit.co/1200/U7hlhBooETUwJjV30HjESA/298575/drew_marisol_-7.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-8",
      title: "Bridal Portrait",
      image: "https://static.showit.co/1200/lw87UfpgwfcJVLl0JlxVCQ/298575/img_0082.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-9",
      title: "Izzie + Brit-3",
      image: "https://static.showit.co/1200/QigGF-3EyBdlUWRU3lJ1BQ/298575/izzie_brit-3.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    },
    {
      id: "ig-10",
      title: "K+X Finished-120",
      image: "https://static.showit.co/1200/x9_XwVBV79D692uRXrZF3w/298575/k_x_finished-120.jpg",
      url: "https://instagram.com/sarajosmithphotography"
    }
  ],

  contact: {
    heading: "Send a Love Note My Way",
    subheading: "Pour a cup of coffee, get cozy, and tell me about the moments you want to preserve. I'd love to hear your story and explore how we can transform your memories into timeless heirlooms that will be cherished for generations.",
    sessionHours: {
      title: "Session Hours",
      description: "Available 7 days a week! Times vary upon lighting/season."
    },
    businessHours: {
      title: "Business Hours",
      description: "(Inquiries, Editing + Gallery Delivery) Monday-Friday 9:00am-5:00pm - CLOSED ALL major holidays. -"
    },
    sessionTypes: [
      "Wedding (Full Day Story)",
      "Intimate Elopement",
      "Micro Wedding",
      "Couples / Engagement",
      "Maternity / Family Heirloom",
      "Destination / Adventure Session"
    ],
    successTitle: "With Heartfelt Thanks!",
    successMessage: "Thank you for taking a moment to share your story with me! Just as every photograph holds its own unique beauty, I believe every inquiry carries the whispers of memories waiting to be captured. Please expect to hear back from me within 24-48 hours. In the meantime, feel free to explore my portfolio and let your imagination wander through the possibilities of what we might create together."
  }
};
