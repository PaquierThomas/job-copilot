



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
async function addDocument(label, file, nature) {
  if (db === null) {
    console.error("Database is not initialized. Cannot add document.");
    return;
  }
 
  const documentFiltres = await getDefault(nature)
  console.log(documentFiltres?.length)

  const tx = db.transaction("documents", "readwrite");
  const store = tx.objectStore("documents");
  

  const addRequest = store.add({
    label: label,          // libellé modifiable
    name: file.name,       // nom d'origine du fichier, ne change jamais
    nature: nature,
    type: file.type,
    size: file.size,
    date: new Date(),
    content: file,
    default: documentFiltres?.length < 1?true:false
  });


  
  
  
 
  addRequest.onerror = function (event) {
    console.error("Error adding document: ", event.target.error);
  };
 
  tx.oncomplete = function () {
    console.log("Document added to the store");
    refreshDocumentList();
  };
 
  tx.onerror = function (event) {
    console.error("Transaction error while adding: ", event.target.error);
  };
}
 
async function getDefault(nature) {
    const getDefaultDocTx = db.transaction("documents", "readonly");
    const getDefaultDocStore = getDefaultDocTx.objectStore("documents");

    // Récupérer tous les documents
    const documents = await new Promise((resolve, reject) => {
        const request = getDefaultDocStore.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });

    // Filtrer les documents
    const documentsFiltres = documents.filter(
        doc => doc.default === true && doc.nature === nature
    );

    console.log("Documents filtrés :", documentsFiltres);

    return documentsFiltres;
}
 
// ---------- SOUMISSION (partagée entre CV et lettre) ----------
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
 
async function submitDocument(nameInputId, fileInputId, nature) {
  const nameInput = document.getElementById(nameInputId);
  const fileInput = document.getElementById(fileInputId);
 
  const label = nameInput.value.trim();
  const file = fileInput.files[0];
 
  if (!file) {
    console.error("Aucun fichier sélectionné.");
    return;
  }
 
  if (file.type !== "application/pdf") {
    console.error("Le fichier doit être un PDF. Type reçu : " + file.type);
    return;
  }
 
  if (file.size > MAX_FILE_SIZE) {
    console.error("Le fichier dépasse la limite de 5 Mo.");
    return;
  }
 
  if (!label) {
    console.error("Le libellé est vide.");
    return;
  }
 
  await addDocument(label, file, nature);
 
  nameInput.value = "";
  fileInput.value = "";
}
 
document.getElementById("cv-submit").addEventListener("click", function () {
  submitDocument("cv-name", "cv-upload", "cv");
});
 
document.getElementById("cover-letter-submit").addEventListener("click", function () {
  submitDocument("cover-letter-name", "cover-letter-upload", "lettre");
});
 
 
// ---------- AFFICHAGE ----------
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
 
    // Texte de la ligne, dans un <span> pour ne pas être effacé par les boutons
    const text = document.createElement("span");
    const displayLabel = doc.label || doc.name; // repli pour les anciens documents
    const sizeKo = Math.round(doc.size / 1024);
    text.textContent =
      `${displayLabel} (${doc.nature}) - fichier : ${doc.name} - ${sizeKo} Ko - ${new Date(doc.date).toLocaleDateString()}`;
    li.appendChild(text);
 
    // Supprimer
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removeDocument(doc.id);
    });
    li.appendChild(deleteButton);
 
    // Ouvrir le PDF
    const openButton = document.createElement("button");
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => {
      const docUrl = URL.createObjectURL(doc.content);
      window.open(docUrl, "_blank");
    });
    li.appendChild(openButton);
 
    // Renommer le libellé (le nom d'origine du fichier ne change pas)
    const modifyButton = document.createElement("button");
    modifyButton.textContent = "Rename";
    modifyButton.addEventListener("click", () => {
      const newLabel = prompt("Nouveau libellé :", displayLabel);
      if (newLabel) {
        modifyDocument(doc.id, {label: newLabel});
      }
    });
    li.appendChild(modifyButton);
 
    docListe.appendChild(li);


    // TRANSOFMRE EN RADIO BUTTON ASAP

    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");

    // Si doc.default vaut true, la case est cochée
    checkbox.checked = doc.default === true;

    if(doc.default === true){
      checkbox.style.pointerEvents = 'none';
    }
  

    checkbox.addEventListener("change", async () => {
        // const nature = await getDefault(doc.nature)
        const documentFiltres = await getDefault(doc.nature)
        console.log("test 12345  " + documentFiltres?.length)

        modifyDocument(doc.id, {default: true})
        modifyDocument(documentFiltres[0].id, {default:false})

        
        console.log("Nouvelle valeur :", checkbox.checked);
    });

    li.appendChild(checkbox);
    docListe.appendChild(li);
  }}
 
