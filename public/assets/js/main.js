const KST_NOW = new Date();

const formatDate = (value) => {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(new Date(value));
};

const isNoticeActive = (notice) => {
  const now = KST_NOW.getTime();
  return new Date(notice.postingStartsAt).getTime() <= now && now <= new Date(notice.postingEndsAt).getTime();
};

const statusLabel = (notice) => isNoticeActive(notice) ? "게시중" : "게시종료";

const noticeCard = (notice) => {
  const ended = !isNoticeActive(notice);
  return `
    <article class="notice-card">
      <div class="notice-card-meta">
        <span class="category-badge">${notice.category}</span>
        <span class="status-badge ${ended ? "ended" : ""}">${statusLabel(notice)}</span>
        <time datetime="${notice.publishedAt}">${formatDate(notice.publishedAt)}</time>
      </div>
      <h3><a href="${notice.url}">${notice.title}</a></h3>
      <p>${notice.summary}</p>
      <div class="notice-card-meta">
        <a class="text-link" href="${notice.url}">자세히 보기</a>
      </div>
    </article>
  `;
};

const loadNotices = async () => {
  const targets = document.querySelectorAll("[data-home-notices], [data-feature-notices], [data-notice-list]");
  const statusTargets = document.querySelectorAll("[data-status-for]");
  if (!targets.length && !statusTargets.length) return;

  const response = await fetch("/data/notices.json", { cache: "no-store" });
  const notices = await response.json();
  const sorted = notices.slice().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  document.querySelectorAll("[data-home-notices]").forEach((container) => {
    container.innerHTML = sorted.slice(0, 2).map((notice) => `
      <a class="notice-mini" href="${notice.url}">
        <span class="status-badge ${isNoticeActive(notice) ? "" : "ended"}">${statusLabel(notice)}</span>
        <time datetime="${notice.publishedAt}">${formatDate(notice.publishedAt)}</time>
        <span>${notice.title}</span>
      </a>
    `).join("");
  });

  document.querySelectorAll("[data-feature-notices]").forEach((container) => {
    const activeFirst = sorted.slice().sort((a, b) => Number(isNoticeActive(b)) - Number(isNoticeActive(a)));
    container.innerHTML = activeFirst.slice(0, 3).map(noticeCard).join("");
  });

  document.querySelectorAll("[data-notice-list]").forEach((container) => {
    const render = (filter = "all") => {
      const filtered = sorted.filter((notice) => {
        if (filter === "all") return true;
        if (filter === "active") return isNoticeActive(notice);
        if (filter === "ended") return !isNoticeActive(notice);
        return notice.category === filter;
      });
      container.innerHTML = filtered.length ? filtered.map(noticeCard).join("") : "<p>표시할 공고가 없습니다.</p>";
    };
    render();

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        render(button.dataset.filter);
      });
    });
  });

  statusTargets.forEach((target) => {
    const notice = sorted.find((item) => item.id === target.dataset.statusFor);
    if (!notice) return;
    target.textContent = statusLabel(notice);
    target.classList.toggle("ended", !isNoticeActive(notice));
  });

};

const setupHeader = () => {
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-menu]");
  const button = document.querySelector("[data-menu-button]");
  if (!header) return;

  const syncHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 16);
  };
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if (button && menu) {
    button.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      });
    });
  }
};

const setupContactForm = () => {
  const form = document.querySelector("[data-contact-form]");
  const status = document.querySelector("[data-form-status]");
  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();

    if (!phone && !email) {
      status.textContent = "연락처 또는 이메일 중 하나를 입력해주세요.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton?.setAttribute("disabled", "true");
    status.textContent = "상담 신청을 접수하는 중입니다...";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.get("type"),
          name: data.get("name"),
          phone,
          email,
          region: data.get("region"),
          message: data.get("message"),
          consent: data.get("consent") === "on",
          company_website: data.get("company_website")
        })
      });

      if (!response.ok) throw new Error("request_failed");
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "request_failed");

      status.textContent = "상담 신청이 접수되었습니다. 빠르게 연락드리겠습니다.";
      form.reset();
    } catch {
      status.textContent = "전송에 실패했습니다. 잠시 후 다시 시도하시거나 이메일로 문의해주세요.";
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
};

setupHeader();
setupContactForm();
loadNotices().catch((error) => {
  console.error("Failed to load notices", error);
});
