import { demoContent, demoThemes } from "./content.js";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderList = (items, renderItem) => items.map(renderItem).join("");

const renderApp = () => {
  const root = document.querySelector("#app");
  const themeId = document.body.dataset.theme;
  const theme = demoThemes[themeId];

  if (!(root instanceof HTMLElement) || !theme) {
    return;
  }

  document.title = `${theme.chineseName} | TGO 风格 Demo`;

  root.innerHTML = `
    <div class="page-wrap">
      <div class="demo-modebar">
        <div class="shell demo-modebar-inner">
          <div>
            <p class="mode-label">${escapeHtml(theme.chineseName)}</p>
            <p class="mode-meta">${escapeHtml(theme.englishName)} · ${escapeHtml(theme.reference)}</p>
          </div>
          <p class="mode-note">${escapeHtml(theme.recommendation)}</p>
        </div>
      </div>

      <header class="demo-header" id="top">
        <div class="shell header-inner">
          <a class="brand" href="../index.html">
            <span class="brand-mark">TGO</span>
            <span class="brand-copy">
              <strong>TGO 鲲鹏会</strong>
              <small>${escapeHtml(theme.summary)}</small>
            </span>
          </a>

          <nav class="nav" aria-label="演示页面导航">
            ${renderList(
              demoContent.nav,
              (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
            )}
          </nav>
        </div>
      </header>

      <main>
        <section class="section hero-section">
          <div class="shell">
            <div class="hero-frame surface-card">
              <div class="hero-copy">
                <p class="eyebrow">${escapeHtml(demoContent.hero.eyebrow)}</p>
                <h1>${escapeHtml(demoContent.hero.title)}</h1>
                <p class="hero-summary">${escapeHtml(demoContent.hero.summary)}</p>
                <p class="hero-quote">“${escapeHtml(demoContent.hero.quote)}”</p>

                <div class="button-row">
                  ${renderList(
                    demoContent.hero.actions,
                    (action, index) => `<a class="button ${index === 0 ? "button-primary" : "button-secondary"}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
                  )}
                </div>
              </div>

              <div class="hero-visual">
                <figure class="hero-image hero-image-primary">
                  <img src="${escapeHtml(demoContent.hero.imagery.primary)}" alt="TGO 活动现场" loading="eager" />
                </figure>

                <aside class="hero-note surface-subcard">
                  <p class="section-kicker">社区节奏</p>
                  <ul class="hero-note-list">
                    ${renderList(demoContent.hero.notes, (item) => `<li>${escapeHtml(item)}</li>`)}
                  </ul>
                </aside>

                <figure class="hero-image hero-image-secondary">
                  <img src="${escapeHtml(demoContent.hero.imagery.secondary)}" alt="TGO 私密小组活动" loading="eager" />
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section class="section" id="intro">
          <div class="shell intro-grid">
            <div class="intro-copy">
              <p class="section-kicker">组织介绍</p>
              <h2>${escapeHtml(demoContent.intro.title)}</h2>
              <p>${escapeHtml(demoContent.intro.summary)}</p>
              <div class="tag-row">
                ${renderList(demoContent.intro.tags, (tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)}
              </div>
            </div>

            <div class="experience-grid">
              ${renderList(
                demoContent.intro.experiences,
                (item) => `
                  <article class="surface-card experience-card">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="eager" />
                    <div class="experience-copy">
                      <h3>${escapeHtml(item.title)}</h3>
                      <p>${escapeHtml(item.body)}</p>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="section" id="board">
          <div class="shell">
            <div class="section-head">
              <div>
                <p class="section-kicker">分会董事会</p>
                <h2>${escapeHtml(demoContent.board.title)}</h2>
              </div>
            </div>
            <div class="board-grid">
              ${renderList(
                demoContent.board.items,
                (item) => `
                  <article class="surface-card board-card">
                    <div class="board-card-top">
                      <img class="avatar" src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.name)}" loading="eager" />
                      <div>
                        <span class="board-branch">${escapeHtml(item.branch)}</span>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p class="board-role">${escapeHtml(item.role)}</p>
                      </div>
                    </div>
                    <p class="board-company">${escapeHtml(item.company)}</p>
                    <p class="board-title">${escapeHtml(item.title)}</p>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="section" id="members">
          <div class="shell">
            <div class="section-head">
              <div>
                <p class="section-kicker">成员推荐</p>
                <h2>${escapeHtml(demoContent.testimonials.title)}</h2>
              </div>
            </div>
            <div class="testimonial-grid">
              ${renderList(
                demoContent.testimonials.items,
                (item) => `
                  <article class="surface-card testimonial-card">
                    <p class="testimonial-quote">“${escapeHtml(item.quote)}”</p>
                    <div class="testimonial-meta">
                      <span class="initial-badge">${escapeHtml(item.name.slice(0, 1))}</span>
                      <div>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${escapeHtml(item.company)} · ${escapeHtml(item.title)}</p>
                        <span>${escapeHtml(item.branch)}</span>
                      </div>
                    </div>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="section" id="events">
          <div class="shell">
            <div class="section-head">
              <div>
                <p class="section-kicker">活动</p>
                <h2>${escapeHtml(demoContent.events.title)}</h2>
              </div>
            </div>
            <div class="collection-grid collection-grid-events">
              ${renderList(
                demoContent.events.items,
                (item) => `
                  <article class="surface-card collection-card event-card">
                    <img class="collection-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="eager" />
                    <div class="collection-copy">
                      <div class="meta-row">
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

        <section class="section" id="articles">
          <div class="shell">
            <div class="section-head">
              <div>
                <p class="section-kicker">文章</p>
                <h2>${escapeHtml(demoContent.articles.title)}</h2>
              </div>
            </div>
            <div class="collection-grid collection-grid-articles">
              ${renderList(
                demoContent.articles.items,
                (item) => `
                  <article class="surface-card article-card">
                    <div class="meta-row">
                      <span>${escapeHtml(item.date)}</span>
                      <span>${escapeHtml(item.author)}</span>
                    </div>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.excerpt)}</p>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section class="section" id="join">
          <div class="shell">
            <div class="join-layout surface-card">
              <div class="join-copy">
                <p class="section-kicker">加入申请</p>
                <h2>${escapeHtml(demoContent.join.title)}</h2>
                <p class="join-summary">${escapeHtml(demoContent.join.summary)}</p>

                <div class="join-info-grid">
                  <article class="surface-subcard mini-card">
                    <h3>加入条件</h3>
                    <ul>
                      ${renderList(demoContent.join.conditions, (item) => `<li>${escapeHtml(item)}</li>`)}
                    </ul>
                  </article>

                  <article class="surface-subcard mini-card">
                    <h3>加入流程</h3>
                    <ol>
                      ${renderList(demoContent.join.process, (item) => `<li>${escapeHtml(item)}</li>`)}
                    </ol>
                  </article>
                </div>
              </div>

              <form class="join-form surface-subcard">
                <div class="form-grid">
                  ${renderList(
                    demoContent.join.fields,
                    (field, index) => `
                      <label class="field ${index >= 4 ? "field-full" : ""}">
                        <span>${escapeHtml(field)}</span>
                        ${index >= 4 ? '<textarea rows="5" placeholder=""></textarea>' : '<input type="text" placeholder="" />'}
                      </label>
                    `
                  )}
                </div>
                <div class="form-actions">
                  <button class="button button-primary" type="button">提交申请</button>
                  <p>${escapeHtml(demoContent.join.footerNote)}</p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer class="demo-footer">
        <div class="shell footer-inner">
          <p>${escapeHtml(demoContent.footer.copy)}</p>
          <nav aria-label="演示页底部导航">
            ${renderList(
              demoContent.footer.links,
              (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
            )}
          </nav>
        </div>
      </footer>
    </div>
  `;
};

renderApp();