// ---------- MODIFICATION DU LIBELLÉ ----------
function modifyDocument(id, newDoc) {
  if (db === null) {
    console.error("Database is not initialized. Cannot modify document.");
    return;
  }
 
  // const cleanLabel = (newLabel || "").trim();
  // if (!cleanLabel) {
  //   console.error("Le nouveau libellé est vide.");
  //   return;
  // }
 
  const modifyTx = db.transaction("documents", "readwrite");
  const modifyStore = modifyTx.objectStore("documents");
  const getRequest = modifyStore.get(id);
 
  getRequest.onsuccess = function (event) {
    const doc = event.target.result;
 
    if (!doc) {
      console.error("Document introuvable pour l'id : " + id);
      return;
    }
 
    // doc.label = cleanLabel;   // on change uniquement le libellé
    modifyStore.put({...doc, ...newDoc});     // doc est complet : le fichier (content) est conservé
  };
 
  getRequest.onerror = function (event) {
    console.error("Error retrieving document for modification: ", event.target.error);
  };
 
  modifyTx.oncomplete = async function () {
    console.log("Document modified successfully");
    await refreshDocumentList();
  };
 
  modifyTx.onerror = function (event) {
    console.error("Error modifying document: ", event.target.error);
  };
}

async function getDocument(id){
  if (db === null) {
    console.error("Database is not initialized. Cannot get document.");
    return;   
  }

  const getTx= db.transaction("documents", "readonly");
  const getStore = getTx.objectStore("documents");
  
  const document = await new Promise((resolve, reject) => {
        const getRequest = getStore.get(id);

        getRequest.onsuccess = () => {
            console.log("Document retrieved: ", getRequest.result);
            resolve(getRequest.result);
        };

        getRequest.onerror = () => {
            console.error("Error retrieving document: ", getRequest.error);
            reject("Error retrieving document ", getRequest.error);
        };
    });
  
    return document
}

async function getAllDocuments(){
  if (db === null) {
    console.error("Database is not initialized. Cannot get all documents.");
    return;   
  }
  const getAllTx = db.transaction("documents", "readonly");
  const getAllStore = getAllTx.objectStore("documents");

  const documents = await new Promise((resolve, reject) => {
        const getAllRequest = getAllStore.getAll();

        getAllRequest.onsuccess = () => {
            console.log("All documents retrieved: ", getAllRequest.result);
            resolve(getAllRequest.result);
        };

        getAllRequest.onerror = () => {
            console.error("Error retrieving all documents: ", getAllRequest.error);
            reject(getAllRequest.error);
        };
    });
  
    return documents
}

function deleteDocument(id){
  if (db === null) {
    console.error("Database is not initialized. Cannot delete document.");
    return;   
  }

  const delTx = db.transaction("documents", "readwrite");
  const delStore = delTx.objectStore("documents");
  const delRequest = delStore.delete(id);

  delRequest.onsuccess = async function() {
    console.log("Document deleted successfully");
    await refreshDocumentList();
  };

  delRequest.onerror = function(event) {
    console.error("Error deleting document: ", event.target.error);
  };
}


async function removeDocument(id){
  const doc = await getDocument(id);
  console.log("voici le doc ", doc)
  await deleteDocument(id);

  if(doc.default === true){
    const remainingDoc = await getAllDocuments();
    const documentFiltres = remainingDoc.filter(
      filterdoc => filterdoc.nature === doc.nature 
    )
    modifyDocument(documentFiltres[0].id, {default: true})

  }
  await refreshDocumentList();
}


// Fonction vider la base de documents
async function clearDocuments(){

  if (db === null) {
    console.error("Database is not initialized. Cannot clear documents.");
    return;   
  }

  const clearTx = db.transaction("documents", "readwrite");
  const clearStore = clearTx.objectStore("documents");
  const clearRequest = clearStore.clear();

  clearRequest.onsuccess = async function(event) {
    console.log("All documents cleared from the store");
    await refreshDocumentList();
  };

  clearRequest.onerror = function(event) {
    console.error("Error clearing documents: ", event.target.error);
  };
}

async function refreshDocumentList() {
  const documents = await getAllDocuments();
  
  renderDocuments(documents);

}

// function makeDefaultDocuments(id){

//   const defaultTx = db.transaction("documents", "readwrite");
//   const defaultStore = defaultTx.objectStore("documents");
//   const defaultRequest = defaultStore.get(id)

//   defaultRequest.onsuccess = function(event){
//     const doc = event.target.result;
//     console.log("Document retrieved", doc)

//     if (default:true){
//       modifyDocument(doc.id, {default: true})
//     }
//   }
// }

// function makeDefaultDocuments() {
  
 
//   const nature = doc.nature;


//   if (nature === "cv") {
//   browser.storage.local.set({ document: { default: true } });

//   }
//   if (nature === "lettre") {
//   doc.id = 
//   browser.storage.local.set({ document: { default: true } });
//   }





// saveProfileButton.addEventListener("click", async () => {
//     const profileData = document.querySelector("#profile-json").value;
//     document.querySelector("#profile-json").value = profileData;
//     browser.storage.local.set({ user: { username: profileData } });
//     browser.storage.local.set({ document: { default: true } });
//     console.log("Profile data saved:", profileData);
// });

// const getProfileData = browser.storage.local.get("user").then((result) => {
//     if (result.user) {
//         document.querySelector("#profile-json").value = result.user.username || "";
//         document.querySelector("#saved-username").textContent = result.user.username || "—";
//     }
//     console.log("Profile data loaded:", result.user);
    
// });