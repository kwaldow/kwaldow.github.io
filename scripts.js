async function getJsonData(url) {
  const jsonArticles = await fetch(url);
  const data = await jsonArticles.json();
  return data;
}
async function getMarkdownData(url) {
  const markdownData = await fetch(url);
  const mdText = await markdownData.text();
  return mdText;
}

async function getHTMLData(url) {
  const htmlData = await fetch(url);
  const htmlText = await htmlData.text();
  return htmlText;
}

async function getBibtexData(url) {
  const bibtexData = await fetch(url);
  const bibtexText = await bibtexData.text();
  return bibtexText;
}

let buildPublicationArticles = [];
let currentPublicationType = "all";
let currentAuthorFilter = "all";

// Publication Group Configuration
const publicationGroups = {
  full: ["full", "journal", "workshop"],
  short: ["poster", "demo", "preprint"],
  // Add new groups here globally
};

async function buildPublications(type, authorFilter = "all") {
  const article_template = document.getElementById("article-template");
  const data = await getJsonData("files/articles.json");

  currentPublicationType = type;
  currentAuthorFilter = authorFilter;

  for (let i = 0; i < buildPublicationArticles.length; i++) {
    buildPublicationArticles[i].remove();
  }
  buildPublicationArticles = [];

  for (let i = 0; i < data.articles.length; i++) {
    const article = data.articles[i];
    const id = article.id;

    // Filter logic based on groups
    if (type !== "all") {
      const allowedTags = publicationGroups[type] || [type];
      const hasAllowedTag = article.tags.some((tag) =>
        allowedTags.includes(tag),
      );

      if (!hasAllowedTag) {
        continue;
      }
    }

    //Hacky Solution to unify display tags (optional, can be refined)
    // Here we can also map tags to display names if needed
    /*
    let temp_tag = article.tags[0];
    if(article.tags[0] == "journal"){
      article.tags[0] = "full";
    }
    */

    // Filter by first author
    if (authorFilter === "first") {
      const firstAuthor = article.authors[0]?.trim();
      if (firstAuthor !== "Kristoffer Waldow") {
        continue; // Skip if not first author
      }
    }

    let newArticle = article_template.cloneNode(true);
    // document.getElementById("publications").appendChild(newArticle);
    document.getElementById("publications-list").appendChild(newArticle);
    newArticle.classList.remove("hidden");

    newArticle.id = article.id;

    newArticle.querySelector(".article-year").textContent = article.year;
    newArticle.querySelector(".article-title").textContent = article.title;

    newArticle.querySelector(".article-authors").innerHTML = article.authors
      .map(
        (author) =>
          `<span>${
            author.trim() == "Kristoffer Waldow"
              ? "<b>Kristoffer Waldow</b>"
              : author.trim()
          }</span>`,
      )
      .join("");
    newArticle.querySelector(".article-publication").textContent =
      article.published;

    newArticle.classList.add(article.tags[0]);

    newArticle.querySelector(".tags").innerHTML = article.tags
      .map((tag) => `<span class=${tag}></span>`)
      .join("");

    const abstractID = "abstract_" + id;
    newArticle.querySelector("#abstract-link").href = "#" + abstractID;
    newArticle
      .querySelector("#abstract-link")
      .setAttribute("aria-controls", abstractID);

    newArticle.querySelector("#abstract-data-toggle").id = abstractID;
    newArticle.querySelector(`#${abstractID} .abstract-content`).textContent =
      article.abstract;

    let linkContainer = newArticle.querySelector("#additional-links");
    article.links.map((item) => {
      let newLink = document.createElement("a");
      newLink.href = item.link;
      newLink.innerHTML =
        "" +
        item.name +
        " <i class='fa-solid fa-arrow-up-right-from-square'></i>";
      newLink.target = "_blank";
      linkContainer.appendChild(newLink);
    });

    let img = newArticle.querySelector("img");
    img.src = article.image;

    if (article.award) {
      newArticle.querySelector(".award").classList.remove("hidden");
    }

    if (article.bibtex) {
      let bibtexData = await getBibtexData(`files/bib/${article.id}.bib`);
      newArticle.querySelector(".citeBtn").classList.remove("hidden");
      newArticle.querySelector(".citeBtn").addEventListener("click", () => {
        openCiteBox(bibtexData);
      });
    }

    buildPublicationArticles.push(newArticle);
  }

  // Generate Stats after building articles
  if (type === "all" && authorFilter === "all") {
    document.getElementById("publication-stats").classList.remove("hidden");
    generateStats(data.articles);
  } else {
    document.getElementById("publication-stats").classList.add("hidden");
  }

  return buildPublicationArticles;
}

