import type { EventRegistrationStatus, PublicImageAsset, RegistrationState } from "./public-content.js";
import { platformName, publicNav } from "./ui.js";

export interface BranchReference {
  slug: string;
  name: string;
  cityName: string;
}

export interface BranchBoardMemberSummary {
  displayName: string;
  company: string;
  title: string;
  bio: string;
  avatar: PublicImageAsset | null;
}

export interface BranchSummary {
  slug: string;
  name: string;
  cityName: string;
  region: string;
  summary: string;
  boardMemberCount: number;
  coverImage: PublicImageAsset | null;
}

export interface BranchDetail extends BranchSummary {
  body: string;
  boardMembers: BranchBoardMemberSummary[];
}

export interface MemberSummary {
  slug: string;
  name: string;
  company: string;
  title: string;
  avatar: PublicImageAsset | null;
  branch: BranchReference | null;
  joinedAt: string;
}

export interface MemberDetail extends MemberSummary {
  bio: string;
}

export interface PublicArticleSummaryV2 {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  coverImage: PublicImageAsset | null;
  branch: BranchReference | null;
}

export interface PublicArticleDetailV2 extends PublicArticleSummaryV2 {
  body: string;
  author: {
    name: string;
    role: string;
  };
}

export interface PublicEventSummaryV2 {
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  cityName: string;
  venueName: string;
  venueAddress: string;
  coverImage: PublicImageAsset | null;
  registrationUrl: string | null;
  branch: BranchReference | null;
  registrationState: RegistrationState;
}

export interface PublicEventDetailV2 extends PublicEventSummaryV2 {
  body: string;
  agenda: Array<{
    time: string;
    title: string;
    speaker: string;
    summary: string;
  }>;
}

export interface PublicEventListQuery {
  page?: number;
  pageSize?: number;
  city?: string;
  branchSlug?: string;
  upcoming?: boolean;
}

export interface PublicEventListMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  cityOptions: string[];
  registrationStateCounts: {
    open: number;
    waitlist: number;
    closed: number;
    notOpen: number;
  };
}

export interface PublicEventListResult {
  items: PublicEventSummaryV2[];
  meta: PublicEventListMeta;
}

export interface JoinPagePayload {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  conditions: string[];
  benefits: string[];
  process: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    label: string;
    href: string;
  };
}

export interface AboutPagePayload {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  sections: Array<{
    title: string;
    body: string[];
  }>;
}

export interface JoinApplicationInput {
  name: string;
  phoneNumber: string;
  wechatId?: string;
  email?: string;
  introduction: string;
  applicationMessage: string;
  targetBranchId?: string;
}

