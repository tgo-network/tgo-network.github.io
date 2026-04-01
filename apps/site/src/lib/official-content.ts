export interface OfficialLink {
  label: string;
  href: string;
}

export interface OfficialImage {
  src: string;
  alt: string;
}

export interface OfficialAboutSection {
  title: string;
  paragraphs: string[];
  images: OfficialImage[];
  link?: OfficialLink;
}

export interface OfficialFaqKeyValue {
  label: string;
  value: string;
}

export interface OfficialFaqItem {
  question: string;
  paragraphs?: string[];
  keyValues?: OfficialFaqKeyValue[];
  image?: OfficialImage;
  link?: OfficialLink;
}

const officialAssetBase = "https://static001.geekbang.org/tgo/img";

const officialImage = (file: string, alt: string): OfficialImage => ({
  src: `${officialAssetBase}/${file}`,
  alt
});

export const officialAboutIntro = {
  label: "关于我们",
  title: "关于 TGO 鲲鹏会",
  summary:
    "现代互联网逐步形成了越来越多的规模性协作社群，人们通过技术、资源、知识连接在一起，产生出远大于 1+1 的价值。TGO 就是这样一个有边界的技术社群组织。",
  leadTitle: "定义你的 TGO 鲲鹏会之旅",
  leadBody:
    "TGO 鲲鹏会学员秉承“投入越多，收获越多”的理念，积极参与到所有活动中，与其他学员建立深厚连接并持续收获价值。围绕全球经验对话、私密小组、公开学习、培训与峰会等长期机制，每位成员都可以定义自己的参与路径。"
};

export const officialAboutSections: OfficialAboutSection[] = [
  {
    title: "全球经验对话",
    paragraphs: [
      "在人工智能、大数据、区块链技术飞速发展的大背景下，如何有效应对未来将出现的机遇与挑战，需要领导者兼具敏锐的商业洞察力和掌握最前沿的技术变革。美国硅谷、以色列、日本是人工智能与大数据、精密制造等领域高科技企业及行业领导者的聚集地，在这里可以探索未来科技发展的信号，与高科技公司技术团队进行思维的碰撞。",
      "ChinaTech Day 中国技术开放日借助于 TGO 鲲鹏会的全球学员网络，将更加紧密地链接全球顶尖企业和科技领导者，为个人成长、团队发展和企业壮大提供助力。"
    ],
    images: [officialImage("1.3e98ca2b.png", "全球经验对话")],
    link: {
      label: "访问 ChinaTech Day",
      href: "http://www.chinatechday.com"
    }
  },
  {
    title: "私密小组活动",
    paragraphs: [
      "小组是 TGO 鲲鹏会最核心的产品，也是各城市最核心的组成单元。所有学员都会进入不同的小组，在长期稳定的关系中持续交流。",
      "在健康运营的情况下，小组会议讨论的内容往往是在一般社交场合不会涉及、也不愿涉及的话题。只有在安全的小组氛围内，成员才会分享那些能够展现脆弱性、带来信任与连接的“5% 话题”。"
    ],
    images: [officialImage("2.cbe01482.png", "私密小组活动")]
  },
  {
    title: "年度团聚家宴",
    paragraphs: [
      "自 2015 年成立以来，年度团聚家宴一直是 TGO 鲲鹏会当地年度最重要的活动之一。它是学员专享的年度休闲社交活动，旨在加强学员之间的了解沟通，推动本地技术社区的分享和交流，让大家在一年一度的团聚中辞旧迎新。"
    ],
    images: [
      officialImage("3.4467078e.png", "年度团聚家宴现场一"),
      officialImage("4.8b10127e.jpeg", "年度团聚家宴现场二")
    ]
  },
  {
    title: "月度公开学习活动",
    paragraphs: [
      "TGO 鲲鹏会全球多个城市每个月均有至少一场线下公开学习活动，内容覆盖创业、管理、团队、架构、商业、运营、产品、资本等话题。所有 TGO 鲲鹏会学员都可以自由参加这些持续发生的学习活动。",
      "各个城市会围绕学员需求和前沿技术趋势制定年度学习规划，把公开分享、案例讨论、闭门交流与企业参访组织成稳定的学习节奏。"
    ],
    images: [
      officialImage("y1.f7698006.png", "月度公开学习活动现场一"),
      officialImage("y2.c99b8704.png", "月度公开学习活动现场二")
    ],
    link: {
      label: "浏览活动列表",
      href: "/events"
    }
  },
  {
    title: "技术高管培训",
    paragraphs: [
      "TGO 鲲鹏会小组提供了锻炼领导力的绝佳场景。一个优秀的小组组长，需要同时承担 CEO 与 COO 的角色：既要确定小组的使命与愿景，也要组织每月小组会议。通过新学员培训和组长领导力培训，TGO 鲲鹏会为学员提供领导力提升的方法、指南与练习场景。"
    ],
    images: [
      officialImage("6.d8b6e0f1.jpeg", "技术高管培训现场一"),
      officialImage("7.483beabe.png", "技术高管培训现场二")
    ]
  },
  {
    title: "荣誉导师辅导",
    paragraphs: [
      "TGO 鲲鹏会荣誉导师在业界享有一定声誉，并对行业发展做出过突出贡献，被业界公认为技术人的榜样。经 TGO 鲲鹏会总部同意后，授予其“荣誉导师”称呼，为学员传道、授业、解惑。",
      "TGO 鲲鹏会会不定期邀请导师分享成熟经验。我们希望科技领导者们聚在一起，散发出更多能量，为科技圈带来源源不断的创意和推动力，一起创造并改变未来。"
    ],
    images: [
      officialImage("8.9cf5e268.jpg", "荣誉导师辅导现场一"),
      officialImage("9.7b221f4f.jpg", "荣誉导师辅导现场二"),
      officialImage("10.475316e1.jpg", "荣誉导师辅导现场三")
    ]
  },
  {
    title: "全球技术领导力峰会（GTLC）",
    paragraphs: [
      "Global Tech Leadership Conference，简称 GTLC，中文名称为全球技术领导力峰会，是 TGO 鲲鹏会主办的高端科技领导者盛会。峰会主要面向 CTO、技术 VP、技术团队 Leader、技术项目负责人等对领导力感兴趣的技术管理者。",
      "在 GTLC 峰会现场，你将与大量 CTO 及优秀技术管理者同行，获得科技圈顶尖领袖带来的实战经验和视野启发。"
    ],
    images: [officialImage("11.a131a302.jpg", "全球技术领导力峰会 GTLC")],
    link: {
      label: "访问 GTLC",
      href: "https://gtlc.infoq.cn/2020/beijing"
    }
  }
];

