export type RegistrationState = "not_open" | "open" | "waitlist" | "closed";
export type ApplicationType = "trial" | "membership" | "contact";
export type EventRegistrationStatus = "submitted" | "approved" | "rejected" | "waitlisted" | "cancelled";

export interface PublicImageAsset {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface TopicSummary {
  slug: string;
  title: string;
  summary: string;
  articleCount: number;
  eventCount: number;
  coverImage: PublicImageAsset | null;
}

export interface CitySummary {
  slug: string;
  name: string;
  summary: string;
  articleCount: number;
  eventCount: number;
  topicCount: number;
  coverImage: PublicImageAsset | null;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  topicSlugs: string[];
  coverImage: PublicImageAsset | null;
  city: {
    slug: string;
    name: string;
    summary: string;
  };
}

export interface EventSummary {
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  coverImage: PublicImageAsset | null;
  registrationUrl: string | null;
  city: {
    slug: string;
    name: string;
    summary: string;
  };
  registrationState: RegistrationState;
}

export interface TopicDetail extends TopicSummary {
  body: string;
  relatedArticles: ArticleSummary[];
  relatedEvents: EventSummary[];
}

export interface ArticleDetail extends ArticleSummary {
  body: string[];
  topics: TopicSummary[];
  citySummary: CitySummary;
  author: {
    name: string;
    role: string;
  };
}

export interface EventDetail extends EventSummary {
  body: string;
  agenda: Array<{
    time: string;
    title: string;
    speaker: string;
  }>;
  relatedTopics: TopicSummary[];
}

export interface CityDetail extends CitySummary {
  body: string;
  featuredArticles: ArticleSummary[];
  upcomingEvents: EventSummary[];
  featuredTopics: TopicSummary[];
}

export interface HomePayload {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    actions: Array<{
      label: string;
      href: string;
    }>;
  };
  featuredTopics: TopicSummary[];
  featuredArticles: ArticleSummary[];
  upcomingEvents: EventSummary[];
  cityHighlights: CitySummary[];
  applicationCallout: {
    title: string;
    summary: string;
    href: string;
  };
}

export interface PublicSiteConfig {
  platformName: string;
  navigation: Array<{
    label: string;
    href: string;
  }>;
  contentCollections: string[];
  footerTagline: string;
  supportEmail: string | null;
}

export interface PublicApplicationInput {
  type: ApplicationType;
  name: string;
  email: string;
  company?: string;
  city?: string;
  message: string;
}

export interface PublicApplicationReceipt {
  id: string;
  receivedAt: string;
  type: ApplicationType;
  applicant: {
    name: string;
    email: string;
    company?: string;
    city?: string;
  };
}

export interface ValidationIssue {
  field: keyof PublicApplicationInput;
  message: string;
}

export interface PublicEventRegistrationInput {
  name: string;
  email?: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
}

export interface PublicEventRegistrationReceipt {
  id: string;
  receivedAt: string;
  status: EventRegistrationStatus;
  event: {
    slug: string;
    title: string;
  };
  attendee: {
    name: string;
    email?: string;
    phoneNumber?: string;
    company?: string;
    jobTitle?: string;
  };
}

export interface EventRegistrationValidationIssue {
  field: keyof PublicEventRegistrationInput;
  message: string;
}

const topicRecords = [
  {
    slug: "platform-architecture",
    title: "Platform Architecture",
    summary: "How editorial platforms stay portable while keeping delivery fast.",
    body:
      "This track focuses on service boundaries, content pipelines, deployment portability, and the tradeoffs between static delivery and dynamic operations. It is the backbone for the first release of the platform.",
    articleSlugs: ["shipping-an-editorial-platform", "from-events-to-knowledge"],
    eventSlugs: ["spring-platform-workshop"]
  },
  {
    slug: "content-operations",
    title: "Content Operations",
    summary: "Editorial workflow, publishing discipline, and reusable content systems.",
    body:
      "Content operations turns scattered publishing into a repeatable machine. The first release will use this topic to connect articles, event recaps, application calls to action, and admin workflow decisions.",
    articleSlugs: ["shipping-an-editorial-platform", "what-a-city-hub-needs"],
    eventSlugs: ["content-ops-roundtable"]
  },
  {
    slug: "city-community",
    title: "City Community",
    summary: "How local chapters, recurring events, and city pages reinforce each other.",
    body:
      "City chapters should feel like part of one network, not isolated microsites. This topic groups the patterns for local landing pages, community events, and editorial highlights that help each city stay active.",
    articleSlugs: ["from-events-to-knowledge", "what-a-city-hub-needs"],
    eventSlugs: ["city-chapter-kickoff"]
  }
] as const;

