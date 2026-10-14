



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


// Zone 1 var partagée
var db = null;

// zone 2 Ouverture de la base de données
const dbName = "the_name";

const request = indexedDB.open(dbName, 2);


request.onerror = function (event) {
  console.error("Database error: ", event.target.error);
};

request.onupgradeneeded = function (event) {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

      if (oldVersion < 2) {
          if (db.objectStoreNames.contains("documents")) {
              db.deleteObjectStore("documents");
          }

          db.createObjectStore("documents", {
              keyPath: "id",
              autoIncrement: true
          });
      }
};

request.onsuccess = function (event){
  db = event.target.result;
  console.log("Database opened successfully");

  db.onerror = function (event) {
    console.error("Database error: " + event.target.error);
  }
};

// Zone 3: Les fonctions 
function addDocument(){

  const tx = db.transaction("documents", "readwrite");
  const store = tx.objectStore("documents");

  const addRequest = store.add({name: "This is my document!", label: "Document 1", type:"cv", size: "1MB", date: new Date()});

  addRequest.onsuccess = function() {
    console.log("Document added to the store");
  };

  addRequest.onerror = function(event) {
    console.error("Error adding document: ", event.target.error);
  };

  tx.oncomplete = function (){
    console.log("Transaction completed asked by john");
  };

}

function getDocument(id){
  if (db === null) {
    console.error("Database is not initialized. Cannot get document.");
    return;   
  }

  const getTx= db.transaction("documents", "readonly");
  const getStore = getTx.objectStore("documents");
  const getRequest = getStore.get(id);

  getRequest.onsuccess = function(event) {
    const doc = event.target.result;
    console.log("Document retrieved: ", doc);
  };

  getRequest.onerror = function(event) {
    console.error("Error retrieving document: ", event.target.error);
  };
}

function getAllDocuments(){
  if (db === null) {
    console.error("Database is not initialized. Cannot get all documents.");
    return;   
  }
  const getAllTx = db.transaction("documents", "readonly");
  const getAllStore = getAllTx.objectStore("documents");
  const getAllRequest = getAllStore.getAll();

  getAllRequest.onsuccess = function(event) {
    const allDocuments = event.target.result;
    console.log("All documents retrieved: ", allDocuments);
  };

  getAllRequest.onerror = function(event) {
    console.error("Error retrieving all documents: ", event.target.error);
  }
}

function deleteDocument(id){
  if (db === null) {
    console.error("Database is not initialized. Cannot delete document.");
    return;   
  }


  const delTx = db.transaction("documents", "readwrite");
  const delStore = delTx.objectStore("documents");
  const delRequest = delStore.delete(id);

  delRequest.onsuccess = function() {
    console.log("Document deleted successfully");
  };

  delRequest.onerror = function(event) {
    console.error("Error deleting document: ", event.target.error);
  };
}
// Fonction vider la base de documents
function clearDocuments(){

  if (db === null) {
    console.error("Database is not initialized. Cannot clear documents.");
    return;   
  }

  const clearTx = db.transaction("documents", "readwrite");
  const clearStore = clearTx.objectStore("documents");
  const clearRequest = clearStore.clear();

  clearRequest.onsuccess = function(event) {
    console.log("All documents cleared from the store");
  };

  clearRequest.onerror = function(event) {
    console.error("Error clearing documents: ", event.target.error);
  };
}


// Fonction pour les boutons submit

const boutonCvSubmit = document.getElementById("cv-submit");

boutonCvSubmit.addEventListener("click", function(){
  const CvName = document.getElementById("cv-name").value;
  const CvFile = document.getElementById("cv-upload").files[0];
  console.log(CvName);
  console.log(CvFile);
  console.log("cv-submit button clicked");
  if (!CvFile) {
    console.error("No Cv file selected. Cannot proceed.");
    return;   
  }


  console.log(CvFile.name, CvFile.size, CvFile.type, CvFile.lastModified);

});

const boutonCoverLetterSubmit = document.getElementById("cover-letter-submit");

boutonCoverLetterSubmit.addEventListener("click", function(){
  
  const CoverLetterName = document.getElementById("cover-letter-name").value;
  const CoverLetterFile = document.getElementById("cover-letter-upload").files[0];

  

  if (!CoverLetterFile) {
    console.error("No cover letter file selected. Cannot proceed.");
    return;   
  }

  console.log(CoverLetterName);
  console.log(CoverLetterFile);
  console.log("cover-letter-submit button clicked");

  console.log(CoverLetterFile.name, CoverLetterFile.size, CoverLetterFile.type, CoverLetterFile.lastModified);
});