export interface JoinApplicationReceipt {
  id: string;
  receivedAt: string;
  applicant: {
    name: string;
    phoneNumber: string;
    wechatId?: string;
    email?: string;
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

export interface JoinApplicationValidationIssue {
  field: keyof JoinApplicationInput;
  message: string;
}

export interface PublicEventRegistrationInputV2 {
  name: string;
  phoneNumber: string;
  wechatId?: string;
  email?: string;
  company?: string;
  title?: string;
  note?: string;
}

export interface PublicEventRegistrationReceiptV2 {
  id: string;
  receivedAt: string;
  status: EventRegistrationStatus;
  event: {
    slug: string;
    title: string;
  };
  attendee: {
    name: string;
    phoneNumber: string;
    wechatId?: string;
    email?: string;
    company?: string;
    title?: string;
    note?: string;
  };
}

export interface EventRegistrationValidationIssueV2 {
  field: keyof PublicEventRegistrationInputV2;
  message: string;
}

export interface PublicHomePayloadV2 {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    actions: Array<{
      label: string;
      href: string;
    }>;
  };
  intro: {
    title: string;
    summary: string;
  };
  audience: {
    title: string;
    items: string[];
  };
  metrics: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  featuredArticles: PublicArticleSummaryV2[];
  featuredEvents: PublicEventSummaryV2[];
  branchHighlights: BranchSummary[];
  joinCallout: {
    title: string;
    summary: string;
    href: string;
  };
}

const publicAsset = (url: string, alt: string): PublicImageAsset => ({
  url,
  alt,
  width: 1200,
  height: 800
});

const branchRecords = [
  {
    slug: "shanghai",
    name: "上海分会",
    cityName: "上海",
    region: "华东",
    summary: "以上海为核心节点，围绕技术管理者成长、闭门交流与标杆走访组织活动。",
    body:
      "上海分会聚焦平台架构、工程组织、AI 落地与技术领导力议题，强调同侪交流与高质量线下活动。",
    coverImage: publicAsset("https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80", "上海分会活动现场"),
    boardMembers: [
      {
        displayName: "周扬",
        company: "海岸智能",
        title: "CTO",
        bio: "长期关注研发组织设计与 AI 基础设施建设。",
        avatar: null
      },
      {
        displayName: "林闻",
        company: "云上科技",
        title: "技术副总裁",
        bio: "负责大型平台与数据系统建设，持续推动技术领导者交流。",
        avatar: null
      }
    ]
  },
  {
    slug: "hangzhou",
    name: "杭州分会",
    cityName: "杭州",
    region: "华东",
    summary: "围绕产品技术协同、增长体系与工程效率提升组织主题活动。",
    body:
      "杭州分会关注电商、云计算、AI 应用与产品创新，强调实践经验的复用与跨团队协作。",
    coverImage: publicAsset("https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80", "杭州分会交流活动"),
    boardMembers: [
      {
        displayName: "沈岚",
        company: "湖山云",
        title: "研发负责人",
        bio: "专注工程效率与中后台平台化建设。",
        avatar: null
      },
      {
        displayName: "贺青",
        company: "知行科技",
        title: "技术合伙人",
        bio: "长期组织技术管理者闭门沙龙与专题工作坊。",
        avatar: null
      }
    ]
  },
  {
    slug: "beijing",
    name: "北京分会",
    cityName: "北京",
    region: "华北",
    summary: "聚焦大模型、企业软件、技术战略与组织升级等方向的高密度交流。",
    body:
      "北京分会依托广泛的产业资源与技术领导者网络，持续组织闭门讨论、标杆企业参访和专题对话。",
    coverImage: publicAsset("https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=1200&q=80", "北京分会活动现场"),
    boardMembers: [
      {
        displayName: "高彻",
        company: "北辰软件",
        title: "首席架构师",
        bio: "关注企业级平台、云原生与技术团队组织管理。",
        avatar: null
      },
      {
        displayName: "唐知微",
        company: "星链智能",
        title: "技术总经理",
        bio: "推动前沿技术与产业场景之间的连接。",
        avatar: null
      }
    ]
  }
] as const;

const branchReferenceMap = new Map(
  branchRecords.map((branch) => [
    branch.slug,
    {
      slug: branch.slug,
      name: branch.name,
      cityName: branch.cityName
    }
  ])
);

const memberRecords = [
  {
    slug: "zhou-yang",
    name: "周扬",
    company: "海岸智能",
    title: "CTO",
    branchSlug: "shanghai",
    joinedAt: "2024-03-18T08:00:00.000Z",
    bio: "负责智能基础设施与研发组织体系建设，关注 AI 时代的平台能力重构。"
  },
  {
    slug: "lin-wen",
    name: "林闻",
    company: "云上科技",
    title: "技术副总裁",
    branchSlug: "shanghai",
    joinedAt: "2023-09-08T08:00:00.000Z",
    bio: "长期推动技术领导者社群建设，关注平台治理与工程效率。"
  },
  {
    slug: "shen-lan",
    name: "沈岚",
    company: "湖山云",
    title: "研发负责人",
    branchSlug: "hangzhou",
    joinedAt: "2024-05-22T08:00:00.000Z",
    bio: "专注于工程平台化、研发流程优化与跨团队协作机制。"
  },
  {
    slug: "he-qing",
    name: "贺青",
    company: "知行科技",
    title: "技术合伙人",
    branchSlug: "hangzhou",
    joinedAt: "2022-12-16T08:00:00.000Z",
    bio: "关注增长产品、技术管理者成长与中高层协同机制。"
  },
  {
    slug: "gao-che",
    name: "高彻",
    company: "北辰软件",
    title: "首席架构师",
    branchSlug: "beijing",
    joinedAt: "2024-01-12T08:00:00.000Z",
    bio: "长期关注企业架构升级、技术战略与组织迭代。"
  },
  {
    slug: "tang-zhiwei",
    name: "唐知微",
    company: "星链智能",
    title: "技术总经理",
    branchSlug: "beijing",
    joinedAt: "2023-07-14T08:00:00.000Z",
    bio: "推动技术社区与产业资源连接，关注模型应用与业务落地。"
  }
] as const;

const articleRecords = [
  {
    slug: "shipping-an-editorial-platform",
    title: "在不锁死技术栈的前提下交付内容平台",
    excerpt: "为什么首个版本即使仍以人工整理内容为主，也应该具备接近生产环境的形态。",
    publishedAt: "2026-03-12T08:00:00.000Z",
    authorName: "李墨言",
    authorRole: "平台编辑",
    branchSlug: "shanghai",
    body: [
      "即使当前数据仍来自种子数据，平台也应该从最终架构形态起步。这样可以避免交付团队先搭一套临时流程，后面又不得不整体重写。",
      "静态优先的页面、独立的管理后台，以及由 API 承担业务规则的分层方式，可以让公开站在扩展时依然保持内容运营的清晰边界。",
      "因此首个版本应优先验证契约、权限和内容状态规则，而不是一开始就追逐更复杂的增长能力。"
    ]
  },
  {
    slug: "from-events-to-knowledge",
    title: "把活动热度转化为可检索的知识资产",
    excerpt: "公开内容模型应该让每一场活动都成为可复用的知识资产，而不是只在当天生效的一次性通知。",
    publishedAt: "2026-03-18T08:00:00.000Z",
    authorName: "陈以维",
    authorRole: "社区制作人",
    branchSlug: "hangzhou",
    body: [
      "很多活动在报名结束后就迅速消失，但平台应该通过回顾文章、城市精选和主题策展把它们的价值沉淀下来。",
      "活动、文章和主题共享一套 schema 后，编辑团队就能在首页、专题页和城市页之间复用同一批原始内容素材。",
      "对于早期团队来说，这种复用能力比单纯堆功能更重要，因为它直接决定运营杠杆。"
    ]
  },
  {
    slug: "what-a-city-hub-needs",
    title: "一座城市主页在真正活起来之前需要什么",
    excerpt: "当城市页面能够把内容节奏、本地活动和明确的参与邀请连接起来时，它才真正具备生命力。",
    publishedAt: "2026-03-24T08:00:00.000Z",
    authorName: "朴乔安",
    authorRole: "城市项目负责人",
    branchSlug: "beijing",
    body: [
      "## 城市页不是一个静态目录\n\n分会页不应只是一个沉寂的目录入口。它应该解释本地分会的状态，突出当前活跃成员与近期活动，并呈现下一步有意义的行动入口。",
      "真正有生命力的城市主页，至少要把下面三件事说清楚：\n\n- 这一城当前围绕哪些议题持续组织活动\n- 哪些成员和董事会成员正在推动社区节奏\n- 访客下一步应该去看活动、文章还是加入方式",
      "> 城市主页真正的价值，不是展示信息，而是把长期节奏说清楚。",
      "```ts\nconst cityHub = {\n  content: true,\n  events: true,\n  members: true\n};\n```",
      "这意味着从第一天开始，文章内容就需要和分会、活动、成员体系形成稳定的公开叙事，而不是仅仅挂在旧的主题和城市原型之下。",
      "当管理后台能够持续维护这些公开内容后，前台就能在不改代码的前提下稳定更新。"
    ]
  }
] as const;

const eventRecords = [
  {
    slug: "shanghai-ai-leadership-salon",
    title: "上海 AI 领导力闭门沙龙",
    summary: "围绕 AI 团队建设、平台治理与落地节奏展开的小范围深度交流。",
    startsAt: "2026-04-12T10:00:00.000Z",
    endsAt: "2026-04-12T16:30:00.000Z",
    venueName: "上海北外滩会客厅",
    venueAddress: "上海市虹口区东大名路 1089 号",
    branchSlug: "shanghai",
    registrationState: "open",
    registrationUrl: "",
    body: "本次活动会讨论大模型项目的推进节奏、平台团队的角色定位，以及技术负责人如何在组织里推动跨部门协同。",
    agenda: [
      {
        time: "10:30",
        title: "AI 项目从 PoC 到规模化",
        speaker: "周扬",
        summary: "围绕落地条件、技术债与组织协同展开。"
      },
      {
        time: "13:30",
        title: "平台团队的下一阶段职责",
        speaker: "林闻",
        summary: "讨论平台治理与业务团队之间的协作边界。"
      }
    ]
  },
  {
    slug: "hangzhou-engineering-workshop",
    title: "杭州工程效率工作坊",
    summary: "从流程、平台与协作机制三个层面拆解研发效率提升。",
    startsAt: "2026-04-26T13:30:00.000Z",
    endsAt: "2026-04-26T18:00:00.000Z",
    venueName: "杭州未来科技城创新中心",
    venueAddress: "杭州市余杭区文一西路 1818 号",
    branchSlug: "hangzhou",
    registrationState: "waitlist",
    registrationUrl: "",
    body: "这场活动重点关注研发流程重构、工程平台建设与多团队协同治理。",
    agenda: [
      {
        time: "14:00",
        title: "工程效率的度量与误区",
        speaker: "沈岚",
        summary: "讨论效率指标如何真正服务管理决策。"
      },
      {
        time: "16:10",
        title: "平台团队如何支持业务交付",
        speaker: "贺青",
        summary: "结合真实案例讨论平台与业务协作。"
      }
    ]
  },
  {
    slug: "beijing-strategy-forum",
    title: "北京技术战略论坛",
    summary: "面向技术决策者，讨论组织升级、技术战略与 AI 时代业务重构。",
    startsAt: "2026-05-18T09:00:00.000Z",
    endsAt: "2026-05-18T17:30:00.000Z",
    venueName: "北京望京国际会议中心",
    venueAddress: "北京市朝阳区望京街 10 号",
    branchSlug: "beijing",
    registrationState: "not_open",
    registrationUrl: "",
    body: "论坛将围绕技术战略、组织能力建设与产业实践展开闭门交流。",
    agenda: [
      {
        time: "09:30",
        title: "AI 时代的技术战略重构",
        speaker: "高彻",
        summary: "讨论技术负责人如何平衡长期能力与短期收益。"
      },
      {
        time: "14:00",
        title: "技术组织升级路径",
        speaker: "唐知微",
        summary: "从团队结构、决策机制与业务协同切入。"
      }
    ]
  }
] as const;

export const branchSummaries: BranchSummary[] = branchRecords.map((branch) => ({
  slug: branch.slug,
  name: branch.name,
  cityName: branch.cityName,
  region: branch.region,
  summary: branch.summary,
  boardMemberCount: branch.boardMembers.length,
  coverImage: branch.coverImage
}));

export const branchDetails: BranchDetail[] = branchRecords.map((branch) => ({
  ...branchSummaries.find((item) => item.slug === branch.slug)!,
  body: branch.body,
  boardMembers: branch.boardMembers.map((member) => ({ ...member }))
}));

export const memberSummaries: MemberSummary[] = memberRecords.map((member) => ({
  slug: member.slug,
  name: member.name,
  company: member.company,
  title: member.title,
  avatar: null,
  branch: branchReferenceMap.get(member.branchSlug) ?? null,
  joinedAt: member.joinedAt
}));

export const memberDetails: MemberDetail[] = memberRecords.map((member) => ({
  ...memberSummaries.find((item) => item.slug === member.slug)!,
  bio: member.bio
}));

export const publicArticleSummariesV2: PublicArticleSummaryV2[] = articleRecords.map((article) => ({
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt,
  publishedAt: article.publishedAt,
  authorName: article.authorName,
  coverImage: null,
  branch: branchReferenceMap.get(article.branchSlug) ?? null
}));

export const publicArticleDetailsV2: PublicArticleDetailV2[] = articleRecords.map((article) => ({
  ...publicArticleSummariesV2.find((item) => item.slug === article.slug)!,
  body: article.body.join("\n\n"),
  author: {
    name: article.authorName,
    role: article.authorRole
  }
}));

export const publicEventSummariesV2: PublicEventSummaryV2[] = eventRecords.map((event) => ({
  slug: event.slug,
  title: event.title,
  summary: event.summary,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  cityName: branchReferenceMap.get(event.branchSlug)?.cityName ?? event.venueName.replace(/市.*/, "市"),
  venueName: event.venueName,
  venueAddress: event.venueAddress,
  coverImage: null,
  registrationUrl: event.registrationUrl || null,
  branch: branchReferenceMap.get(event.branchSlug) ?? null,
  registrationState: event.registrationState
}));

export const publicEventDetailsV2: PublicEventDetailV2[] = eventRecords.map((event) => ({
  ...publicEventSummariesV2.find((item) => item.slug === event.slug)!,
  body: event.body,
  agenda: event.agenda.map((item) => ({ ...item }))
}));

export const joinPagePayload: JoinPagePayload = {
  hero: {
    eyebrow: "加入 TGO 鲲鹏会",
    title: "面向技术领导者的高质量同侪网络",
    summary: "我们希望连接不同城市的 CTO、技术 VP、研发负责人和关键技术管理者，通过分会活动、私密小组、公开学习与长期连接，形成真正有边界的社区。"
  },
  conditions: [
    "具备明确的技术管理职责，并愿意持续参与高质量交流。",
    "在技术战略、研发管理、架构演进或组织建设等方向有真实实践。",
    "认可分享、互助、长期建设与同侪信任的社区价值。"
  ],
  benefits: [
    "进入跨城市技术领导者交流网络，获得长期稳定的同侪连接。",
    "参与闭门活动、专题研讨、私密小组与标杆企业走访。",
    "获得成员之间的经验复盘、资源对接与组织实践交流机会。"
  ],
  process: [
    "先阅读加入说明，确认是否适合当前阶段的组织定位。",
    "在线提交加入申请，由工作人员进行初步审核与联系。",
    "根据分会安排完成进一步沟通、确认与后续跟进。"
  ],
  faq: [
    {
      question: "申请后多久会得到反馈？",
      answer: "申请资料进入后台后，会由工作人员进行初步审核与联系，具体节奏取决于当前分会安排与运营节奏。"
    },
    {
      question: "不是成员能参加活动吗？",
      answer: "可以，当前活动报名为开放提交，由工作人员在后台进行审核确认。"
    },
    {
      question: "成员和工作人员是什么关系？",
      answer: "两者是完全独立的两套身份：成员用于前台组织参与，工作人员用于后台运营与审核。"
    }
  ],
  cta: {
    label: "填写加入申请",
    href: "/join#application-form"
  }
};

export const aboutPagePayload: AboutPagePayload = {
  hero: {
    eyebrow: "关于 TGO 鲲鹏会",
    title: "构建全球化的有技术背景的优秀人才同侪学习成长平台",
    summary:
      "TGO 是极客邦旗下科技领导者聚集和交流的组织，学员由 CTO、架构师、技术 VP、具有技术背景的 CEO 等组成，目前已经在北京、上海、深圳、广州、杭州、成都、硅谷、南京、台北、厦门、武汉、苏州等城市定期举办学习活动。"
  },
  sections: [
    {
      title: "定义你的 TGO 鲲鹏会之旅",
      body: [
        "TGO 鲲鹏会学员秉承“投入越多，收获越多”的理念，积极参与到所有的活动中，与其他学员建立深厚连接并从中不断收获价值。",
        "TGO 鲲鹏会的活动包含多个方向，每位学员都可以自由选择其中的部分或全部活动，以定义自己在社区中的长期参与路径。"
      ]
    },
    {
      title: "全球经验对话",
      body: [
        "在人工智能、大数据、区块链与精密制造持续演进的背景下，技术领导者需要同时具备商业洞察力与技术前瞻判断。",
        "美国硅谷、以色列、日本等区域聚集了大量高科技企业和行业领导者，社区通过全球经验对话帮助学员理解技术趋势、连接优秀团队，并为个人成长、团队发展和企业壮大提供助力。"
      ]
    },
    {
      title: "私密小组活动",
      body: [
        "小组是 TGO 鲲鹏会最核心的产品，也是各城市最核心的组成单元，所有学员都会进入不同的小组持续参与交流。",
        "在健康运营的小组氛围中，成员会分享一般社交场合不会轻易展开的真实问题、关键抉择与脆弱时刻，正是这种高信任的小范围交流，让社区形成长期而稳固的连接。"
      ]
    },
    {
      title: "年度团聚家宴",
      body: [
        "自 2015 年成立以来，年度团聚家宴一直是 TGO 鲲鹏会各地的重要年度活动，也是学员专享的休闲社交场景。",
        "它强调一年一度的集中团聚、跨团队交流与关系加深，让地方分会的长期连接不只发生在日常活动之中。"
      ]
    },
    {
      title: "月度公开学习活动",
      body: [
        "TGO 鲲鹏会在多个城市长期组织线下公开学习活动，内容覆盖创业、管理、团队、架构、商业、运营、产品与资本等议题。",
        "这些活动既是学员持续学习的重要入口，也是社区对外开放的窗口，帮助更多技术管理者理解 TGO 的组织方式与学习氛围。"
      ]
    },
    {
      title: "技术高管培训",
      body: [
        "TGO 鲲鹏会小组也提供了锻炼领导力的真实场景，一个优秀的小组组长往往需要同时承担愿景引导与日常组织两种责任。",
        "通过新学员培训和组长领导力培训，社区为学员提供方法、指南与实践场景，帮助技术管理者在真实协作中持续提升领导力。"
      ]
    },
    {
      title: "荣誉导师辅导",
      body: [
        "TGO 鲲鹏会荣誉导师在业界具有广泛影响力，并对行业发展做出过突出贡献，是被广泛认可的技术榜样。",
        "社区会邀请导师为学员分享经验、解答问题、提供启发，希望让科技领导者们聚在一起，释放更多能量，为技术圈带来持续的创意和推动力。"
      ]
    },
    {
      title: "全球技术领导力峰会（GTLC）",
      body: [
        "Global Tech Leadership Conference 是 TGO 鲲鹏会主办的高端科技领导者盛会，面向 CTO、技术 VP、技术团队 Leader 与技术项目负责人等技术管理者。",
        "在 GTLC，参与者可以与大规模技术管理者同行，获得顶尖领袖的实战经验与视野启发，进一步拓展对领导力与技术战略的理解。"
      ]
    },
    {
      title: "即刻申请加入 TGO 鲲鹏会",
      body: [
        "如果你认同这种以长期连接、真实交流和技术领导力成长为核心的社区方式，可以继续查看加入说明并提交申请。",
        "前台申请用于表达加入意愿，后续审核、沟通与确认将由工作人员在后台持续跟进。"
      ]
    }
  ]
};

export const siteConfig: PublicSiteConfig = {
  platformName,
  navigation: [...publicNav],
  contentCollections: ["branches", "members", "articles", "events", "join", "about"],
  footerTagline: "构建全球化的有技术背景的优秀人才同侪学习成长平台。",
  supportEmail: null
};

export const publicHomePayloadV2: PublicHomePayloadV2 = {
  hero: {
    eyebrow: "TGO 鲲鹏会",
    title: "连接技术领导者、分会活动与长期交流网络",
    summary: "面向 CTO、技术 VP、研发负责人和关键技术管理者，通过分会网络、活动学习、成员连接与内容沉淀建立长期同侪社区。",
    actions: [
      {
        label: "了解加入方式",
        href: "/join"
      },
      {
        label: "查看近期活动",
        href: "/events"
      }
    ]
  },
  intro: {
    title: "不止于内容发布，更强调技术领导者之间的长期协作关系",
    summary: "TGO 鲲鹏会以城市分会和董事会为长期组织单元，把成员网络、学习活动与组织洞察连接起来，形成可持续运营的社区结构。"
  },
  audience: {
    title: "覆盖人群",
    items: [
      "CTO、技术 VP、研发负责人、架构负责人",
      "在快速成长企业里承担技术管理职责的核心管理者",
      "希望获得同侪交流与长期连接机会的技术领导者"
    ]
  },
  metrics: [
    {
      label: "重点分会",
      value: "3+",
      description: "以城市分会承接长期连接，逐步扩展社区网络。"
    },
    {
      label: "活动形态",
      value: "4 类",
      description: "私密小组、闭门沙龙、专题工作坊与标杆走访。"
    },
    {
      label: "公开模块",
      value: "7 项",
      description: "围绕组织介绍、成员、活动、文章与加入路径展开。"
    }
  ],
  featuredArticles: publicArticleSummariesV2.slice(0, 3),
  featuredEvents: publicEventSummariesV2.slice(0, 3),
  branchHighlights: branchSummaries.slice(0, 3),
  joinCallout: {
    title: "成为下一位加入网络的技术领导者",
    summary: "如果你希望进入高质量的技术管理者交流网络，可以先阅读加入说明，再提交正式申请，由工作人员继续审核与联系。",
    href: "/join"
  }
};

export const getBranchDetail = (slug: string) => branchDetails.find((branch) => branch.slug === slug) ?? null;
export const getMemberDetail = (slug: string) => memberDetails.find((member) => member.slug === slug) ?? null;
export const getPublicArticleDetailV2 = (slug: string) =>
  publicArticleDetailsV2.find((article) => article.slug === slug) ?? null;
export const getPublicEventDetailV2 = (slug: string) =>
  publicEventDetailsV2.find((event) => event.slug === slug) ?? null;

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const validateJoinApplicationInput = (
  input: unknown
):
  | {
      valid: true;
      data: JoinApplicationInput;
    }
  | {
      valid: false;
      issues: JoinApplicationValidationIssue[];
    } => {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      issues: [
        {
          field: "name",
          message: "申请请求体必须是对象。"
        }
      ]
    };
  }

  const record = input as Record<string, unknown>;
  const name = readString(record.name);
  const phoneNumber = readString(record.phoneNumber);
  const wechatId = readString(record.wechatId);
  const email = readString(record.email).toLowerCase();
  const introduction = readString(record.introduction);
  const applicationMessage = readString(record.applicationMessage);
  const targetBranchId = readString(record.targetBranchId);
  const issues: JoinApplicationValidationIssue[] = [];

  if (name.length < 2) {
    issues.push({
      field: "name",
      message: "姓名至少需要 2 个字符。"
    });
  }

  if (phoneNumber.replace(/\D/g, "").length < 6) {
    issues.push({
      field: "phoneNumber",
      message: "请输入有效的手机号。"
    });
  }

  if (email.length > 0 && (!email.includes("@") || email.length < 5)) {
    issues.push({
      field: "email",
      message: "请输入有效的邮箱地址。"
    });
  }

  if (introduction.length < 20) {
    issues.push({
      field: "introduction",
      message: "个人介绍至少需要 20 个字符。"
    });
  }

  if (applicationMessage.length < 20) {
    issues.push({
      field: "applicationMessage",
      message: "申请信息至少需要 20 个字符。"
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
      phoneNumber,
      ...(wechatId ? { wechatId } : {}),
      ...(email ? { email } : {}),
      introduction,
      applicationMessage,
      ...(targetBranchId ? { targetBranchId } : {})
    }
  };
};