const cityRecords = [
  {
    slug: "shanghai",
    name: "Shanghai",
    summary: "The launch city for flagship editorial events and platform experiments.",
    body:
      "Shanghai acts as the lead city for the initial public launch. It combines flagship events, editorial pilots, and staff workflows that later expand to the wider network.",
    articleSlugs: ["shipping-an-editorial-platform"],
    eventSlugs: ["spring-platform-workshop"],
    topicSlugs: ["platform-architecture", "content-operations"]
  },
  {
    slug: "hangzhou",
    name: "Hangzhou",
    summary: "A city page shape focused on maker communities and operator gatherings.",
    body:
      "Hangzhou is a strong proving ground for the city-page template because it naturally mixes product operators, engineering leaders, and workshop-driven events.",
    articleSlugs: ["from-events-to-knowledge"],
    eventSlugs: ["content-ops-roundtable"],
    topicSlugs: ["platform-architecture", "city-community"]
  },
  {
    slug: "beijing",
    name: "Beijing",
    summary: "A policy-and-practice chapter that connects community scale with editorial depth.",
    body:
      "Beijing brings larger partner networks and a wider editorial reach. The city page needs to highlight how articles, events, and featured topics can all roll up into one local story.",
    articleSlugs: ["what-a-city-hub-needs"],
    eventSlugs: ["city-chapter-kickoff"],
    topicSlugs: ["content-operations", "city-community"]
  }
] as const;

const articleRecords = [
  {
    slug: "shipping-an-editorial-platform",
    title: "Shipping an Editorial Platform Without Locking the Stack",
    excerpt:
      "Why the first release should look production-shaped even when the content is still curated by hand.",
    publishedAt: "2026-03-12T08:00:00.000Z",
    authorName: "Morgan Lee",
    authorRole: "Platform Editor",
    topicSlugs: ["platform-architecture", "content-operations"],
    citySlug: "shanghai",
    body: [
      "The platform should start with the final architecture shape even if the data is still seeded. That keeps the delivery team from building throwaway flows that later need a rewrite.",
      "Static-first pages, a dedicated admin console, and an API-owned business layer give the public site room to scale while keeping editorial operations explicit.",
      "The first release should therefore prove contracts, permissions, and content status rules before it chases advanced growth features."
    ]
  },
  {
    slug: "from-events-to-knowledge",
    title: "Turning Event Energy into Searchable Knowledge",
    excerpt:
      "A public content model should make every event a reusable knowledge asset, not a one-night announcement.",
    publishedAt: "2026-03-18T08:00:00.000Z",
    authorName: "Avery Chen",
    authorRole: "Community Producer",
    topicSlugs: ["platform-architecture", "city-community"],
    citySlug: "hangzhou",
    body: [
      "Events often disappear after registration closes, but the platform should preserve their value through recap articles, city highlights, and topic-level curation.",
      "A shared schema for events, articles, and topics lets editorial teams reuse the same source material across the home page, topic hubs, and city pages.",
      "That reuse is especially important for early-stage teams that need leverage more than feature count."
    ]
  },
  {
    slug: "what-a-city-hub-needs",
    title: "What a City Hub Needs Before It Feels Alive",
    excerpt:
      "City pages work best when they connect editorial cadence, local events, and a clear invitation to participate.",
    publishedAt: "2026-03-24T08:00:00.000Z",
    authorName: "Jordan Park",
    authorRole: "City Program Lead",
    topicSlugs: ["content-operations", "city-community"],
    citySlug: "beijing",
    body: [
      "A city page should not be a dead directory entry. It should explain the local chapter, highlight active topics, and surface the next meaningful call to action.",
      "That means city records need summaries, cover assets later, linked events, and linked editorial pieces from day one.",
      "Once the admin console can manage these links, the public site becomes much easier to keep fresh without code edits."
    ]
  }
] as const;