export const officialFaqItems: OfficialFaqItem[] = [
  {
    question: "TGO 鲲鹏会是什么？",
    paragraphs: [
      "TGO 鲲鹏会是极客邦科技旗下科技领导者同侪学习平台，由极客邦科技创始人霍太稳于 2015 年发起。成员由具有科技背景的公司创始人、CXO、技术 VP、架构师、教授学者和科创投资人等组成。",
      "组织采用“学员共建”的形式，希望通过“共建、自治”的方式维护各城市的健康发展，为学员提供必要的服务，帮助学员个人更好地学习和成长，也帮助学员企业之间更好地合作与交流。"
    ]
  },
  {
    question: "TGO 鲲鹏会的加入标准是什么？",
    image: officialImage("t1.c3bebe87.png", "TGO 鲲鹏会加入标准")
  },
  {
    question: "TGO 鲲鹏会的加入流程是什么？",
    image: officialImage("t2.aa02107f.png", "TGO 鲲鹏会加入流程")
  },
  {
    question: "TGO 鲲鹏会的学费金额是多少？",
    paragraphs: [
      "2024 年 12 月起，TGO 鲲鹏会新学员会费调整为 2048-9216 / 年 / 人。每个城市会费不一样，具体以当地分会说明为准。",
      "TGO 鲲鹏会实行财年制度，财年周期是当年的 7 月 1 日至次年的 6 月 30 日。每年的 7 月 1 日统一结算学费，不满一年会按月份折算。"
    ],
    keyValues: [
      {
        label: "示例会籍期限",
        value: "2022 年 5 月 1 日 - 2023 年 6 月 30 日（共计 14 个月）"
      },
      {
        label: "示例学费金额",
        value: "分会会费 / 12 × 14"
      }
    ]
  },
  {
    question: "学费可以打折吗？",
    paragraphs: [
      "TGO 鲲鹏会学费为统一价格，没有折扣。会费用于支持当地运营和年度学员服务。"
    ]
  },
  {
    question: "TGO 鲲鹏会的活动有哪些？",
    paragraphs: [
      "TGO 鲲鹏会活动主要在线下展开，主要分为两种：私密小组活动与公开学习活动。",
      "加入之后，成员会按照行业背景、专业领域等进入 8-10 人的小组内，小组成员每月不定期线下见面沟通，交流经验、互学互助。",
      "各地分会每个月都会组织 1-2 场公开学习活动，主题与形式多样，包含大咖演讲、议桌局、闭门讨论、亲子活动、户外探索、企业参访等。公开学习活动通常保持较小规模，公开报名后仍需工作人员审核。"
    ]
  },
  {
    question: "公开学习活动和小组活动的区别是什么？",
    paragraphs: [
      "小组活动的参与成员是固定的，讨论内容、举办时间和分享人主要由小组内部共同决定，落地实施也由小组成员完成。",
      "公开学习活动则由 TGO 鲲鹏会发起，活动主题与时间由当地区域经理和董事会共同决定，成员可以根据自己的需求与话题匹配度选择参加。"
    ]
  },
  {
    question: "面试的标准是什么，面试官是谁？",
    paragraphs: [
      "面试一般采用线下一对一沟通的方式，如遇特殊情况也可能改为电话沟通。面试内容主要包括个人经历介绍、能为现有成员带来的价值，以及加入 TGO 鲲鹏会的主要诉求。",
      "每次参与面试的面试官通常为当地董事会成员，他们会在沟通过程中判断候选人的诉求与社区能够提供的价值是否匹配。"
    ],
    link: {
      label: "查看董事会成员",
      href: "/branches"
    }
  },
  {
    question: "TGO 鲲鹏会每个地区都有董事会，董事会具体是干什么的？",
    paragraphs: [
      "TGO 鲲鹏会是一个学员共建的组织，通过“共建、自治”的方式维护当地健康发展，为学员提供必要服务，帮助成员个人成长，也帮助成员企业之间更好地合作和交流。",
      "每个地区都会由当地董事会成员与 TGO 鲲鹏会管理团队共同运营。董事会委员由当地学员担任，对当地运营有全部知情权与共同决定权。"
    ],
    keyValues: [
      {
        label: "负责人",
        value: "把控当地董事会总体方向，带领董事会制定年度目标与实施计划。"
      },
      {
        label: "学习产品负责人",
        value: "规划、协调学习活动，确保内容质量，并根据学员反馈持续调整。"
      },
      {
        label: "会籍负责人",
        value: "协调招募潜在成员，面试符合标准的高质量候选人，传播社区价值。"
      },
      {
        label: "服务负责人",
        value: "负责新成员欢迎、连接与指引，也协调接待其他地区来访成员。"
      },
      {
        label: "小组负责人",
        value: "负责新成员进入小组的安置，以及组长最佳实践的分享与沉淀。"
      }
    ]
  },
  {
    question: "加入 TGO 鲲鹏会之后，我可以享受哪些学员权益？",
    paragraphs: [
      "主要包括参加 TGO 鲲鹏会活动、个人品牌打造，以及与学习活动、企业宣传、资源对接、技术团队招聘、产品推荐、优秀案例展示、团队成长和极客邦资源折扣相关的一系列服务。"
    ]
  },
  {
    question: "可以开票吗？开票的内容和税点是多少？电子票还是纸质的发票？",
    paragraphs: ["可以。"],
    keyValues: [
      {
        label: "开票内容",
        value: "会员费、服务费、技术服务费、信息服务费、会议服务费、技术培训费"
      },
      {
        label: "开票税点",
        value: "1%"
      },
      {
        label: "开票类型",
        value: "电子发票"
      }
    ]
  },
  {
    question: "TGO 鲲鹏会和其他组织的区别是什么？有什么不一样？",
    image: officialImage("t3.5d3aa3c5.jpg", "TGO 鲲鹏会与其他组织的区别")
  }
];
