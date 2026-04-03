import { demoContent } from "./content.js";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderList = (items, renderItem) => items.map(renderItem).join("");

const introSignals = [
  {
    title: "组织形式",
    body: "采用学员共建、分会运营的方式，由各地董事会成员与工作人员共同维护长期社区节奏。"
  },
  {
    title: "覆盖人群",
    body: "主要面向 CTO、技术 VP、研发负责人、架构负责人和技术创业者等科技领导者。"
  },
  {
    title: "活动方式",
    body: "围绕私密小组、公开学习、企业参访、专题研讨与峰会交流等形式持续发生。"
  }
];

const page = document.querySelector("#app");

if (page instanceof HTMLElement) {
  document.title = "正式候选版 | TGO 风格 Demo";

  page.innerHTML = `
    <div class="official-page">
      <header class="official-header" id="top">
        <div class="official-shell official-header-inner">
          <a class="official-brand" href="../index.html">
            <span class="official-brand-mark">TGO</span>
            <span class="official-brand-copy">
              <strong>TGO 鲲鹏会</strong>
              <small>科技领导者社区正式候选稿</small>
            </span>
          </a>

          <nav class="official-nav" aria-label="候选稿导航">
            ${renderList(
              demoContent.nav,
              (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
            )}
          </nav>
        </div>
      </header>

      <main>
        <section class="official-hero">
          <div class="official-shell official-hero-grid">
            <div class="official-hero-copy">
              <p class="official-kicker">TGO 鲲鹏会</p>
              <h1>科技领导者的长期学习与交流社区</h1>
              <p class="official-summary">${escapeHtml(demoContent.hero.summary)}</p>
              <p class="official-support">围绕城市分会、真实成员、公开活动与长期内容沉淀，建立一个持续运转、值得信任、可长期参与的组织型社区。</p>

              <div class="official-actions">
                <a class="official-button official-button-primary" href="#events">浏览近期活动</a>
                <a class="official-button official-button-secondary" href="#join">查看加入方式</a>
              </div>
            </div>

            <div class="official-hero-visual">
              <figure class="official-hero-image">
                <img src="${escapeHtml(demoContent.hero.imagery.primary)}" alt="TGO 活动现场" loading="eager" />
              </figure>
              <div class="official-hero-note">
                <p>这是一个强调长期关系、真实经验与同侪反馈的社区，而不是一次性的活动集合页。</p>
              </div>
            </div>
          </div>
        </section>

        <section class="official-section official-intro" id="intro">
          <div class="official-shell">
            <div class="official-section-head">
              <div>
                <p class="official-kicker">组织介绍</p>
                <h2>以分会承接长期连接，以活动与内容维持公共节奏</h2>
              </div>
            </div>

            <div class="official-intro-grid">
              <article class="official-intro-copy">
                <p>${escapeHtml(demoContent.intro.summary)}</p>
                <p>我们希望访客进入首页后，首先感受到这是一家真实在运转的组织：有明确的人群边界，有清晰的城市分会结构，也有持续发生的公开活动与内容沉淀。</p>
              </article>

              <div class="official-signal-grid">
                ${renderList(
                  introSignals,
                  (item) => `
                    <article class="official-signal-card">
                      <h3>${escapeHtml(item.title)}</h3>
                      <p>${escapeHtml(item.body)}</p>
                    </article>
                  `
                )}
              </div>
            </div>
          </div>
        </section>

        <section class="official-section" id="board">
          <div class="official-shell">
            <div class="official-section-head">
              <div>
                <p class="official-kicker">分会董事会</p>
                <h2>各地分会由公开可见的董事会成员共同维护</h2>
              </div>
            </div>

            <div class="official-board-grid">
              ${renderList(
                demoContent.board.items,
                (item) => `
                  <article class="official-board-card">
                    <div class="official-board-meta">
                      <span>${escapeHtml(item.branch)}</span>
                      <span>${escapeHtml(item.role)}</span>
                    </div>
                    <div class="official-board-profile">
                      <img src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.name)}" loading="eager" />
                      <div>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p class="official-board-company">${escapeHtml(item.company)}</p>
                        <p class="official-board-title">${escapeHtml(item.title)}</p>
                      </div>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="official-section" id="members">
          <div class="official-shell">
            <div class="official-section-head official-section-head-split">
              <div>
                <p class="official-kicker">成员推荐</p>
                <h2>让真实成员先发声，而不是先堆砌说明文字</h2>
              </div>
              <a class="official-text-link" href="#join">了解加入路径</a>
            </div>

            <div class="official-testimonial-grid">
              ${renderList(
                demoContent.testimonials.items,
                (item) => `
                  <article class="official-testimonial-card">
                    <p class="official-testimonial-quote">“${escapeHtml(item.quote)}”</p>
                    <div class="official-testimonial-meta">
                      <strong>${escapeHtml(item.name)}</strong>
                      <span>${escapeHtml(item.company)} · ${escapeHtml(item.title)}</span>
                      <small>${escapeHtml(item.branch)}</small>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="official-section" id="events">
          <div class="official-shell">
            <div class="official-section-head official-section-head-split">
              <div>
                <p class="official-kicker">活动</p>
                <h2>近期公开活动</h2>
              </div>
              <a class="official-text-link" href="#articles">继续查看文章</a>
            </div>

            <div class="official-event-grid">
              ${renderList(
                demoContent.events.items,
                (item) => `
                  <article class="official-event-card">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="eager" />
                    <div class="official-event-copy">
                      <div class="official-event-meta">
                        <span>${escapeHtml(item.city)}</span>
                        <span>${escapeHtml(item.date)}</span>
                      </div>
                      <h3>${escapeHtml(item.title)}</h3>
                      <p>${escapeHtml(item.summary)}</p>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="official-section" id="articles">
          <div class="official-shell">
            <div class="official-section-head">
              <div>
                <p class="official-kicker">文章</p>
                <h2>技术管理与组织实践沉淀</h2>
              </div>
            </div>

            <div class="official-article-list">
              ${renderList(
                demoContent.articles.items,
                (item) => `
                  <article class="official-article-item">
                    <div class="official-article-meta">
                      <span>${escapeHtml(item.date)}</span>
                      <span>${escapeHtml(item.author)}</span>
                    </div>
                    <div class="official-article-copy">
                      <h3>${escapeHtml(item.title)}</h3>
                      <p>${escapeHtml(item.excerpt)}</p>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="official-section official-join-section" id="join">
          <div class="official-shell official-join-grid">
            <div class="official-join-copy">
              <p class="official-kicker">加入申请</p>
              <h2>适合愿意长期参与社区交流的技术领导者</h2>
              <p>${escapeHtml(demoContent.join.summary)}</p>

              <div class="official-join-panels">
                <article class="official-join-panel">
                  <h3>加入条件</h3>
                  <ul>
                    ${renderList(demoContent.join.conditions, (item) => `<li>${escapeHtml(item)}</li>`)}
                  </ul>
                </article>

                <article class="official-join-panel">
                  <h3>加入流程</h3>
                  <ol>
                    ${renderList(demoContent.join.process, (item) => `<li>${escapeHtml(item)}</li>`)}
                  </ol>
                </article>
              </div>
            </div>

            <form class="official-form" aria-label="加入申请表候选稿">
              <div class="official-form-grid">
                ${renderList(
                  demoContent.join.fields,
                  (field, index) => `
                    <label class="official-field ${index >= 4 ? "official-field-full" : ""}">
                      <span>${escapeHtml(field)}</span>
                      ${index >= 4 ? '<textarea rows="5"></textarea>' : '<input type="text" />'}
                    </label>
                  `
                )}
              </div>

              <div class="official-form-actions">
                <button class="official-button official-button-primary" type="button">提交申请</button>
                <p>${escapeHtml(demoContent.join.footerNote)}</p>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer class="official-footer">
        <div class="official-shell official-footer-inner">
          <p>版权所有 © 2026 TGO 鲲鹏会</p>
          <nav aria-label="候选稿页脚导航">
            <a href="../index.html">返回方案总览</a>
            <a href="#top">回到顶部</a>
          </nav>
        </div>
      </footer>
    </div>
  `;
}