const eventRecords = [
  {
    slug: "spring-platform-workshop",
    title: "Spring Platform Workshop",
    summary: "A hands-on session for shaping the first release architecture and public publishing loop.",
    startsAt: "2026-04-10T10:00:00.000Z",
    endsAt: "2026-04-10T17:00:00.000Z",
    venueName: "North Bund Studio",
    citySlug: "shanghai",
    registrationState: "open",
    registrationUrl: "",
    body:
      "This workshop pulls together product, engineering, and editorial operators to finalize the launch-ready surface area of the platform. The focus is not on flashy features, but on the durable workflows that make the system maintainable.",
    topicSlugs: ["platform-architecture"],
    agenda: [
      {
        time: "10:00",
        title: "Architecture briefing",
        speaker: "Morgan Lee"
      },
      {
        time: "13:30",
        title: "Publishing workflow review",
        speaker: "Avery Chen"
      },
      {
        time: "15:30",
        title: "Delivery checklist",
        speaker: "Jordan Park"
      }
    ]
  },
  {
    slug: "content-ops-roundtable",
    title: "Content Ops Roundtable",
    summary: "A smaller operator session on editorial workflow, reuse, and publish-state discipline.",
    startsAt: "2026-04-22T14:00:00.000Z",
    endsAt: "2026-04-22T18:00:00.000Z",
    venueName: "Lakefront Workshop Room",
    citySlug: "hangzhou",
    registrationState: "waitlist",
    registrationUrl: "",
    body:
      "The roundtable examines how one piece of content should travel through admin review, public publishing, event amplification, and city curation without forking the workflow.",
    topicSlugs: ["content-operations"],
    agenda: [
      {
        time: "14:00",
        title: "Editorial queue design",
        speaker: "Avery Chen"
      },
      {
        time: "15:45",
        title: "Asset and metadata reuse",
        speaker: "Morgan Lee"
      },
      {
        time: "17:00",
        title: "Publishing QA",
        speaker: "Jordan Park"
      }
    ]
  },
  {
    slug: "city-chapter-kickoff",
    title: "City Chapter Kickoff",
    summary: "A practical launch event for the first cross-city editorial and event operating rhythm.",
    startsAt: "2026-05-08T09:30:00.000Z",
    endsAt: "2026-05-08T16:30:00.000Z",
    venueName: "East Garden Forum",
    citySlug: "beijing",
    registrationState: "not_open",
    registrationUrl: "",
    body:
      "This kickoff establishes a repeatable template for local chapter pages, recurring events, and the operational loop between content editors and city operators.",
    topicSlugs: ["city-community"],
    agenda: [
      {
        time: "09:30",
        title: "City launch narrative",
        speaker: "Jordan Park"
      },
      {
        time: "11:00",
        title: "Topic and event alignment",
        speaker: "Morgan Lee"
      },
      {
        time: "14:30",
        title: "Community activation plan",
        speaker: "Avery Chen"
      }
    ]
  }
] as const;

const topicBaseMap = new Map(
  topicRecords.map((topic) => [topic.slug, { slug: topic.slug, title: topic.title, summary: topic.summary }])
);

const cityBaseMap = new Map(
  cityRecords.map((city) => [city.slug, { slug: city.slug, name: city.name, summary: city.summary }])
);

export const articleSummaries: ArticleSummary[] = articleRecords.map((article) => {
  const city = cityBaseMap.get(article.citySlug);

  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    authorName: article.authorName,
    topicSlugs: [...article.topicSlugs],
    coverImage: null,
    city: city ?? { slug: article.citySlug, name: article.citySlug, summary: article.citySlug }
  };
});

export const eventSummaries: EventSummary[] = eventRecords.map((event) => {
  const city = cityBaseMap.get(event.citySlug);

  return {
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    venueName: event.venueName,
    coverImage: null,
    registrationUrl: event.registrationUrl || null,
    city: city ?? { slug: event.citySlug, name: event.citySlug, summary: event.citySlug },
    registrationState: event.registrationState
  };
});

export const topicSummaries: TopicSummary[] = topicRecords.map((topic) => ({
  slug: topic.slug,
  title: topic.title,
  summary: topic.summary,
  articleCount: topic.articleSlugs.length,
  eventCount: topic.eventSlugs.length,
  coverImage: null
}));

