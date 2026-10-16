



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
  refreshDocumentList();
};

// Zone 3: Les fonctions 

function addDocument(fileName, fileType, fileContent, fileNature, fileSize) {
    const tx = db.transaction("documents", "readwrite");
    const store = tx.objectStore("documents");

    const addRequest = store.add({
        name: fileName,
        nature: fileNature,
        type: fileType,
        size: fileSize,
        date: new Date(),
        content: fileContent
    });

    addRequest.onsuccess = function () {
        console.log("Document ajouté :", fileName);
    };

    addRequest.onerror = function (event) {
        console.error("Erreur lors de l'ajout :", event.target.error);
    };

    tx.oncomplete = function () {
        console.log("Transaction terminée");
        refreshDocumentList();
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
    renderDocuments(getAllRequest.result);
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
    refreshDocumentList();
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
    refreshDocumentList();
  };

  clearRequest.onerror = function(event) {
    console.error("Error clearing documents: ", event.target.error);
  };
}

function refreshDocumentList() {
  getAllDocuments();

}

function renderDocuments(documents) {
  const docListe = document.getElementById("liste-documents");
  docListe.innerHTML = "";

  if (!documents || documents.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No documents available.";
    docListe.appendChild(li);
    return;
  }

  for (const doc of documents) {
    const li = document.createElement("li");
    li.textContent = (`Name: ${doc.name},  Type: ${doc.type}, Size: ${doc.size} bytes, Nature: ${doc.nature}, Date: ${doc.date}, Content: ${doc.content}`);               
    docListe.appendChild(li);      
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteDocument(doc.id);
    });
    li.appendChild(deleteButton);

    // Pour ouvrir le pdf
    const openButton = document.createElement("button");
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => {
      console.log("Open button clicked for document: ", doc);
      const docFile = doc.content;
      const docUrl = URL.createObjectURL(docFile);
      window.open(docUrl, "_blank");
    });
    li.appendChild(openButton);
  }
}

// Fonction pour les boutons submit

const boutonCvSubmit = document.getElementById("cv-submit");




// Bouton submit pour CV + Lettres
boutonCvSubmit.addEventListener("click", function () {
    const CvName = document.getElementById("cv-name").value.trim();
    const CvFile = document.getElementById("cv-upload").files[0];

    if (!CvFile) {
        console.error("Aucun fichier CV sélectionné.");
        return;
    }

    if (!CvName) {
        console.error("Le nom du CV est vide.");
        return;
    }

    if (CvFile.size > 2 * 1024 * 1024) {
        console.error("Le fichier dépasse la limite de 2 Mo.");
        return;
    }

    addDocument(
        CvName,       
        CvFile.type,  
        CvFile,       
        "cv",         
        CvFile.size   
    );

    document.getElementById("cv-name").value = "";
    document.getElementById("cv-upload").value = "";
});


const boutonCoverLetterSubmit = document.getElementById("cover-letter-submit");

boutonCoverLetterSubmit.addEventListener("click", function(){
  
  const CoverLetterName = document.getElementById("cover-letter-name").value;
  const CoverLetterFile = document.getElementById("cover-letter-upload").files[0];

  if(!CoverLetterName){
    console.error("Cover letter file has no name. Cannot proceed.");
    return;
  }

  if (!CoverLetterFile) {
    console.error("No cover letter file selected. Cannot proceed.");
    return;   
  }
  if(CoverLetterFile.size > 4 * 1024 * 1024) { // 4MB limit
    console.error("Cover letter file is too large. Cannot proceed.");
    return;
  }

  console.log(CoverLetterName);
  console.log(CoverLetterFile);
  console.log("cover-letter-submit button clicked");

  console.log(CoverLetterFile.name, CoverLetterFile.size, CoverLetterFile.type, CoverLetterFile.lastModified);
  addDocument(CoverLetterFile.name, CoverLetterFile.type, CoverLetterFile, "cover-letter");
  console.log("Cover letter added to the database");
  document.getElementById("cover-letter-name").value = "";
  document.getElementById("cover-letter-upload").value = "";
});



function modifyDocument(id, newName){
  if (db === null) {
    console.error("Database is not initialized. Cannot modify document.");
    return;   
  }

  if (!newName) {
    console.error("New name is empty. Cannot modify document.");
    return;   
  }

  if(!id){
    console.error("Document ID is not provided. Cannot modify document.");
    return;   
  }

  // Cannot find document condition
  if (id === undefined || id === null) {
    console.error("Document ID is undefined or null. Cannot modify document.");
    return;   
  }

  const modifyTx = db.transaction("documents","readwrite");
  const modifyStore = modifyTx.objectStore("documents");
  const getRequest = modifyStore.get(id);

  getRequest.onsuccess = function(event) {
    const doc = event.target.result;
    modifyStore.put({ ...doc, name: newName });
  };

  getRequest.onerror = function(event) {
    console.error("Error retrieving document for modification: ", event.target.error);
  };

  modifyTx.oncomplete = function() {
    console.log("Document modified successfully");
    refreshDocumentList();
    
  };

  modifyTx.onerror = function(event) {
    console.error("Error modifying document: ", event.target.error);
  };
}
