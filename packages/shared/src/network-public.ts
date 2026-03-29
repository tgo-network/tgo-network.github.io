import type { ArticleDetail, ArticleSummary, EventRegistrationStatus, PublicImageAsset, RegistrationState } from "./public-content.js";
import { articleDetails, articleSummaries } from "./public-content.js";

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

export interface PublicEventSummaryV2 {
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
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
  featuredArticles: ArticleSummary[];
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

export const publicEventSummariesV2: PublicEventSummaryV2[] = eventRecords.map((event) => ({
  slug: event.slug,
  title: event.title,
  summary: event.summary,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
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
    title: "面向技术领导者的高质量交流网络",
    summary: "我们希望连接不同城市的技术管理者，通过闭门交流、标杆走访、专题活动与长期陪伴，形成可信任的同侪网络。"
  },
  conditions: [
    "具备明确的技术管理职责，能够持续参与高质量交流。",
    "在技术战略、研发管理、架构演进或组织建设等方向有真实实践。",
    "认可社区分享、互助与长期建设的价值。"
  ],
  benefits: [
    "进入跨城市技术领导者交流网络。",
    "参与闭门活动、专题研讨与标杆企业走访。",
    "获得成员之间的经验复盘与业务连接机会。"
  ],
  process: [
    "在线提交加入申请。",
    "工作人员进行初步审核与联系。",
    "根据分会安排完成进一步沟通与确认。"
  ],
  faq: [
    {
      question: "成员是否需要付费？",
      answer: "当前阶段按线下沟通与运营规则执行，后续若有标准化政策会在后台配置并对外同步。"
    },
    {
      question: "不是成员能参加活动吗？",
      answer: "可以，当前活动报名为开放提交，由工作人员在后台进行审核确认。"
    }
  ],
  cta: {
    label: "填写加入申请",
    href: "/join#application-form"
  }
};

export const aboutPagePayload: AboutPagePayload = {
  hero: {
    eyebrow: "关于我们",
    title: "一个连接技术领导者、分会活动与长期交流的组织网络",
    summary: "TGO 风格平台的前台承载组织介绍、成员展示、活动报名与内容传播，后台则支撑工作人员进行持续运营。"
  },
  sections: [
    {
      title: "组织形式",
      body: [
        "我们以分会为基本组织单元，围绕技术领导者构建长期交流网络。",
        "每个分会都由董事会成员共同推动本地活动节奏与社群发展。"
      ]
    },
    {
      title: "活动形式",
      body: [
        "活动包括闭门沙龙、专题工作坊、标杆走访与小范围圆桌。",
        "核心目标是让技术管理者获得高价值、可复用的实践经验。"
      ]
    },
    {
      title: "加入方式",
      body: [
        "非成员可以通过前台提交加入申请。",
        "工作人员会在后台进行审核、联系与后续跟进。"
      ]
    }
  ]
};

export const publicHomePayloadV2: PublicHomePayloadV2 = {
  hero: {
    eyebrow: "TGO 鲲鹏会",
    title: "连接技术领导者、分会活动与长期交流网络",
    summary: "前台聚焦组织介绍、分会董事会、成员列表、活动、文章、加入申请与关于我们；后台负责持续运营与审核。",
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
    title: "围绕技术领导者建立可信任的长期连接",
    summary: "我们希望把城市分会、成员网络、精选文章与活动沉淀成一套可以持续运营的公开站点与后台体系。"
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
      label: "覆盖城市",
      value: "3+",
      description: "先从重点分会启动，后续继续扩展网络。"
    },
    {
      label: "活动形态",
      value: "4 类",
      description: "闭门沙龙、专题工作坊、标杆走访与圆桌交流。"
    },
    {
      label: "公开模块",
      value: "7 项",
      description: "围绕组织介绍、成员、活动、文章与加入路径展开。"
    }
  ],
  featuredArticles: articleSummaries.slice(0, 3),
  featuredEvents: publicEventSummariesV2.slice(0, 3),
  branchHighlights: branchSummaries.slice(0, 3),
  joinCallout: {
    title: "成为下一位加入网络的技术领导者",
    summary: "如果你希望进入高质量的技术管理者交流网络，可以先阅读加入说明，再提交正式申请。",
    href: "/join"
  }
};

export const getBranchDetail = (slug: string) => branchDetails.find((branch) => branch.slug === slug) ?? null;
export const getMemberDetail = (slug: string) => memberDetails.find((member) => member.slug === slug) ?? null;
export const getPublicEventDetailV2 = (slug: string) =>
  publicEventDetailsV2.find((event) => event.slug === slug) ?? null;
export const getArticleDetailForHome = (slug: string): ArticleDetail | null =>
  articleDetails.find((article) => article.slug === slug) ?? null;

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