export const citySummaries: CitySummary[] = cityRecords.map((city) => ({
  slug: city.slug,
  name: city.name,
  summary: city.summary,
  articleCount: city.articleSlugs.length,
  eventCount: city.eventSlugs.length,
  topicCount: city.topicSlugs.length,
  coverImage: null
}));

const articleSummaryMap = new Map(articleSummaries.map((article) => [article.slug, article]));
const eventSummaryMap = new Map(eventSummaries.map((event) => [event.slug, event]));
const topicSummaryMap = new Map(topicSummaries.map((topic) => [topic.slug, topic]));
const citySummaryMap = new Map(citySummaries.map((city) => [city.slug, city]));

export const topicDetails: TopicDetail[] = topicRecords.map((topic) => ({
  ...topicSummaryMap.get(topic.slug)!,
  body: topic.body,
  relatedArticles: topic.articleSlugs
    .map((slug) => articleSummaryMap.get(slug))
    .filter((article): article is ArticleSummary => Boolean(article)),
  relatedEvents: topic.eventSlugs
    .map((slug) => eventSummaryMap.get(slug))
    .filter((event): event is EventSummary => Boolean(event))
}));

export const articleDetails: ArticleDetail[] = articleRecords.map((article) => {
  const citySummary = citySummaryMap.get(article.citySlug)!;

  return {
    ...articleSummaryMap.get(article.slug)!,
    body: [...article.body],
    topics: article.topicSlugs
      .map((slug) => topicSummaryMap.get(slug))
      .filter((topic): topic is TopicSummary => Boolean(topic)),
    citySummary,
    author: {
      name: article.authorName,
      role: article.authorRole
    }
  };
});

export const eventDetails: EventDetail[] = eventRecords.map((event) => ({
  ...eventSummaryMap.get(event.slug)!,
  body: event.body,
  agenda: event.agenda.map((entry) => ({ ...entry })),
  relatedTopics: event.topicSlugs
    .map((slug) => topicSummaryMap.get(slug))
    .filter((topic): topic is TopicSummary => Boolean(topic))
}));

export const cityDetails: CityDetail[] = cityRecords.map((city) => ({
  ...citySummaryMap.get(city.slug)!,
  body: city.body,
  featuredArticles: city.articleSlugs
    .map((slug) => articleSummaryMap.get(slug))
    .filter((article): article is ArticleSummary => Boolean(article)),
  upcomingEvents: city.eventSlugs
    .map((slug) => eventSummaryMap.get(slug))
    .filter((event): event is EventSummary => Boolean(event)),
  featuredTopics: city.topicSlugs
    .map((slug) => topicSummaryMap.get(slug))
    .filter((topic): topic is TopicSummary => Boolean(topic))
}));

export const homePayload: HomePayload = {
  hero: {
    eyebrow: "Phase 2 Public MVP",
    title: "Static-first presentation, API-owned content, and a clear path to staff operations.",
    summary:
      "The public site now has real list and detail routes for topics, articles, events, and cities. Each surface is ready to switch from demo data to API-backed content without changing the page architecture.",
    actions: [
      {
        label: "Explore articles",
        href: "/articles"
      },
      {
        label: "View upcoming events",
        href: "/events"
      }
    ]
  },
  featuredTopics: topicSummaries.slice(0, 3),
  featuredArticles: articleSummaries.slice(0, 3),
  upcomingEvents: eventSummaries.slice(0, 3),
  cityHighlights: citySummaries.slice(0, 3),
  applicationCallout: {
    title: "Ready for the next operator cohort",
    summary:
      "The application flow is now shaped as a public API contract, so the form can move from placeholder UI to a real intake path without rewriting the site.",
    href: "/apply"
  }
};

export const siteConfig: PublicSiteConfig = {
  platformName: "TGO Network",
  navigation: [
    {
      label: "Home",
      href: "/"
    },
    {
      label: "Topics",
      href: "/topics"
    },
    {
      label: "Articles",
      href: "/articles"
    },
    {
      label: "Events",
      href: "/events"
    },
    {
      label: "Cities",
      href: "/cities"
    },
    {
      label: "Apply",
      href: "/apply"
    },
    {
      label: "About",
      href: "/about"
    }
  ],
  contentCollections: ["topics", "articles", "events", "cities"],
  footerTagline: "TGO Network public prototype built with Astro and fed by the shared public API contract.",
  supportEmail: null
};