function generateStats(articles) {
  // 1. Calculate Type Stats
  const typeCounts = {
    Conference: 0,
    Journal: 0,
    Poster: 0,
    Demo: 0,
    Workshop: 0,
    Preprint: 0,
    Other: 0,
  };

  // 2. Collect Keywords
  const keywordsCount = {};

  articles.forEach((article) => {
    // Count Types based on tags
    let typeFound = false;
    article.tags.forEach((tag) => {
      const lowerTag = tag.toLowerCase();
      // Only count predefined types for the chart
      if (lowerTag === "full" || lowerTag === "full paper") {
        typeCounts["Conference"]++;
        typeFound = true;
      } else if (lowerTag === "journal") {
        typeCounts["Journal"]++;
        typeFound = true;
      } else if (lowerTag === "poster") {
        typeCounts["Poster"]++;
        typeFound = true;
      } else if (lowerTag === "demo") {
        typeCounts["Demo"]++;
        typeFound = true;
      } else if (lowerTag === "workshop") {
        typeCounts["Workshop"]++;
        typeFound = true;
      } else if (lowerTag === "preprint") {
        typeCounts["Preprint"]++;
        typeFound = true;
      }
    });

    if (!typeFound) typeCounts["Other"]++;

    // Count Keywords
    // If article has "keywords" field, use it. Otherwise fall back to tags but filter out the "type" tags used above.
    const sourceKeywords = article.keywords || article.tags;

    if (sourceKeywords) {
      sourceKeywords.forEach((keyword) => {
        // Normalize keyword
        const normKeyword = keyword.trim();
        const lowerKeyword = normKeyword.toLowerCase();

        // Filter out structural tags if we are falling back to tags
        if (!article.keywords) {
          const structuralTags = [
            "full",
            "journal",
            "poster",
            "demo",
            "workshop",
            "preprint",
            "short",
            "long",
          ];
          if (structuralTags.includes(lowerKeyword)) return;
        }

        if (!keywordsCount[normKeyword]) keywordsCount[normKeyword] = 0;
        keywordsCount[normKeyword]++;
      });
    }
  });

  // Render Bar Chart
  const barChartContainer = document.getElementById("stats-bar-chart");
  barChartContainer.innerHTML = "";

  const values = Object.values(typeCounts);
  const maxCount = Math.max(...values);

  Object.entries(typeCounts).forEach(([label, count]) => {
    // Only show categories that have at least one paper
    if (count === 0) return;

    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

    const row = document.createElement("div");
    row.className = "stat-row";

    // The bar width is relative to the max count to fill the space better
    // But conceptually a true bar chart is % of total.
    // Here we use % of max value for visual scaling in the container.

    row.innerHTML = `
      <div class="stat-label">${label}</div>
      <div class="stat-bar-container">
        <div class="stat-bar" style="width: 0%" data-target-width="${percentage}%">
          ${count}
        </div>
      </div>
    `;
    barChartContainer.appendChild(row);

    // Animate bars with a slight delay
    setTimeout(() => {
      const bar = row.querySelector(".stat-bar");
      bar.style.width = bar.getAttribute("data-target-width");
    }, 100);
  });

  // Render Keywords Cloud
  const keywordsContainer = document.getElementById("keywords-cloud");
  keywordsContainer.innerHTML = "";

  // Sort keywords by count descending
  const sortedKeywords = Object.entries(keywordsCount).sort(
    (a, b) => b[1] - a[1],
  );

  if (sortedKeywords.length === 0) {
    keywordsContainer.innerHTML =
      '<p style="text-align:center; color:#999;">No keywords found.</p>';
  } else {
    // Only consider the top 20 keywords
    const topKeywords = sortedKeywords.slice(0, 20);

    // Find min and max counts for scaling
    const counts = topKeywords.map(([_, count]) => count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);

    topKeywords.forEach(([keyword, count], i) => {
      const tag = document.createElement("span");
      tag.className = "keyword-tag";

      // 2-level sizing: Top 5 get a boost, rest are smaller
      if (i < 5) {
        tag.style.fontSize = "1.3rem";
        tag.style.fontWeight = "bold";
      } else {
        tag.style.fontSize = "0.9rem";
      }

      tag.innerHTML = `${keyword} <span class="count">${count}</span>`;
      keywordsContainer.appendChild(tag);
    });
  }
}