export const validatePublicEventRegistrationInputV2 = (
  input: unknown
):
  | {
      valid: true;
      data: PublicEventRegistrationInputV2;
    }
  | {
      valid: false;
      issues: EventRegistrationValidationIssueV2[];
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
  const phoneNumber = readString(record.phoneNumber);
  const wechatId = readString(record.wechatId);
  const email = readString(record.email).toLowerCase();
  const company = readString(record.company);
  const title = readString(record.title);
  const note = readString(record.note);
  const issues: EventRegistrationValidationIssueV2[] = [];

  if (name.length < 2) {
    issues.push({
      field: "name",
      message: "姓名至少需要 2 个字符。"
    });
  }

  if (phoneNumber.replace(/\D/g, "").length < 6) {
    issues.push({
      field: "phoneNumber",
      message: "请输入有效的手机号。"
    });
  }

  if (email.length > 0 && (!email.includes("@") || email.length < 5)) {
    issues.push({
      field: "email",
      message: "请输入有效的邮箱地址。"
    });
  }

  if (company.length > 160) {
    issues.push({
      field: "company",
      message: "公司名称不能超过 160 个字符。"
    });
  }

  if (title.length > 160) {
    issues.push({
      field: "title",
      message: "职称不能超过 160 个字符。"
    });
  }

  if (note.length > 1000) {
    issues.push({
      field: "note",
      message: "备注不能超过 1000 个字符。"
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
      phoneNumber,
      ...(wechatId ? { wechatId } : {}),
      ...(email ? { email } : {}),
      ...(company ? { company } : {}),
      ...(title ? { title } : {}),
      ...(note ? { note } : {})
    }
  };
};
