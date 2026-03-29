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
    title: "平台架构",
    summary: "如何在保持交付效率的同时，让内容平台具备良好的可迁移性。",
    body:
      "这一主题聚焦服务边界、内容流水线、部署可迁移性，以及静态交付与动态运营之间的取舍。它会成为平台首个版本的骨架。",
    articleSlugs: ["shipping-an-editorial-platform", "from-events-to-knowledge"],
    eventSlugs: ["spring-platform-workshop"]
  },
  {
    slug: "content-operations",
    title: "内容运营",
    summary: "编辑工作流、发布纪律，以及可复用的内容系统。",
    body:
      "内容运营会把零散发布变成可重复运转的机制。首个版本会通过这个主题串联文章、活动回顾、申请转化入口，以及后台工作流中的关键决策。",
    articleSlugs: ["shipping-an-editorial-platform", "what-a-city-hub-needs"],
    eventSlugs: ["content-ops-roundtable"]
  },
  {
    slug: "city-community",
    title: "城市社群",
    summary: "本地分会、周期活动与城市页面如何彼此增强。",
    body:
      "城市分会应当像同一张网络中的节点，而不是彼此割裂的小站。这个主题会沉淀本地落地页、社区活动与编辑精选的模式，帮助每座城市持续保持活跃。",
    articleSlugs: ["from-events-to-knowledge", "what-a-city-hub-needs"],
    eventSlugs: ["city-chapter-kickoff"]
  }
] as const;

const cityRecords = [
  {
    slug: "shanghai",
    name: "上海",
    summary: "旗舰内容活动与平台试验的启动城市。",
    body:
      "上海将作为首次公开发布的领航城市，承载旗舰活动、编辑试点，以及后续可以复制到更大网络中的工作人员流程。",
    articleSlugs: ["shipping-an-editorial-platform"],
    eventSlugs: ["spring-platform-workshop"],
    topicSlugs: ["platform-architecture", "content-operations"]
  },
  {
    slug: "hangzhou",
    name: "杭州",
    summary: "一座更偏向创作者社群与运营者聚会的城市样板。",
    body:
      "杭州非常适合作为城市页模板的试验场，因为这里天然汇聚了产品运营者、工程负责人以及工作坊驱动的活动。",
    articleSlugs: ["from-events-to-knowledge"],
    eventSlugs: ["content-ops-roundtable"],
    topicSlugs: ["platform-architecture", "city-community"]
  },
  {
    slug: "beijing",
    name: "北京",
    summary: "一座把社群规模与内容深度连接起来的城市节点。",
    body:
      "北京拥有更大的合作伙伴网络和更广的内容辐射范围。城市页面需要展示文章、活动与精选主题如何汇聚成一条完整的本地叙事。",
    articleSlugs: ["what-a-city-hub-needs"],
    eventSlugs: ["city-chapter-kickoff"],
    topicSlugs: ["content-operations", "city-community"]
  }
] as const;