function buildTabs(articleCount) {
  const tabs = (document.getElementById("tab-publication").innerText =
    `Publications (${articleCount})`);

  const children = document.getElementById("tabs").children;
  const sections = document.getElementsByTagName("section");
  for (let i = 0; i < children.length; i++) {
    const index = i;
    children[i].addEventListener("click", () => {
      changeTab(index);
    });
  }

  function changeTab(id) {
    for (let i = 0; i < children.length; i++) {
      children[i].classList.remove("nav-active");
    }
    children[id].classList.add("nav-active");

    for (let i = 0; i < sections.length; i++) {
      sections[i].classList.remove("section-active");
    }
    setTimeout(() => {
      const local_id = id;
      for (let i = 0; i < sections.length; i++) {
        sections[i].classList.add("hidden");
      }
      sections[local_id].classList.remove("hidden");
      setTimeout(() => {
        sections[local_id].classList.add("section-active");
      }, 125);
    }, 125);
  }
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("section");
  if (tabParam) {
    switch (tabParam) {
      case "publications":
        changeTab(0);
        break;
      case "pte":
        changeTab(1);
        break;
      case "research-projects":
        changeTab(2);
        break;
      case "teachingAndReviews":
        changeTab(3);
        break;
      case "InteractiveProjects":
        changeTab(4);
        break;
      default:
        changeTab(0);
    }
  }
}

async function buildNews() {
  const data = await getJsonData("files/news.json");
  const newsContainer = document.getElementById("news");
  const newsHTMLData = data.news
    .map(
      (newsItem) =>
        ` <li><span class='time'>[${newsItem.date}]</span> <span class='message'>${newsItem.message}</span></li>`,
    )
    .join("");
  newsContainer.innerHTML = newsHTMLData;
}

function scrollBtnBehaviour() {
  let mybutton = document.getElementById("scroll-btn");

  // When the user scrolls down 20px from the top of the document, show the button
  window.onscroll = function () {
    scrollFunction();
  };

  function scrollFunction() {
    const tabs = document
      .getElementById("tab-publication")
      .getBoundingClientRect();

    // console.log(document.documentElement.scrollTop);

    if (tabs.y < -100) {
      mybutton.style.display = "block";
    } else {
      mybutton.style.display = "none";
    }

    // const threshhold = 500;
    // if (document.body.scrollTop > threshhold || document.documentElement.scrollTop > threshhold) {
    //   mybutton.style.display = "block";
    // } else {
    //   mybutton.style.display = "none";
    // }
  }
}

function parseProjectMarkdown(md) {
  const title = md.split("<TITLE>")[1];
  const partners = md.split("<PARTNERS>")[1].split(",");
  const image = md.split("<IMAGE>")[1];
  const time = md.split("<TIME>")[1];
  const id = md.split("<ID>")[1];
  const body = marked.parse(md);

  //console.log(title, partners, image, time);
  // console.log(body);
  return {
    id: id,
    title: title,
    partners: partners,
    image: image,
    time: time,
    body: body,
  };
}

async function buildProjects() {
  const article_template = document.getElementById("projects-article-template");
  const projects_json = await getJsonData("/files/projects.json");
  for (let i = 0; i < projects_json.project_files.length; i++) {
    const projectRaw = await getMarkdownData(projects_json.project_files[i]);
    const article = parseProjectMarkdown(projectRaw);
    let newArticle = article_template.cloneNode(true);
    document.getElementById("research-projects").appendChild(newArticle);
    newArticle.classList.remove("hidden");
    newArticle.id = article.id;

    newArticle.querySelector(".article-year").textContent = article.time;
    newArticle.querySelector(".article-title").textContent = article.title;
    newArticle.querySelector(".article-authors").innerHTML = article.partners
      .map((partner) => `<span>${partner.trim()}</span>`)
      .join("");
    newArticle.querySelector(".body").innerHTML = article.body;
    newArticle.querySelector("img").src = article.image;
  }
}

async function buildPTE() {
  const pteData = await getHTMLData("/files/pages/pte.html");

  // Directly render the html as we are structuring it with HTML
  const body = pteData;
  document.getElementById("pte-content").innerHTML = body;
  // console.log(body);
}

async function buildTeaching() {
  const teachingData = await getMarkdownData("/files/mds/teaching.md");
  const teachingHtml = marked.parse(teachingData);
  document.getElementById("teaching-content").innerHTML = teachingHtml;
  // console.log(teachingHtml);
}

async function buildInteractiveProjects() {
  const teachingData = await getMarkdownData(
    "/files/mds/interactive-projects.md",
  );
  const teachingHtml = marked.parse(teachingData);
  document.getElementById("interactive-projects-content").innerHTML =
    teachingHtml;
  // console.log(teachingHtml);
}

