const sitePublicRoot = "/apps/site/public";

const siteAsset = (path) => `${sitePublicRoot}${path}`;

export const demoThemes = {
  "atlas-ink": {
    id: "atlas-ink",
    chineseName: "方案 A · 东方克制型",
    englishName: "Atlas Ink",
    reference: "Apple × Monocle × YPO",
    summary: "中文高级感最强，适合作为正式主站的长期气质。",
    recommendation: "优先推荐"
  },
  "summit-signal": {
    id: "summit-signal",
    chineseName: "方案 B · 全球科技峰会型",
    englishName: "Summit Signal",
    reference: "Web Summit × TED × Apple",
    summary: "活动势能更强，适合强调前沿技术与城市大会氛围。",
    recommendation: "活动视觉更有冲击力"
  },
  "member-house": {
    id: "member-house",
    chineseName: "方案 C · 现代会所会员型",
    englishName: "Member House",
    reference: "YPO × Chief × Soho House",
    summary: "更强调会籍感、邀请感与长期社群归属。",
    recommendation: "会员社区气质最强"
  },
  "pro-community": {
    id: "pro-community",
    chineseName: "方案 D · 专业社区信息型",
    englishName: "Pro Community",
    reference: "Vercel × Stripe × Intercom",
    summary: "强调整体网站内容的模块化组织，呈现清晰、高端而且极具科技感的观感，适合作为内容丰富的平台。",
    recommendation: "内容承载力更强"
  }
};

