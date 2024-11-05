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
let buildPublicationArticles = [];
async function buildPublications(type) {
  const article_template = document.getElementById("article-template");
  const data = await getJsonData("files/articles.json");

  for (let i = 0; i < buildPublicationArticles.length; i++) {
    buildPublicationArticles[i].remove();
  }
  buildPublicationArticles = [];

  for (let i = 0; i < data.articles.length; i++) {
    const article = data.articles[i];
    const id = article.id;
    //console.log(article.links)
    // if (article.authors[0].trim() != "Kristoffer Waldow") continue;

    if(type != "all"){
      if (!article.tags.includes(type)) {
        continue; // Wenn der Artikel den Typ nicht hat, wird er übersprungen
      }
    }

    let newArticle = article_template.cloneNode(true);
    document.getElementById("publications").appendChild(newArticle);
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
          }</span>`
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

    newArticle.querySelector("#abstract-data-toggle").textContent =
      article.abstract;
    newArticle.querySelector("#abstract-data-toggle").id = abstractID;

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
    buildPublicationArticles.push(newArticle);
  }
  return buildPublicationArticles;
}

function buildTabs(articleCount) {
  const tabs = (document.getElementById(
    "tab-publication"
  ).innerText = `Publications (${articleCount})`);

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
}

async function buildNews() {
  const data = await getJsonData("files/news.json");
  const newsContainer = document.getElementById("news");
  const newsHTMLData = data.news
    .map(
      (newsItem) =>
        ` <li><span class='time'>[${newsItem.date}]</span> <span class='message'>${newsItem.message}</span></li>`
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
  const body = marked.parse(md);

  //console.log(title, partners, image, time);
  // console.log(body);
  return {
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
    newArticle.id = "ID_" + article.title;

    newArticle.querySelector(".article-year").textContent = article.time;
    newArticle.querySelector(".article-title").textContent = article.title;
    newArticle.querySelector(".article-authors").innerHTML = article.partners
      .map((partner) => `<span>${partner.trim()}</span>`)
      .join("");
    newArticle.querySelector(".body").innerHTML = article.body;
    newArticle.querySelector("img").src = article.image;
  }
}

async function buildTeaching() {
  const teachingData = await getMarkdownData("/files/mds/teaching.md");
  const teachingHtml = marked.parse(teachingData);
  document.getElementById("teaching-content").innerHTML = teachingHtml;
  // console.log(teachingHtml);
}

async function buildInteractiveProjects() {
  const teachingData = await getMarkdownData(
    "/files/mds/interactive-projects.md"
  );
  const teachingHtml = marked.parse(teachingData);
  document.getElementById("interactive-projects-content").innerHTML =
    teachingHtml;
  // console.log(teachingHtml);
}

async function setup() {
  const articleData = await buildPublications("all");

  buildTabs(articleData.length);

  await buildNews();
  scrollBtnBehaviour();
  await buildProjects();
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

document.getElementById("type-selector").addEventListener("change", async function () {
  const selectedType = this.value;
  const articleData = await buildPublications(selectedType);
  document.getElementById("tab-publication").innerText = `Publications (${articleData.length})`;
});