async function buildTimeline() {
  const data = await getJsonData("files/articles.json");
  const timelineWrapper = document.getElementById("timelineWrapper");

  // Count publications per year
  const yearCounts = {};
  data.articles.forEach((article) => {
    const year = article.year;
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  // Get sorted years
  const years = Object.keys(yearCounts).sort((a, b) => a - b);

  // Create timeline track
  const track = document.createElement("div");
  track.className = "timeline-track";

  // Get max count for scaling
  const maxCount = Math.max(...Object.values(yearCounts));

  // Create year items
  years.forEach((year) => {
    const count = yearCounts[year];
    const barHeight = Math.max(10, (count / maxCount) * 50); // Min 10px, max 50px

    const yearItem = document.createElement("div");
    yearItem.className = "timeline-year-item";

    const bar = document.createElement("div");
    bar.className = "year-bar";
    bar.style.height = barHeight + "px";

    const countLabel = document.createElement("div");
    countLabel.className = "year-count";
    countLabel.textContent = count;

    const dot = document.createElement("div");
    dot.className = "year-dot";

    const label = document.createElement("div");
    label.className = "year-label";
    label.textContent = year;

    yearItem.appendChild(countLabel);
    yearItem.appendChild(bar);
    yearItem.appendChild(dot);
    yearItem.appendChild(label);

    // Add click handler to scroll to first article of that year
    yearItem.addEventListener("click", () => {
      const firstArticle = data.articles.find((a) => a.year == year);
      if (firstArticle) {
        const element = document.getElementById(firstArticle.id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });

    track.appendChild(yearItem);
  });

  timelineWrapper.appendChild(track);
}

async function setup() {
  const articleData = await buildPublications("all");

  buildTabs(articleData.length);
  await buildTimeline();

  await buildNews();
  scrollBtnBehaviour();
  await buildProjects();
  await buildPTE();
  await buildTeaching();
  await buildInteractiveProjects();
}

setup();

document.addEventListener("scroll", function () {
  const reveals = document.querySelectorAll("article");

  for (let i = 0; i < reveals.length; i++) {
    const windowHeight = window.innerHeight;
    const elementTop = reveals[i].getBoundingClientRect().top;
    const elementVisible = 0;

    if (elementTop < windowHeight - elementVisible) {
      reveals[i].classList.add("is-visible");
    } else {
      reveals[i].classList.remove("is-visible");
    }
  }
});

const toggle = document.getElementById("threeOptionToggle");
const options = toggle.querySelectorAll(".option");
const activeArea = toggle.querySelector(".active-area");

// Funktion, um den aktiven Bereich und Text basierend auf der Auswahl zu aktualisieren
function updateToggle(state) {
  // Entferne aktive Klasse von allen Optionen und füge sie zur gewählten hinzu
  options.forEach((option) => option.classList.remove("active"));
  const selectedOption = toggle.querySelector(`.option[data-state="${state}"]`);
  selectedOption.classList.add("active");

  // Ändere den Schalter-Hintergrund und die Position basierend auf der Auswahl
  toggle.className = `toggle ${state}`;

  // Verschiebe den aktiven Bereich je nach Zustand
  if (state === "all") {
    activeArea.style.transform = "translateX(0%)";
  } else if (state === "full") {
    activeArea.style.transform = "translateX(100%)";
  } else if (state === "short") {
    activeArea.style.transform = "translateX(200%)";
  }
}

// Event-Listener für jede Option, um den Zustand zu wechseln
options.forEach((option) => {
  option.addEventListener("click", async function (event) {
    const selectedState = event.target.getAttribute("data-state");
    updateToggle(selectedState);
    const articleData = await buildPublications(
      selectedState,
      currentAuthorFilter,
    );
    document.getElementById("tab-publication").innerText =
      `Publications (${articleData.length})`;
  });
});

// Setze den Standardzustand
updateToggle("all");

// First Author Checkbox Toggle
const firstAuthorCheckbox = document.getElementById("firstAuthorCheckbox");
let isFirstAuthorActive = false;

firstAuthorCheckbox.addEventListener("click", async function () {
  isFirstAuthorActive = !isFirstAuthorActive;
  this.classList.toggle("active", isFirstAuthorActive);

  const authorFilter = isFirstAuthorActive ? "first" : "all";
  const articleData = await buildPublications(
    currentPublicationType,
    authorFilter,
  );
  document.getElementById("tab-publication").innerText =
    `Publications (${articleData.length})`;
});

function openCiteBox(citePreText) {
  const overlay = document.getElementById("citeOverlay");
  overlay.classList.remove("hidden");
  overlay.querySelector(".bibtex").innerText = citePreText;
}

// Copy to clipboard
document.getElementById("copyBibtexBtn").addEventListener("click", function () {
  const text = document.getElementById("bibtexBlock").innerText;

  navigator.clipboard.writeText(text).then(() => {
    const msg = document.getElementById("copyMsg");
    msg.style.display = "inline";
    setTimeout(() => (msg.style.display = "none"), 1500);
    const overlay = document.getElementById("citeOverlay");
    setTimeout(() => overlay.classList.add("hidden"), 2500);
  });
});

document.getElementById("citeOverlay").addEventListener("click", function (e) {
  const citeBox = document.querySelector(".cite-box");
  if (!citeBox.contains(e.target)) {
    this.classList.add("hidden");
  }
});