export const demoContent = {
  nav: [
    { label: "组织介绍", href: "#intro" },
    { label: "分会董事会", href: "#board" },
    { label: "成员推荐", href: "#members" },
    { label: "活动", href: "#events" },
    { label: "文章", href: "#articles" },
    { label: "加入申请", href: "#join" }
  ],
  hero: {
    eyebrow: "TGO 鲲鹏会",
    title: "面向科技领导者的高质量学习社区",
    summary:
      "连接 CTO、技术 VP、研发负责人和技术创业者，通过城市分会、私密小组、公开学习活动与长期内容沉淀，形成真实、稳定、长期发生的同侪交流网络。",
    quote: "TGO 是一个有边界的技术社群组织。",
    actions: [
      { label: "浏览近期活动", href: "#events" },
      { label: "查看加入方式", href: "#join" }
    ],
    notes: [
      "学员共建的组织形式，以城市分会承接长期连接。",
      "公开活动面向成员与访客开放报名，由工作人员继续审核确认。",
      "成员与工作人员是两套独立身份，不共享后台权限。"
    ],
    imagery: {
      primary: siteAsset("/official/about/11.a131a302.jpg"),
      secondary: siteAsset("/official/about/2.cbe01482.png")
    }
  },
  intro: {
    title: "以城市分会承接长期连接，让学习、交流与共建持续发生",
    summary:
      "TGO 鲲鹏会采用学员共建、分会运营的组织方式，把私密小组、公开学习、全球经验对话与年度峰会组织成稳定节奏，让技术领导者在真实问题中获得长期反馈。",
    tags: ["学员共建", "城市分会", "长期同侪交流", "公开学习活动"],
    experiences: [
      {
        title: "全球经验对话",
        body:
          "围绕人工智能、大数据、精密制造等前沿方向，连接全球顶尖企业与科技领导者，帮助成员获得更广阔的产业视角。",
        image: siteAsset("/official/about/1.3e98ca2b.png")
      },
      {
        title: "私密小组活动",
        body:
          "小组是最核心的产品形态。成员在长期稳定的关系里讨论一般社交场合不会涉及的真实难题，建立信任与连接。",
        image: siteAsset("/official/about/2.cbe01482.png")
      },
      {
        title: "月度公开学习活动",
        body:
          "各地分会每个月均有公开学习活动，话题覆盖管理、团队、架构、商业与前沿技术，并保持小规模、高质量的交流氛围。",
        image: siteAsset("/official/about/y1.f7698006.png")
      }
    ]
  },
  board: {
    title: "分会董事会",
    items: [
      {
        branch: "北京分会",
        role: "负责人",
        name: "陈肃",
        company: "涛思数据",
        title: "高级副总裁",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/beijing/1171.png")
      },
      {
        branch: "上海分会",
        role: "负责人",
        name: "吴坚",
        company: "保时捷（上海）数字科技有限公司",
        title: "董事总经理",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/shanghai/674.jpg")
      },
      {
        branch: "深圳分会",
        role: "负责人",
        name: "王拓",
        company: "芯安信息安全",
        title: "创始人兼 CTO",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/shenzhen/149.jpg")
      },
      {
        branch: "广州分会",
        role: "负责人",
        name: "杨韶伟",
        company: "广州威而比科技有限公司",
        title: "联合创始人兼 CTO",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/guangzhou/1606.jpg")
      },
      {
        branch: "杭州分会",
        role: "负责人",
        name: "芦宇峰",
        company: "杭州擎路科技",
        title: "创始人",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/hangzhou/178.png")
      },
      {
        branch: "成都分会",
        role: "负责人",
        name: "马力遥",
        company: "互联极简",
        title: "创始人",
        avatar: siteAsset("/imports/tgo-infoq/branches/members/chengdu/473.jpg")
      }
    ]
  },
  testimonials: {
    title: "成员推荐",
    items: [
      {
        name: "郭理靖",
        company: "奈雪的茶",
        title: "CTO",
        branch: "杭州分会",
        quote: "真正有价值的，不是一场活动结束时的热闹，而是之后还能继续讨论那些没有标准答案的管理问题。"
      },
      {
        name: "陈锡言",
        company: "一览科技",
        title: "联合创始人",
        branch: "北京分会",
        quote: "当你长期和一群做过复杂业务、复杂组织的人交流，很多判断会更稳，很多问题也会更快看到第二种解法。"
      },
      {
        name: "黄良懿",
        company: "高仙机器人",
        title: "研发 VP",
        branch: "深圳分会",
        quote: "社区最难得的地方，是大家愿意把真实经验、真实代价和真实犹豫拿出来讨论，而不是只讲结果。"
      }
    ]
  },
  events: {
    title: "精选活动",
    items: [
      {
        city: "上海",
        date: "2026.04.12",
        title: "上海 AI 领导力闭门沙龙",
        summary: "围绕 AI 团队建设、平台治理与落地节奏展开的小范围深度交流。",
        image: siteAsset("/imports/tgo-infoq/branches/banners/shanghai.png")
      },
      {
        city: "杭州",
        date: "2026.04.26",
        title: "杭州工程效率工作坊",
        summary: "从流程、平台与协作机制三个层面拆解研发效率提升。",
        image: siteAsset("/official/about/y2.c99b8704.png")
      },
      {
        city: "北京",
        date: "2026.05.18",
        title: "北京技术战略论坛",
        summary: "面向技术决策者，讨论组织升级、技术战略与 AI 时代业务重构。",
        image: siteAsset("/imports/tgo-infoq/branches/banners/beijing.png")
      }
    ]
  },
  articles: {
    title: "文章",
    items: [
      {
        date: "2026.03.12",
        title: "在不锁死技术栈的前提下交付内容平台",
        excerpt: "为什么首个版本即使仍以人工整理内容为主，也应该具备接近生产环境的形态。",
        author: "李墨言"
      },
      {
        date: "2026.03.18",
        title: "把活动热度转化为可检索的知识资产",
        excerpt: "公开内容模型应该让每一场活动都成为可复用的知识资产，而不是只在当天生效的一次性通知。",
        author: "陈以维"
      },
      {
        date: "2026.03.24",
        title: "一座城市主页在真正活起来之前需要什么",
        excerpt: "当城市页面能够把内容节奏、本地活动和明确的参与邀请连接起来时，它才真正具备生命力。",
        author: "朴乔安"
      }
    ]
  },
  join: {
    title: "加入 TGO 鲲鹏会",
    summary:
      "如果你认可这种长期、真实、同侪交流的方式，可以先查看加入条件，再提交申请。之后由工作人员继续审核与联系。",
    conditions: [
      "具备明确的技术管理职责，并愿意长期参与高质量交流。",
      "在技术战略、研发管理、架构演进或组织建设方向有真实实践。",
      "认可分享、互助、长期建设与同侪信任的社区价值。"
    ],
    process: ["在线申请", "工作人员联系", "进一步沟通", "审核确认"],
    fields: ["姓名", "电话", "微信号", "邮箱", "个人介绍", "申请信息"],
    footerNote: "申请提交后会进入后台审核流程。"
  },
  footer: {
    copy: "版权所有 © 2026 TGO 鲲鹏会",
    links: [
      { label: "返回方案总览", href: "../index.html" },
      { label: "回到顶部", href: "#top" }
    ]
  }
};