const articleRecords = [
  {
    slug: "shipping-an-editorial-platform",
    title: "在不锁死技术栈的前提下交付内容平台",
    excerpt:
      "为什么首个版本即使仍以人工整理内容为主，也应该具备接近生产环境的形态。",
    publishedAt: "2026-03-12T08:00:00.000Z",
    authorName: "李墨言",
    authorRole: "平台编辑",
    topicSlugs: ["platform-architecture", "content-operations"],
    citySlug: "shanghai",
    body: [
      "即使当前数据仍来自种子数据，平台也应该从最终架构形态起步。这样可以避免交付团队先搭一套临时流程，后面又不得不整体重写。",
      "静态优先的页面、独立的管理后台，以及由 API 承担业务规则的分层方式，可以让公开站在扩展时依然保持内容运营的清晰边界。",
      "因此首个版本应优先验证契约、权限和内容状态规则，而不是一开始就追逐更复杂的增长能力。"
    ]
  },
  {
    slug: "from-events-to-knowledge",
    title: "把活动热度转化为可检索的知识资产",
    excerpt:
      "公开内容模型应该让每一场活动都成为可复用的知识资产，而不是只在当天生效的一次性通知。",
    publishedAt: "2026-03-18T08:00:00.000Z",
    authorName: "陈以维",
    authorRole: "社区制作人",
    topicSlugs: ["platform-architecture", "city-community"],
    citySlug: "hangzhou",
    body: [
      "很多活动在报名结束后就迅速消失，但平台应该通过回顾文章、城市精选和主题策展把它们的价值沉淀下来。",
      "活动、文章和主题共享一套 schema 后，编辑团队就能在首页、专题页和城市页之间复用同一批原始内容素材。",
      "对于早期团队来说，这种复用能力比单纯堆功能更重要，因为它直接决定运营杠杆。"
    ]
  },
  {
    slug: "what-a-city-hub-needs",
    title: "一座城市主页在真正活起来之前需要什么",
    excerpt:
      "当城市页面能够把内容节奏、本地活动和明确的参与邀请连接起来时，它才真正具备生命力。",
    publishedAt: "2026-03-24T08:00:00.000Z",
    authorName: "朴乔安",
    authorRole: "城市项目负责人",
    topicSlugs: ["content-operations", "city-community"],
    citySlug: "beijing",
    body: [
      "城市页不应只是一个沉寂的目录入口。它应该解释本地分会的状态、突出当前活跃主题，并呈现下一步有意义的行动入口。",
      "这意味着从第一天开始，城市数据就需要摘要、后续可接入的封面资源、关联活动以及关联内容文章。",
      "当管理后台能够维护这些关联关系后，公开站就能在不改代码的前提下持续更新。"
    ]
  }
] as const;