export const eventRegistrationStatusOptions: Array<{ value: EventRegistrationStatus; label: string }> = [
  {
    value: "submitted",
    label: "Submitted"
  },
  {
    value: "approved",
    label: "Approved"
  },
  {
    value: "rejected",
    label: "Rejected"
  },
  {
    value: "waitlisted",
    label: "Waitlisted"
  },
  {
    value: "cancelled",
    label: "Cancelled"
  }
];

export const applicationTypeOptions: Array<{ value: ApplicationType; label: string }> = [
  {
    value: "trial",
    label: "Trial"
  },
  {
    value: "membership",
    label: "Membership"
  },
  {
    value: "contact",
    label: "Contact"
  }
];

export const getTopicDetail = (slug: string) => topicDetails.find((topic) => topic.slug === slug) ?? null;
export const getArticleDetail = (slug: string) => articleDetails.find((article) => article.slug === slug) ?? null;
export const getEventDetail = (slug: string) => eventDetails.find((event) => event.slug === slug) ?? null;
export const getCityDetail = (slug: string) => cityDetails.find((city) => city.slug === slug) ?? null;

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const validatePublicApplicationInput = (
  input: unknown
):
  | {
      valid: true;
      data: PublicApplicationInput;
    }
  | {
      valid: false;
      issues: ValidationIssue[];
    } => {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      issues: [
        {
          field: "message",
          message: "Application payload must be an object."
        }
      ]
    };
  }

  const record = input as Record<string, unknown>;
  const type = readString(record.type) as ApplicationType;
  const name = readString(record.name);
  const email = readString(record.email).toLowerCase();
  const company = readString(record.company);
  const city = readString(record.city);
  const message = readString(record.message);
  const issues: ValidationIssue[] = [];

  if (!applicationTypeOptions.some((option) => option.value === type)) {
    issues.push({
      field: "type",
      message: "Choose a supported application type."
    });
  }

  if (name.length < 2) {
    issues.push({
      field: "name",
      message: "Name must be at least 2 characters long."
    });
  }

  if (!email.includes("@") || email.length < 5) {
    issues.push({
      field: "email",
      message: "Provide a valid email address."
    });
  }

  if (message.length < 20) {
    issues.push({
      field: "message",
      message: "Message must be at least 20 characters long."
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      type,
      name,
      email,
      ...(company ? { company } : {}),
      ...(city ? { city } : {}),
      message
    }
  };
};

export const validatePublicEventRegistrationInput = (
  input: unknown
):
  | {
      valid: true;
      data: PublicEventRegistrationInput;
    }
  | {
      valid: false;
      issues: EventRegistrationValidationIssue[];
    } => {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      issues: [
        {
          field: "name",
          message: "Registration payload must be an object."
        }
      ]
    };
  }

  const record = input as Record<string, unknown>;
  const name = readString(record.name);
  const email = readString(record.email).toLowerCase();
  const phoneNumber = readString(record.phoneNumber);
  const company = readString(record.company);
  const jobTitle = readString(record.jobTitle);
  const issues: EventRegistrationValidationIssue[] = [];

  if (name.length < 2) {
    issues.push({
      field: "name",
      message: "Name must be at least 2 characters long."
    });
  }

  if (email.length > 0 && (!email.includes("@") || email.length < 5)) {
    issues.push({
      field: "email",
      message: "Provide a valid email address."
    });
  }

  if (phoneNumber.length > 0 && phoneNumber.replace(/\D/g, "").length < 6) {
    issues.push({
      field: "phoneNumber",
      message: "Provide a valid phone number."
    });
  }

  if (email.length === 0 && phoneNumber.length === 0) {
    issues.push({
      field: "email",
      message: "Provide at least one contact method: email or phone."
    });
    issues.push({
      field: "phoneNumber",
      message: "Provide at least one contact method: email or phone."
    });
  }

  if (company.length > 160) {
    issues.push({
      field: "company",
      message: "Company must be 160 characters or fewer."
    });
  }

  if (jobTitle.length > 160) {
    issues.push({
      field: "jobTitle",
      message: "Job title must be 160 characters or fewer."
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      name,
      ...(email ? { email } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
      ...(company ? { company } : {}),
      ...(jobTitle ? { jobTitle } : {})
    }
  };
};
