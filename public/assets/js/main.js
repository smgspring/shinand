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

  const hasHero = document.body.classList.contains("has-hero");
  const syncHeader = () => {
    const open = menu?.classList.contains("open");
    header.classList.toggle("is-solid", !hasHero || window.scrollY > 24 || Boolean(open));
  };
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if (button && menu) {
    const close = () => {
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      syncHeader();
    };
    button.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      syncHeader();
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }
};

const setupSteps = () => {
  const tablist = document.querySelector("[data-steps]");
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  let current = 0;
  let timer;

  const select = (index, focus = false) => {
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const selected = i === current;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tabs[current].focus();
  };

  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setInterval(() => select(current + 1), 5000);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      select(i);
      stop();
    });
  });
  tablist.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    stop();
    select(current + keys[event.key], true);
  });

  const section = tablist.closest("section");
  if ("IntersectionObserver" in window && section) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(section);
  }
};

// 동선 약도: 현재 동선 / 제안 배치 전환
const setupFlow = () => {
  const figure = document.querySelector("[data-flow]");
  if (!figure) return;
  const caption = figure.querySelector("[data-flow-caption]");
  const captions = {
    now: "주문대와 바가 6m 떨어져 있어, 한 번 오갈 때마다 손 씻기를 포함해 평균 31초가 걸립니다.",
    plan: "주문 담당을 주문대에 고정하고 픽업대로 넘기면, 같은 2명으로 처리량이 늘어납니다."
  };
  figure.querySelectorAll("[data-flow-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.flowView;
      figure.dataset.state = view;
      figure.querySelectorAll("[data-flow-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      if (caption) caption.textContent = captions[view];
    });
  });
};

const PLACES = [
  { word: "병원카페", row: 0, col: 2, label: "병원 카페", note: "외래 시간대와 보호자 체류 시간을 기준으로 메뉴와 인력을 짭니다." },
  { word: "학교", row: 0, col: 10, label: "학교", note: "학사 일정에 맞춘 운영 시간과 가격대를 설계합니다." },
  { word: "오피스", row: 1, col: 0, label: "오피스", note: "출근·점심 피크에 맞춘 테이크아웃 동선이 핵심입니다." },
  { word: "역세권", row: 1, col: 8, label: "역세권", note: "유동 인구보다 실제 체류와 회전율을 계산합니다." },
  { word: "대학가", row: 2, col: 4, label: "대학가", note: "방학 비수기까지 고려한 연간 매출 구조를 봅니다." },
  { word: "리조트", row: 3, col: 1, label: "리조트", note: "성수기와 비수기 편차를 운영 인력 계획에 반영합니다." },
  { word: "주택가", row: 3, col: 9, label: "주택가", note: "단골 비중과 주말 수요를 기준으로 좌석과 메뉴를 설계합니다." },
  { word: "사내카페", row: 4, col: 6, label: "사내 카페", note: "복지 운영 기준과 위탁 운영 범위를 함께 정리합니다." },
  { word: "관공서", row: 5, col: 2, label: "관공서", note: "입찰·계약 조건과 영업 시간 제한을 먼저 확인합니다." }
];

const setupWordGrid = () => {
  const grid = document.querySelector("[data-word-grid]");
  const note = document.querySelector("[data-word-note]");
  if (!grid || !note) return;

  const COLS = 14;
  const ROWS = 6;
  const filler = "커피라떼원두잔컵빈향우유시럽얼음메뉴단골좌석테라스오븐빵쿠키바닐라";
  let seed = 7;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const cells = Array.from({ length: ROWS * COLS }, () => filler[Math.floor(random() * filler.length)]);
  const owners = new Array(ROWS * COLS).fill(-1);
  PLACES.forEach((place, index) => {
    [...place.word].forEach((char, k) => {
      const i = place.row * COLS + place.col + k;
      cells[i] = char;
      owners[i] = index;
    });
  });

  grid.innerHTML = cells.map((char, i) => `<span${owners[i] >= 0 ? ' class="is-word"' : ""}>${char}</span>`).join("");
  const spans = [...grid.children];

  let active = 0;
  const show = (index) => {
    active = index % PLACES.length;
    const place = PLACES[active];
    spans.forEach((span, i) => {
      const hit = owners[i] === active;
      span.classList.toggle("is-hit", hit);
      span.classList.toggle("is-first", hit && owners[i - 1] !== active);
      span.classList.toggle("is-last", hit && owners[i + 1] !== active);
    });
    note.innerHTML = `<b>${place.label}</b>${place.note}`;
  };
  show(0);

  spans.forEach((span, i) => {
    span.addEventListener("mouseenter", () => {
      if (owners[i] >= 0) show(owners[i]);
    });
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let timer;
  const section = grid.closest("section");
  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => show(active + 1), 2600);
  };
  if ("IntersectionObserver" in window && section) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : clearInterval(timer))).observe(section);
  }
  grid.addEventListener("mouseenter", () => clearInterval(timer));
  grid.addEventListener("mouseleave", start);
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
setupSteps();
setupFlow();
setupWordGrid();
setupContactForm();
loadNotices().catch((error) => {
  console.error("Failed to load notices", error);
});