const eventRecords = [
  {
    slug: "spring-platform-workshop",
    title: "春季平台工作坊",
    summary: "围绕首发架构与公开发布闭环展开的一场实战型工作坊。",
    startsAt: "2026-04-10T10:00:00.000Z",
    endsAt: "2026-04-10T17:00:00.000Z",
    venueName: "北外滩工作室",
    citySlug: "shanghai",
    registrationState: "open",
    registrationUrl: "",
    body:
      "这场工作坊会把产品、工程和内容运营同学聚在一起，共同敲定平台首发时真正需要上线的范围。重点不在花哨功能，而在能让系统长期可维护的稳健工作流。",
    topicSlugs: ["platform-architecture"],
    agenda: [
      {
        time: "10:00",
        title: "架构简报",
        speaker: "李墨言"
      },
      {
        time: "13:30",
        title: "发布工作流复盘",
        speaker: "陈以维"
      },
      {
        time: "15:30",
        title: "交付清单检查",
        speaker: "朴乔安"
      }
    ]
  },
  {
    slug: "content-ops-roundtable",
    title: "内容运营圆桌",
    summary: "一场围绕编辑流程、内容复用与发布状态纪律的小型运营讨论。",
    startsAt: "2026-04-22T14:00:00.000Z",
    endsAt: "2026-04-22T18:00:00.000Z",
    venueName: "湖畔工作坊",
    citySlug: "hangzhou",
    registrationState: "waitlist",
    registrationUrl: "",
    body:
      "这场圆桌会讨论一份内容如何在不分叉流程的前提下，贯穿后台审核、公开发布、活动放大与城市策展。",
    topicSlugs: ["content-operations"],
    agenda: [
      {
        time: "14:00",
        title: "编辑队列设计",
        speaker: "陈以维"
      },
      {
        time: "15:45",
        title: "资源与元数据复用",
        speaker: "李墨言"
      },
      {
        time: "17:00",
        title: "发布质检",
        speaker: "朴乔安"
      }
    ]
  },
  {
    slug: "city-chapter-kickoff",
    title: "城市分会启动会",
    summary: "为首个跨城市内容与活动协作节奏准备的实践型启动活动。",
    startsAt: "2026-05-08T09:30:00.000Z",
    endsAt: "2026-05-08T16:30:00.000Z",
    venueName: "东园论坛",
    citySlug: "beijing",
    registrationState: "not_open",
    registrationUrl: "",
    body:
      "这场启动会将沉淀本地分会页面、周期活动，以及内容编辑与城市运营之间的协作闭环，形成可重复复用的模板。",
    topicSlugs: ["city-community"],
    agenda: [
      {
        time: "09:30",
        title: "城市启动叙事",
        speaker: "朴乔安"
      },
      {
        time: "11:00",
        title: "主题与活动协同",
        speaker: "李墨言"
      },
      {
        time: "14:30",
        title: "社群激活计划",
        speaker: "陈以维"
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
    eyebrow: "第二阶段公开站 MVP",
    title: "以静态优先呈现、由 API 承载内容，并为工作人员运营留出清晰的演进路径。",
    summary:
      "公开站现在已经具备主题、文章、活动与城市的真实列表页和详情页。每个页面都可以在不改页面架构的前提下，从演示数据切换到 API 驱动的数据来源。",
    actions: [
      {
        label: "浏览文章",
        href: "/articles"
      },
      {
        label: "查看近期活动",
        href: "/events"
      }
    ]
  },
  featuredTopics: topicSummaries.slice(0, 3),
  featuredArticles: articleSummaries.slice(0, 3),
  upcomingEvents: eventSummaries.slice(0, 3),
  cityHighlights: citySummaries.slice(0, 3),
  applicationCallout: {
    title: "准备迎接下一批运营伙伴",
    summary:
      "申请流程现在已经被抽象为公开 API 契约，因此表单后续可以从占位界面平滑升级为真实的线索入口，而不需要重写站点。",
    href: "/apply"
  }
};

export const siteConfig: PublicSiteConfig = {
  platformName: "TGO Network",
  navigation: [
    {
      label: "首页",
      href: "/"
    },
    {
      label: "主题",
      href: "/topics"
    },
    {
      label: "文章",
      href: "/articles"
    },
    {
      label: "活动",
      href: "/events"
    },
    {
      label: "城市",
      href: "/cities"
    },
    {
      label: "申请",
      href: "/apply"
    },
    {
      label: "关于",
      href: "/about"
    }
  ],
  contentCollections: ["topics", "articles", "events", "cities"],
  footerTagline: "TGO Network 公开站原型基于 Astro 构建，并由共享的公开 API 契约驱动。",
  supportEmail: null
};

export const eventRegistrationStatusOptions: Array<{ value: EventRegistrationStatus; label: string }> = [
  {
    value: "submitted",
    label: "已提交"
  },
  {
    value: "approved",
    label: "已通过"
  },
  {
    value: "rejected",
    label: "已拒绝"
  },
  {
    value: "waitlisted",
    label: "候补中"
  },
  {
    value: "cancelled",
    label: "已取消"
  }
];

export const applicationTypeOptions: Array<{ value: ApplicationType; label: string }> = [
  {
    value: "trial",
    label: "试用"
  },
  {
    value: "membership",
    label: "会员"
  },
  {
    value: "contact",
    label: "联系我们"
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
          message: "申请请求体必须是对象。"
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
      message: "请选择支持的申请类型。"
    });
  }

  if (name.length < 2) {
    issues.push({
      field: "name",
      message: "姓名至少需要 2 个字符。"
    });
  }

  if (!email.includes("@") || email.length < 5) {
    issues.push({
      field: "email",
      message: "请输入有效的邮箱地址。"
    });
  }

  if (message.length < 20) {
    issues.push({
      field: "message",
      message: "申请说明至少需要 20 个字符。"
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
          message: "报名请求体必须是对象。"
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
      message: "姓名至少需要 2 个字符。"
    });
  }

  if (email.length > 0 && (!email.includes("@") || email.length < 5)) {
    issues.push({
      field: "email",
      message: "请输入有效的邮箱地址。"
    });
  }

  if (phoneNumber.length > 0 && phoneNumber.replace(/\D/g, "").length < 6) {
    issues.push({
      field: "phoneNumber",
      message: "请输入有效的手机号。"
    });
  }

  if (email.length === 0 && phoneNumber.length === 0) {
    issues.push({
      field: "email",
      message: "请至少填写一种联系方式：邮箱或手机号。"
    });
    issues.push({
      field: "phoneNumber",
      message: "请至少填写一种联系方式：邮箱或手机号。"
    });
  }

  if (company.length > 160) {
    issues.push({
      field: "company",
      message: "公司名称不能超过 160 个字符。"
    });
  }

  if (jobTitle.length > 160) {
    issues.push({
      field: "jobTitle",
      message: "职位名称不能超过 160 个字符。"
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
