const people = [
  {
    id: "sam",
    name: "Sam Rivera",
    initials: "SR",
    distance: 0.8,
    x: 63,
    y: 38,
    tags: ["hiking", "coffee", "photography"],
    bio: "Looking for weekend trail buddies and coffee shop study sessions.",
    external: { Instagram: "@sam.moves", Discord: "samtrail#1482" },
  },
  {
    id: "mina",
    name: "Mina Patel",
    initials: "MP",
    distance: 1.7,
    x: 36,
    y: 29,
    tags: ["pickleball", "music", "games"],
    bio: "Always up for doubles pickleball or a small indie concert.",
    external: { WeChat: "mina-nearby", Telegram: "@minapatel" },
  },
  {
    id: "leo",
    name: "Leo Chen",
    initials: "LC",
    distance: 3.2,
    x: 71,
    y: 64,
    tags: ["programming", "games", "photography"],
    bio: "Frontend builder, night market explorer, beginner photographer.",
    external: { Discord: "leocode#2026", Instagram: "@leo.builds" },
  },
  {
    id: "nora",
    name: "Nora Kim",
    initials: "NK",
    distance: 6.4,
    x: 29,
    y: 68,
    tags: ["crocheting", "coffee", "music"],
    bio: "Crochet circle organizer and playlist curator.",
    external: { Instagram: "@nora.threads", WhatsApp: "+1 949 555 0188" },
  },
  {
    id: "video",
    name: "Campus sunset post",
    initials: "▶",
    distance: 1.2,
    x: 54,
    y: 73,
    tags: ["hiking", "video"],
    bio: "Location-triggered video from Sam: sunset from the ridge.",
    external: {},
    isVideo: true,
  },
];

const currentUser = {
  name: "Alex Young",
  tags: ["hiking", "coffee", "programming", "games"],
};

const threads = [
  {
    id: "sam",
    title: "Sam Rivera",
    subtitle: "Shared: hiking, coffee",
    messages: [
      { from: "sam", text: "Want to try the Quail Hill loop this week?" },
      { from: "me", text: "Yes, I am free Thursday afternoon." },
    ],
  },
  {
    id: "group-hiking",
    title: "Hiking nearby",
    subtitle: "4 people within 3 mi",
    messages: [
      { from: "mina", text: "Anyone doing a short sunset route?" },
      { from: "me", text: "I can join after class." },
    ],
  },
];

const allTags = [...new Set(people.flatMap((person) => person.tags).concat(currentUser.tags))].sort();
let activeTag = "all";
let radius = 5;
let locationSharing = true;
let selectedThreadId = threads[0].id;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function init() {
  renderTagFilters();
  renderSelectedTags();
  renderDiscovery();
  renderThreads();
  renderMessages();
  bindEvents();
}

function bindEvents() {
  $$(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  $("#radiusRange").addEventListener("input", (event) => {
    radius = Number(event.target.value);
    $("#radiusOutput").textContent = `${radius} mi`;
    $("#visibilityState").textContent = locationSharing ? `Visible within ${radius} mi` : "Location hidden";
    renderDiscovery();
  });

  $("#locationToggle").addEventListener("change", (event) => {
    locationSharing = event.target.checked;
    $("#visibilityState").textContent = locationSharing ? `Visible within ${radius} mi` : "Location hidden";
    renderDiscovery();
  });

  $("#tagSearch").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    activeTag = query || "all";
    renderDiscovery();
  });

  $("#refreshMap").addEventListener("click", () => {
    jitterPeople();
    renderDiscovery();
    showToast("Nearby positions refreshed.");
  });

  $("#closeDrawer").addEventListener("click", () => $("#detailDrawer").classList.remove("open"));
  $("#messageForm").addEventListener("submit", sendMessage);
  $("#transferChat").addEventListener("click", transferChat);
  $("#newGroupChat").addEventListener("click", createGroupChat);
  $("#saveProfile").addEventListener("click", saveProfile);
  $("#addCustomTag").addEventListener("click", addCustomTag);
  $("#publishVideo").addEventListener("click", () => showToast("Location video published for nearby viewers."));
  $("#anonymousToggle").addEventListener("change", updateDisplayName);
}

