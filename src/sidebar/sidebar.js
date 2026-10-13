// const settings = document.querySelector("#settings");

// settings.addEventListener("click", () => {
//   browser.runtime.openOptionsPage();
// });

// async function loadData() {
//   const result = await browser.storage.local.get("user");

//   if (!result.user) {
//     return;
//   }

//   document.querySelector("#username").textContent =
//     result.user.username || "Utilisateur";

//   document.querySelector("#data-username").textContent =
//     result.user.username || "—";

//   document.querySelector("#data-avatar").textContent = result.user.avatar
//     ? "Importé"
//     : "—";
// }

// loadData();



const buttons = document.querySelectorAll("button[data-tab]") 
const sections = document.querySelectorAll("section[data-tab]")


buttons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Action button clicked");
    console.log(button.dataset.tab);


    sections.forEach((section) => {
        section.hidden = true;
    });

    const targetSection = document.querySelector(
      `section[data-tab="${button.dataset.tab}"]`
    );
    if (targetSection) {
      targetSection.hidden = false;
    }
  });
});


const saveProfileButton = document.querySelector("#save-profile");

saveProfileButton.addEventListener("click", async () => {
    const profileData = document.querySelector("#profile-json").value;
    document.querySelector("#profile-json").value = profileData;
    browser.storage.local.set({ user: { username: profileData } });
    console.log("Profile data saved:", profileData);
});

const getProfileData = browser.storage.local.get("user").then((result) => {
    if (result.user) {
        document.querySelector("#profile-json").value = result.user.username || "";
        document.querySelector("#saved-username").textContent = result.user.username || "—";
    }
    console.log("Profile data loaded:", result.user);
    
});
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.user) {
        const newValue = changes.user.newValue;
        document.querySelector("#profile-json").value = newValue.username || "";
        document.querySelector("#saved-username").textContent = newValue.username || "—";
        console.log("Profile data updated:", newValue);
    }
});


// Database web
const dbName = "the_name";

const request = indexedDB.open(dbName, 1);


request.onerror = function (event) {
  console.error("Database error: ", event.target.error);
};

request.onupgradeneeded = function (event) {
  const db = event.target.result;

  if(!db.objectStoreNames.contains("documents")) {
    db.createObjectStore("documents", {keyPath: "id"});
  }
};

request.onsuccess = function (event){
  const db = event.target.result;
  console.log("Database opened successfully");

  db.onerror = function (event) {
    alert("Database error: " + event.target.error);
  }

  const tx = db.transaction("documents", "readwrite");
  const store = tx.objectStore("documents");

  const addRequest = store.add({id:1, name: "This is my document!", label: "Document 1", type:"cv", size: "1MB", date: new Date()});

  addRequest.onsuccess = function() {
    console.log("Document added to the store");
  };

  addRequest.onerror = function(event) {
    console.error("Error adding document: ", event.target.error);
  };

  tx.oncomplete = function (){
    console.log("Transaction completed asked by john");
  };
};