function switchView(viewName) {
  $$(".nav-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`).classList.add("active");
}

function renderTagFilters() {
  const container = $("#tagFilters");
  container.innerHTML = "";
  ["all", ...allTags].forEach((tag) => {
    const button = document.createElement("button");
    button.className = `tag-pill ${tag === activeTag ? "active" : ""}`;
    button.textContent = tag === "all" ? "All interests" : tag;
    button.addEventListener("click", () => {
      activeTag = tag;
      $("#tagSearch").value = "";
      renderTagFilters();
      renderDiscovery();
    });
    container.appendChild(button);
  });
}

function getMatches() {
  if (!locationSharing) {
    return [];
  }

  return people.filter((person) => {
    const withinRadius = person.distance <= radius;
    const tagMatches = activeTag === "all" || person.tags.some((tag) => tag.includes(activeTag));
    return withinRadius && tagMatches;
  });
}

function renderDiscovery() {
  const matches = getMatches();
  renderPins(matches);
  renderPeople(matches);
  $("#matchCount").textContent = matches.length;
  $("#mapStatus").textContent = locationSharing
    ? matches.length
      ? `Showing ${matches.length} nearby match${matches.length === 1 ? "" : "es"} within ${radius} mi.`
      : "No nearby users found. Try increasing the radius or changing tags."
    : "Location sharing is off. Enable it to view nearby users.";
}

function renderPins(matches) {
  const pinLayer = $("#nearbyPins");
  pinLayer.innerHTML = "";
  $("#routeLine").classList.remove("visible");

  matches.forEach((person) => {
    const pin = document.createElement("button");
    pin.className = `person-pin ${person.isVideo ? "video" : ""}`;
    pin.style.left = `${person.x}%`;
    pin.style.top = `${person.y}%`;
    pin.textContent = person.initials;
    pin.title = person.name;
    pin.addEventListener("click", () => openProfile(person));
    pinLayer.appendChild(pin);
  });
}

function renderPeople(matches) {
  const list = $("#peopleList");
  list.innerHTML = "";

  matches.forEach((person) => {
    const card = document.createElement("article");
    card.className = "person-card";
    card.innerHTML = `
      <header>
        <div>
          <h4>${person.name}</h4>
          <small>${person.distance.toFixed(1)} mi away</small>
        </div>
      </header>
      <div class="selected-tags">
        ${person.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}
      </div>
      <div class="card-actions">
        <button class="secondary-button" data-action="profile">Profile</button>
        <button class="primary-button" data-action="route">Route</button>
      </div>
    `;
    card.querySelector('[data-action="profile"]').addEventListener("click", () => openProfile(person));
    card.querySelector('[data-action="route"]').addEventListener("click", () => requestRoute(person));
    list.appendChild(card);
  });
}

function openProfile(person) {
  const shared = person.tags.filter((tag) => currentUser.tags.includes(tag));
  $("#drawerContent").innerHTML = `
    <section class="drawer-profile">
      <div class="avatar">${person.initials}</div>
      <div>
        <p class="eyebrow">${person.distance.toFixed(1)} mi away</p>
        <h2>${person.name}</h2>
        <p>${person.bio}</p>
      </div>
      <div>
        <strong>Shared interests</strong>
        <div class="selected-tags">
          ${(shared.length ? shared : ["No shared tags yet"]).map((tag) => `<span class="tag-pill active">${tag}</span>`).join("")}
        </div>
      </div>
      <div>
        <strong>External chat</strong>
        <p>${formatExternal(person.external)}</p>
      </div>
      <div class="card-actions">
        <button class="primary-button" id="drawerChat">Message</button>
        <button class="secondary-button" id="drawerBlock">Block</button>
      </div>
    </section>
  `;
  $("#drawerChat").addEventListener("click", () => startChat(person));
  $("#drawerBlock").addEventListener("click", () => showToast(`${person.name} has been blocked.`));
  $("#detailDrawer").classList.add("open");
}

function formatExternal(external) {
  const entries = Object.entries(external);
  return entries.length ? entries.map(([app, handle]) => `${app}: ${handle}`).join(" · ") : "No external account linked.";
}

function requestRoute(person) {
  if (!locationSharing) {
    showToast("Location unavailable for routing.");
    return;
  }

  const route = $("#routeLine");
  const map = $(".map-surface").getBoundingClientRect();
  const startX = map.width * 0.5;
  const startY = map.height * 0.5;
  const endX = map.width * (person.x / 100);
  const endY = map.height * (person.y / 100);
  const length = Math.hypot(endX - startX, endY - startY);
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

  route.style.left = `${startX}px`;
  route.style.top = `${startY}px`;
  route.style.width = `${length}px`;
  route.style.transform = `rotate(${angle}deg)`;
  route.classList.add("visible");
  showToast(`${person.name} accepted the route request.`);
}

function jitterPeople() {
  people.forEach((person) => {
    person.x = clamp(person.x + randomBetween(-3, 3), 18, 82);
    person.y = clamp(person.y + randomBetween(-3, 3), 18, 82);
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function renderThreads() {
  const list = $("#threadList");
  list.innerHTML = "";
  threads.forEach((thread) => {
    const button = document.createElement("button");
    button.className = `thread-card ${thread.id === selectedThreadId ? "active" : ""}`;
    button.innerHTML = `<strong>${thread.title}</strong><span>${thread.messages.length}</span>`;
    button.addEventListener("click", () => {
      selectedThreadId = thread.id;
      renderThreads();
      renderMessages();
    });
    list.appendChild(button);
  });
}

function renderMessages() {
  const thread = threads.find((item) => item.id === selectedThreadId);
  $("#chatTitle").textContent = thread.title;
  $("#chatSubtitle").textContent = thread.subtitle;
  $("#messages").innerHTML = thread.messages
    .map((message) => `<div class="message-bubble ${message.from === "me" ? "me" : ""}">${message.text}</div>`)
    .join("");
}

function sendMessage(event) {
  event.preventDefault();
  const input = $("#messageInput");
  const text = input.value.trim();
  if (!text) {
    showToast("Message cannot be empty.");
    return;
  }

  const thread = threads.find((item) => item.id === selectedThreadId);
  thread.messages.push({ from: "me", text });
  input.value = "";
  renderThreads();
  renderMessages();
}

function transferChat() {
  const thread = threads.find((item) => item.id === selectedThreadId);
  showToast(`Shared external contact info in ${thread.title}.`);
}

function createGroupChat() {
  const exists = threads.some((thread) => thread.id === "group-programming");
  if (!exists) {
    threads.push({
      id: "group-programming",
      title: "Programming nearby",
      subtitle: "People sharing programming",
      messages: [{ from: "leo", text: "Anyone building a project this weekend?" }],
    });
  }
  selectedThreadId = "group-programming";
  renderThreads();
  renderMessages();
  showToast("Group chat created.");
}

function renderSelectedTags() {
  $("#selectedTags").innerHTML = currentUser.tags
    .map((tag) => `<button class="tag-pill active" data-tag="${tag}">${tag} ×</button>`)
    .join("");

  $$("#selectedTags .tag-pill").forEach((button) => {
    button.addEventListener("click", () => {
      currentUser.tags = currentUser.tags.filter((tag) => tag !== button.dataset.tag);
      renderSelectedTags();
      renderDiscovery();
    });
  });
  $("#tagLimit").textContent = `${currentUser.tags.length} / 8`;
}

function addCustomTag(event) {
  event.preventDefault();
  const input = $("#customTagInput");
  const tag = input.value.trim().toLowerCase();
  if (!tag) {
    showToast("Tag name cannot be empty.");
    return;
  }
  if (currentUser.tags.includes(tag)) {
    showToast("Tag already added.");
    return;
  }
  if (currentUser.tags.length >= 8) {
    showToast("Max tags exceeded.");
    return;
  }
  currentUser.tags.push(tag);
  input.value = "";
  renderSelectedTags();
  renderDiscovery();
  showToast(`${tag} added to your profile.`);
}

function saveProfile() {
  const name = $("#displayName").value.trim();
  if (!name) {
    showToast("Display name cannot be empty.");
    return;
  }
  currentUser.name = name;
  updateDisplayName();
  showToast("Profile saved.");
}

function updateDisplayName() {
  const anonymous = $("#anonymousToggle").checked;
  $("#currentUserName").textContent = anonymous ? "Anonymous" : currentUser.name;
}

function startChat(person) {
  const existing = threads.find((thread) => thread.id === person.id);
  if (!existing) {
    threads.push({
      id: person.id,
      title: person.name,
      subtitle: `Shared: ${person.tags.filter((tag) => currentUser.tags.includes(tag)).join(", ") || "new match"}`,
      messages: [{ from: person.id, text: "Hi! Nice to Kinnect with you." }],
    });
  }
  selectedThreadId = person.id;
  switchView("chat");
  renderThreads();
  renderMessages();
  $("#detailDrawer").classList.remove("open");
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

init();
